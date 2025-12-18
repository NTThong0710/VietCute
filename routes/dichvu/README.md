# Dịch Vụ (Services) Routes

Module quản lý dịch vụ.

## Endpoints

### GET `/dichvu`

Lấy danh sách tất cả dịch vụ.

**Response:**

```json
[
  {
    "id_DV": 1,
    "ten_DV": "Spa & Massage",
    "mo_ta": "Dịch vụ spa thư giãn",
    "gia": 500000,
    "...": "..."
  }
]
```

**Note:** Các giá trị NULL sẽ được chuyển thành `"Chưa có"`.

### DELETE `/dichvu/:id`

Xóa dịch vụ theo ID.

**Response:**

```json
{
  "message": "Dịch vụ đã được xóa thành công!"
}
```

**Error Response:**

- 404: Dịch vụ không tồn tại
- 500: Lỗi server
