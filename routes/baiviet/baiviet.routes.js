const express = require("express");
const router = express.Router();
const db = require("../../DB");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ==================== PUBLIC ROUTES ====================

// Lấy danh sách bài viết với phân trang
router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  db.query("SELECT COUNT(*) AS total FROM baiviet", (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi truy vấn tổng số bài viết" });
    }

    const total = result[0].total;
    const totalPages = Math.ceil(total / pageSize);

    db.query(
      "SELECT * FROM baiviet ORDER BY publish_date DESC LIMIT ?, ?",
      [offset, pageSize],
      (err, articles) => {
        if (err) {
          return res.status(500).json({ error: "Lỗi truy vấn bài viết" });
        }

        res.json({
          articles,
          currentPage: page,
          totalPages,
          total,
        });
      }
    );
  });
});

// Lấy bài viết theo ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM baiviet WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Database query error" });
    }
    if (result.length === 0) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }
    res.json(result[0]);
  });
});

// Lấy bài viết theo slug
router.get("/slug/:slug", (req, res) => {
  const { slug } = req.params;

  db.query("SELECT * FROM baiviet WHERE slug = ?", [slug], (err, result) => {
    if (err) {
      console.error("Lỗi truy vấn bài viết:", err);
      return res.status(500).json({ error: "Lỗi truy vấn bài viết" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    res.json(result[0]);
  });
});

// Lấy bài viết mới nhất
router.get("/latest/new", (req, res) => {
  const limit = parseInt(req.query.limit) || 4;
  db.query(
    "SELECT * FROM baiviet ORDER BY publish_date DESC LIMIT ?",
    [limit],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Lỗi truy vấn" });
      res.json(result);
    }
  );
});

// Lấy bài viết liên quan theo tác giả
router.get("/related/author", (req, res) => {
  const { author } = req.query;

  if (!author) {
    return res.status(400).json({ error: "Author is required" });
  }

  const query = "SELECT * FROM baiviet WHERE author = ? ORDER BY id DESC";
  db.query(query, [author], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result);
  });
});

// Thêm bài viết
router.post("/", upload.single("image"), (req, res) => {
  const { title, content, author, publish_date } = req.body;
  const image_url = req.file
    ? `http://localhost:3000/uploads/${req.file.filename}`
    : "";

  const query =
    "INSERT INTO baiviet (title, content, author, publish_date, image_url) VALUES (?, ?, ?, ?, ?)";

  db.query(
    query,
    [title, content, author, publish_date, image_url],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Có lỗi khi thêm bài viết!" });
      }
      res.status(201).json({
        id: result.insertId,
        title,
        content,
        author,
        publish_date,
        image_url,
      });
    }
  );
});

// Sửa bài viết
router.put("/:id", upload.single("image"), (req, res) => {
  const { title, content, author, publish_date } = req.body;
  let newImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const queryGetOldImage = `SELECT image_url FROM baiviet WHERE id = ?`;
  db.query(queryGetOldImage, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Lỗi khi lấy thông tin bài viết!" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Bài viết không tồn tại!" });
    }

    const oldImagePath = results[0].image_url
      ? path.join(
          __dirname,
          "../../",
          results[0].image_url.replace("http://localhost:3000/", "")
        )
      : null;

    const image_url = newImagePath
      ? `http://localhost:3000${newImagePath}`
      : results[0].image_url;

    const queryUpdate = `
      UPDATE baiviet
      SET title = ?, content = ?, author = ?, publish_date = ?, image_url = ?
      WHERE id = ?
    `;
    db.query(
      queryUpdate,
      [title, content, author, publish_date, image_url, req.params.id],
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ message: "Lỗi khi cập nhật bài viết!" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Bài viết không tồn tại!" });
        }

        if (newImagePath && oldImagePath) {
          fs.unlink(oldImagePath, (unlinkErr) => {
            if (unlinkErr) console.error("Không thể xóa ảnh cũ:", unlinkErr);
          });
        }

        res.status(200).json({
          id: req.params.id,
          title,
          content,
          author,
          publish_date,
          image_url,
        });
      }
    );
  });
});

// Xóa bài viết
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM baiviet WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Lỗi xóa bài viết" });
    res.status(204).send();
  });
});

module.exports = router;
