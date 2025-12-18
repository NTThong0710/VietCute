# Payment Routes

Module xử lý thanh toán qua MoMo và VNPay.

## MoMo Payment

### POST `/payment/momo`

Tạo link thanh toán MoMo.

**Request Body:**

```json
{
  "amount": 1000000
}
```

**Response:**

```json
{
  "partnerCode": "MOMO",
  "orderId": "MOMO1234567890",
  "requestId": "MOMO1234567890",
  "amount": 1000000,
  "responseTime": 1234567890,
  "message": "Successful",
  "resultCode": 0,
  "payUrl": "https://test-payment.momo.vn/...",
  "deeplink": "...",
  "qrCodeUrl": "..."
}
```

### POST `/payment/callback`

Webhook callback từ MoMo (tự động gọi).

**Request Body:**

```json
{
  "orderId": "MOMO1234567890",
  "resultCode": 0
}
```

### POST `/payment/transaction-status`

Kiểm tra trạng thái giao dịch MoMo.

**Request Body:**

```json
{
  "orderId": "MOMO1234567890"
}
```

## VNPay Payment

### POST `/payment/vnpay`

Tạo link thanh toán VNPay.

**Request Body:**

```json
{
  "amount": 1000000,
  "orderInfo": "Thanh toán đặt phòng",
  "bookingId": 123
}
```

**Response:**

```json
{
  "statusCode": 200,
  "message": "Tạo URL thanh toán VNPay thành công",
  "payUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "orderId": "VNPAY_123_1234567890"
}
```

### GET `/payment/vnpay/ipn`

IPN (Instant Payment Notification) từ VNPay.

**Query Parameters:** (Tự động từ VNPay)

### GET `/payment/vnpay/return`

Return URL sau khi thanh toán VNPay.

**Query Parameters:** (Tự động từ VNPay)

Redirect về:

- Success: `http://localhost:3001/thanks?status=success&gateway=vnpay`
- Failed: `http://localhost:3001/thanks?status=failed&gateway=vnpay&code={code}`

## Booking Helpers

### POST `/payment/updatePayUrl`

Cập nhật URL thanh toán cho đơn đặt phòng.

**Request Body:**

```json
{
  "bookingId": 123,
  "payUrl": "https://payment.example.com/..."
}
```

## Payment Configuration

### MoMo

- Environment: Test/Sandbox
- Partner Code: MOMO
- Access Key: F8BBA842ECF85
- Redirect URL: http://localhost:3001/thanks

### VNPay

- Environment: Sandbox
- TMN Code: Z7OOK2N9
- Return URL: http://localhost:3001/thanks

## Response Codes

### MoMo

- `0`: Success
- Other: Failed

### VNPay

- `00`: Success
- `97`: Invalid signature
- `99`: Unknown error
- Others: See VNPay documentation
