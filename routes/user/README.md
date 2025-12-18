# User Routes

Module quản lý người dùng, authentication và admin operations.

## Authentication Endpoints

### POST `/user/register`

Đăng ký tài khoản mới.

**Request Body:**

```json
{
  "ten_user": "Nguyễn Văn A",
  "sdt_user": "0123456789",
  "pass_user": "password123",
  "email_user": "user@example.com"
}
```

**Response:**

```json
{
  "thongbao": "Tạo tài khoản thành công",
  "result": { "insertId": 1 }
}
```

### POST `/user/login`

Đăng nhập hệ thống.

**Request Body:**

```json
{
  "email_user": "user@example.com",
  "pass_user": "password123"
}
```

**Response:**

```json
{
  "message": "Đăng nhập thành công với vai trò Người dùng",
  "user": {
    "id_user": 1,
    "ten_user": "Nguyễn Văn A",
    "email_user": "user@example.com",
    "sdt_user": "0123456789",
    "role": 2,
    "redirectTo": "/"
  }
}
```

**Roles:**

- `0`: Admin → redirect to `/admin`
- `1`: Staff → redirect to `/staff`
- `2`: User → redirect to `/`

### POST `/user/change-password/:id`

Đổi mật khẩu.

**Parameters:**

- `id`: ID của user

**Request Body:**

```json
{
  "old_password": "oldpass",
  "new_password": "newpass",
  "confirm_password": "newpass"
}
```

### POST `/user/check-email`

Kiểm tra email có tồn tại không.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "exists": true
}
```

### POST `/user/reset-password`

Reset mật khẩu qua email và số điện thoại.

**Request Body:**

```json
{
  "email_user": "user@example.com",
  "phone_number": "0123456789",
  "new_password": "newpassword"
}
```

## User Profile Endpoints

### GET `/user`

Lấy danh sách tất cả users.

### GET `/user/:id`

Lấy thông tin chi tiết user.

**Response:**

```json
{
  "user": {
    "id_user": 1,
    "ten_user": "Nguyễn Văn A",
    "sdt_user": "0123456789",
    "email_user": "user@example.com",
    "address": "Hà Nội",
    "gender": "Nam",
    "dob": "1990-01-01",
    "avatar": "/uploads/avatar.jpg"
  }
}
```

### PUT `/user/:id`

Cập nhật thông tin user.

**Request Body:**

```json
{
  "ten_user": "Nguyễn Văn B",
  "sdt_user": "0987654321",
  "email_user": "newuser@example.com",
  "address": "Hà Nội",
  "gender": "Nam",
  "dob": "1990-01-01"
}
```

### POST `/user/:id_user/avatar`

Upload ảnh đại diện.

**Content-Type:** `multipart/form-data`

**Form Data:**

- `avatar`: File ảnh

**Response:**

```json
{
  "thongbao": "Cập nhật ảnh đại diện thành công",
  "avatar": "/uploads/1234567890.jpg"
}
```

## Admin Endpoints

### GET `/admin/user`

Lấy tất cả users (Admin).

### GET `/admin/user/role/:role_id`

Lấy users theo role.

**Parameters:**

- `role_id`: 0 (Admin), 1 (Staff), 2 (User)

### GET `/admin/user/:id`

Lấy chi tiết user (Admin).

### POST `/admin/user`

Thêm user mới (Admin).

**Request Body:**

```json
{
  "ten_user": "Nguyễn Văn C",
  "email_user": "user3@example.com",
  "sdt_user": "0111222333",
  "pass_user": "password",
  "role_id": 2
}
```

### PUT `/admin/user/:id`

Cập nhật user (Admin).

### DELETE `/admin/user/:id`

Xóa user (Admin).

### GET `/admin/user/nhanvien/role`

Lấy danh sách nhân viên (role_id = 1).

### GET `/admin/user/nhanvien/search?query=`

Tìm kiếm nhân viên.

## Business Rules

- Mật khẩu mặc định: `0000`
- Role mặc định khi đăng ký: `2` (User)
- Avatar mặc định: `../../image/user2.png`
- Khi upload avatar mới, avatar cũ sẽ được xóa
