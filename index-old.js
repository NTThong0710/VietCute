const db = require("./DB"); // Import từ database.js
const express = require("express");
const axios = require("axios");
const slugify = require("slugify");
require("./cron-job");
require("./cron-danhgia");

const multer = require("multer");
const path = require("path");
const moment = require("moment");

const app = express();
const bodyParser = require("body-parser");
const crypto = require("crypto");

const fs = require("fs");
var cors = require("cors");
const { METHODS } = require("http");
const { log } = require("console");

// Import Routes
const homestayRoutes = require("./routes/homestay.routes");
const adminHomestayRoutes = require("./routes/admin-homestay.routes");

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount Routes
app.use("/homestay", homestayRoutes);
app.use("/admin/homestay", adminHomestayRoutes);

// Backward compatibility routes - redirect old endpoints to new ones
app.get("/homestaylienquan/:id", (req, res) => {
  res.redirect(307, `/homestay/lienquan/${req.params.id}`);
});

app.get("/ct_homestay/:slug", (req, res) => {
  res.redirect(307, `/homestay/ct/${req.params.slug}`);
});

app.get("/homestayTrongLoai/:id_loai", (req, res) => {
  res.redirect(307, `/homestay/loai/${req.params.id_loai}`);
});

app.post("/booking/homestay", (req, res) => {
  req.url = "/homestay/booking";
  homestayRoutes(req, res);
});

app.put("/booking/homestay/:id", (req, res) => {
  req.url = `/homestay/booking/${req.params.id}`;
  homestayRoutes(req, res);
});

app.get("/search_homestay", (req, res) => {
  res.redirect(307, `/homestay/search?query=${req.query.query || ""}`);
});

app.get("/dshinhanh", (req, res) => {
  res.redirect(307, `/homestay/dshinhanh`);
});

// Hàm chuyển tên thành slug
function convertToSlug(text) {
  return text
    .toLowerCase()
    .normalize("NFD") // Tách các ký tự có dấu
    .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu
    .replace(/đ/g, "d") // Thay 'đ' thành 'd'
    .replace(/[^a-z0-9\s-]/g, "") // Loại bỏ ký tự đặc biệt
    .replace(/\s+/g, "-") // Thay khoảng trắng bằng gạch ngang
    .replace(/-+/g, "-") // Loại bỏ gạch ngang thừa
    .replace(/^-+|-+$/g, ""); // Loại bỏ gạch ngang ở đầu và cuối
}

//    ngrok config add-authtoken 2p3piWeNUIuaWIP4lo3SWohbuDI_3zKkyrwRCqb5KEFh9671u
//    ngrok http http://localhost:3000

//   03/07    9704 0000 0000 0018    NGUYEN VAN A	OTP

//////////////////////////////////////conect Da ta/////////////////////////////////

/////////////////////////////////QUẢN LÍ ĐƠN HÀNG USER HEAD///////////////////////

app.get("/dh_user", (req, res) => {
  // Giả sử id_user được gửi qua query (ví dụ: ?id_user=1)
  const { id_user } = req.query;

  // Kiểm tra xem id_user có được truyền vào không
  if (!id_user) {
    return res.status(400).json({ thongbao: "Thiếu id_user!" });
  }

  // Query JOIN 3 bảng để lấy thông tin đơn hàng của người dùng cụ thể
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.id_user = ?  -- Lọc theo id_user
        ORDER BY 
            dh.id_DatHomestay DESC
    `;

  db.query(sql, [id_user], (err, data) => {
    if (err) {
      console.error("Lỗi lấy danh sách đơn hàng:", err);
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

app.delete("/dh_user/:id", (req, res) => {
  const { id } = req.params; // id của đơn hàng cần xóa

  // Kiểm tra trạng thái thanh toán của đơn hàng trước khi xóa
  let checkSql = `
        SELECT TT_Thanhtoan FROM dat_homestay WHERE id_DatHomestay = ?
    `;

  db.query(checkSql, [id], (err, result) => {
    if (err) {
      console.error("Lỗi kiểm tra trạng thái thanh toán:", err);
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

    // Nếu trạng thái là 'Chờ thanh toán', tiến hành xóa đơn hàng
    let deleteSql = `
            DELETE FROM dat_homestay WHERE id_DatHomestay = ?
        `;

    db.query(deleteSql, [id], (err, data) => {
      if (err) {
        console.error("Lỗi xóa đơn hàng:", err);
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

/////////////////////////////////QUẢN LÍ ĐƠN HÀNG USER END///////////////////////

app.get("/donhangchuacoc", (req, res) => {
  // Query JOIN 3 bảng để lấy thông tin đầy đủ, thêm id_DatHomestay
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = "chưa đặt cọc"
        ORDER BY 
            dh.id_DatHomestay DESC
    `;

  db.query(sql, (err, data) => {
    if (err) {
      console.error("Lỗi lấy danh sách đơn hàng:", err);
      res.status(500).json({ thongbao: "Lỗi lấy danh sách đơn hàng", err });
    } else {
      res.status(200).json(data);
    }
  });
});

app.delete("/donhangchuacoc/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay =?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});
app.get("/donhangdacoc", (req, res) => {
  let sql = `SELECT 
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = 'thanh toán thành công'
            AND dh.id_HinhThuc_Coc = 1
        ORDER BY
            dh.id_DatHomestay DESC`;

  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list đơn hàng", err });
    else res.json(data);
  });
});

