const express = require("express");
const router = express.Router();
const db = require("../../DB");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Config multer cho upload avatar
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

// ==================== USER PROFILE ROUTES ====================

// Lấy danh sách users
router.get("/", function (req, res) {
  let sql = `SELECT * FROM users`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list user", err });
    else res.json(data);
  });
});

// Lấy thông tin user theo ID
router.get("/:id", function (req, res) {
  const userId = req.params.id;

  let sql = `SELECT * FROM users WHERE id_user = ?`;
  db.query(sql, [userId], (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ thongbao: "Lỗi khi lấy thông tin người dùng", err });
    }

    if (data.length === 0) {
      return res.status(404).json({ thongbao: "Người dùng không tìm thấy" });
    }

    const user = data[0];
    const avatar = user.avatar || "../../image/user2.png";

    const userData = {
      id_user: user.id_user || "Chưa cập nhật",
      ten_user: user.ten_user || "Chưa cập nhật",
      sdt_user: user.sdt_user || "Chưa cập nhật",
      email_user: user.email_user || "Chưa cập nhật",
      address: user.address || "Chưa cập nhật",
      gender: user.gender || "Chưa cập nhật",
      dob: user.dob || "Chưa cập nhật",
      avatar: avatar,
    };

    res.json({ user: userData });
  });
});

// Cập nhật thông tin user
router.put("/:id", function (req, res) {
  const userId = req.params.id;
  let { ten_user, sdt_user, email_user, address, gender, dob } = req.body;

  ten_user = ten_user || "";
  sdt_user = sdt_user || "";
  email_user = email_user || "";
  address = address || "";
  gender = gender || "";
  dob = dob || "";

  let sql = `
    UPDATE users 
    SET 
      ten_user = ?, 
      sdt_user = ?, 
      email_user = ?, 
      address = ?, 
      gender = ?, 
      dob = ? 
    WHERE id_user = ?
  `;

  db.query(
    sql,
    [ten_user, sdt_user, email_user, address, gender, dob, userId],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ thongbao: "Lỗi khi cập nhật thông tin người dùng", err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ thongbao: "Người dùng không tìm thấy" });
      }

      res.json({ thongbao: "Cập nhật thông tin người dùng thành công" });
    }
  );
});

// Upload avatar
router.post("/:id_user/avatar", upload.single("avatar"), (req, res) => {
  const userId = req.params.id_user;
  const avatarFile = req.file;

  if (!avatarFile) {
    return res.status(400).json({ thongbao: "Chưa tải lên file" });
  }

  const newAvatarPath = `/uploads/${avatarFile.filename}`;
  const newAvatarFullPath = path.join(
    __dirname,
    "../../uploads",
    avatarFile.filename
  );

  const sqlGetOldAvatar = `SELECT avatar FROM users WHERE id_user = ?`;
  db.query(sqlGetOldAvatar, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ thongbao: "Lỗi khi kiểm tra ảnh cũ", err });
    }

    const oldAvatarPath = result.length > 0 ? result[0].avatar : null;

    const sqlUpdateAvatar = `UPDATE users SET avatar = ? WHERE id_user = ?`;
    db.query(sqlUpdateAvatar, [newAvatarPath, userId], (err, result) => {
      if (err) {
        fs.unlink(newAvatarFullPath, (unlinkErr) => {
          if (unlinkErr) console.error("Không xóa được file mới:", unlinkErr);
        });
        return res
          .status(500)
          .json({ thongbao: "Lỗi khi cập nhật ảnh đại diện", err });
      }

      if (oldAvatarPath) {
        const oldAvatarFullPath = path.join(__dirname, "../../", oldAvatarPath);
        fs.unlink(oldAvatarFullPath, (unlinkErr) => {
          if (unlinkErr) console.error("Không xóa được file cũ:", unlinkErr);
        });
      }

      res.status(200).json({
        thongbao: "Cập nhật ảnh đại diện thành công",
        avatar: newAvatarPath,
      });
    });
  });
});

module.exports = router;
