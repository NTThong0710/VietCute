const express = require("express");
const router = express.Router();
const db = require("../../DB");

// ==================== VOUCHER ROUTES ====================

// Lấy tất cả vouchers
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM vouchers ORDER BY ngay_het_han DESC",
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
      }
      res.status(200).json(results);
    }
  );
});

// Thêm voucher mới
router.post("/", function (req, res) {
  let data = req.body;
  let sql = `INSERT INTO vouchers SET ?`;
  db.query(sql, data, (err, result) => {
    if (err) res.json({ thongbao: "Lỗi thêm voucher", err });
    else
      res.json({
        thongbao: "Đã thêm voucher thành công",
        id: result.insertId,
      });
  });
});

// Kiểm tra voucher có hợp lệ không
router.post("/check", (req, res) => {
  const { ma_voucher } = req.body;

  if (!ma_voucher) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng cung cấp mã voucher." });
  }

  const query = "SELECT * FROM vouchers WHERE ma_voucher = ?";
  db.query(query, [ma_voucher], (err, results) => {
    if (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      return res.status(500).json({ success: false, message: "Lỗi server." });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Mã voucher không tồn tại hoặc không hợp lệ. Vui lòng kiểm tra lại.",
      });
    }

    const voucher = results[0];
    const currentDate = new Date();
    const expirationDate = new Date(voucher.ngay_het_han);

    // Kiểm tra ngày hết hạn
    if (currentDate > expirationDate) {
      return res
        .status(400)
        .json({ success: false, message: "Mã voucher đã hết hạn." });
    }

    // Kiểm tra số lượng còn lại
    if (voucher.so_luong <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Mã voucher đã được sử dụng hết." });
    }

    // Trả về kết quả nếu voucher hợp lệ
    return res.status(200).json({
      success: true,
      message: "Mã voucher hợp lệ.",
      data: {
        id: voucher.id,
        ma_voucher: voucher.ma_voucher,
        giam_gia: voucher.giam_gia,
        ngay_het_han: voucher.ngay_het_han,
        so_luong: voucher.so_luong,
      },
    });
  });
});

// Cập nhật voucher
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const sql = `UPDATE vouchers SET ? WHERE id = ?`;

  db.query(sql, [data, id], (err, result) => {
    if (err) {
      return res.status(500).json({ thongbao: "Lỗi cập nhật voucher", err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ thongbao: "Không tìm thấy voucher" });
    }
    res.json({ thongbao: "Đã cập nhật voucher thành công" });
  });
});

// Xóa voucher
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM vouchers WHERE id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).json({ thongbao: "Lỗi xóa voucher", err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ thongbao: "Không tìm thấy voucher" });
    }
    res.json({ thongbao: "Đã xóa voucher thành công" });
  });
});

module.exports = router;
