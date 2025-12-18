# Contact Routes

Module xử lý form liên hệ.

## Endpoints

### POST `/contact`

Gửi tin nhắn liên hệ.

**Request Body:**

```json
{
  "name": "Nguyễn Văn A",
  "email": "user@example.com",
  "message": "Tôi muốn biết thêm thông tin về homestay..."
}
```

**Response:**

```json
{
  "thongbao": "Gửi tin thành công!"
}
```

**Error Response:**

- 400: Thiếu thông tin

```json
{
  "thongbao": "Vui lòng điền đầy đủ thông tin!"
}
```

- 500: Lỗi server

```json
{
  "thongbao": "Lỗi khi gửi tin nhắn"
}
```

## Validation

Tất cả 3 trường `name`, `email`, `message` đều bắt buộc.
