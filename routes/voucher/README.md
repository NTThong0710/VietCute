# Voucher Routes

Module quản lý mã giảm giá (vouchers).

## Endpoints

### GET `/vouchers`

Lấy danh sách tất cả vouchers.

**Response:**

```json
[
  {
    "id": 1,
    "ma_voucher": "SUMMER2024",
    "giam_gia": 100000,
    "ngay_het_han": "2024-12-31",
    "so_luong": 50,
    "mo_ta": "Giảm giá mùa hè"
  }
]
```

### POST `/vouchers`

Thêm voucher mới.

**Request Body:**

```json
{
  "ma_voucher": "SUMMER2024",
  "giam_gia": 100000,
  "ngay_het_han": "2024-12-31",
  "so_luong": 50,
  "mo_ta": "Giảm giá mùa hè"
}
```

**Response:**

```json
{
  "thongbao": "Đã thêm voucher thành công",
  "id": 1
}
```

### POST `/vouchers/check`

Kiểm tra tính hợp lệ của voucher.

**Request Body:**

```json
{
  "ma_voucher": "SUMMER2024"
}
```

**Response Success:**

```json
{
  "success": true,
  "message": "Mã voucher hợp lệ.",
  "data": {
    "id": 1,
    "ma_voucher": "SUMMER2024",
    "giam_gia": 100000,
    "ngay_het_han": "2024-12-31",
    "so_luong": 50
  }
}
```

**Response Error:**

```json
{
  "success": false,
  "message": "Mã voucher đã hết hạn."
}
```

### PUT `/vouchers/:id`

Cập nhật thông tin voucher.

**Parameters:**

- `id`: ID của voucher

**Request Body:**

```json
{
  "giam_gia": 150000,
  "so_luong": 30
}
```

**Response:**

```json
{
  "thongbao": "Đã cập nhật voucher thành công"
}
```

### DELETE `/vouchers/:id`

Xóa voucher.

**Parameters:**

- `id`: ID của voucher

**Response:**

```json
{
  "thongbao": "Đã xóa voucher thành công"
}
```

## Validation Rules

- `ma_voucher`: Bắt buộc, unique
- `giam_gia`: Bắt buộc, số dương
- `ngay_het_han`: Bắt buộc, định dạng date
- `so_luong`: Bắt buộc, số nguyên >= 0

## Business Logic

Khi check voucher, hệ thống kiểm tra:

1. Voucher có tồn tại không
2. Ngày hết hạn (phải > ngày hiện tại)
3. Số lượng còn lại (phải > 0)
