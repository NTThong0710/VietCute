const express = require("express");
const router = express.Router();
const db = require("../../DB");

// ==================== USER ORDER MANAGEMENT ====================

// Lấy đơn hàng của user
router.get("/user/:id_user", (req, res) => {
  const { id_user } = req.params;

  let sql = `
    SELECT 
      dh.id_DatHomestay, 
      dh.id_homestay,
      dh.ngay_dat,
      dh.ngay_tra,
      dh.tong_tien_dat,
      dh.TT_Thanhtoan,
      h.ten_homestay,
      h.TrangThai,
      u.ten_user,
      u.sdt_user,
      u.email_user
    FROM dat_homestay AS dh
    JOIN homestay AS h ON dh.id_homestay = h.id_homestay
    JOIN users AS u ON dh.id_user = u.id_user
    WHERE dh.id_user = ?
    ORDER BY dh.id_DatHomestay DESC
  `;

  db.query(sql, [id_user], (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ thongbao: "Lỗi lấy danh sách đơn hàng", err });
    }
    if (data.length === 0) {
      return res
        .status(404)
        .json({ thongbao: "Không có đơn hàng nào cho người dùng này." });
    }
    res.status(200).json(data);
  });
});

// Hủy đơn hàng của user
router.delete("/user/:id", (req, res) => {
  const { id } = req.params;

  let checkSql = `SELECT TT_Thanhtoan FROM dat_homestay WHERE id_DatHomestay = ?`;

  db.query(checkSql, [id], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ thongbao: "Lỗi kiểm tra trạng thái thanh toán" });
    }

    if (result.length === 0) {
      return res.status(404).json({ thongbao: "Đơn hàng không tồn tại" });
    }

    const orderStatus = result[0].TT_Thanhtoan;

    if (
      orderStatus !== "Chờ thanh toán" &&
      orderStatus !== "Thanh toán thất bại"
    ) {
      return res.status(400).json({
        thongbao:
          "Không thể hủy đơn hàng vì trạng thái không phải 'Chờ thanh toán' hoặc 'Thanh toán thất bại'",
      });
    }

    let deleteSql = `DELETE FROM dat_homestay WHERE id_DatHomestay = ?`;

    db.query(deleteSql, [id], (err, data) => {
      if (err) {
        return res.status(500).json({ thongbao: "Lỗi khi xóa đơn hàng" });
      }

      if (data.affectedRows > 0) {
        res.status(200).json({ thongbao: "Đơn hàng đã được hủy thành công" });
      } else {
        res.status(404).json({ thongbao: "Không tìm thấy đơn hàng để hủy" });
      }
    });
  });
});

// ==================== ADMIN ORDER MANAGEMENT ====================

// Đơn hàng chưa đặt cọc
router.get("/chua-dat-coc", (req, res) => {
  let sql = `
    SELECT 
      dh.id_DatHomestay, 
      dh.id_homestay,
      dh.ngay_dat,
      dh.ngay_tra,
      dh.tong_tien_dat,
      dh.TT_Thanhtoan,
      h.ten_homestay,
      h.TrangThai,
      u.ten_user,
      u.sdt_user,
      u.email_user
    FROM dat_homestay AS dh
    JOIN homestay AS h ON dh.id_homestay = h.id_homestay
    JOIN users AS u ON dh.id_user = u.id_user
    WHERE dh.TT_Thanhtoan = "chưa đặt cọc"
    ORDER BY dh.id_DatHomestay DESC
  `;

  db.query(sql, (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ thongbao: "Lỗi lấy danh sách đơn hàng", err });
    }
    res.status(200).json(data);
  });
});

