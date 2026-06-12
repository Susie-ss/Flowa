// PostgreSQL 数据库适配器（Neon Serverless / Vercel）
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

let ready = false;
let readyCallbacks = [];

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// 将 SQLite 风格 ? 占位符转换为 PostgreSQL $1, $2, ...
function convertPlaceholders(query) {
  let idx = 0;
  return query.replace(/\?/g, () => { idx++; return '$' + idx; });
}

async function run(query, params = []) {
  const pgQuery = convertPlaceholders(query);
  const result = await pool.query(pgQuery, params);
  return result;
}

async function get(query, params = []) {
  const pgQuery = convertPlaceholders(query);
  const result = await pool.query(pgQuery, params);
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function all(query, params = []) {
  const pgQuery = convertPlaceholders(query);
  const result = await pool.query(pgQuery, params);
  return result.rows;
}

async function close() {
  await pool.end();
  ready = false;
}

function onDBReady(callback) {
  if (ready) {
    callback();
  } else {
    readyCallbacks.push(callback);
  }
}

async function initSchema() {
  // 用户表
  await run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nickname TEXT,
    status INTEGER DEFAULT 1,
    last_login_ip TEXT,
    last_login_at BIGINT,
    created_at BIGINT,
    updated_at BIGINT
  )`);

  // 产品线表
  await run(`CREATE TABLE IF NOT EXISTS product_lines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#5B5EF4',
    sort_order INTEGER DEFAULT 0,
    owner_id TEXT,
    created_at BIGINT
  )`);

  // 项目表
  await run(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    share_permission INTEGER DEFAULT 0,
    share_password TEXT,
    share_expiry_days INTEGER,
    pages_json TEXT,
    version_num INTEGER DEFAULT 0,
    color TEXT DEFAULT '#5B5EF4',
    created_at BIGINT,
    updated_at BIGINT
  )`);

  // 项目产品线关联
  await run(`CREATE TABLE IF NOT EXISTS project_product_lines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    product_line_id TEXT NOT NULL,
    user_id TEXT,
    created_at BIGINT,
    UNIQUE(project_id, product_line_id)
  )`);

  // 项目成员
  await run(`CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    invited_at BIGINT,
    UNIQUE(project_id, user_id)
  )`);

  // 刷新令牌
  await run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at BIGINT
  )`);

  // 项目版本
  await run(`CREATE TABLE IF NOT EXISTS project_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version_num INTEGER NOT NULL,
    pages_json TEXT,
    created_at BIGINT
  )`);

  // 评论
  await run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    page_path TEXT,
    content TEXT NOT NULL,
    parent_id TEXT,
    version_num INTEGER DEFAULT 1,
    created_at BIGINT
  )`);

  // 用户头像
  await run(`CREATE TABLE IF NOT EXISTS user_avatars (
    user_id TEXT PRIMARY KEY,
    avatar_data TEXT,
    updated_at BIGINT
  )`);

  // 日志表
  await run(`CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    timestamp TEXT NOT NULL,
    level INTEGER NOT NULL,
    level_name TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id TEXT,
    username TEXT,
    ip TEXT,
    url TEXT,
    method TEXT,
    stack TEXT,
    created_at TEXT
  )`);

  // 索引
  await run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_product_lines_sort ON product_lines(sort_order)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_project_pl_project ON project_product_lines(project_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_project_pl_line ON project_product_lines(product_line_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_project_versions_project ON project_versions(project_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)`);
}

// 初始化
(async () => {
  try {
    // 测试连接
    await pool.query('SELECT 1');
    await initSchema();
    ready = true;
    console.log('[DB] PostgreSQL schema initialized (via pg)');
    readyCallbacks.forEach(cb => cb());
    readyCallbacks = [];
  } catch (e) {
    console.error('[DB] PostgreSQL init error:', e.message);
    ready = true;
    readyCallbacks.forEach(cb => cb());
    readyCallbacks = [];
  }
})();

module.exports = {
  generateId,
  run,
  get,
  all,
  close,
  onDBReady,
  initSchema
};
