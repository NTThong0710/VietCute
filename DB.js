const mysql = require("mysql");

// Dùng createPool thay vì createConnection
const db = mysql.createPool({
  connectionLimit: 5, // Clever Cloud gói Free giới hạn kết nối, để 5 là đẹp
  host: process.env.MYSQL_ADDON_HOST || "localhost",
  user: process.env.MYSQL_ADDON_USER || "root",
  password: process.env.MYSQL_ADDON_PASSWORD || "",
  database: process.env.MYSQL_ADDON_DB || "paradiso",
  port: process.env.MYSQL_ADDON_PORT || 3306,
  waitForConnections: true,
  queueLimit: 0
});

// Kiểm tra thử kết nối khi server bật
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Lỗi kết nối Database Pool:", err.code);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection was closed.');
    }
    if (err.code === 'ER_CON_COUNT_ERROR') {
      console.error('Database has too many connections.');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('Database connection was refused.');
    }
  } else {
    console.log("✅ Kết nối Database Pool thành công!");
    // Quan trọng: Phải nhả kết nối ra sau khi test xong
    connection.release();
  }
});

// Giữ nguyên dòng này để các file khác không bị lỗi
module.exports = db;
