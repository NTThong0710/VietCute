const express = require("express");
const router = express.Router();
const db = require("../../DB");

// ==================== DANHGIA ROUTES ====================

// Lấy tất cả đánh giá theo homestay
router.get("/:id_homestay", (req, res) => {
  const { id_homestay } = req.params;
  const sql = "SELECT * FROM danh_gia WHERE id_homestay = ? ORDER BY id DESC";
  db.query(sql, [id_homestay], (err, results) => {
    if (err) {
      console.error("Lỗi khi lấy đánh giá:", err);
      return res.status(500).json({ thongbao: "Đã có lỗi khi lấy đánh giá" });
    }
    res.json(results);
  });
});

// Thêm đánh giá mới
router.post("/", (req, res) => {
  const { id_homestay, ten_user, noi_dung, sao } = req.body;

  if (!id_homestay || !ten_user || !noi_dung || !sao) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng điền đầy đủ các trường" });
  }

  const sql =
    "INSERT INTO danh_gia (id_homestay, ten_user, noi_dung, sao) VALUES (?, ?, ?, ?)";
  db.query(sql, [id_homestay, ten_user, noi_dung, sao], (err, result) => {
    if (err) {
      console.error("Lỗi khi thêm đánh giá:", err);
      return res.status(500).json({ thongbao: "Đã có lỗi khi thêm đánh giá" });
    }
    res.json({
      thongbao: "Đánh giá đã được thêm thành công",
      id: result.insertId,
    });
  });
});

// Cập nhật đánh giá
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { ten_user, noi_dung, sao } = req.body;

  if (!ten_user || !noi_dung || !sao) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng cung cấp thông tin hợp lệ" });
  }

  const query =
    "UPDATE danh_gia SET ten_user = ?, noi_dung = ?, sao = ? WHERE id = ?";
  db.query(query, [ten_user, noi_dung, sao, id], (error, results) => {
    if (error) {
      console.error("Lỗi khi cập nhật đánh giá:", error);
      return res.status(500).json({ thongbao: "Cập nhật không thành công" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ thongbao: "Không tìm thấy đánh giá" });
    }
    res.json({ thongbao: "Đánh giá đã được cập nhật thành công" });
  });
});

// Xóa đánh giá
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM danh_gia WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Lỗi khi xóa đánh giá:", err);
      return res.status(500).json({ thongbao: "Đã có lỗi khi xóa đánh giá" });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ thongbao: "Không tìm thấy đánh giá" });
    }
    res.json({ thongbao: "Đánh giá đã được xóa thành công" });
  });
});

module.exports = router;
