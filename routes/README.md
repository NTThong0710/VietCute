# Routes Module Structure

## Tổng quan

Thư mục này chứa các module router đã được tách riêng từ file `index.js` chính để tổ chức code tốt hơn, dễ bảo trì và mở rộng.

## Cấu trúc

### 1. `homestay.routes.js`

Module chứa tất cả các routes liên quan đến homestay cho người dùng (public routes).

#### Endpoints:

- **GET `/homestay`** - Lấy tất cả homestay
- **GET `/homestay/dat_homestay`** - Lấy tất cả thông tin đặt homestay
- **GET `/homestay/search?query=`** - Tìm kiếm homestay theo từ khóa
- **GET `/homestay/dshinhanh`** - Lấy danh sách hình ảnh của homestay
- **GET `/homestay/lienquan/:id`** - Lấy danh sách homestay liên quan
- **GET `/homestay/ct/:slug`** - Lấy chi tiết homestay theo slug
- **GET `/homestay/loai/:id_loai`** - Lấy homestay theo loại
- **GET `/homestay/:id`** - Lấy homestay theo ID
- **POST `/homestay/booking`** - Đặt homestay
- **PUT `/homestay/booking/:id`** - Cập nhật trạng thái booking

### 2. `admin-homestay.routes.js`

Module chứa tất cả các routes quản lý homestay cho admin.

#### Endpoints:

- **GET `/admin/homestay`** - Lấy danh sách homestay với hình ảnh (admin)
- **GET `/admin/homestay/:id`** - Lấy chi tiết homestay theo ID (admin)
- **POST `/admin/homestay`** - Thêm homestay mới
- **POST `/admin/homestay/:id_homestay/images`** - Thêm hình ảnh cho homestay
- **PUT `/admin/homestay/:id`** - Cập nhật homestay
- **DELETE `/admin/homestay/:id`** - Xóa homestay

## Backward Compatibility

Các endpoints cũ vẫn được hỗ trợ thông qua redirect trong file `index.js`:

- `/homestaylienquan/:id` → `/homestay/lienquan/:id`
- `/ct_homestay/:slug` → `/homestay/ct/:slug`
- `/homestayTrongLoai/:id_loai` → `/homestay/loai/:id_loai`
- `/booking/homestay` → `/homestay/booking`
- `/search_homestay` → `/homestay/search`
- `/dshinhanh` → `/homestay/dshinhanh`

## Lợi ích của việc Module hóa

1. **Tổ chức code tốt hơn**: Mỗi module chịu trách nhiệm cho một nhóm chức năng cụ thể
2. **Dễ bảo trì**: Dễ dàng tìm và sửa code khi cần
3. **Dễ mở rộng**: Thêm routes mới mà không làm file index.js quá dài
4. **Tái sử dụng**: Có thể tái sử dụng các hàm và middleware
5. **Testing**: Dễ dàng viết unit test cho từng module riêng biệt
6. **Collaboration**: Nhiều developer có thể làm việc song song trên các module khác nhau

## Cách sử dụng

### Import vào index.js:

```javascript
const homestayRoutes = require("./routes/homestay.routes");
const adminHomestayRoutes = require("./routes/admin-homestay.routes");

app.use("/homestay", homestayRoutes);
app.use("/admin/homestay", adminHomestayRoutes);
```

### Thêm route mới:

```javascript
// Trong file homestay.routes.js
router.get("/new-endpoint", (req, res) => {
  // Logic xử lý
});
```

## ✅ ĐÃ HOÀN THÀNH TẤT CẢ CÁC MODULE

### 1. ✅ `loai-homestay/` - Quản lý loại homestay

- **Files:** `loai-homestay.routes.js`, `admin-loai-homestay.routes.js`, `README.md`
- **Endpoints:** 6 routes (Public: 2, Admin: 4)
- **Status:** Complete ✅

### 2. ✅ `danhgia/` - Quản lý đánh giá

- **Files:** `danhgia.routes.js`, `README.md`
- **Endpoints:** 4 routes (CRUD operations)
- **Status:** Complete ✅