app.get("/donhangdacoc/:id", (req, res) => {
  const { id } = req.params; // Lấy id từ URL
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            dh.TT_Thanhtoan = 'thanh toán thành công'
            AND dh.id_HinhThuc_Coc = 1
        AND 
            dh.id_DatHomestay = ?
    `;

  db.query(sql, [id], (err, data) => {
    if (err) {
      res.status(500).json({ thongbao: "Lỗi lấy chi tiết đơn hàng", err });
    } else if (data.length === 0) {
      res.status(404).json({ thongbao: "Không tìm thấy đơn hàng với ID này" });
    } else {
      res.json(data[0]); // Trả về chi tiết đơn hàng
    }
  });
});

app.put("/donhangdacoc/:id", (req, res) => {
  const { id } = req.params;
  const {
    ngay_dat,
    ngay_tra,
    tong_tien_dat,
    id_user,
    created_at,
    TT_Thanhtoan, // Trạng thái thanh toán
    tien_coc_truoc, // Tiền cọc đã trả trước
    tien_can_thanhtoan, // Tiền cần thanh toán
    voucher, // Voucher giảm giá (nếu có)
  } = req.body;

  // Kiểm tra đầu vào hợp lệ
  if (
    !id ||
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

  // Câu truy vấn cập nhật
  const sqlUpdate = `
        UPDATE dat_homestay 
        SET 
            ngay_dat = ?, 
            ngay_tra = ?, 
            tong_tien_dat = ?, 
            id_user = ?, 
            created_at = ?, 
            TT_Thanhtoan = ?, 
            tien_coc_truoc = ?, 
            tien_can_thanhtoan = ?, 
            voucher = ?
        WHERE id_DatHomestay = ?`;

  // Thực hiện cập nhật dữ liệu
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
        console.error("Lỗi khi cập nhật dữ liệu:", err);
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
app.delete("/donhangdacoc/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay =?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});

app.get("/donhangdathanhtoan", (req, res) => {
  let sql = `SELECT 
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
           dh.TT_Thanhtoan = 'Đã thanh toán'
            AND dh.id_HinhThuc_Coc IN (1, 2) `;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗii lấy list donhang", err });
    else res.json(data);
  });
});
app.delete("/donhang/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM dat_homestay WHERE id_DatHomestay =?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});

//check voucher
app.get("/donhangdacoc/:id", (req, res) => {
  const { id } = req.params;

  const sql = `
      SELECT dh.id_DatHomestay, hs.ten_homestay, dh.ten_user, dh.tong_tien_dat, dh.tien_coc_truoc
      FROM don_hang dh
      JOIN homestay hs ON dh.id_homestay = hs.id_homestay
      WHERE dh.id_DatHomestay = ?;
    `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn:", err);
      return res.status(500).json({ message: "Lỗi khi lấy dữ liệu đơn hàng" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.json(results[0]);
  });
});

// Cập nhật thông tin thanh toán trong bảng dat_homestay
app.put("/donhangdathanhtoan/:id", (req, res) => {
  const orderId = req.params.id;
  const { TT_Thanhtoan, tong_tien_dat } = req.body;

  console.log("Dữ liệu nhận được từ frontend:", req.body); // In ra để kiểm tra

  // Nếu dữ liệu bị thiếu
  if (!TT_Thanhtoan || !tong_tien_dat) {
    return res
      .status(400)
      .json({ error: "Vui lòng cung cấp đầy đủ thông tin." });
  }

  const sqlQuery = `UPDATE dat_homestay SET TT_Thanhtoan = ?, tong_tien_dat = ? WHERE id_DatHomestay = ?`;

  db.query(sqlQuery, [TT_Thanhtoan, tong_tien_dat, orderId], (err, result) => {
    if (err) {
      console.error("Lỗi khi cập nhật:", err);
      return res
        .status(500)
        .json({ error: "Có lỗi xảy ra khi cập nhật thông tin thanh toán!" });
    }

    console.log("Kết quả cập nhật:", result); // Xem kết quả truy vấn SQL

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } else {
      return res
        .status(404)
        .json({ error: "Không tìm thấy đơn hàng với ID này." });
    }
  });
});

app.post("/don_hang", async (req, res) => {
  const { id_DatHomestay, ngay_giao_dich } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO don_hang (id_DatHomestay, ngay_giao_dich)
             VALUES (?, ?)`,
      [id_DatHomestay, ngay_giao_dich]
    );
    res.json({
      message: "Thêm giao dịch mới thành công.",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Lỗi thêm giao dịch:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

app.get("/hinhthuc_coc", (req, res) => {
  db.query("SELECT * FROM hinhthuc_coc", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
    }
    res.status(200).json(results); // Trả về tất cả các vouchers
  });
});

///////////////////////////////////////////////cho tao lam

/////////////////////////////////////////////cho tao lam

///////donhang///////////

//axios PAYMENT
var accessKey = "F8BBA842ECF85";
var secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

app.post("/payment", async (req, res) => {
  const { amount } = req.body; // Nhận số tiền từ client
  if (!amount) {
    return res.status(400).json({
      statusCode: 400,
      message: "Số tiền không hợp lệ.",
    });
  }
  var orderInfo = "pay with MoMo";
  var partnerCode = "MOMO";
  var redirectUrl = "http://localhost:3001/thanks";
  var ipnUrl = "https://9ec5-115-77-23-68.ngrok-free.app/callback";
  var requestType = "payWithMethod";
  // var amount = '50000';
  var orderId = partnerCode + new Date().getTime();
  var requestId = orderId;
  var extraData = "";
  var orderGroupId = "";
  var autoCapture = true;
  var lang = "vi";

  //before sign HMAC SHA256 with format
  //accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
  var rawSignature =
    "accessKey=" +
    accessKey +
    "&amount=" +
    amount +
    "&extraData=" +
    extraData +
    "&ipnUrl=" +
    ipnUrl +
    "&orderId=" +
    orderId +
    "&orderInfo=" +
    orderInfo +
    "&partnerCode=" +
    partnerCode +
    "&redirectUrl=" +
    redirectUrl +
    "&requestId=" +
    requestId +
    "&requestType=" +
    requestType;
  //puts raw signature
  console.log("--------------------RAW SIGNATURE----------------");
  console.log(rawSignature);
  //signature
  const crypto = require("crypto");
  var signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");
  console.log("--------------------SIGNATURE----------------");
  console.log(signature);

  //json object send to MoMo endpoint
  const requestBody = JSON.stringify({
    partnerCode: partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId: requestId,
    amount: amount,
    orderId: orderId,
    orderInfo: orderInfo,
    redirectUrl: redirectUrl,
    ipnUrl: ipnUrl,
    lang: lang,
    requestType: requestType,
    autoCapture: autoCapture,
    extraData: extraData,
    orderGroupId: orderGroupId,
    signature: signature,
  });
  //option for axios
  const options = {
    method: "POST",
    url: "https://test-payment.momo.vn/v2/gateway/api/create",
    headers: {
      "Content-type": "application/json",
      "Content-length": Buffer.byteLength(requestBody),
    },
    data: requestBody,
  };
  let result;
  try {
    result = await axios(options);
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "L��i khi gửi yêu cầu đến MoMo",
    });
  }
});

// Helper function to remove Vietnamese tones (VNPay requirement)
function removeVietnameseTones(str) {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Remove special characters except space and alphanumeric
  str = str.replace(/[^a-zA-Z0-9 ]/g, "");
  return str;
}

