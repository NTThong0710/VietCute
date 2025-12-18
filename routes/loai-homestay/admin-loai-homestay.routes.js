const express = require("express");
const router = express.Router();
const db = require("../../DB");

// ==================== ADMIN ROUTES ====================

// Lấy tất cả loại homestay (Admin)
router.get("/", function (req, res) {
  let sql = `SELECT * FROM loai_homestay`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list loại", err });
    else res.json(data);
  });
});

// Lấy chi tiết 1 loại homestay (Admin)
router.get("/:id", function (req, res) {
  let id = parseInt(req.params.id);
  if (id <= 0) {
    res.json({ thongbao: "Không tìm thấy loại", id: id });
    return;
  }
  let sql = `SELECT * FROM loai_homestay WHERE id_Loai = ?`;
  db.query(sql, id, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy 1 loại", err });
    else res.json(data[0]);
  });
});

// Thêm loại homestay mới
router.post("/", function (req, res) {
  let data = req.body;
  let sql = `INSERT INTO loai_homestay SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) res.json({ thongbao: "Lỗi thêm loại", err });
    else
      res.json({
        thongbao: "Đã thêm loại thành công",
        id_loai: result.insertId,
      });
  });
});

// Sửa loại homestay
router.put("/:id", function (req, res) {
  let id = req.params.id;
  let data = req.body;
  let sql = `UPDATE loai_homestay SET ? WHERE id_Loai = ?`;
  db.query(sql, [data, id], (err, d) => {
    if (err) res.json({ thongbao: "Lỗi sửa loại", err });
    else res.json({ thongbao: "Đã sửa loại thành công" });
  });
});

// Xóa loại homestay
router.delete("/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM loai_homestay WHERE id_Loai = ?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa loại", err });
    else res.json({ thongbao: "Đã xóa loại thành công" });
  });
});

module.exports = router;