// Xóa đơn hàng chưa đặt cọc
router.delete("/chua-dat-coc/:id", (req, res) => {
  let id = req.params.id;
  let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay = ?`;
  db.query(sql, id, (err, d) => {
    if (err) {
      return res.json({ thongbao: "Lỗi xóa đơn hàng", err });
    }
    res.json({ thongbao: "Đã xóa đơn hàng thành công" });
  });
});

// Đơn hàng đã đặt cọc
router.get("/da-dat-coc", (req, res) => {
  let sql = `
    SELECT 
      dh.id_DatHomestay, 
      dh.id_homestay,
      dh.ngay_dat,
      dh.ngay_tra,
      dh.tong_tien_dat,
      dh.TT_Thanhtoan,
      h.ten_homestay,
      h.TrangThai,
      h.gia_homestay,  
      u.ten_user,
      u.sdt_user,
      u.email_user
    FROM dat_homestay AS dh
    JOIN homestay AS h ON dh.id_homestay = h.id_homestay
    JOIN users AS u ON dh.id_user = u.id_user
    WHERE dh.TT_Thanhtoan = 'thanh toán thành công' AND dh.id_HinhThuc_Coc = 1
    ORDER BY dh.id_DatHomestay DESC
  `;

  db.query(sql, (err, data) => {
    if (err) {
      return res.json({ thongbao: "Lỗi lấy list đơn hàng", err });
    }
    res.json(data);
  });
});

// Lấy chi tiết đơn hàng đã đặt cọc theo ID
router.get("/da-dat-coc/:id", (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      dh.id_DatHomestay,  
      dh.id_homestay,
      dh.ngay_dat,
      dh.ngay_tra,
      dh.tong_tien_dat,
      dh.TT_Thanhtoan,
      h.ten_homestay,
      h.gia_homestay,  
      u.ten_user,
      u.sdt_user,
      u.email_user
    FROM dat_homestay AS dh
    JOIN homestay AS h ON dh.id_homestay = h.id_homestay
    JOIN users AS u ON dh.id_user = u.id_user
    WHERE dh.TT_Thanhtoan = 'thanh toán thành công' 
      AND dh.id_HinhThuc_Coc = 1
      AND dh.id_DatHomestay = ?
  `;

  db.query(sql, [id], (err, data) => {
    if (err) {
      return res
        .status(500)
        .json({ thongbao: "Lỗi lấy chi tiết đơn hàng", err });
    }
    if (data.length === 0) {
      return res
        .status(404)
        .json({ thongbao: "Không tìm thấy đơn hàng với ID này" });
    }
    res.json(data[0]);
  });
});

// Cập nhật đơn hàng đã đặt cọc
router.put("/da-dat-coc/:id", (req, res) => {
  const { id } = req.params;
  const {
    ngay_dat,
    ngay_tra,
    tong_tien_dat,
    id_user,
    created_at,
    TT_Thanhtoan,
    tien_coc_truoc,
    tien_can_thanhtoan,
    voucher,
  } = req.body;

  if (
    !ngay_dat ||
    !ngay_tra ||
    !tong_tien_dat ||
    !id_user ||
    !created_at ||
    !TT_Thanhtoan ||
    !tien_coc_truoc ||
    !tien_can_thanhtoan
  ) {
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp đầy đủ thông tin." });
  }

  const sqlUpdate = `
    UPDATE dat_homestay 
    SET ngay_dat = ?, ngay_tra = ?, tong_tien_dat = ?, id_user = ?, 
        created_at = ?, TT_Thanhtoan = ?, tien_coc_truoc = ?, 
        tien_can_thanhtoan = ?, voucher = ?
    WHERE id_DatHomestay = ?
  `;

  db.query(
    sqlUpdate,
    [
      ngay_dat,
      ngay_tra,
      tong_tien_dat,
      id_user,
      created_at,
      TT_Thanhtoan,
      tien_coc_truoc,
      tien_can_thanhtoan,
      voucher,
      id,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Lỗi khi cập nhật dữ liệu." });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Không tìm thấy đơn đặt homestay." });
      }
      res.status(200).json({ message: "Cập nhật thành công!" });
    }
  );
});

