const express = require("express");
const router = express.Router();
const db = require("../../DB");
const bcrypt = require("bcrypt"); // <--- Thêm cái này (nhớ npm install bcrypt)

// ==================== ĐĂNG KÝ (Có Hash Pass) ====================
router.post("/register", async (req, res) => {
  let { ten_user, sdt_user, pass_user, email_user } = req.body;

  // Thêm giá trị mặc định cho các trường có thể bị thiếu (Logic cũ)
  const address = "";
  const gender = "";
  const dob = "1990-01-01";
  const avatar = "";

  try {
    // 1. Mã hóa mật khẩu trước khi lưu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pass_user, salt);

    let sql = `
      INSERT INTO users (ten_user, sdt_user, pass_user, email_user, role_id, address, gender, dob, avatar)
      VALUES (?, ?, ?, ?, 2, ?, ?, ?, ?)
    `;

    // Lưu hashedPassword vào DB thay vì pass_user thường
    db.query(
      sql,
      [ten_user, sdt_user, hashedPassword, email_user, address, gender, dob, avatar],
      (err, result) => {
        if (err) {
          console.error("Error:", err);
          return res.status(400).json({ thongbao: "Tài khoản đã tồn tại hoặc lỗi SQL", err });
        } else {
          res.json({ thongbao: "Tạo tài khoản thành công", result });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ thongbao: "Lỗi mã hóa mật khẩu", error });
  }
});

// ==================== ĐĂNG NHẬP (So sánh Hash) ====================
router.post("/login", (req, res) => {
  const { email_user, pass_user } = req.body;

  if (!email_user || !pass_user) {
    return res.status(400).json({ message: "Email và mật khẩu là bắt buộc" });
  }

  const sql = "SELECT * FROM users WHERE email_user = ?";
  db.query(sql, [email_user], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Có lỗi xảy ra", err });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ message: "Email không tồn tại hoặc không chính xác!" });
    }

    const user = results[0];

    // --- LOGIC MỚI: KIỂM TRA MẬT KHẨU ---
    // Hỗ trợ cả mật khẩu cũ (chưa hash) và mật khẩu mới (đã hash)
    let isMatch = false;
    
    // Nếu mật khẩu trong DB bắt đầu bằng $2b$ hoặc $2a$ thì là đã hash
    if (user.pass_user.startsWith("$2b$") || user.pass_user.startsWith("$2a$")) {
       isMatch = await bcrypt.compare(pass_user, user.pass_user);
    } else {
       // Nếu không phải hash thì so sánh thường (cho tài khoản cũ dùng được)
       isMatch = (pass_user === user.pass_user);
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu không chính xác!" });
    }
    // ------------------------------------

    // LOGIC CŨ: Phân quyền và điều hướng (Giữ nguyên)
    let redirectTo = "/";
    let roleDescription = "";

    if (user.role_id === 0) {
      redirectTo = "/admin";
      roleDescription = "Quản trị viên";
    } else if (user.role_id === 1) {
      redirectTo = "/staff";
      roleDescription = "Nhân viên";
    } else if (user.role_id === 2) {
      redirectTo = "/";
      roleDescription = "Người dùng";
    } else {
      return res
        .status(403)
        .json({ message: "Vai trò người dùng không xác định" });
    }

    // Trả về kết quả (Giữ nguyên cấu trúc JSON)
    res.status(200).json({
      message: `Đăng nhập thành công với vai trò ${roleDescription}`,
      user: {
        id_user: user.id_user,
        ten_user: user.ten_user,
        email_user: user.email_user,
        sdt_user: user.sdt_user,
        role_id: user.role_id, // Sửa key 'role' thành 'role_id' cho khớp frontend check
        redirectTo: redirectTo,
      },
    });
  });
});

// ==================== ĐỔI MẬT KHẨU (Có check Hash cũ) ====================
router.post("/change-password/:id", (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;
  const id_user = req.params.id;

  if (!old_password || !new_password || !confirm_password) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp đầy đủ thông tin." });
  }

  if (new_password !== confirm_password) {
    return res
      .status(400)
      .json({ message: "Mật khẩu mới và mật khẩu nhập lại không khớp." });
  }

  const sql = "SELECT * FROM users WHERE id_user = ?";
  db.query(sql, [id_user], async (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Có lỗi xảy ra khi truy vấn dữ liệu.", err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const user = results[0];

    // Kiểm tra mật khẩu cũ (Hỗ trợ cả hash và thường)
    let isMatch = false;
    if (user.pass_user.startsWith("$2b$") || user.pass_user.startsWith("$2a$")) {
       isMatch = await bcrypt.compare(old_password, user.pass_user);
    } else {
       isMatch = (old_password === user.pass_user);
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu cũ không chính xác." });
    }

    // Mã hóa mật khẩu MỚI trước khi update
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedNewPassword = await bcrypt.hash(new_password, salt);

      const updateSql = "UPDATE users SET pass_user = ? WHERE id_user = ?";
      db.query(updateSql, [hashedNewPassword, id_user], (updateErr, updateResult) => {
        if (updateErr) {
          return res
            .status(500)
            .json({ message: "Có lỗi xảy ra khi cập nhật mật khẩu.", updateErr });
        }

        if (updateResult.affectedRows === 0) {
          return res
            .status(400)
            .json({ message: "Không thể cập nhật mật khẩu. Vui lòng thử lại." });
        }

        res.status(200).json({ message: "Đổi mật khẩu thành công." });
      });
    } catch (hashError) {
        return res.status(500).json({ message: "Lỗi mã hóa mật khẩu mới" });
    }
  });
});

// ==================== RESET MẬT KHẨU (Hash mật khẩu mới) ====================
router.post("/reset-password", async (req, res) => {
  const { email_user, phone_number, new_password } = req.body;

  if (!email_user || !phone_number || !new_password) {
    return res.status(400).json({ message: "*Thiếu dữ liệu*" });
  }

  const sqlSelect = "SELECT * FROM users WHERE email_user = ? AND sdt_user = ?";
  db.query(sqlSelect, [email_user, phone_number], async (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm người dùng:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "Email hoặc số điện thoại không đúng" });
    }

    try {
        // Mã hóa mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(new_password, salt);

        const sqlUpdate =
          "UPDATE users SET pass_user = ? WHERE email_user = ? AND sdt_user = ?";
        db.query(sqlUpdate, [hashedNewPassword, email_user, phone_number], (err) => {
          if (err) {
            console.error("Lỗi khi cập nhật mật khẩu:", err);
            return res.status(500).json({ message: "Lỗi khi cập nhật mật khẩu" });
          }

          res.status(200).json({ message: "Cập nhật mật khẩu thành công" });
        });
    } catch (hashError) {
        return res.status(500).json({ message: "Lỗi mã hóa mật khẩu" });
    }
  });
});

// Kiểm tra email tồn tại (Giữ nguyên 100%)
router.post("/check-email", (req, res) => {
  const { email } = req.body;

  const query = "SELECT * FROM users WHERE email_user = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn:", err);
      return res.status(500).json({ error: "Lỗi server" });
    }

    if (results.length > 0) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  });
});

module.exports = router;
