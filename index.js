const db = require("./DB");
const express = require("express");
const axios = require("axios");
const slugify = require("slugify");
const multer = require("multer");
const path = require("path");
const moment = require("moment");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const fs = require("fs");
const cors = require("cors");

require("./cron-job");
require("./cron-danhgia");

const app = express();

const corsOptions = {
  origin: ["http://localhost:3001", "http://localhost:3000"],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const homestayRoutes = require("./routes/homestay.routes");
const adminHomestayRoutes = require("./routes/admin-homestay.routes");
const loaiHomestayRoutes = require("./routes/loai-homestay/loai-homestay.routes");
const adminLoaiHomestayRoutes = require("./routes/loai-homestay/admin-loai-homestay.routes");
const danhgiaRoutes = require("./routes/danhgia/danhgia.routes");
const voucherRoutes = require("./routes/voucher/voucher.routes");
const authRoutes = require("./routes/auth/auth.routes");
const userRoutes = require("./routes/user/user.routes");
const adminUserRoutes = require("./routes/user/admin-user.routes");
const baivietRoutes = require("./routes/baiviet/baiviet.routes");
const donhangRoutes = require("./routes/donhang/donhang.routes");
const paymentRoutes = require("./routes/payment/payment.routes");
const dichvuRoutes = require("./routes/dichvu/dichvu.routes");
const contactRoutes = require("./routes/contact/contact.routes");

// Homestay
app.use("/homestay", homestayRoutes);
app.use("/admin/homestay", adminHomestayRoutes);

// Loại Homestay
app.use("/loaihomestay", loaiHomestayRoutes);
app.use("/admin/loai", adminLoaiHomestayRoutes);

// Đánh giá
app.use("/danhgia", danhgiaRoutes);

// Voucher
app.use("/vouchers", voucherRoutes);

// Auth & User
app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/admin/nhanvien", adminUserRoutes);
app.use("/admin/user", adminUserRoutes);

// Bài viết
app.use("/baiviet", baivietRoutes);

// Đơn hàng
app.use("/donhang", donhangRoutes);

// Payment
app.use("/payment", paymentRoutes);

// Dịch vụ
app.use("/dichvu", dichvuRoutes);

// Liên hệ
app.use("/contact", contactRoutes);

app.get("/homestaylienquan/:id", (req, res) => {
  res.redirect(307, `/homestay/lienquan/${req.params.id}`);
});

app.get("/ct_homestay/:slug", (req, res) => {
  res.redirect(307, `/homestay/ct/${req.params.slug}`);
});

app.get("/homestayTrongLoai/:id_loai", (req, res) => {
  res.redirect(307, `/homestay/loai/${req.params.id_loai}`);
});

app.get("/search_homestay", (req, res) => {
  res.redirect(307, `/homestay/search?query=${req.query.query || ""}`);
});

app.get("/dshinhanh", (req, res) => {
  res.redirect(307, `/homestay/dshinhanh`);
});

app.post("/checkBooking", (req, res) => {
  const { id_homestay, ngay_dat, ngay_tra } = req.body;

  // Kiểm tra tính hợp lệ của ngày
  if (
    !moment(ngay_dat, "YYYY-MM-DD", true).isValid() ||
    !moment(ngay_tra, "YYYY-MM-DD", true).isValid()
  ) {
    return res
      .status(400)
      .json({ error: "Ngày nhận hoặc ngày trả không hợp lệ." });
  }

  const formattedNgayDat = moment(ngay_dat, "YYYY-MM-DD").format("YYYY-MM-DD");
  const formattedNgayTra = moment(ngay_tra, "YYYY-MM-DD").format("YYYY-MM-DD");

  // Kiểm tra logic ngày trả > ngày nhận
  if (new Date(formattedNgayTra) <= new Date(formattedNgayDat)) {
    return res
      .status(400)
      .json({ error: "Ngày trả phòng phải lớn hơn ngày nhận phòng." });
  }

  // Truy vấn kiểm tra trùng lặp ngày đặt
  const checkOverlapQuery = `
        SELECT * 
        FROM dat_homestay 
        WHERE id_homestay = ? 
          AND NOT (
              ngay_tra <= ? OR ngay_dat >= ?
          )
    `;

  db.query(
    checkOverlapQuery,
    [id_homestay, formattedNgayDat, formattedNgayTra],
    (err, rows) => {
      if (err) {
        console.error("Lỗi truy vấn:", err);
        return res
          .status(500)
          .json({ error: "Lỗi máy chủ khi kiểm tra ngày đặt phòng." });
      }

      // Trả về kết quả có xung đột hoặc không
      if (rows.length > 0) {
        return res.status(200).json({ conflict: true });
      }

      return res.status(200).json({ conflict: false });
    }
  );
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
