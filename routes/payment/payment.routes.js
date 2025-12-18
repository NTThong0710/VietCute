const express = require("express");
const router = express.Router();
const db = require("../../DB");
const axios = require("axios");
const crypto = require("crypto");
const querystring = require("qs");
require("dotenv").config();

// MoMo Configuration
const accessKey = process.env.MOMO_ACCESS_KEY;
const secretKey = process.env.MOMO_SECRET_KEY;

// VNPay Configuration
const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE;
const VNPAY_SECRET_KEY = process.env.VNPAY_SECRET_KEY;
const VNPAY_URL = process.env.VNPAY_URL;

// ==================== HELPER FUNCTIONS ====================

function sortObject(obj) {
  let sorted = {};
  let str = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(key);
    }
  }
  str.sort();
  for (let key = 0; key < str.length; key++) {
    sorted[str[key]] = obj[str[key]];
  }
  return sorted;
}

// ==================== MOMO PAYMENT ====================

// Create MoMo payment
router.post("/momo", async (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res
      .status(400)
      .json({ statusCode: 400, message: "Số tiền không hợp lệ." });
  }

  const orderInfo = "pay with MoMo";
  const partnerCode = "MOMO";
  const redirectUrl = "http://localhost:3001/thanks";
  const ipnUrl = "https://9ec5-115-77-23-68.ngrok-free.app/callback";
  const requestType = "payWithMethod";
  const orderId = partnerCode + new Date().getTime();
  const requestId = orderId;
  const extraData = "";
  const orderGroupId = "";
  const autoCapture = true;
  const lang = "vi";

  const rawSignature =
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

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = JSON.stringify({
    partnerCode,
    partnerName: "Test",
    storeId: "MomoTestStore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang,
    requestType,
    autoCapture,
    extraData,
    orderGroupId,
    signature,
  });

  const options = {
    method: "POST",
    url: "https://test-payment.momo.vn/v2/gateway/api/create",
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
    return res
      .status(500)
      .json({ statusCode: 500, message: "Lỗi khi gửi yêu cầu đến MoMo" });
  }
});

// MoMo callback
router.post("/callback", async (req, res) => {
  const { orderId, resultCode } = req.body;

  try {
    if (resultCode === 0) {
      await db.query(
        `UPDATE dat_homestay 
         SET TT_Thanhtoan = CASE 
             WHEN id_HinhThuc_Coc = 2 THEN 'Đã thanh toán' 
             ELSE 'Thanh toán thành công' 
         END,
         order_id = ? 
         WHERE order_id IS NULL`,
        [orderId]
      );
      return res
        .status(200)
        .json({ message: "Cập nhật trạng thái: Thanh toán thành công." });
    } else {
      await db.query(
        `UPDATE dat_homestay 
         SET TT_Thanhtoan = 'Thanh toán thất bại',
         order_id = ? 
         WHERE order_id IS NULL`,
        [orderId]
      );
      return res.status(200).json({ message: "Thanh toán thất bại." });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật orderId:", error.message);
    return res.status(500).json({ message: "Lỗi khi xử lý callback từ MoMo." });
  }
});

// Check MoMo transaction status
router.post("/transaction-status", async (req, res) => {
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

// ==================== VNPAY PAYMENT ====================

// Create VNPay payment
router.post("/vnpay", async (req, res) => {
  try {
    const { amount, orderInfo, bookingId } = req.body;

    const returnUrl = "http://localhost:3001/thanks";
    const date = new Date();
    const createDate = date
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const txnRef = `VNPAY_${bookingId}_${date.getTime()}`;

    let ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress;
    if (ipAddr && ipAddr.includes(",")) {
      ipAddr = ipAddr.split(",")[0];
    }

    const cleanOrderInfo = `Thanh toan don dat phong #${bookingId}`;

    let vnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: VNPAY_TMN_CODE,
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

    vnpParams = sortObject(vnpParams);

    let signData = "";
    Object.keys(vnpParams).forEach((key) => {
      const encodedValue = encodeURIComponent(vnpParams[key]).replace(
        /%20/g,
        "+"
      );
      if (signData) {
        signData += "&" + key + "=" + encodedValue;
      } else {
        signData = key + "=" + encodedValue;
      }
    });

    const hmac = crypto.createHmac("sha512", VNPAY_SECRET_KEY);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    const paymentUrl = `${VNPAY_URL}?${signData}&vnp_SecureHash=${signed}`;

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

// VNPay IPN (Instant Payment Notification)
router.get("/vnpay/ipn", (req, res) => {
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

    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac("sha512", VNPAY_SECRET_KEY);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      const rspCode = vnpParams["vnp_ResponseCode"];
      if (rspCode === "00") {
        return res.status(200).json({ RspCode: "00", Message: "Success" });
      }
      return res.status(200).json({ RspCode: "00", Message: "Success" });
    } else {
      return res
        .status(200)
        .json({ RspCode: "97", Message: "Invalid signature" });
    }
  } catch (error) {
    return res.status(200).json({ RspCode: "99", Message: "Unknown error" });
  }
});

// VNPay return URL handler
router.get("/vnpay/return", (req, res) => {
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

    const signData = querystring.stringify(vnpParams, { encode: false });
    const hmac = crypto.createHmac("sha512", VNPAY_SECRET_KEY);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (secureHash === signed) {
      const rspCode = vnpParams["vnp_ResponseCode"];
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
    return res.redirect(
      `http://localhost:3001/thanks?status=error&gateway=vnpay`
    );
  }
});

// ==================== BOOKING HELPERS ====================

// Update payment URL for booking
router.post("/updatePayUrl", (req, res) => {
  const { bookingId, payUrl } = req.body;

  if (!bookingId || !payUrl) {
    return res.status(400).json({ message: "Dữ liệu không đầy đủ." });
  }

  if (isNaN(bookingId)) {
    return res.status(400).json({ message: "ID đơn đặt phòng không hợp lệ." });
  }

  try {
    new URL(payUrl);
  } catch (error) {
    return res.status(400).json({ message: "URL thanh toán không hợp lệ." });
  }

  const updateQuery = `UPDATE dat_homestay SET pay_url = ? WHERE id_DatHomestay = ?`;

  db.query(updateQuery, [payUrl, bookingId], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Lỗi máy chủ.", error: err.message });
    }

    if (results.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Không thể cập nhật URL thanh toán." });
    }

    return res
      .status(200)
      .json({ message: "Cập nhật URL thanh toán thành công.", bookingId });
  });
});

module.exports = router;