// VNPay Payment Integration
app.post("/payment/vnpay", async (req, res) => {
  try {
    const { amount, orderInfo, bookingId } = req.body;

    // ... (Giữ nguyên phần validate của bạn) ...

    // Cấu hình VNPay
    const tmnCode = "Z7OOK2N9";
    const secretKey = "9V1X3R1SA0LRU0JQSE2Z741OYOMTFR4Z";
    const vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    const returnUrl = "http://localhost:3001/thanks";

    const date = new Date();
    const createDate = date
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const txnRef = `VNPAY_${bookingId}_${date.getTime()}`;

    // Xử lý IP
    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress;

    if (ipAddr && ipAddr.includes(",")) {
      ipAddr = ipAddr.split(",")[0];
    }

    const cleanOrderInfo = removeVietnameseTones(
      orderInfo || `Thanh toan don dat phong #${bookingId}`
    );

    let vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: cleanOrderInfo,
      vnp_OrderType: "other",
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // --- PHẦN QUAN TRỌNG ĐỂ FIX LỖI --- //

    // 1. Sắp xếp tham số theo thứ tự a-z
    vnpParams = sortObject(vnpParams);

    // 2. Tạo chuỗi dữ liệu (đã encode) để tạo chữ ký
    const crypto = require("crypto");
    let signData = "";

    // Dùng vòng lặp này để đảm bảo hash và url giống hệt nhau
    Object.keys(vnpParams).forEach((key) => {
      const value = vnpParams[key];
      // EncodeURIComponent quan trọng để biến http:// thành http%3A%2F%2F
      // Replace %20 thành + để đúng chuẩn dữ liệu form của VNPay
      const encodedValue = encodeURIComponent(value).replace(/%20/g, "+");

      if (signData) {
        signData += "&" + key + "=" + encodedValue;
      } else {
        signData = key + "=" + encodedValue;
      }
    });

    // 3. Tạo chữ ký (HMAC SHA512)
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // 4. Tạo URL thanh toán cuối cùng
    // Lưu ý: signData ở trên đã được encode chuẩn, nên nối trực tiếp vào URL
    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

    console.log("VNPay URL:", paymentUrl);

    return res.status(200).json({
      statusCode: 200,
      message: "Tạo URL thanh toán VNPay thành công",
      payUrl: paymentUrl,
      orderId: txnRef,
    });
  } catch (error) {
    console.error("Lỗi:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// Hàm sắp xếp object (Bắt buộc phải có)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(key);
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = obj[str[key]];
  }
  return sorted;
}

// VNPay IPN (Instant Payment Notification) Handler
app.get("/vnpay/ipn", (req, res) => {
  try {
    let vnpParams = req.query;
    const secureHash = vnpParams["vnp_SecureHash"];

    // Remove hash params for verification
    delete vnpParams["vnp_SecureHash"];
    delete vnpParams["vnp_SecureHashType"];

    // Sort parameters
    vnpParams = Object.keys(vnpParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = vnpParams[key];
        return acc;
      }, {});

    const secretKey = "9V1X3R1SA0LRU0JQSE2Z741OYOMTFR4Z";

    // Use querystring module like official VNPay example
    const querystring = require("qs");
    const signData = querystring.stringify(vnpParams, { encode: false });

    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      const orderId = vnpParams["vnp_TxnRef"];
      const rspCode = vnpParams["vnp_ResponseCode"];

      if (rspCode === "00") {
        // Payment successful - Update database
        console.log("VNPay payment successful:", orderId);

        // Extract booking ID and update status
        const bookingId = orderId.split("_")[1];
        // TODO: Call updatePaymentStatus or update database directly

        return res.status(200).json({ RspCode: "00", Message: "Success" });
      } else {
        console.log("VNPay payment failed:", orderId, rspCode);
        return res.status(200).json({ RspCode: "00", Message: "Success" });
      }
    } else {
      return res
        .status(200)
        .json({ RspCode: "97", Message: "Invalid signature" });
    }
  } catch (error) {
    console.error("VNPay IPN Error:", error);
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
});

// VNPay Return URL Handler (For user redirect)
app.get("/vnpay/return", (req, res) => {
  try {
    let vnpParams = req.query;
    const secureHash = vnpParams["vnp_SecureHash"];

    delete vnpParams["vnp_SecureHash"];
    delete vnpParams["vnp_SecureHashType"];

    vnpParams = Object.keys(vnpParams)
      .sort()
      .reduce((acc, key) => {
        acc[key] = vnpParams[key];
        return acc;
      }, {});

    const secretKey = "9V1X3R1SA0LRU0JQSE2Z741OYOMTFR4Z";

    // Use querystring module like official VNPay example
    const querystring = require("qs");
    const signData = querystring.stringify(vnpParams, { encode: false });

    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      const rspCode = vnpParams["vnp_ResponseCode"];

      // Redirect based on payment status
      if (rspCode === "00") {
        return res.redirect(
          `http://localhost:3001/thanks?status=success&gateway=vnpay`
        );
      } else {
        return res.redirect(
          `http://localhost:3001/thanks?status=failed&gateway=vnpay&code=${rspCode}`
        );
      }
    } else {
      return res.redirect(
        `http://localhost:3001/thanks?status=failed&gateway=vnpay&code=97`
      );
    }
  } catch (error) {
    console.error("VNPay Return Error:", error);
    return res.redirect(
      `http://localhost:3001/thanks?status=error&gateway=vnpay`
    );
  }
});

