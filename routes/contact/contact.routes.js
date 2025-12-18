const express = require("express");
const router = express.Router();
const db = require("../../DB");

// Xử lý form liên hệ
router.post("/", (req, res) => {
  const { name, email, message } = req.body;

  // Kiểm tra xem có giá trị nào trống không
  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng điền đầy đủ thông tin!" });
  }

  const sql =
    "INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)";

  db.query(sql, [name, email, message], (err, result) => {
    if (err) {
      console.error("Lỗi khi lưu dữ liệu:", err);
      return res.status(500).json({ thongbao: "Lỗi khi gửi tin nhắn" });
    }
    res.status(200).json({ thongbao: "Gửi tin thành công!" });
  });
});

module.exports = router;
