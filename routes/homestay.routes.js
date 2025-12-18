const express = require("express");
const router = express.Router();
const db = require("../DB");
const moment = require("moment");

// Hàm chuyển tên thành slug
function convertToSlug(text) {
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

// Lấy tất cả homestay
router.get("/", function (req, res) {
  let sql = `SELECT * FROM homestay`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list homestay", err });
    else res.json(data);
  });
});

// API lấy danh sách hình ảnh của homestay
router.get("/dshinhanh", (req, res) => {
  const query = `
    SELECT *
    FROM homestay, hinh_homestay, hinh_anh
    WHERE homestay.id_homestay = hinh_homestay.id_homestay 
    AND hinh_homestay.id_hinh = hinh_anh.id_hinh
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching images:", err);
      return res.status(500).send("Server error");
    }
    res.json(results);
  });
});

// Lấy tất cả dat_homestay
router.get("/dat_homestay", function (req, res) {
  let sql = `SELECT * FROM dat_homestay`;
  db.query(sql, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy list homestay", err });
    else res.json(data);
  });
});

// Tìm kiếm homestay - phải đặt trước route /:id
router.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).send("Vui lòng nhập từ khóa tìm kiếm.");

  const sql = `
    SELECT * FROM homestay
    WHERE ten_homestay LIKE ? OR mota LIKE ?
  `;
  db.query(sql, [`%${query}%`, `%${query}%`], (err, results) => {
    if (err) {
      console.error("Lỗi khi tìm kiếm:", err);
      return res.status(500).send("Lỗi server");
    }
    res.json(results);
  });
});

// Lấy danh sách homestay liên quan
router.get("/lienquan/:id", function (req, res) {
  let id = parseInt(req.params.id || 0);
  if (isNaN(id) || id <= 0) {
    res.json({ "thong bao": "Không biết homestay", id: id });
    return;
  }
  let sql = `SELECT * FROM homestay, hinh_homestay, hinh_anh
     WHERE id_Loai = ? AND homestay.id_homestay = hinh_homestay.id_homestay 
    AND hinh_homestay.id_hinh = hinh_anh.id_hinh ORDER BY homestay.id_homestay desc LIMIT 4`;
  db.query(sql, id, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy homestay", err });
    else res.json(data);
  });
});

// Lấy chi tiết homestay theo slug
router.get("/ct/:slug", (req, res) => {
  const { slug } = req.params;
  let sql = "SELECT * FROM homestay WHERE slug = ?";
  db.query(sql, [slug], (err, rows) => {
    if (err) {
      console.error("Database query error:", err);
      res.status(500).json({ message: "Internal server error" });
    } else if (rows.length > 0) {
      res.json(rows[0]);
    } else {
      res.status(404).json({ message: "Homestay not found" });
    }
  });
});

// Lấy homestay theo loại
router.get("/loai/:id_loai", function (req, res) {
  let id_Loai = parseInt(req.params.id_loai);
  if (isNaN(id_Loai) || id_Loai <= 0) {
    res.json({ thongbao: "Không biết loại", id_Loai: id_Loai });
    return;
  }
  let sql = `SELECT * FROM homestay WHERE id_Loai = ? ORDER BY id_homestay desc`;
  db.query(sql, id_Loai, (err, data) => {
    if (err) res.json({ thongbao: "Lỗi lấy sản phẩm trong loai", err });
    else res.json(data);
  });
});

// Lấy homestay theo ID - phải đặt cuối cùng vì là route tổng quát
router.get("/:id", function (req, res) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    res.json({ thongbao: "ID không hợp lệ", id: id });
    return;
  }
  let sql = `SELECT * FROM homestay WHERE id_homestay = ?`;
  db.query(sql, [id], (err, data) => {
    if (err) {
      res.json({ thongbao: "Lỗi lấy homestay", err });
    } else if (data.length === 0) {
      res.json({ thongbao: "Không tìm thấy homestay với ID này" });
    } else {
      res.json(data[0]);
    }
  });
});

// ==================== BOOKING ROUTES ====================

// Đặt homestay
router.post("/booking", (req, res) => {
  const { id_homestay, ngay_dat, ngay_tra, tong_tien_dat, id_user } = req.body;

  if (
    !moment(ngay_dat, "DD/MM/YYYY", true).isValid() ||
    !moment(ngay_tra, "DD/MM/YYYY", true).isValid()
  ) {
    return res
      .status(400)
      .json({ error: "Ngày nhận hoặc ngày trả không hợp lệ." });
  }

  const formattedNgayDat = moment(ngay_dat, "DD/MM/YYYY").format("YYYY-MM-DD");
  const formattedNgayTra = moment(ngay_tra, "DD/MM/YYYY").format("YYYY-MM-DD");

  if (new Date(formattedNgayTra) <= new Date(formattedNgayDat)) {
    return res
      .status(400)
      .json({ error: "Ngày trả phòng phải lớn hơn ngày nhận phòng." });
  }

  const checkOverlapQuery = `
    SELECT * 
    FROM dat_homestay 
    WHERE id_homestay = ? 
      AND NOT (
          ngay_tra <= ? OR ngay_dat >= ?
      )
  `;

  db.query(
    checkOverlapQuery,
    [id_homestay, formattedNgayDat, formattedNgayTra],
    (err, rows) => {
      if (err) {
        console.error("Lỗi truy vấn:", err);
        return res.status(500).json({ error: "Lỗi hệ thống." });
      }

      if (rows.length > 0) {
        return res.status(400).json({
          error: "Ngày này đã được đặt. Vui lòng chọn ngày hoặc homestay khác.",
        });
      }

      const sqlInsert = `
        INSERT INTO dat_homestay 
        (id_homestay, ngay_dat, ngay_tra, tong_tien_dat, id_user, TT_Thanhtoan) 
        VALUES (?, ?, ?, ?, ?, 'chưa đặt cọc')
      `;
      db.query(
        sqlInsert,
        [
          id_homestay,
          formattedNgayDat,
          formattedNgayTra,
          tong_tien_dat,
          id_user,
        ],
        (err) => {
          if (err) {
            console.error("Lỗi khi thêm đặt phòng:", err);
            return res
              .status(500)
              .json({ error: "Không thể lưu dữ liệu đặt phòng vào hệ thống." });
          }
          res.status(200).json({ message: "Đặt phòng thành công!" });
        }
      );
    }
  );
});

// Cập nhật trạng thái booking
router.put("/booking/:id", (req, res) => {
  const { id } = req.params;

  const sqlUpdate = `
    UPDATE dat_homestay 
    SET TT_Thanhtoan = 'đã đặt cọc' 
    WHERE id_DatHomestay = ?
  `;

  db.query(sqlUpdate, [id], (err, result) => {
    if (err) {
      console.error("Lỗi khi cập nhật trạng thái:", err);
      return res.status(500).json({ error: "Lỗi hệ thống." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
    }

    res.status(200).json({ message: "Cập nhật trạng thái thành công!" });
  });
});

module.exports = router;