app.post("/BookingRoom", (req, res) => {
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

app.post("/checkExistingBooking", (req, res) => {
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

app.post("/updatePayUrl", (req, res) => {
  const { bookingId, payUrl } = req.body;

  // Validate input
  if (!bookingId || !payUrl) {
    return res.status(400).json({ message: "Dữ liệu không đầy đủ." });
  }

  // Validate bookingId is numeric
  if (isNaN(bookingId)) {
    return res.status(400).json({ message: "ID đơn đặt phòng không hợp lệ." });
  }

  // Validate payUrl format (basic URL validation)
  try {
    new URL(payUrl);
  } catch (error) {
    return res.status(400).json({ message: "URL thanh toán không hợp lệ." });
  }

  // First check if booking exists
  const checkQuery =
    "SELECT id_DatHomestay, TT_Thanhtoan FROM dat_homestay WHERE id_DatHomestay = ?";

  db.query(checkQuery, [bookingId], (checkErr, checkResults) => {
    if (checkErr) {
      console.error("Lỗi kiểm tra đơn đặt phòng:", checkErr);
      return res
        .status(500)
        .json({ message: "Lỗi máy chủ.", error: checkErr.message });
    }

    if (checkResults.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn đặt phòng." });
    }

    // Update payment URL
    const updateQuery = `
      UPDATE dat_homestay
      SET pay_url = ?
      WHERE id_DatHomestay = ?
    `;

    db.query(updateQuery, [payUrl, bookingId], (err, results) => {
      if (err) {
        console.error("Lỗi cập nhật URL thanh toán:", err);
        return res
          .status(500)
          .json({ message: "Lỗi máy chủ.", error: err.message });
      }

      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Không thể cập nhật URL thanh toán." });
      }

      return res.status(200).json({
        message: "Cập nhật URL thanh toán thành công.",
        bookingId: bookingId,
      });
    });
  });
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

// app.post("/callback", async (req, res) => {
//     console.log("callback:: ");
//     console.log(req.body); // Log thông tin callback từ MoMo

//     // Lấy thông tin từ request body
//     const { orderId, resultCode } = req.body;

//     try {
//         if (resultCode === 0) {  // Nếu thanh toán thành công (resultCode là 0)
//             // Cập nhật orderId vào bảng dat_homestay
//             await db.query(
//                 `UPDATE dat_homestay SET TT_Thanhtoan = 'Thanh toán thành công' , order_id = ? WHERE order_id IS NULL`,
//                 [orderId] // Chèn orderId vào cột order_id
//             );
//             console.log(`Cập nhật orderId thành công cho orderId: ${orderId}`);
//             return res.status(200).json({ message: "Cập nhật trạng thái: Thanh toán thành công." });
//         } else {
//             // Nếu thanh toán thất bại, không cần làm gì thêm (bỏ qua)
//             await db.query(
//                 `UPDATE dat_homestay SET TT_Thanhtoan = 'Thanh toán thất bại', order_id = ? WHERE order_id IS NULL`,
//                 [orderId] // Cập nhật orderId và trạng thái
//             );
//             console.log(`Thanh toán thất bại cho orderId: ${orderId}`);
//             return res.status(200).json({ message: "Thanh toán thất bại." });
//         }
//     } catch (error) {
//         console.error("Lỗi khi cập nhật orderId:", error.message);
//         return res.status(500).json({ message: "Lỗi khi xử lý callback từ MoMo." });
//     }
// });

// Kiểm tra trạng thái giao dịch

app.post("/callback", async (req, res) => {
  console.log("callback:: ");
  console.log(req.body); // Log thông tin callback từ MoMo

  // Lấy thông tin từ request body
  const { orderId, resultCode } = req.body;

  try {
    if (resultCode === 0) {
      // Nếu thanh toán thành công (resultCode là 0)
      // Cập nhật trạng thái và orderId vào bảng dat_homestay
      await db.query(
        `UPDATE dat_homestay 
                 SET TT_Thanhtoan = CASE 
                     WHEN id_HinhThuc_Coc = 2 THEN 'Đã thanh toán' 
                     ELSE 'Thanh toán thành công' 
                 END,
                 order_id = ? 
                 WHERE order_id IS NULL`,
        [orderId] // Chèn orderId vào cột order_id
      );
      console.log(`Cập nhật orderId thành công cho orderId: ${orderId}`);
      return res
        .status(200)
        .json({ message: "Cập nhật trạng thái: Thanh toán thành công." });
    } else {
      // Nếu thanh toán thất bại
      await db.query(
        `UPDATE dat_homestay 
                 SET TT_Thanhtoan = 'Thanh toán thất bại',
                 order_id = ? 
                 WHERE order_id IS NULL`,
        [orderId] // Cập nhật orderId và trạng thái
      );
      console.log(`Thanh toán thất bại cho orderId: ${orderId}`);
      return res.status(200).json({ message: "Thanh toán thất bại." });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật orderId:", error.message);
    return res.status(500).json({ message: "Lỗi khi xử lý callback từ MoMo." });
  }
});

app.post("/transaction-status", async (req, res) => {
  const { orderId } = req.body;
  const rawSignature = `accessKey=${accessKey}&orderId=${orderId}&partnerCode=MOMO&requestId=${orderId}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode: "MOMO",
    requestId: orderId,
    orderId,
    signature,
    language: "vi",
  });

  const options = {
    method: "POST",
    url: "https://test-payment.momo.vn/v2/gateway/api/query",
    headers: {
      "Content-type": "application/json",
      "Content-length": Buffer.byteLength(requestBody),
    },
    data: requestBody,
  };

  try {
    let result = await axios(options);
    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      statusCode: 500,
      message: "Lỗi khi kiểm tra trạng thái thanh toán",
    });
  }
});

// Hàm cập nhật trạng thái thanh toán trong cơ sở dữ liệu
async function updatePaymentStatus(orderId, status) {
  // Cập nhật trạng thái thanh toán vào cơ sở dữ liệu của bạn (ví dụ MongoDB, MySQL, v.v.)
  console.log(
    `Cập nhật trạng thái thanh toán của đơn hàng ${orderId}: ${status}`
  );
  // Ví dụ: await db.update({ orderId }, { status });
}
///////donhang///////////

/////////////////////////////////////////////////////////////////////////////////////////////
// Booking routes đã được chuyển sang /routes/homestay.routes.js
//lay voucher
app.get("/vouchers", (req, res) => {
  db.query("SELECT * FROM vouchers", (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi khi truy vấn dữ liệu" });
    }
    res.status(200).json(results); // Trả về tất cả các vouchers
  });
});
app.post("/add-voucher", function (req, res) {
  let data = req.body;
  let sql = `INSERT INTO vouchers SET?`;
  db.query(sql, data, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi thêm vouchers", err });
    else res.json({ thongbao: "Đã thêm vouchers thành công" });
  });
});

app.post("/check-voucher", (req, res) => {
  const { ma_voucher } = req.body;
  console.log(ma_voucher);

  // Kiểm tra mã voucher có được cung cấp không
  if (!ma_voucher) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng cung cấp mã voucher." });
  }

  // Truy vấn cơ sở dữ liệu
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
        giam_gia: voucher.giam_gia,
        ngay_het_han: voucher.ngay_het_han,
        so_luong: voucher.so_luong,
      },
    });
  });
});

// lấy user
app.get("/user", function (req, res) {
  db.query(`SELECT * FROM users; `, (err, data) => {
    if (err) res.json({ thongbao: "lỗi lấy user", err });
    else res.json(data);
  });
});

// Cấu hình lưu trữ file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads")); // Thư mục lưu trữ file
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Đặt tên file
  },
});
const upload = multer({ storage }); // Tạo middleware Multer
// Endpoint xử lý tải ảnh đại diện

app.post("/user/:id_user/avatar", upload.single("avatar"), (req, res) => {
  const userId = req.params.id_user;
  const avatarFile = req.file;

  if (!avatarFile) {
    return res.status(400).json({ thongbao: "Chưa tải lên file" });
  }

  // Lấy đường dẫn của file ảnh mới
  const newAvatarPath = `/uploads/${avatarFile.filename}`;
  const newAvatarFullPath = path.join(
    __dirname,
    "uploads",
    avatarFile.filename
  );

  // Truy vấn ảnh hiện tại trong cơ sở dữ liệu
  const sqlGetOldAvatar = `SELECT avatar FROM users WHERE id_user = ?`;
  db.query(sqlGetOldAvatar, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ thongbao: "Lỗi khi kiểm tra ảnh cũ", err });
    }

    // Lấy đường dẫn ảnh cũ
    const oldAvatarPath = result.length > 0 ? result[0].avatar : null;

    // Cập nhật ảnh mới vào database
    const sqlUpdateAvatar = `UPDATE users SET avatar = ? WHERE id_user = ?`;
    db.query(sqlUpdateAvatar, [newAvatarPath, userId], (err, result) => {
      if (err) {
        // Xóa ảnh mới nếu không cập nhật được database
        fs.unlink(newAvatarFullPath, (unlinkErr) => {
          if (unlinkErr) console.error("Không xóa được file mới:", unlinkErr);
        });
        return res
          .status(500)
          .json({ thongbao: "Lỗi khi cập nhật ảnh đại diện", err });
      }

      // Xóa ảnh cũ khỏi thư mục (nếu tồn tại)
      if (oldAvatarPath) {
        const oldAvatarFullPath = path.join(__dirname, oldAvatarPath);
        fs.unlink(oldAvatarFullPath, (unlinkErr) => {
          if (unlinkErr) console.error("Không xóa được file cũ:", unlinkErr);
        });
      }

      // Trả về đường dẫn ảnh mới
      res.json({ avatarPath: newAvatarPath });
    });
  });
});

// Đảm bảo phục vụ các ảnh tải lên dưới dạng tĩnh
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//lấy tất cả loaiHomestay
app.get("/loaihomestay", function (req, res) {
  let sql = `SELECT * FROM loai_homestay`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list homestay", err });
    else res.json(data);
  });
});

//lấy theo loại homestay
app.get("/loaihomestay", function (req, res) {
  let id_loai = parseInt(req.params.id_loai);
  if (isNaN(id_loai) || id_loai <= 0) {
    res.json({ thongbao: "Không biết loại", id_loai: id_loai });
    return;
  }
  let sql = `SELECT * FROM loai_homestay WHERE id_Loai =?`;
  db.query(sql, id_loai, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy  loai", err });
    else res.json(data[0]);
  });
});

// Homestay public routes đã được chuyển sang /routes/homestay.routes.js

// Xử lý form liên hệ
app.post("/contact", (req, res) => {
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

// Lấy tất cả đánh giá cho một homestay
app.get("/danhgia/:id_homestay", (req, res) => {
  const { id_homestay } = req.params;
  const sql = "SELECT * FROM danh_gia WHERE id_homestay = ?";
  db.query(sql, [id_homestay], (err, results) => {
    if (err) {
      console.error("Lỗi khi lấy đánh giá:", err);
      return res.status(500).json({ thongbao: "Đã có lỗi khi lấy đánh giá" });
    }
    res.json(results);
  });
});

// Thêm một đánh giá
app.post("/danhgia", (req, res) => {
  const { id_homestay, ten_user, noi_dung, sao } = req.body;
  if (!id_homestay || !ten_user || !noi_dung || !sao) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng điền đầy đủ các trường" });
  }
  const sql =
    "INSERT INTO danh_gia (id_homestay, ten_user, noi_dung, sao) VALUES (?, ?, ?, ?)";
  db.query(sql, [id_homestay, ten_user, noi_dung, sao], (err) => {
    if (err) {
      console.error("Lỗi khi thêm đánh giá:", err);
      return res.status(500).json({ thongbao: "Đã có lỗi khi thêm đánh giá" });
    }
    res.json({ thongbao: "Đánh giá đã được thêm thành công" });
  });
});

// Cập nhật một đánh giá
app.put("/danhgia/:id", (req, res) => {
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

// Xóa một đánh giá
app.delete("/danhgia/:id", (req, res) => {
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

// Đăng ký, Đăng nhập
app.post("/Register", (req, res) => {
  let { ten_user, sdt_user, pass_user, email_user } = req.body; // Chỉ nhận các trường cần thiết
  let sql = `
        INSERT INTO users (ten_user, sdt_user, pass_user, email_user, role_id)
        VALUES (?,?, ?, ?, 2)
    `;

  db.query(sql, [ten_user, sdt_user, pass_user, email_user], (err, result) => {
    if (err) {
      console.error("Error:", err);
      return res.status(400).json({ thongbao: "Tài khoản đã tồn tại", err });
    } else {
      res.json({ thongbao: "Tạo tài khoản thành công", result });
    }
  });
});

//dung
// app.post('/login', (req, res) => {
//     const { email_user, pass_user } = req.body;

//     // Kiểm tra dữ liệu đầu vào
//     if (!email_user || !pass_user ) {
//         return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
//     }

//     // SQL query để tìm người dùng theo email
//     const sql = 'SELECT * FROM users WHERE email_user = ?';
//     db.query(sql, [email_user], (err, results) => {
//         if (err) {
//             return res.status(500).json({ message: 'Có lỗi xảy ra', err });
//         }

//         if (results.length === 0) {
//             return res.status(401).json({ message: 'Email không tồn tại hoặc không chính xác!' });
//         }

//         const user = results[0];

//         if (pass_user !== user.pass_user) {
//             return res.status(401).json({ message: 'Mật khẩu không chính xác!' });
//         }

//         // Kiểm tra vai trò (role_id) của người dùng
//         if (user.role_id === 1) {
//             // Người dùng bình thường
//             res.status(200).json({
//                 message: 'Đăng nhập thành công',
//                 user: {
//                     id_user: user.id_user,
//                     ten_user: user.ten_user,
//                     email_user: user.email_user,
//                     sdt_user: user.sdt_user,
//                     role_id: user.role_id,
//                     redirectTo: '/'  // Đường dẫn cho người dùng
//                 }
//             });
//         } else if (user.role_id === 2) {
//             // Quản trị viên
//             res.status(200).json({
//                 message: 'Đăng nhập thành công với quyền admin',
//                 user: {
//                     id: user.id_user,
//                     name: user.ten_user,
//                     email: user.email_user,
//                     dien_thoai: user.sdt_user,
//                     role: user.role_id,
//                     redirectTo: '/admin'  // Đường dẫn cho quản trị viên
//                 }
//             });
//         } else {
//             // Vai trò không xác định
//             res.status(403).json({ message: 'Vai trò người dùng không xác định' });
//         }
//     });
// });

app.post("/login", (req, res) => {
  const { email_user, pass_user } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!email_user || !pass_user) {
    return res.status(400).json({ message: "Email và mật khẩu là bắt buộc" });
  }

  // SQL query để tìm người dùng theo email
  const sql = "SELECT * FROM users WHERE email_user = ?";
  db.query(sql, [email_user], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Có lỗi xảy ra", err });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ message: "Email không tồn tại hoặc không chính xác!" });
    }

    const user = results[0];

    // Kiểm tra mật khẩu
    if (pass_user !== user.pass_user) {
      return res.status(401).json({ message: "Mật khẩu không chính xác!" });
    }

    // Logic xử lý dựa trên role
    let redirectTo = "/";
    let roleDescription = "";

    if (user.role_id === 0) {
      // ADMIN
      redirectTo = "/admin";
      roleDescription = "Quản trị viên";
    } else if (user.role_id === 1) {
      // STAFF
      redirectTo = "/staff";
      roleDescription = "Nhân viên";
    } else if (user.role_id === 2) {
      // USER
      redirectTo = "/";
      roleDescription = "Người dùng";
    } else {
      // Vai trò không hợp lệ
      return res
        .status(403)
        .json({ message: "Vai trò người dùng không xác định" });
    }

    // Trả về phản hồi
    res.status(200).json({
      message: `Đăng nhập thành công với vai trò ${roleDescription}`,
      user: {
        id_user: user.id_user,
        ten_user: user.ten_user,
        email_user: user.email_user,
        sdt_user: user.sdt_user,
        role: user.role_id,
        redirectTo: redirectTo,
      },
    });
  });
});

//thay dỏi pass
app.post("/change-password/:id", (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;
  const id_user = req.params.id; // Lấy id_user từ tham số URL

  // Kiểm tra dữ liệu đầu vào
  if (!old_password || !new_password || !confirm_password) {
    return res
      .status(400)
      .json({ message: "Vui lòng cung cấp đầy đủ thông tin." });
  }

  // Kiểm tra mật khẩu mới và mật khẩu nhập lại
  if (new_password !== confirm_password) {
    return res
      .status(400)
      .json({ message: "Mật khẩu mới và mật khẩu nhập lại không khớp." });
  }

  // SQL query để lấy thông tin người dùng dựa vào id_user
  const sql = "SELECT * FROM users WHERE id_user = ?";
  db.query(sql, [id_user], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Có lỗi xảy ra khi truy vấn dữ liệu.", err });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy người dùng." });
    }

    const user = results[0];

    // Kiểm tra mật khẩu cũ có khớp không
    if (old_password !== user.pass_user) {
      return res.status(401).json({ message: "Mật khẩu cũ không chính xác." });
    }

    // SQL query để cập nhật mật khẩu mới
    const updateSql = "UPDATE users SET pass_user = ? WHERE id_user = ?";
    db.query(updateSql, [new_password, id_user], (updateErr, updateResult) => {
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

      // Trả về thông báo thành công
      res.status(200).json({ message: "Đổi mật khẩu thành công." });
    });
  });
});

app.post("/user", async (req, res) => {
  try {
    const { id, ...updatedData } = req.body;

    // Tìm người dùng theo id và cập nhật thông tin
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Người dùng không tồn tại" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Có lỗi xảy ra:", error);
    res.status(500).json({ error: "Lỗi máy chủ" });
  }
});

app.get("/user", function (req, res) {
  let sql = `SELECT * FROM users`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗii lấy list user", err });
    else res.json(data);
  });
});

app.get("/user/:id", function (req, res) {
  const userId = req.params.id; // Lấy id từ tham số URL

  // Truy vấn thông tin người dùng theo id
  let sql = `SELECT * FROM users WHERE id_user = ?`; // Dùng tham số để tránh SQL Injection
  db.query(sql, [userId], (err, data) => {
    if (err) {
      // Nếu có lỗi khi truy vấn
      return res
        .status(500)
        .json({ thongbao: "Lỗi khi lấy thông tin người dùng", err });
    }

    if (data.length === 0) {
      // Nếu không tìm thấy người dùng với id tương ứng
      return res.status(404).json({ thongbao: "Người dùng không tìm thấy" });
    }

    // Lấy thông tin người dùng
    const user = data[0];

    // Kiểm tra avatar và gán giá trị mặc định nếu không có avatar
    const avatar = user.avatar || "../../image/user2.png"; // Gán avatar mặc định nếu không có
    // Kiểm tra từng trường và gán "Chưa cập nhật" nếu trường đó không có giá trị
    const userData = {
      id_user: user.id_user || "Chưa cập nhật",
      ten_user: user.ten_user || "Chưa cập nhật",
      sdt_user: user.sdt_user || "Chưa cập nhật",
      email_user: user.email_user || "Chưa cập nhật",
      address: user.address || "Chưa cập nhật",
      gender: user.gender || "Chưa cập nhật",
      dob: user.dob || "Chưa cập nhật",
      old_password: user.old_passwordb || "Chưa cập nhật",
      new_password: user.new_password || "Chưa cập nhật",
      confirm_password: user.confirm_password || "Chưa cập nhật",
      avatar: avatar, // Thêm avatar vào dữ liệu người dùng
    };

    // Trả về thông tin người dùng đã xử lý
    res.json({ user: userData });
  });
});

app.put("/user/:id", function (req, res) {
  const userId = req.params.id; // Lấy id người dùng từ URL
  let { ten_user, sdt_user, email_user, address, gender, dob } = req.body; // Lấy dữ liệu từ body

  // Kiểm tra và nếu không có giá trị thì gán thành chuỗi rỗng
  ten_user = ten_user || "";
  sdt_user = sdt_user || "";
  email_user = email_user || "";
  address = address || "";
  gender = gender || "";
  dob = dob || "";

  // Kiểm tra xem các trường bắt buộc có tồn tại hay không
  // if (!ten_user || !sdt_user || !email_user || !address || !gender || !dob) {
  //   return res.status(400).json({ "thongbao": "Vui lòng cung cấp đầy đủ thông tin để cập nhật" });
  // }

  // Cập nhật thông tin người dùng trong cơ sở dữ liệu
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

  // Thực thi câu lệnh SQL
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

      // Trả về thông báo thành công
      res.json({ thongbao: "Cập nhật thông tin người dùng thành công" });
    }
  );
});

// API kiểm tra email
app.post("/check-email", (req, res) => {
  const { email } = req.body;

  const query = "SELECT * FROM users WHERE email_user = ?";
  db.query(query, [email], (err, results) => {
    if (err) {
      console.error("Lỗi truy vấn:", err);
      return res.status(500).json({ error: "Lỗi server" });
    }

    if (results.length > 0) {
      // Nếu tìm thấy email trong cơ sở dữ liệu
      return res.json({ exists: true });
    } else {
      // Nếu không tìm thấy email
      return res.json({ exists: false });
    }
  });
});

//đặt mật khẩu mới
app.post("/reset-password", (req, res) => {
  const { email_user, phone_number, new_password } = req.body;

  // Kiểm tra nếu thiếu dữ liệu
  if (!email_user || !phone_number || !new_password) {
    return res.status(400).json({ message: "*Thiếu dữ liệu*" });
  }

  // Tìm người dùng dựa trên email và số điện thoại
  const sqlSelect = "SELECT * FROM users WHERE email_user = ? AND sdt_user = ?";
  db.query(sqlSelect, [email_user, phone_number], (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm người dùng:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "Email hoặc số điện thoại không đúng" });
    }

    // Cập nhật mật khẩu mới
    const sqlUpdate =
      "UPDATE users SET pass_user = ? WHERE email_user = ? AND sdt_user = ?";
    db.query(sqlUpdate, [new_password, email_user, phone_number], (err) => {
      if (err) {
        console.error("Lỗi khi cập nhật mật khẩu:", err);
        return res.status(500).json({ message: "Lỗi khi cập nhật mật khẩu" });
      }

      res.status(200).json({ message: "Cập nhật mật khẩu thành công" });
    });
  });
});

///////////////////////////////ADMIN////////////////////////////////////
// Admin homestay routes đã được chuyển sang /routes/admin-homestay.routes.js

// show loại homestay trong admin
app.get("/admin/loai", function (req, res) {
  let sql = `SELECT * FROM loai_homestay`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list sp", err });
    else res.json(data);
  });
});

//định nghĩa route lấy chi tiết 1 loại homestay trong admin
app.get("/admin/loai/:id", function (req, res) {
  let id = parseInt(req.params.id);
  if (id <= 0) {
    res.json({ thongbao: "Không tìm thấy sản phẩm", id: id });
    return;
  }
  let sql = `SELECT * FROM loai_homestay WHERE id_Loai = ?`;
  db.query(sql, id, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy 1 sp", err });
    else res.json(data[0]);
  });
});
//Định nghĩa route thêm loại
app.post("/admin/loai", function (req, res) {
  let data = req.body;
  let sql = `INSERT INTO loai_homestay SET?`;
  db.query(sql, data, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi thêm sản phẩm", err });
    else
      res.json({
        thongbao: "Đã thêm sản phẩm thành công",
        id_sp: data.insertId,
      });
  });
});

//định nghĩa route sửa loại homestay
app.put("/admin/loai/:id", function (req, res) {
  let id = req.params.id;
  let data = req.body;
  let sql = `UPDATE loai_homestay SET? WHERE id_Loai =?`;
  db.query(sql, [data, id], (err, d) => {
    if (err) res.json({ thongbao: "Lỗi sửa sản phẩm", err });
    else res.json({ thongbao: "Đã sửa sản phẩm thành công" });
  });
});

//định nghĩa route xóa loại homestay
app.delete("/admin/loai/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM loai_homestay WHERE id_Loai =?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});

//////////////////////////////////////SEARCH//////////////////////////////
// Search homestay đã được chuyển sang /routes/homestay.routes.js với endpoint /homestay/search

app.get("/search_loai", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  // Truy vấn SQL để tìm kiếm sản phẩm theo tên hoặc mô tả
  const sql = `
  SELECT * FROM loai_homestay
  WHERE Ten_Loai LIKE ? OR Mo_Ta LIKE ?
`;
  // Sử dụng câu lệnh SQL với các tham số an toàn
  db.query(sql, [`%${query}%`, `%${query}%`], (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm kiếm:", err);
      return res.status(500).send("Lỗi server");
    }
    res.json(results);
  });
});

app.get("/search_nhanvien", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  // Truy vấn SQL để tìm kiếm sản phẩm theo tên hoặc mô tả
  const sql = `
  SELECT * FROM users
  WHERE ten_user LIKE ? OR email_user LIKE ? OR sdt_user LIKE ? AND role_id = 1
`;
  // Sử dụng câu lệnh SQL với các tham số an toàn
  db.query(sql, [`%${query}%`, `%${query}%`], (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm kiếm:", err);
      return res.status(500).send("Lỗi server");
    }
    res.json(results);
  });
});

app.get("/search_donhang", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  // Truy vấn SQL để tìm kiếm đơn hàng theo tên user hoặc theo tên Homestay
  const sql = `
   SELECT 
            h.ten_homestay,
            u.ten_user,
            u.sdt_user,
            u.email_user
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            u.ten_user LIKE ? OR h.ten_homestay LIKE ?
            OR u.sdt_user LIKE ? OR u.email_user LIKE ?
`;
  // Sử dụng câu lệnh SQL với các tham số an toàn
  db.query(
    sql,
    [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi tìm kiếm:", err);
        return res.status(500).send("Lỗi server");
      }
      res.json(results);
    }
  );
});

app.get("/search_chuadatcoc", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  // Truy vấn SQL để tìm kiếm đơn hàng theo tên user hoặc theo tên Homestay
  const sql = `
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            (u.ten_user LIKE ? OR h.ten_homestay LIKE ?
            OR u.sdt_user LIKE ? OR u.email_user LIKE ?)
            AND dh.TT_Thanhtoan = "chưa đặt cọc"
        ORDER BY 
            dh.id_DatHomestay DESC 
           
`;
  // Sử dụng câu lệnh SQL với các tham số an toàn
  db.query(
    sql,
    [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi tìm kiếm:", err);
        return res.status(500).send("Lỗi server");
      }
      res.json(results);
    }
  );
});

app.get("/search_dadatcoc", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  // Truy vấn SQL để tìm kiếm đơn hàng theo tên user hoặc theo tên Homestay
  const sql = `
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            (u.ten_user LIKE ? OR h.ten_homestay LIKE ?
            OR u.sdt_user LIKE ? OR u.email_user LIKE ?)
            AND dh.TT_Thanhtoan = "đã đặt cọc"
        ORDER BY 
            dh.id_DatHomestay DESC 
           
`;
  // Sử dụng câu lệnh SQL với các tham số an toàn
  db.query(
    sql,
    [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi tìm kiếm:", err);
        return res.status(500).send("Lỗi server");
      }
      res.json(results);
    }
  );
});

app.get("/search_dathanhtoan", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");
  // Truy vấn SQL để tìm kiếm đơn hàng theo tên user hoặc theo tên Homestay
  const sql = `
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
        FROM 
            dat_homestay AS dh
        JOIN 
            homestay AS h 
        ON 
            dh.id_homestay = h.id_homestay
        JOIN 
            users AS u 
        ON 
            dh.id_user = u.id_user
        WHERE 
            (u.ten_user LIKE ? OR h.ten_homestay LIKE ?
            OR u.sdt_user LIKE ? OR u.email_user LIKE ?)
            AND dh.TT_Thanhtoan = "đã thanh toán"
        ORDER BY 
            dh.id_DatHomestay DESC 
           
`;
  // Sử dụng câu lệnh SQL với các tham số an toàn
  db.query(
    sql,
    [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`],
    (err, results) => {
      if (err) {
        console.error("Lỗi khi tìm kiếm:", err);
        return res.status(500).send("Lỗi server");
      }
      res.json(results);
    }
  );
});

//////////////////////////////////////SEARCH END//////////////////////////////
//////////////////////////////////////DICH VU HEAD//////////////////////////////
//show
app.get("/dichvu", (req, res) => {
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

//Xóa
app.delete("/xoadichvu/:id", (req, res) => {
  const { id } = req.params;

  // Truy vấn SQL để xóa dịch vụ
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
//////////////////////////////////////DICH VU END//////////////////////////////

// ////////NHAVIEN///////////////////////////////////////////////////////////////////////////////
//chi lay role 1
app.get("/admin/nhanvien/role", function (req, res) {
  let sql = `SELECT * FROM users WHERE role_id = 1`; // Lọc chỉ người dùng có role_id = 1
  db.query(sql, (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy list user", err });
    } else {
      res.json(data);
    }
  });
});
app.get("/admin/nhanvien", function (req, res) {
  let sql = `SELECT * FROM users`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗii lấy list user", err });
    else res.json(data);
  });
});

app.get("/admin/nhanvien/:id", function (req, res) {
  let id = parseInt(req.params.id);
  if (id <= 0) {
    res.json({ thongbao: "Không tìm thấy sản phẩm", id: id });
    return;
  }
  let sql = `SELECT * FROM users WHERE id_user = ?`;
  db.query(sql, id, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy 1 sp", err });
    else res.json(data[0]);
  });
});

//định nghĩa route sửa loại homestay
app.put("/admin/nhanvien/:id", function (req, res) {
  let id = req.params.id;
  let data = req.body;
  let sql = `UPDATE users SET? WHERE id_user =?`;
  db.query(sql, [data, id], (err, d) => {
    if (err) res.json({ thongbao: "Lỗi sửa sản phẩm", err });
    else res.json({ thongbao: "Đã sửa sản phẩm thành công" });
  });
});

//định nghĩa route xóa loại homestay
app.delete("/admin/nhanvien/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM users WHERE id_user =?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});
app.post("/admin/nhanvien", function (req, res) {
  // Lấy dữ liệu từ body của request
  const { ten_user, email_user, sdt_user, pass_user, role_id } = req.body; // Thay đổi từ 'password' thành 'pass_user'

  // Kiểm tra dữ liệu nhập vào
  if (!ten_user || !email_user || !sdt_user) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng điền đầy đủ thông tin người dùng!" });
  }

  // Gán giá trị mặc định nếu không có pass_user hoặc role_id
  const finalPassword = pass_user || "0000"; // Mật khẩu mặc định là '0000' nếu không có pass_user
  const finalRoleId = role_id || 1; // Vai trò mặc định là 1 nếu không có role_id

  // SQL query để thêm người dùng vào cơ sở dữ liệu
  let sql = `INSERT INTO users (ten_user, email_user, sdt_user, pass_user, role_id) 
               VALUES (?, ?, ?, ?, ?)`; // Thay 'password' thành 'pass_user'

  // Thực hiện truy vấn để thêm người dùng mới
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

      // Nếu thêm thành công, trả về thông báo
      res
        .status(201)
        .json({ thongbao: "Thêm người dùng thành công!", data: result });
    }
  );
});
// Endpoint POST để thêm nhanvien///////////////////////////////////////////////////////////////////////////////
//chi lay role 1
app.get("/admin/user/role", function (req, res) {
  let sql = `SELECT * FROM users WHERE role_id = 2`; // Lọc chỉ người dùng có role_id = 1
  db.query(sql, (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy list user", err });
    } else {
      res.json(data);
    }
  });
});
app.get("/admin/user", function (req, res) {
  let sql = `SELECT * FROM users`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗii lấy list user", err });
    else res.json(data);
  });
});

