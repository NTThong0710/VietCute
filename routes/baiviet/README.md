# Bài Viết (Blog/Articles) Routes

Module quản lý bài viết/blog.

## Public Endpoints

### GET `/baiviet?page=1&pageSize=10`

Lấy danh sách bài viết với phân trang.

**Query Parameters:**

- `page` (optional): Trang hiện tại, default = 1
- `pageSize` (optional): Số bài viết mỗi trang, default = 10

**Response:**

```json
{
  "articles": [...],
  "currentPage": 1,
  "totalPages": 10,
  "total": 100
}
```

### GET `/baiviet/:id`

Lấy bài viết theo ID.

### GET `/baiviet/slug/:slug`

Lấy bài viết theo slug.

### GET `/baiviet/latest/new?limit=4`

Lấy bài viết mới nhất.

**Query Parameters:**

- `limit` (optional): Số lượng bài viết, default = 4

### GET `/baiviet/related/author?author=`

Lấy các bài viết liên quan theo tác giả.

**Query Parameters:**

- `author` (required): Tên tác giả

## Admin Endpoints

### POST `/baiviet`

Thêm bài viết mới.

**Content-Type:** `multipart/form-data`

**Form Data:**

- `title`: Tiêu đề bài viết
- `content`: Nội dung bài viết
- `author`: Tác giả
- `publish_date`: Ngày xuất bản
- `image`: File ảnh đại diện (optional)

**Response:**

```json
{
  "id": 1,
  "title": "Tiêu đề bài viết",
  "content": "Nội dung...",
  "author": "Tác giả",
  "publish_date": "2024-01-15",
  "image_url": "http://localhost:3000/uploads/image.jpg"
}
```

### PUT `/baiviet/:id`

Cập nhật bài viết.

**Content-Type:** `multipart/form-data`

**Form Data:** (Giống POST)

### DELETE `/baiviet/:id`

Xóa bài viết.

## Features

- Upload và quản lý ảnh đại diện cho bài viết
- Tự động xóa ảnh cũ khi cập nhật ảnh mới
- Phân trang cho danh sách bài viết
- Lấy bài viết theo slug (SEO friendly)
- Lấy bài viết liên quan theo tác giả