// Xóa đơn hàng đã đặt cọc
router.delete("/da-dat-coc/:id", (req, res) => {
  let id = req.params.id;
  let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay = ?`;
  db.query(sql, id, (err, d) => {
    if (err) {
      return res.json({ thongbao: "Lỗi xóa đơn hàng", err });
    }
    res.json({ thongbao: "Đã xóa đơn hàng thành công" });
  });
});

// Đơn hàng đã thanh toán
router.get("/da-thanh-toan", (req, res) => {
  let sql = `
    SELECT 
      dh.id_DatHomestay,  
      dh.id_homestay,
      dh.ngay_dat,
      dh.ngay_tra,
      dh.tong_tien_dat,
      dh.TT_Thanhtoan,
      h.ten_homestay,
      u.ten_user,
      u.sdt_user,
      u.email_user
    FROM dat_homestay AS dh
    JOIN homestay AS h ON dh.id_homestay = h.id_homestay
    JOIN users AS u ON dh.id_user = u.id_user
    WHERE dh.TT_Thanhtoan = 'Đã thanh toán' AND dh.id_HinhThuc_Coc IN (1, 2)
  `;

  db.query(sql, (err, data) => {
    if (err) {
      return res.json({ thongbao: "Lỗi lấy list donhang", err });
    }
    res.json(data);
  });
});

// Cập nhật thanh toán đơn hàng
router.put("/da-thanh-toan/:id", (req, res) => {
  const orderId = req.params.id;
  const { TT_Thanhtoan, tong_tien_dat } = req.body;

  if (!TT_Thanhtoan || !tong_tien_dat) {
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp đầy đủ thông tin." });
  }

  const sqlQuery = `UPDATE dat_homestay SET TT_Thanhtoan = ?, tong_tien_dat = ? WHERE id_DatHomestay = ?`;

  db.query(sqlQuery, [TT_Thanhtoan, tong_tien_dat, orderId], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Có lỗi xảy ra khi cập nhật thông tin thanh toán!" });
    }

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } else {
      return res
        .status(404)
        .json({ error: "Không tìm thấy đơn hàng với ID này." });
    }
  });
});

// Xóa đơn hàng bất kỳ
router.delete("/:id", (req, res) => {
  let id = req.params.id;
  let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay = ?`;
  db.query(sql, id, (err, d) => {
    if (err) {
      return res.json({ thongbao: "Lỗi xóa đơn hàng", err });
    }
    res.json({ thongbao: "Đã xóa đơn hàng thành công" });
  });
});

// Lấy hình thức cọc
router.get("/hinhthuc_coc", (req, res) => {
  db.query("SELECT * FROM hinhthuc_coc", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
    }
    res.status(200).json(results);
  });
});