app.get("/admin/user/:id", function (req, res) {
  let id = parseInt(req.params.id);
  if (id <= 0) {
    res.json({ thongbao: "Không tìm thấy sản phẩm", id: id });
    return;
  }
  let sql = `SELECT * FROM users WHERE id_user = ?`;
  db.query(sql, id, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy 1 sp", err });
    else res.json(data[0]);
  });
});

//định nghĩa route sửa loại homestay
app.put("/admin/user/:id", function (req, res) {
  let id = req.params.id;
  let data = req.body;
  let sql = `UPDATE users SET? WHERE id_user =?`;
  db.query(sql, [data, id], (err, d) => {
    if (err) res.json({ thongbao: "Lỗi sửa sản phẩm", err });
    else res.json({ thongbao: "Đã sửa sản phẩm thành công" });
  });
});

//định nghĩa route xóa loại homestay
app.delete("/admin/user/:id", function (req, res) {
  let id = req.params.id;
  let sql = `DELETE FROM users WHERE id_user =?`;
  db.query(sql, id, (err, d) => {
    if (err) res.json({ thongbao: "Lỗi xóa sản phẩm", err });
    else res.json({ thongbao: "Đã xóa sản phẩm thành công" });
  });
});

app.post("/admin/user", function (req, res) {
  // Lấy dữ liệu từ body của request
  const { ten_user, email_user, sdt_user, pass_user, role_id } = req.body; // Thay đổi từ 'password' thành 'pass_user'

  // Kiểm tra dữ liệu nhập vào
  if (!ten_user || !email_user || !sdt_user) {
    return res
      .status(400)
      .json({ thongbao: "Vui lòng điền đầy đủ thông tin người dùng!" });
  }

  // Gán giá trị mặc định nếu không có pass_user hoặc role_id
  const finalPassword = pass_user || "0000"; // Mật khẩu mặc định là '0000' nếu không có pass_user
  const finalRoleId = role_id || 2; // Vai trò mặc định là 1 nếu không có role_id

  // SQL query để thêm người dùng vào cơ sở dữ liệu
  let sql = `INSERT INTO users (ten_user, email_user, sdt_user, pass_user, role_id) 
               VALUES (?, ?, ?, ?, ?)`; // Thay 'password' thành 'pass_user'

  // Thực hiện truy vấn để thêm người dùng mới
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

      // Nếu thêm thành công, trả về thông báo
      res
        .status(201)
        .json({ thongbao: "Thêm người dùng thành công!", data: result });
    }
  );
});
//định nghĩa route ds User//////////////////////////////////////////////////////////////////////////////////////

