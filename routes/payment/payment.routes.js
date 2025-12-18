const express = require("express");
const router = express.Router();
const db = require("../../DB"); // Check lại đường dẫn DB của ông
const axios = require("axios");
const crypto = require("crypto");
const querystring = require("qs");
require("dotenv").config();

// ==================== CONFIGURATION ====================
const accessKey = process.env.MOMO_ACCESS_KEY;
const secretKey = process.env.MOMO_SECRET_KEY;

const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE;
const VNPAY_SECRET_KEY = process.env.VNPAY_SECRET_KEY;
const VNPAY_URL = process.env.VNPAY_URL;
const VNPAY_RETURN_URL_FE = "http://localhost:3001/thanks"; // URL Frontend trang cảm ơn

// ==================== HELPER FUNCTIONS ====================

// 1. Hàm sắp xếp object (Bắt buộc của VNPAY)
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
    // Encode value để tránh lỗi ký tự đặc biệt
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

// 2. Hàm format ngày giờ chuẩn VNPAY (Thay thế moment)
// Output: YYYYMMDDHHmmss
function dateFormat(date) {
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);
    const seconds = ("0" + date.getSeconds()).slice(-2);
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// ==================== MOMO PAYMENT (Giữ nguyên) ====================
// ... (Code MoMo cũ của ông ở đây, tui lược bớt cho ngắn, ông giữ nguyên nhé) ...
router.post("/momo", async (req, res) => {
    // Logic Momo giữ nguyên
    return res.status(400).json({message: "MoMo chưa cấu hình trong bản này"});
});

// ==================== VNPAY PAYMENT (JS THUẦN) ====================

// 1. TẠO URL THANH TOÁN
router.post("/vnpay", (req, res) => {
  try {
    const { amount, bookingId } = req.body;
    
    // Lấy IP
    let ipAddr = req.headers["x-forwarded-for"] ||
                 req.connection.remoteAddress ||
                 req.socket.remoteAddress ||
                 "127.0.0.1";

    const date = new Date();
    const createDate = dateFormat(date); // YYYYMMDDHHmmss
    
    // Mã đơn hàng: VNPAY_BookingID_Timestamp (Đảm bảo duy nhất)
    const orderId = `VNPAY_${bookingId}_${date.getTime()}`; 
    
    // Config tham số
    let vnp_Params = {};
    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = VNPAY_TMN_CODE;
    vnp_Params["vnp_Locale"] = "vn";
    vnp_Params["vnp_CurrCode"] = "VND";
    vnp_Params["vnp_TxnRef"] = orderId;
    vnp_Params["vnp_OrderInfo"] = `Thanh toan hoa don #${bookingId}`;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = amount * 100; // x100 theo quy định VNPAY
    vnp_Params["vnp_ReturnUrl"] = VNPAY_RETURN_URL_FE; 
    vnp_Params["vnp_IpAddr"] = ipAddr;
    vnp_Params["vnp_CreateDate"] = createDate;

    // Sắp xếp
    vnp_Params = sortObject(vnp_Params);

    // Tạo chuỗi ký
    let signData = "";
    Object.keys(vnp_Params).forEach((key) => {
        if(signData) {
            signData += "&" + key + "=" + vnp_Params[key];
        } else {
            signData = key + "=" + vnp_Params[key];
        }
    });

    // Ký HMAC SHA512
    let hmac = crypto.createHmac("sha512", VNPAY_SECRET_KEY);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // Thêm chữ ký
    vnp_Params["vnp_SecureHash"] = signed;
    
    // URL cuối cùng
    let paymentUrl = VNPAY_URL + "?" + signData + "&vnp_SecureHash=" + signed;

    return res.status(200).json({
      statusCode: 200,
      message: "Tạo URL thành công",
      payUrl: paymentUrl,
    });

  } catch (error) {
    console.error("Lỗi tạo URL:", error);
    return res.status(500).json({ message: "Lỗi Server" });
  }
});

// 2. IPN (Instant Payment Notification) - Cập nhật Database
router.get("/vnpay/ipn", (req, res) => {
  try {
    let vnp_Params = req.query;
    let secureHash = vnp_Params["vnp_SecureHash"];

    // Xóa hash cũ để check lại
    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    // Sắp xếp lại
    vnp_Params = sortObject(vnp_Params);

    // Tạo chuỗi ký
    let signData = "";
    Object.keys(vnp_Params).forEach((key) => {
        if(signData) {
            signData += "&" + key + "=" + vnp_Params[key];
        } else {
            signData = key + "=" + vnp_Params[key];
        }
    });

    // Hash lại
    let hmac = crypto.createHmac("sha512", VNPAY_SECRET_KEY);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // So sánh chữ ký
    if (secureHash === signed) {
      const rspCode = vnp_Params["vnp_ResponseCode"];
      
      // Tách lấy Booking ID từ chuỗi VNPAY_123_1739...
      const orderIdParts = vnp_Params["vnp_TxnRef"].split("_");
      const bookingId = orderIdParts[1]; 

      if (rspCode === "00") {
        // --- UPDATE DATABASE ---
        console.log("Thanh toán thành công Booking:", bookingId);
        
        const sql = `UPDATE dat_homestay 
                     SET TT_Thanhtoan = 'Đã thanh toán', 
                         pay_url = 'VNPAY',
                         order_id = ? 
                     WHERE id_DatHomestay = ?`;
                     
        db.query(sql, [vnp_Params["vnp_TxnRef"], bookingId], (err, result) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(200).json({ RspCode: "99", Message: "DB Error" });
            }
            return res.status(200).json({ RspCode: "00", Message: "Success" });
        });
      } else {
        console.log("Thanh toán thất bại Booking:", bookingId);
        return res.status(200).json({ RspCode: "00", Message: "Success" });
      }
    } else {
      return res.status(200).json({ RspCode: "97", Message: "Fail checksum" });
    }
  } catch (error) {
    console.error("IPN Error:", error);
    return res.status(200).json({ RspCode: "99", Message: "Unknown Error" });
  }
});

// 3. RETURN URL (Điều hướng Frontend)
router.get("/vnpay/return", (req, res) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params["vnp_SecureHash"];

    delete vnp_Params["vnp_SecureHash"];
    delete vnp_Params["vnp_SecureHashType"];

    vnp_Params = sortObject(vnp_Params);

    let signData = "";
    Object.keys(vnp_Params).forEach((key) => {
        if(signData) {
            signData += "&" + key + "=" + vnp_Params[key];
        } else {
            signData = key + "=" + vnp_Params[key];
        }
    });

    let hmac = crypto.createHmac("sha512", VNPAY_SECRET_KEY);
    let signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
        if(vnp_Params['vnp_ResponseCode'] === "00") {
             // Thành công -> Về trang Cảm ơn
             return res.redirect(`${VNPAY_RETURN_URL_FE}?status=success&gateway=vnpay&code=${vnp_Params['vnp_TxnRef']}`);
        } else {
             // Thất bại
             return res.redirect(`${VNPAY_RETURN_URL_FE}?status=failed&gateway=vnpay`);
        }
    } else {
        // Sai chữ ký
        return res.redirect(`${VNPAY_RETURN_URL_FE}?status=failed&reason=checksum`);
    }
});

module.exports = router;
