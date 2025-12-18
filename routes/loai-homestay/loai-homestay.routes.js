const express = require("express");
const router = express.Router();
const db = require("../../DB");

// ==================== PUBLIC ROUTES ====================

// Tìm kiếm loại homestay - phải đặt trước route /:id
router.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  const sql = `
    SELECT * FROM loai_homestay
    WHERE Ten_Loai LIKE ? OR Mo_Ta LIKE ?
  `;
  db.query(sql, [`%${query}%`, `%${query}%`], (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm kiếm:", err);
      return res.status(500).send("Lỗi server");
    }
    res.json(results);
  });
});

// Lấy tất cả loại homestay
router.get("/", function (req, res) {
  let sql = `SELECT * FROM loai_homestay`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list loại homestay", err });
    else res.json(data);
  });
});

// Lấy loại homestay theo ID
router.get("/:id", function (req, res) {
  let id_loai = parseInt(req.params.id);
  if (isNaN(id_loai) || id_loai <= 0) {
    res.json({ thongbao: "Không biết loại", id_loai: id_loai });
    return;
  }
  let sql = `SELECT * FROM loai_homestay WHERE id_Loai = ?`;
  db.query(sql, id_loai, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy loại", err });
    else res.json(data[0]);
  });
});

module.exports = router;