// Lấy danh sách bài viết
app.get("/baiviet", (req, res) => {
  db.query("SELECT * FROM baiviet ORDER BY id DESC", (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

app.get("/baiviet/:id", (req, res) => {
  const { id } = req.params; // Lấy id từ URL
  const query = "SELECT * FROM baiviet WHERE id = ?"; // Câu truy vấn lấy bài viết theo id
  db.query(query, [id], (err, result) => {
    if (err) {
      res.status(500).json({ error: "Database query error" }); // Xử lý lỗi
      throw err;
    }
    if (result.length === 0) {
      res.status(404).json({ message: "Bài viết không tồn tại" }); // Xử lý khi không tìm thấy bài viết
    } else {
      res.json(result[0]); // Trả về bài viết đầu tiên (theo logic)
    }
  });
});

app.post("/baiviet", upload.single("image"), (req, res) => {
  const { title, content, author, publish_date } = req.body;
  const image_url = req.file
    ? `http://localhost:3000/uploads/${req.file.filename}`
    : ""; // Lấy URL của ảnh tải lên

  const query =
    "INSERT INTO baiviet (title, content, author, publish_date, image_url) VALUES (?, ?, ?, ?, ?)";

  db.query(
    query,
    [title, content, author, publish_date, image_url],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Có lỗi khi thêm bài viết!" });
      }
      res.status(201).json({
        id: result.insertId,
        title,
        content,
        author,
        publish_date,
        image_url,
      });
    }
  );
});

// Sửa bài viết
app.put("/baiviet/:id", upload.single("image"), (req, res) => {
  const { title, content, author, publish_date } = req.body;

  // Mặc định giữ ảnh cũ nếu không có ảnh mới
  let newImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  // Lấy thông tin bài viết hiện tại để xác định ảnh cũ
  const queryGetOldImage = `SELECT image_url FROM baiviet WHERE id = ?`;
  db.query(queryGetOldImage, [req.params.id], (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Lỗi khi lấy thông tin bài viết!" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Bài viết không tồn tại!" });
    }

    const oldImagePath = results[0].image_url
      ? path.join(
          __dirname,
          results[0].image_url.replace("http://localhost:3000/", "")
        )
      : null;

    // Đường dẫn ảnh mới hoặc giữ nguyên ảnh cũ nếu không tải lên
    const image_url = newImagePath
      ? `http://localhost:3000${newImagePath}`
      : results[0].image_url;

    // Cập nhật bài viết với thông tin mới
    const queryUpdate = `
            UPDATE baiviet
            SET title = ?, content = ?, author = ?, publish_date = ?, image_url = ?
            WHERE id = ?
        `;
    db.query(
      queryUpdate,
      [title, content, author, publish_date, image_url, req.params.id],
      (err, result) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ message: "Lỗi khi cập nhật bài viết!" });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Bài viết không tồn tại!" });
        }

        // Xóa ảnh cũ nếu có ảnh mới được tải lên
        if (newImagePath && oldImagePath) {
          fs.unlink(oldImagePath, (unlinkErr) => {
            if (unlinkErr) console.error("Không thể xóa ảnh cũ:", unlinkErr);
          });
        }

        // Trả về bài viết đã cập nhật
        res.status(200).json({
          id: req.params.id,
          title,
          content,
          author,
          publish_date,
          image_url,
        });
      }
    );
  });
});

