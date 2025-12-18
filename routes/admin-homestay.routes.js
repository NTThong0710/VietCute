const express = require("express");
const router = express.Router();
const db = require("../DB");
const multer = require("multer");
const path = require("path");

// Hàm chuyển tên thành slug
function convertToSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Cấu hình multer cho upload ảnh
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Lấy danh sách homestay với hình ảnh
router.get("/", (req, res) => {
  const query = `
    SELECT homestay.*, 
     MAX(hinh_homestay.url_hinh) AS url_hinh
      FROM homestay
      LEFT JOIN hinh_homestay ON homestay.id_homestay = hinh_homestay.id_homestay
      GROUP BY homestay.id_homestay
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Server error");
    }
    res.json(results);
  });
});

// Lấy chi tiết homestay theo ID
router.get("/:id", (req, res) => {
  const id_homestay = req.params.id;

  const query = `
    SELECT *
    FROM homestay
    LEFT JOIN hinh_homestay ON homestay.id_homestay = hinh_homestay.id_homestay
    WHERE homestay.id_homestay = ?
  `;

  db.query(query, [id_homestay], (err, results) => {
    if (err) {
      console.error("Error fetching homestay details:", err);
      return res.status(500).send("Server error");
    }

    if (results.length === 0) {
      return res.status(404).send("Homestay not found");
    }

    res.json(results);
  });
});

// Thêm homestay mới
router.post("/", (req, res) => {
  const { ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai } =
    req.body;
  const slug = convertToSlug(ten_homestay);

  if (!ten_homestay || !gia_homestay || !id_Loai) {
    return res.status(400).json({ message: "Thiếu dữ liệu cần thiết!" });
  }

  const query = `
    INSERT INTO homestay (slug, ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const danh_gia_value = danh_gia ?? 0;

  db.query(
    query,
    [
      slug,
      ten_homestay,
      gia_homestay,
      mota,
      danh_gia_value,
      TrangThai,
      id_Loai,
    ],
    (err, result) => {
      if (err) {
        console.error("Lỗi khi thêm dữ liệu:", err);
        return res.status(500).json({ message: "Lỗi khi thêm dữ liệu" });
      }

      res
        .status(201)
        .json({ message: "Thêm homestay thành công!", id: result.insertId });
    }
  );
});

// Thêm hình ảnh cho homestay
router.post("/:id_homestay/images", upload.array("images", 5), (req, res) => {
  const { id_homestay } = req.params;
  const files = req.files;

  if (!files || files.length === 0) {
    return res
      .status(400)
      .json({ message: "Không có hình ảnh nào được tải lên!" });
  }

  const values = files.map((file) => [
    id_homestay,
    `/uploads/${file.filename}`,
  ]);

  const query = "INSERT INTO hinh_homestay (id_homestay, url_hinh) VALUES ?";
  db.query(query, [values], (err) => {
    if (err) {
      console.error("Lỗi khi thêm hình ảnh:", err);
      return res.status(500).json({ message: "Lỗi khi thêm hình ảnh" });
    }

    res.status(201).json({ message: "Thêm hình ảnh thành công!" });
  });
});

// Cập nhật homestay
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const {
    ten_homestay,
    gia_homestay,
    mota,
    danh_gia,
    TrangThai,
    id_Loai,
    url_hinh,
  } = req.body;

  if (
    !ten_homestay ||
    !gia_homestay ||
    !id_Loai ||
    !url_hinh ||
    typeof TrangThai === "undefined"
  ) {
    return res
      .status(400)
      .send(
        "Please provide all required fields: ten_homestay, gia_homestay, id_Loai, TrangThai, and url_hinh."
      );
  }

  const updateHomestayQuery = `
    UPDATE Homestay 
    SET ten_homestay = ?, gia_homestay = ?, mota = ?, danh_gia = ?, TrangThai = ?, id_Loai = ?
    WHERE id_homestay = ?
  `;

  db.query(
    updateHomestayQuery,
    [
      ten_homestay,
      gia_homestay,
      mota,
      danh_gia || "Chưa đánh giá",
      TrangThai,
      id_Loai,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Error updating homestay:", err);
        return res.status(500).send("Server error while updating homestay");
      }

      if (result.affectedRows === 0) {
        return res.status(404).send("Homestay not found");
      }

      const updateImageQuery = `
        UPDATE hinh_homestay 
        SET url_hinh = ?
        WHERE id_homestay = ?
      `;

      db.query(updateImageQuery, [url_hinh, id], (err) => {
        if (err) {
          console.error("Error updating image:", err);
          return res.status(500).send("Server error while updating image");
        }

        res.json({
          message: "Homestay đã được cập nhật thành công",
        });
      });
    }
  );
});

// Xóa homestay
router.delete("/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM homestay WHERE id_homestay = ?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});

module.exports = router;
