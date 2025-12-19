const express = require("express");
const router = express.Router();
const db = require("../../DB");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ==================== CONFIG ====================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const SERVER_DOMAIN = "https://vietcute.onrender.com";

// Hàm tạo slug
function convertToSlug(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Hàm xử lý link ảnh hiển thị ra
const fixImageUrl = (item) => {
  if (item.url_hinh && !item.url_hinh.startsWith("http")) {
    item.url_hinh = `${SERVER_DOMAIN}${item.url_hinh}`;
  }
  return item;
};

// ==================== ROUTES ====================

// 1. Lấy danh sách homestay
router.get("/", (req, res) => {
  const query = `
    SELECT homestay.*, 
      (SELECT url_hinh FROM hinh_homestay WHERE hinh_homestay.id_homestay = homestay.id_homestay LIMIT 1) AS url_hinh
      FROM homestay
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data:", err);
      return res.status(500).send("Server error");
    }
    // Xử lý link ảnh
    const processed = results.map(item => fixImageUrl(item));
    res.json(processed);
  });
});

// 2. Lấy chi tiết homestay
router.get("/:id", (req, res) => {
  const id_homestay = req.params.id;
  const query = `
    SELECT homestay.*, hinh_homestay.url_hinh
    FROM homestay
    LEFT JOIN hinh_homestay ON homestay.id_homestay = hinh_homestay.id_homestay
    WHERE homestay.id_homestay = ?
  `;

  db.query(query, [id_homestay], (err, results) => {
    if (err) return res.status(500).send("Server error");
    if (results.length === 0) return res.status(404).send("Not found");

    // Vì join có thể ra nhiều dòng (nhiều ảnh), ta lấy dòng đầu tiên hoặc xử lý list
    // Ở đây giả sử lấy dòng đầu tiên làm đại diện
    const data = fixImageUrl(results[0]);
    res.json(data);
  });
});

// 3. THÊM HOMESTAY (Có upload ảnh)
// Lưu ý: Frontend phải gửi field name là "image" hoặc "images"
router.post("/", upload.single("image"), (req, res) => {
  const { ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai } = req.body;
  
  if (!ten_homestay || !gia_homestay || !id_Loai) {
    return res.status(400).json({ message: "Thiếu dữ liệu!" });
  }

  const slug = convertToSlug(ten_homestay);
  const danh_gia_value = danh_gia ?? 0;
  
  // 1. Insert vào bảng homestay
  const queryHomestay = `
    INSERT INTO homestay (slug, ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(queryHomestay, [slug, ten_homestay, gia_homestay, mota, danh_gia_value, TrangThai, id_Loai], (err, result) => {
      if (err) {
        console.error("Lỗi thêm homestay:", err);
        return res.status(500).json({ message: "Lỗi DB" });
      }

      const newId = result.insertId;

      // 2. Nếu có ảnh upload, Insert vào bảng hinh_homestay
      if (req.file) {
        const url_hinh = `/uploads/${req.file.filename}`; // Lưu đường dẫn tương đối
        const queryHinh = "INSERT INTO hinh_homestay (id_homestay, url_hinh) VALUES (?, ?)";
        
        db.query(queryHinh, [newId, url_hinh], (errHinh) => {
            if (errHinh) console.error("Lỗi thêm hình:", errHinh);
            // Vẫn trả về thành công dù lỗi hình (có thể fix sau)
            res.status(201).json({ message: "Thêm thành công", id: newId });
        });
      } else {
        res.status(201).json({ message: "Thêm thành công (không ảnh)", id: newId });
      }
    }
  );
});

// 4. CẬP NHẬT HOMESTAY (QUAN TRỌNG: Sửa lỗi 500 ở đây)
router.put("/:id", upload.single("image"), (req, res) => {
  const { id } = req.params;
  const { ten_homestay, gia_homestay, mota, danh_gia, TrangThai, id_Loai } = req.body;

  // Lấy đường dẫn ảnh mới (nếu có upload)
  let newImagePath = req.file ? `/uploads/${req.file.filename}` : null;

  // 1. Update bảng Homestay trước
  const updateHomestayQuery = `
    UPDATE homestay 
    SET ten_homestay = ?, gia_homestay = ?, mota = ?, danh_gia = ?, TrangThai = ?, id_Loai = ?
    WHERE id_homestay = ?
  `;

  db.query(
    updateHomestayQuery,
    [ten_homestay, gia_homestay, mota, danh_gia || 0, TrangThai, id_Loai, id],
    (err, result) => {
      if (err) {
        console.error("Lỗi update homestay:", err);
        return res.status(500).json({ message: "Lỗi server update homestay" });
      }

      // 2. Xử lý ảnh (Nếu có upload ảnh mới)
      if (newImagePath) {
        // Tìm ảnh cũ để xóa
        db.query("SELECT url_hinh FROM hinh_homestay WHERE id_homestay = ? LIMIT 1", [id], (errFind, resFind) => {
            
            // Xóa file cũ trên ổ cứng
            if (!errFind && resFind.length > 0) {
                let oldUrl = resFind[0].url_hinh;
                if (oldUrl && !oldUrl.startsWith("http")) {
                    const oldPath = path.join(__dirname, "../../", oldUrl);
                    fs.unlink(oldPath, (e) => {}); 
                }
            }

            // Update hoặc Insert ảnh mới vào DB
            // (Dùng ON DUPLICATE KEY UPDATE hoặc Check trước)
            // Ở đây để đơn giản: Xóa hết ảnh cũ của ID này rồi thêm mới (để tránh 1 homestay quá nhiều ảnh rác)
            db.query("DELETE FROM hinh_homestay WHERE id_homestay = ?", [id], (errDel) => {
                const queryInsertHinh = "INSERT INTO hinh_homestay (id_homestay, url_hinh) VALUES (?, ?)";
                db.query(queryInsertHinh, [id, newImagePath], (errIns) => {
                    if (errIns) console.error("Lỗi update hình:", errIns);
                    return res.json({ message: "Cập nhật thành công!" });
                });
            });
        });
      } else {
        // Không upload ảnh mới -> Giữ nguyên
        res.json({ message: "Cập nhật thông tin thành công (Giữ ảnh cũ)" });
      }
    }
  );
});

// 5. Xóa homestay
router.delete("/:id", function (req, res) {
  let id = req.params.id;
  
  // Nên xóa ảnh trong folder uploads trước (Code nâng cao)
  // Nhưng tạm thời xóa DB trước
  let sql = `DELETE FROM homestay WHERE id_homestay = ?`;
  db.query(sql, id, (err, d) => {
    if (err) res.status(500).json({ thongbao: "Lỗi xóa", err });
    else res.json({ thongbao: "Đã xóa thành công" });
  });
});

module.exports = router;