// Xóa bài viết
app.delete("/baiviet/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM baiviet WHERE id = ?", [id], (err) => {
    if (err) throw err;
    res.status(204).send();
  });
});

app.get("/api/articles", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 4;
  const offset = (page - 1) * pageSize;

  db.query("SELECT COUNT(*) AS total FROM baiviet", (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Lỗi truy vấn tổng số bài viết" });
    }

    const total = result[0].total;
    const totalPages = Math.ceil(total / pageSize);

    // Truy vấn bài viết, sắp xếp theo publish_date giảm dần
    db.query(
      "SELECT * FROM baiviet ORDER BY publish_date DESC LIMIT ?, ?",
      [offset, pageSize],
      (err, articles) => {
        if (err) {
          return res.status(500).json({ error: "Lỗi truy vấn bài viết" });
        }

        res.json({
          articles,
          currentPage: page,
          totalPages,
        });
      }
    );
  });
});

app.get("/api/articles/:slug", (req, res) => {
  const slug = req.params.slug;

  if (!slug) {
    return res.status(400).json({ error: "Slug không hợp lệ" });
  }

  db.query("SELECT * FROM baiviet WHERE slug = ?", [slug], (err, result) => {
    if (err) {
      console.error("Lỗi truy vấn bài viết:", err);
      return res.status(500).json({ error: "Lỗi truy vấn bài viết" });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Bài viết không tồn tại" });
    }

    res.json(result[0]); // Trả về bài viết chi tiết
  });
});
// API để lấy 5 bài viết mới nhất
app.get("/baivietmoi", (req, res) => {
  db.query(
    "SELECT * FROM baiviet ORDER BY publish_date DESC LIMIT 4",
    (err, result) => {
      if (err) throw err;
      res.json(result);
    }
  );
});

// Endpoint để lấy bài viết liên quan đến tác giả
app.get("/post_lienquan", (req, res) => {
  const { author } = req.query; // Lấy tên tác giả từ query

  if (!author) {
    return res.status(400).json({ error: "Author is required" });
  }

  // Truy vấn SQL để lọc bài viết theo tác giả
  const query = "SELECT * FROM baiviet WHERE author = ? ORDER BY id DESC";
  db.query(query, [author], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(result); // Trả về danh sách bài viết liên quan đến tác giả
  });
});
///////////////////////////////ADMIN////////////////////////////////////
// app.listen(3000, () => console.log("ung dung chay voi port 3000"))
const port = 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
