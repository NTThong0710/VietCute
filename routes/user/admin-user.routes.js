const express = require("express");
const router = express.Router();
const db = require("../../DB");

// ==================== ADMIN USER MANAGEMENT ====================

// Lấy users theo role
router.get("/role/:role_id", function (req, res) {
  const role_id = req.params.role_id;
  let sql = `SELECT * FROM users WHERE role_id = ?`;
  db.query(sql, [role_id], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy list user", err });
    } else {
      res.json(data);
    }
  });
});

// Lấy tất cả users (Admin)
router.get("/", function (req, res) {
  let sql = `SELECT * FROM users ORDER BY id_user DESC`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list user", err });
    else res.json(data);
  });
});

// Lấy user theo ID (Admin)
router.get("/:id", function (req, res) {
  let id = parseInt(req.params.id);
  if (id <= 0) {
    res.json({ thongbao: "Không tìm thấy user", id: id });
    return;
  }
  let sql = `SELECT * FROM users WHERE id_user = ?`;
  db.query(sql, id, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy user", err });
    else res.json(data[0]);
  });
});

// Thêm user mới (Admin)
router.post("/", function (req, res) {
  const { ten_user, email_user, sdt_user, pass_user, role_id } = req.body;

  if (!ten_user || !email_user || !sdt_user) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng điền đầy đủ thông tin người dùng!" });
  }

  const finalPassword = pass_user || "0000";
  const finalRoleId = role_id || 2;

  let sql = `INSERT INTO users (ten_user, email_user, sdt_user, pass_user, role_id) 
             VALUES (?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [ten_user, email_user, sdt_user, finalPassword, finalRoleId],
    (err, result) => {
      if (err) {
        console.error("Có lỗi khi thêm người dùng:", err);
        return res
          .status(500)
          .json({ thongbao: "Lỗi khi thêm người dùng", err });
      }

      res.status(201).json({
        thongbao: "Thêm người dùng thành công!",
        id: result.insertId,
      });
    }
  );
});

// Cập nhật user (Admin)
router.put("/:id", function (req, res) {
  let id = req.params.id;
  let data = req.body;
  let sql = `UPDATE users SET ? WHERE id_user = ?`;
  db.query(sql, [data, id], (err, d) => {
    if (err) res.json({ thongbao: "Lỗi sửa user", err });
    else res.json({ thongbao: "Đã sửa user thành công" });
  });
});

// Xóa user (Admin)
router.delete("/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM users WHERE id_user = ?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa user", err });
    else res.json({ thongbao: "Đã xóa user thành công" });
  });
});

// ==================== SEARCH ROUTES ====================

// Tìm kiếm nhân viên - phải đặt trước route /:id
router.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  const sql = `
    SELECT * FROM users
    WHERE (ten_user LIKE ? OR email_user LIKE ? OR sdt_user LIKE ?)
  `;

  db.query(sql, [`%${query}%`, `%${query}%`, `%${query}%`], (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm kiếm:", err);
      return res.status(500).send("Lỗi server");
    }
    res.json(results);
  });
});

// Lấy nhân viên (role_id = 1) - when mounted at /admin/nhanvien, this becomes /admin/nhanvien/role
router.get("/role", function (req, res) {
  let sql = `SELECT * FROM users WHERE role_id = 1`;
  db.query(sql, (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy list nhân viên", err });
    } else {
      res.json(data);
    }
  });
});

module.exports = router;
