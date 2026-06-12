// 数据库抽象层入口
// 自动检测环境：Vercel (DATABASE_URL) → PostgreSQL，本地 → SQLite

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

// 自动检测：如果有 DATABASE_URL（Vercel Postgres/Neon），使用 PostgreSQL
// 否则 fallback 到 SQLite
const hasPgUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const dbType = process.env.DB_TYPE || (hasPgUrl ? 'postgres' : 'sqlite');

let dbImpl;
if (dbType === 'postgres') {
  console.log('[DB] Using PostgreSQL adapter');
  dbImpl = require('./postgres');
} else if (dbType === 'sqlite') {
  console.log('[DB] Using SQLite adapter');
  dbImpl = require('./sqlite');
} else if (dbType === 'mysql') {
  dbImpl = require('./mysql');
} else if (dbType === 'sqlserver') {
  dbImpl = require('./sqlserver');
} else {
  console.log('[DB] Fallback to SQLite adapter');
  dbImpl = require('./sqlite');
}

module.exports = dbImpl;
