# Đánh Giá Routes

Module quản lý đánh giá (reviews) cho homestay.

## Endpoints

### GET `/danhgia/:id_homestay`

Lấy tất cả đánh giá của một homestay.

**Parameters:**

- `id_homestay`: ID của homestay

**Response:**

```json
[
  {
    "id": 1,
    "id_homestay": 1,
    "ten_user": "Nguyễn Văn A",
    "noi_dung": "Homestay rất đẹp và sạch sẽ",
    "sao": 5,
    "ngay_tao": "2024-01-15"
  }
]
```

### POST `/danhgia`

Thêm đánh giá mới.

**Request Body:**

```json
{
  "id_homestay": 1,
  "ten_user": "Nguyễn Văn A",
  "noi_dung": "Homestay rất đẹp và sạch sẽ",
  "sao": 5
}
```

**Response:**

```json
{
  "thongbao": "Đánh giá đã được thêm thành công",
  "id": 1
}
```

### PUT `/danhgia/:id`

Cập nhật đánh giá.

**Parameters:**

- `id`: ID của đánh giá

**Request Body:**

```json
{
  "ten_user": "Nguyễn Văn A",
  "noi_dung": "Homestay rất tuyệt vời",
  "sao": 5
}
```

**Response:**

```json
{
  "thongbao": "Đánh giá đã được cập nhật thành công"
}
```

### DELETE `/danhgia/:id`

Xóa đánh giá.

**Parameters:**

- `id`: ID của đánh giá

**Response:**

```json
{
  "thongbao": "Đánh giá đã được xóa thành công"
}
```

## Validation

- Tất cả các trường đều bắt buộc khi tạo/cập nhật
- `sao` phải là số từ 1-5
- `id_homestay` phải tồn tại trong database