router.post("/checkExistingBooking", (req, res) => {
  const { id_user, id_homestay, ngay_dat, ngay_tra } = req.body;

  // Validate input data
  if (!id_user || !id_homestay || !ngay_dat || !ngay_tra) {
    return res.status(400).json({ message: "Dữ liệu không đầy đủ." });
  }

  // Validate numeric fields
  if (isNaN(id_user) || isNaN(id_homestay)) {
    return res.status(400).json({ message: "ID không hợp lệ." });
  }

  // Validate date format
  const checkInDate = new Date(ngay_dat);
  const checkOutDate = new Date(ngay_tra);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({ message: "Định dạng ngày không hợp lệ." });
  }

  // Query to check for existing booking with more details
  const query = `
      SELECT 
        id_DatHomestay, 
        pay_url, 
        TT_Thanhtoan,
        expiration_time,
        created_at
      FROM dat_homestay 
      WHERE id_user = ? 
        AND id_homestay = ? 
        AND ngay_dat = ? 
        AND ngay_tra = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;

  db.query(
    query,
    [id_user, id_homestay, ngay_dat, ngay_tra],
    (err, results) => {
      if (err) {
        console.error("Lỗi kiểm tra đặt phòng:", err);
        return res.status(500).json({
          message: "Lỗi máy chủ khi kiểm tra đơn đặt phòng.",
          error: err.message,
        });
      }

      // If booking found
      if (results.length > 0) {
        const booking = results[0];
        const now = new Date();
        const expirationTime = new Date(booking.expiration_time);

        // Check if booking has expired
        const isExpired = expirationTime < now;

        // Only return active bookings (not expired and not completed/cancelled)
        const activeStatuses = ["Chờ thanh toán", "Chờ xác nhận"];
        const isActive =
          activeStatuses.includes(booking.TT_Thanhtoan) && !isExpired;

        if (isActive) {
          return res.status(200).json({
            exists: true,
            bookingId: booking.id_DatHomestay,
            payUrl: booking.pay_url || "",
            TT_Thanhtoan: booking.TT_Thanhtoan,
            expiresAt: booking.expiration_time,
          });
        }
      }

      // No active booking found
      return res.status(200).json({
        exists: false,
        message: "Không có đơn đặt phòng nào đang hoạt động.",
      });
    }
  );
});

router.post("/BookingRoom", (req, res) => {
  const {
    id_user,
    id_homestay,
    ngay_dat,
    ngay_tra,
    tong_tien_dat,
    TT_Thanhtoan,
    id_HinhThuc_Coc,
    created_at,
  } = req.body;

  // Kiểm tra các trường bắt buộc
  if (
    !id_user ||
    !id_homestay ||
    !ngay_dat ||
    !ngay_tra ||
    !tong_tien_dat ||
    !TT_Thanhtoan ||
    !id_HinhThuc_Coc ||
    !created_at
  ) {
    return res.status(400).json({ message: "Tất cả các trường là bắt buộc." });
  }

  // Validate numeric fields
  if (
    isNaN(id_user) ||
    isNaN(id_homestay) ||
    isNaN(tong_tien_dat) ||
    tong_tien_dat <= 0
  ) {
    return res.status(400).json({ message: "Dữ liệu số không hợp lệ." });
  }

  // Validate dates
  const checkInDate = new Date(ngay_dat);
  const checkOutDate = new Date(ngay_tra);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return res.status(400).json({ message: "Định dạng ngày không hợp lệ." });
  }

  if (checkInDate < today) {
    return res
      .status(400)
      .json({ message: "Ngày nhận phòng không thể trong quá khứ." });
  }

  if (checkOutDate <= checkInDate) {
    return res
      .status(400)
      .json({ message: "Ngày trả phòng phải sau ngày nhận phòng." });
  }

  // Validate payment method
  const validPaymentMethods = ["1", "2"];
  if (!validPaymentMethods.includes(String(id_HinhThuc_Coc))) {
    return res
      .status(400)
      .json({ message: "Phương thức thanh toán không hợp lệ." });
  }

  // Tính toán thời gian hết hạn (15 phút sau thời điểm tạo)
  const expirationTime = new Date();
  expirationTime.setMinutes(expirationTime.getMinutes() + 15);

  // Convert ISO datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
  const formatDateTimeForMySQL = (date) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace("T", " ");
  };

  const mysqlCreatedAt = formatDateTimeForMySQL(created_at);
  const mysqlExpirationTime = formatDateTimeForMySQL(expirationTime);

  // Chèn thông tin đặt phòng vào bảng `dat_homestay`
  const insertQuery = `
      INSERT INTO dat_homestay (id_user, id_homestay, ngay_dat, ngay_tra, tong_tien_dat, TT_Thanhtoan, id_HinhThuc_Coc, created_at, expiration_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

  db.query(
    insertQuery,
    [
      id_user,
      id_homestay,
      ngay_dat,
      ngay_tra,
      tong_tien_dat,
      TT_Thanhtoan,
      id_HinhThuc_Coc,
      mysqlCreatedAt,
      mysqlExpirationTime,
    ],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi thêm dữ liệu vào dat_homestay:", err);

        // Check for specific error types
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(409)
            .json({ message: "Đơn đặt phòng đã tồn tại.", error: err.message });
        }

        return res.status(500).json({
          message: "Có lỗi xảy ra khi đặt phòng.",
          error: err.message,
        });
      }

      res.status(200).json({
        message: "Đặt phòng thành công",
        bookingId: results.insertId,
      });
    }
  );
});

module.exports = router;
