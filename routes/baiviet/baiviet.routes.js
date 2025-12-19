const express = require("express");
const router = express.Router();
const db = require("../../DB"); // Đảm bảo đường dẫn này trỏ đúng về file DB.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Cấu hình Multer để lưu ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Lưu vào thư mục uploads ở root
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Domain của server Render (Dùng để ghép link ảnh khi trả về frontend)
const SERVER_DOMAIN = "https://vietcute.onrender.com";

// ==================== HELPER FUNCTION ====================
// Hàm xử lý link ảnh trước khi trả về cho Frontend
const fixImageUrl = (article) => {
  if (!article.image_url) return article;

  // Nếu trong DB lưu đường dẫn tương đối (/uploads/...), thì ghép domain vào
  if (!article.image_url.startsWith("http")) {
    article.image_url = `${SERVER_DOMAIN}${article.image_url}`;
  }
  return article;
};

// ==================== ROUTES ====================

// 1. Lấy danh sách bài viết (Có phân trang)
router.get("/", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  const offset = (page - 1) * pageSize;

  // Query 1: Đếm tổng số bài
  db.query("SELECT COUNT(*) AS total FROM baiviet", (err, result) => {
    if (err) {
      console.error("Lỗi đếm bài viết:", err);
      return res.status(500).json({ error: "Lỗi server" });
    }

    const total = result[0].total;
    const totalPages = Math.ceil(total / pageSize);

    // Query 2: Lấy dữ liệu phân trang
    db.query(
      "SELECT * FROM baiviet ORDER BY publish_date DESC LIMIT ?, ?",
      [offset, pageSize],
      (err, articles) => {
        if (err) {
          console.error("Lỗi lấy bài viết:", err);
          return res.status(500).json({ error: "Lỗi truy vấn bài viết" });
        }

        // Xử lý link ảnh cho từng bài viết
        const processedArticles = articles.map((article) => fixImageUrl(article));

        res.json({
          articles: processedArticles,
          currentPage: page,
          totalPages,
          total,
        });
      }
    );
  });
});

// 2. Lấy chi tiết bài viết theo ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM baiviet WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy" });

    res.json(fixImageUrl(result[0]));
  });
});

// 3. Lấy bài viết theo Slug
router.get("/slug/:slug", (req, res) => {
  const { slug } = req.params;
  db.query("SELECT * FROM baiviet WHERE slug = ?", [slug], (err, result) => {
    if (err) return res.status(500).json({ error: "Lỗi DB" });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy" });

    res.json(fixImageUrl(result[0]));
  });
});

// 4. Lấy bài viết mới nhất (Limit)
router.get("/latest/new", (req, res) => {
  const limit = parseInt(req.query.limit) || 4;
  db.query(
    "SELECT * FROM baiviet ORDER BY publish_date DESC LIMIT ?",
    [limit],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Lỗi DB" });
      
      const processed = result.map((item) => fixImageUrl(item));
      res.json(processed);
    }
  );
});

// 5. Lấy bài viết liên quan theo tác giả
router.get("/related/author", (req, res) => {
  const { author } = req.query;
  if (!author) return res.status(400).json({ error: "Thiếu tên tác giả" });

  db.query(
    "SELECT * FROM baiviet WHERE author = ? ORDER BY id DESC",
    [author],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Lỗi DB" });
      
      const processed = result.map((item) => fixImageUrl(item));
      res.json(processed);
    }
  );
});

// 6. THÊM BÀI VIẾT MỚI (Sửa logic lưu ảnh)
router.post("/", upload.single("image"), (req, res) => {
  const { title, content, author, publish_date } = req.body;

  // CHỈ LƯU ĐƯỜNG DẪN TƯƠNG ĐỐI (/uploads/abc.jpg)
  const image_url = req.file ? `/uploads/${req.file.filename}` : "";

  const query =
    "INSERT INTO baiviet (title, content, author, publish_date, image_url) VALUES (?, ?, ?, ?, ?)";

  db.query(
    query,
    [title, content, author, publish_date, image_url],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi thêm bài viết" });
      }
      res.status(201).json({
        id: result.insertId,
        title,
        content,
        author,
        publish_date,
        image_url: image_url ? `${SERVER_DOMAIN}${image_url}` : "",
      });
    }
  );
});

// 7. SỬA BÀI VIẾT (Xử lý xóa ảnh cũ)
router.put("/:id", upload.single("image"), (req, res) => {
  const { title, content, author, publish_date } = req.body;
  
  // Nếu có upload ảnh mới thì lấy đường dẫn mới, không thì null
  let newImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  // Bước 1: Lấy ảnh cũ từ DB để xóa
  const queryGetOldImage = `SELECT image_url FROM baiviet WHERE id = ?`;
  
  db.query(queryGetOldImage, [req.params.id], (err, results) => {
    if (err || results.length === 0) {
        return res.status(500).json({ message: "Lỗi tìm bài viết" });
    }

    let currentDbUrl = results[0].image_url; // Link hiện tại trong DB
    let oldFileToDelete = null;

    // Logic xác định đường dẫn file cũ trên ổ cứng để xóa
    if (newImagePath && currentDbUrl) {
        // Cần xóa localhost hoặc domain để lấy đường dẫn file thật
        let relativePath = currentDbUrl;
        if (relativePath.includes("http")) {
             // Cắt bỏ phần domain http://.../ để lấy /uploads/...
             const urlParts = relativePath.split("/uploads/");
             if (urlParts.length > 1) {
                 relativePath = "/uploads/" + urlParts[1];
             }
        }
        oldFileToDelete = path.join(__dirname, "../../", relativePath);
    }

    // Nếu không up ảnh mới -> Giữ nguyên link cũ
    // Nếu có up ảnh mới -> Dùng link mới
    const image_url_to_save = newImagePath ? newImagePath : currentDbUrl;

    // Bước 2: Update vào DB
    const queryUpdate = `
      UPDATE baiviet
      SET title = ?, content = ?, author = ?, publish_date = ?, image_url = ?
      WHERE id = ?
    `;

    db.query(
      queryUpdate,
      [title, content, author, publish_date, image_url_to_save, req.params.id],
      (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi update" });

        // Bước 3: Xóa ảnh cũ trên server (nếu có ảnh mới)
        if (newImagePath && oldFileToDelete) {
          fs.unlink(oldFileToDelete, (err) => {
            if (err) console.error("Không xóa được ảnh cũ (có thể không tồn tại):", err.message);
            else console.log("Đã xóa ảnh cũ:", oldFileToDelete);
          });
        }

        res.status(200).json({ message: "Cập nhật thành công" });
      }
    );
  });
});

// 8. XÓA BÀI VIẾT
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  
  // (Tùy chọn: Có thể thêm bước SELECT để xóa ảnh trước khi DELETE dòng)
  db.query("DELETE FROM baiviet WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ error: "Lỗi xóa bài viết" });
    res.status(204).send();
  });
});

module.exports = router;
