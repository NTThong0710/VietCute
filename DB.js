// File: DB.js
const mysql = require("mysql");
require("dotenv").config();

// Cấu hình kết nối
const db = mysql.createPool({
  connectionLimit: 5, // Clever Cloud Free giới hạn connection, để 5 là an toàn
  host: process.env.MYSQL_ADDON_HOST,
  user: process.env.MYSQL_ADDON_USER,
  password: process.env.MYSQL_ADDON_PASSWORD,
  database: process.env.MYSQL_ADDON_DB,
  port: process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  queueLimit: 0
});

// Test kết nối khi khởi động
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Lỗi kết nối Database:", err.code);
  } else {
    console.log("✅ Kết nối Database thành công!");
    connection.release();
  }
});

module.exports = db;