### 3. ✅ `voucher/` - Quản lý voucher

- **Files:** `voucher.routes.js`, `README.md`
- **Endpoints:** 3 routes (List, Add, Check validity)
- **Status:** Complete ✅

### 4. ✅ `user/` - Quản lý người dùng & Auth

- **Files:** `user.routes.js`, `admin-user.routes.js`, `README.md`
- **Endpoints:** 10+ routes (Auth, Profile, Avatar, Admin CRUD)
- **Status:** Complete ✅

### 5. ✅ `baiviet/` - Quản lý bài viết

- **Files:** `baiviet.routes.js`, `README.md`
- **Endpoints:** 8 routes (CRUD, pagination, slug, latest posts)
- **Status:** Complete ✅

### 6. ✅ `donhang/` - Quản lý đơn hàng

- **Files:** `donhang.routes.js`, `README.md`
- **Endpoints:** 15 routes (User orders, Admin orders by status)
- **Status:** Complete ✅

### 7. ✅ `payment/` - Xử lý thanh toán

- **Files:** `payment.routes.js`, `README.md`
- **Endpoints:** 8 routes (MoMo, VNPay integration)
- **Status:** Complete ✅

### 8. ✅ `dichvu/` - Quản lý dịch vụ

- **Files:** `dichvu.routes.js`, `README.md`
- **Endpoints:** 2 routes (List, Delete)
- **Status:** Complete ✅

### 9. ✅ `contact/` - Xử lý liên hệ

- **Files:** `contact.routes.js`, `README.md`
- **Endpoints:** 1 route (Submit contact form)
- **Status:** Complete ✅

## 📁 Cấu trúc thư mục hoàn chỉnh

```
routes/
├── index.js                           # Central routes configuration ⚙️
├── homestay.routes.js                 # Public homestay
├── admin-homestay.routes.js           # Admin homestay
├── loai-homestay/
│   ├── loai-homestay.routes.js
│   ├── admin-loai-homestay.routes.js
│   └── README.md
├── danhgia/
│   ├── danhgia.routes.js
│   └── README.md
├── voucher/
│   ├── voucher.routes.js
│   └── README.md
├── user/
│   ├── user.routes.js
│   ├── admin-user.routes.js
│   └── README.md
├── baiviet/
│   ├── baiviet.routes.js
│   └── README.md
├── donhang/
│   ├── donhang.routes.js
│   └── README.md
├── payment/
│   ├── payment.routes.js
│   └── README.md
├── dichvu/
│   ├── dichvu.routes.js
│   └── README.md
└── contact/
    ├── contact.routes.js
    └── README.md
```

## 📊 Thống kê

- **Tổng số modules:** 10 ✅
- **Tổng số routes files:** 14 files
- **Tổng số endpoints:** ~60 routes
- **Độ hoàn thành:** 100% 🎉

## 🚀 Cách tích hợp vào index.js

Xem file [MIGRATION_GUIDE.md](../MIGRATION_GUIDE.md) để biết chi tiết cách tích hợp.

#### 8. `dichvu/` - Quản lý dịch vụ

**Endpoints:** 2 routes

- GET list services
- DELETE service
  **Độ phức tạp:** ⭐ (Rất đơn giản - chưa đầy đủ CRUD)

#### 9. `contact/` - Quản lý liên hệ

**Endpoints:** 1 route

- POST contact form
  **Độ phức tạp:** ⭐ (Rất đơn giản)

---

## 🎯 Khuyến nghị thứ tự thực hiện:

1. **loai-homestay/** - Đơn giản nhất, làm để làm quen pattern
2. **danhgia/** - Tiếp tục với module đơn giản
3. **voucher/** - Tương tự đơn giản
4. **user/** - Quan trọng, có logic auth
5. **baiviet/** - Trung bình, có upload
6. **donhang/** - Phức tạp, nhiều business logic
7. **payment/** - Rất phức tạp, tích hợp bên ngoài
8. **dichvu/** & **contact/** - Bổ sung nếu cần
