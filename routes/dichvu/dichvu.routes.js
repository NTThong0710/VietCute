const express = require("express");
const router = express.Router();
const db = require("../../DB");

// Lấy danh sách dịch vụ
router.get("/", (req, res) => {
  db.query("SELECT * FROM dich_vu", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
    }

    // Xử lý kết quả, thay thế giá trị NULL bằng 'Chưa có'
    const updatedResults = results.map((row) => {
      const updatedRow = {};
      for (const key in row) {
        updatedRow[key] = row[key] === null ? "Chưa có" : row[key];
      }
      return updatedRow;
    });

    res.status(200).json(updatedResults);
  });
});

// Lấy dịch vụ theo ID
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM dich_vu WHERE id_DV = ?";

  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại!" });
    }

    res.json(results[0]);
  });
});

// Thêm dịch vụ mới
router.post("/", (req, res) => {
  const { ten_dich_vu, mo_ta, gia } = req.body;

  if (!ten_dich_vu) {
    return res.status(400).json({ error: "Tên dịch vụ là bắt buộc" });
  }

  const sql = "INSERT INTO dich_vu (ten_dich_vu, mo_ta, gia) VALUES (?, ?, ?)";

  db.query(sql, [ten_dich_vu, mo_ta || null, gia || null], (err, result) => {
    if (err) {
      console.error("Lỗi khi thêm dịch vụ:", err.message);
      return res.status(500).json({ error: "Không thể thêm dịch vụ!" });
    }

    res.status(201).json({
      message: "Dịch vụ đã được thêm thành công!",
      id: result.insertId,
    });
  });
});

// Cập nhật dịch vụ
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { ten_dich_vu, mo_ta, gia } = req.body;

  if (!ten_dich_vu) {
    return res.status(400).json({ error: "Tên dịch vụ là bắt buộc" });
  }

  const sql =
    "UPDATE dich_vu SET ten_dich_vu = ?, mo_ta = ?, gia = ? WHERE id_DV = ?";

  db.query(
    sql,
    [ten_dich_vu, mo_ta || null, gia || null, id],
    (err, result) => {
      if (err) {
        console.error("Lỗi khi cập nhật dịch vụ:", err.message);
        return res.status(500).json({ error: "Không thể cập nhật dịch vụ!" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Dịch vụ không tồn tại!" });
      }

      res.json({ message: "Dịch vụ đã được cập nhật thành công!" });
    }
  );
});

// Xóa dịch vụ
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM dich_vu WHERE id_DV = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Lỗi khi xóa dịch vụ:", err.message);
      return res.status(500).json({ error: "Không thể xóa dịch vụ!" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Dịch vụ không tồn tại!" });
    }

    res.json({ message: "Dịch vụ đã được xóa thành công!" });
  });
});

module.exports = router;
