const mysql = require("mysql");

// Kết nối dùng biến môi trường từ Render
const db = mysql.createConnection({
  host: process.env.MYSQL_ADDON_HOST,     // Khớp với key trên Render
  user: process.env.MYSQL_ADDON_USER,     // Khớp với key trên Render
  password: process.env.MYSQL_ADDON_PASSWORD, // Khớp với key trên Render
  database: process.env.MYSQL_ADDON_DB,   // Khớp với key trên Render
  port: process.env.MYSQL_ADDON_PORT || 3306 // Khớp với key trên Render
});

db.connect((err) => {
  if (err) {
    console.error("Lỗi kết nối database rồi bro:", err.message);
    // Thay vì exit ngay, ta log lỗi để debug trên Render
    process.exit(1);
  }
  console.log("Kết nối database Clever Cloud thành công rực rỡ!");
});

module.exports = db;
