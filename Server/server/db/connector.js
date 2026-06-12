// 数据库抽象层入口
// 根据配置切换 SQLite / MySQL / SQL Server

const path = require('path');
const fs = require('fs');

// 读取 .env
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.substring(0, idx).trim();
      const val = line.substring(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

loadEnv();

// 默认使用 SQLite
const dbType = process.env.DB_TYPE || 'sqlite';

let dbImpl;
if (dbType === 'sqlite') {
  dbImpl = require('./sqlite');
} else if (dbType === 'mysql') {
  dbImpl = require('./mysql');
} else if (dbType === 'sqlserver') {
  dbImpl = require('./sqlserver');
} else {
  dbImpl = require('./sqlite');
}

module.exports = dbImpl;
