# Loại Homestay Routes

Module quản lý các loại (danh mục) homestay.

## Public Endpoints

### GET `/loaihomestay`

Lấy danh sách tất cả loại homestay.

**Response:**

```json
[
  {
    "id_Loai": 1,
    "Ten_Loai": "Villa",
    "Mo_Ta": "Biệt thự cao cấp"
  }
]
```

### GET `/loaihomestay/:id`

Lấy chi tiết một loại homestay theo ID.

**Response:**

```json
{
  "id_Loai": 1,
  "Ten_Loai": "Villa",
  "Mo_Ta": "Biệt thự cao cấp"
}
```

### GET `/loaihomestay/search?query=`

Tìm kiếm loại homestay theo tên hoặc mô tả.

**Query Parameters:**

- `query` (required): Từ khóa tìm kiếm

**Response:**

```json
[
  {
    "id_Loai": 1,
    "Ten_Loai": "Villa",
    "Mo_Ta": "Biệt thự cao cấp"
  }
]
```

## Admin Endpoints

### GET `/admin/loai`

Lấy danh sách tất cả loại homestay (Admin).

### GET `/admin/loai/:id`

Lấy chi tiết một loại homestay (Admin).

### POST `/admin/loai`

Thêm loại homestay mới.

**Request Body:**

```json
{
  "Ten_Loai": "Villa",
  "Mo_Ta": "Biệt thự cao cấp"
}
```

### PUT `/admin/loai/:id`

Cập nhật thông tin loại homestay.

**Request Body:**

```json
{
  "Ten_Loai": "Villa Premium",
  "Mo_Ta": "Biệt thự cao cấp 5 sao"
}
```

### DELETE `/admin/loai/:id`

Xóa loại homestay.
