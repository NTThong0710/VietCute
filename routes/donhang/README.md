# Đơn Hàng (Orders) Routes

Module quản lý đơn đặt homestay.

## User Order Endpoints

### GET `/donhang/user/:id_user`

Lấy danh sách đơn hàng của user.

**Response:**

```json
[
  {
    "id_DatHomestay": 1,
    "id_homestay": 5,
    "ngay_dat": "2024-01-15",
    "ngay_tra": "2024-01-20",
    "tong_tien_dat": 5000000,
    "TT_Thanhtoan": "Đã thanh toán",
    "ten_homestay": "Sudes Nest",
    "TrangThai": "Còn phòng",
    "ten_user": "Nguyễn Văn A",
    "sdt_user": "0123456789",
    "email_user": "user@example.com"
  }
]
```

### DELETE `/donhang/user/:id`

Hủy đơn hàng của user (chỉ cho phép với đơn "Chờ thanh toán" hoặc "Thanh toán thất bại").

## Admin Order Endpoints

### Đơn hàng chưa đặt cọc

#### GET `/donhang/chua-dat-coc`

Lấy danh sách đơn hàng chưa đặt cọc.

#### DELETE `/donhang/chua-dat-coc/:id`

Xóa đơn hàng chưa đặt cọc.

### Đơn hàng đã đặt cọc

#### GET `/donhang/da-dat-coc`

Lấy danh sách đơn hàng đã đặt cọc (thanh toán thành công với hình thức cọc = 1).

#### GET `/donhang/da-dat-coc/:id`

Lấy chi tiết đơn hàng đã đặt cọc theo ID.

#### PUT `/donhang/da-dat-coc/:id`

Cập nhật đơn hàng đã đặt cọc.

**Request Body:**

```json
{
  "ngay_dat": "2024-01-15",
  "ngay_tra": "2024-01-20",
  "tong_tien_dat": 5000000,
  "id_user": 1,
  "created_at": "2024-01-10",
  "TT_Thanhtoan": "thanh toán thành công",
  "tien_coc_truoc": 1000000,
  "tien_can_thanhtoan": 4000000,
  "voucher": "SALE20"
}
```

#### DELETE `/donhang/da-dat-coc/:id`

Xóa đơn hàng đã đặt cọc.

### Đơn hàng đã thanh toán

#### GET `/donhang/da-thanh-toan`

Lấy danh sách đơn hàng đã thanh toán hoàn tất.

#### PUT `/donhang/da-thanh-toan/:id`

Cập nhật thông tin thanh toán đơn hàng.

**Request Body:**

```json
{
  "TT_Thanhtoan": "Đã thanh toán",
  "tong_tien_dat": 5000000
}
```

### DELETE `/donhang/:id`

Xóa đơn hàng bất kỳ theo ID.

### GET `/donhang/hinhthuc-coc`

Lấy danh sách các hình thức cọc.

## Order Status

- `"chưa đặt cọc"`: Đơn mới tạo chưa thanh toán
- `"thanh toán thành công"`: Đã đặt cọc (hình thức 1)
- `"Đã thanh toán"`: Đã thanh toán đầy đủ
- `"Chờ thanh toán"`: Đang chờ xử lý thanh toán
- `"Thanh toán thất bại"`: Thanh toán không thành công

## Payment Types (id_HinhThuc_Coc)

- `1`: Đặt cọc trước (30-50%)
- `2`: Thanh toán đầy đủ
