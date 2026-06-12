require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || (() => {
  try {
    const cfgPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      return cfg.port || 3000;
    }
  } catch(e) {}
  return 3000;
})();

const isProduction = process.env.NODE_ENV === 'production';

// 生产环境：抑制 console.log，统一用 logger
if (isProduction) {
  const originalLog = console.log;
  console.log = function(...args) {
    // 只保留启动关键信息
    if (args[0] && typeof args[0] === 'string' && args[0].includes('running')) {
      originalLog.apply(console, args);
    }
  };
}

// 日志模块
const logger = require('./db/logger');

// ===== 安全与性能中间件 =====

// CORS：开发环境全开放，生产环境可配置白名单
const corsOrigin = process.env.CORS_ORIGIN || (isProduction ? false : true);
app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 安全头
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },  // 允许跨域加载资源
  contentSecurityPolicy: false  // 预览页面可能包含内联脚本
}));

// Gzip 压缩
app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志中间件（记录所有 API 请求）
app.use('/api', (req, res, next) => {
  const start = Date.now();
  
  // 响应完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = logger.getMetaFromRequest(req);
    meta.duration = duration;
    
    // 只记录非成功的响应或关键操作
    if (res.statusCode >= 400) {
      logger.warn(`API ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, meta);
    } else if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      // 记录写操作
      logger.info(`API ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`, meta);
    }
  });
  
  next();
});

// 静态文件：前端页面
app.use(express.static(path.join(__dirname, 'public')));

// 确保 previewCache 目录存在
const previewCacheDir = path.join(__dirname, '..', 'previewCache', 'projects');
if (!fs.existsSync(previewCacheDir)) {
  fs.mkdirSync(previewCacheDir, { recursive: true });
  console.log('Created previewCache directory');
}

// 加载数据库模块（异步初始化）
const db = require('./db/connector');

// SQLite 建表语句（按顺序执行）
const schemaStatements = [
  // 用户表
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    status INTEGER DEFAULT 1,
    last_login_ip TEXT,
    last_login_at INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  )`,
  // 产品线表
  `CREATE TABLE IF NOT EXISTS product_lines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#5B5EF4',
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER
  )`,
  // 项目表
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    share_permission INTEGER DEFAULT 0,
    share_password TEXT DEFAULT NULL,
    share_expiry_days INTEGER DEFAULT NULL,
    pages_json TEXT,
    version_num INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  )`,
  // 项目-产品线关系表
  `CREATE TABLE IF NOT EXISTS project_product_lines (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    product_line_id TEXT NOT NULL,
    created_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE,
    UNIQUE(project_id, product_line_id)
  )`,
  // 协作成员表
  `CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    invited_by TEXT NOT NULL,
    invited_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(project_id, user_id)
  )`,
  // 刷新令牌表（id 保留 INTEGER，此为边缘表）
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  // 项目版本记录表
  `CREATE TABLE IF NOT EXISTS project_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version_num INTEGER NOT NULL,
    pages_json TEXT,
    created_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  )`,
  // 评论表
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    page_path TEXT,
    content TEXT NOT NULL,
    parent_id TEXT,
    version_num INTEGER DEFAULT 1,
    created_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
  )`,
  // 用户头像表
  `CREATE TABLE IF NOT EXISTS user_avatars (
    user_id TEXT PRIMARY KEY,
    avatar_data TEXT,
    updated_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  // 索引
  `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
  `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)`,
  `CREATE INDEX IF NOT EXISTS idx_product_lines_sort ON product_lines(sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token)`,
  `CREATE INDEX IF NOT EXISTS idx_pl_project ON project_product_lines(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pl_line ON project_product_lines(product_line_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pm_user ON project_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rt_token ON refresh_tokens(token)`,
  `CREATE INDEX IF NOT EXISTS idx_rt_user ON refresh_tokens(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rt_expires ON refresh_tokens(expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_pv_project ON project_versions(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)`,
  // 项目表 color 字段索引
  `CREATE INDEX IF NOT EXISTS idx_projects_color ON projects(color)`
];

// 使用同步循环初始化数据库（在 dbReady 后）
function initSchemaSync() {
  console.log(`Starting sync schema initialization (${schemaStatements.length} statements)...`);
  
  for (let i = 0; i < schemaStatements.length; i++) {
    const stmt = schemaStatements[i];
    try {
      db.run(stmt);
      console.log(`Executed ${i + 1}/${schemaStatements.length}: ${stmt.substring(0, 50)}...`);
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log(`Skipped ${i + 1}/${schemaStatements.length} (already exists)`);
      } else {
        console.error(`Error executing statement ${i + 1}:`, e.message);
        console.error('Statement:', stmt.substring(0, 100));
      }
    }
  }

  // 数据库迁移：先检查列是否存在，避免 duplicate column 报错
  const columnMigrations = [
    { table: 'projects', col: 'version_num', sql: `ALTER TABLE projects ADD COLUMN version_num INTEGER DEFAULT 0` },
    { table: 'project_product_lines', col: 'user_id', sql: `ALTER TABLE project_product_lines ADD COLUMN user_id TEXT` },
    { table: 'product_lines', col: 'owner_id', sql: `ALTER TABLE product_lines ADD COLUMN owner_id TEXT` },
    { table: 'users', col: 'nickname', sql: `ALTER TABLE users ADD COLUMN nickname TEXT` },
    { table: 'projects', col: 'color', sql: `ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#5B5EF4'` },
    { table: 'projects', col: 'share_password', sql: `ALTER TABLE projects ADD COLUMN share_password TEXT DEFAULT NULL` },
    { table: 'projects', col: 'share_expiry_days', sql: `ALTER TABLE projects ADD COLUMN share_expiry_days INTEGER DEFAULT NULL` },
  ];
  for (const m of columnMigrations) {
    try {
      const cols = db.all(`PRAGMA table_info(${m.table})`);
      const exists = cols.some(c => c.name === m.col);
      if (!exists) {
        db.run(m.sql);
        console.log('Migration:', m.sql.substring(0, 60));
      }
    } catch (e) {
      console.error('Migration error:', e.message);
    }
  }

  // 旧数据修复
  const dataFixes = [
    `UPDATE product_lines SET owner_id = (SELECT p.owner_id FROM projects p INNER JOIN project_product_lines ppl ON p.id = ppl.project_id WHERE ppl.product_line_id = product_lines.id LIMIT 1) WHERE owner_id IS NULL AND id != 'uncategori'`,
    `UPDATE projects SET version_num = 0 WHERE pages_json IS NULL`,
    `UPDATE projects SET color = '#5B5EF4' WHERE color IS NULL`,
  ];
  for (const fix of dataFixes) {
    try { db.run(fix); console.log('Data fix:', fix.substring(0, 60)); }
    catch (e) { console.log('Data fix skip:', e.message); }
  }
  
  // 检查数据库中的表
  try {
    const tables = db.all("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables after schema initialization:', JSON.stringify(tables));
  } catch(e) {
    console.error('Cannot query tables:', e.message);
  }
  
  console.log('Schema initialization complete (sync)');
}

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/product-lines', require('./routes/product-lines'));
// files 必须在 projects 之前，否则 projects 的 authMiddleware 会拦截
app.use('/api/projects/:id/files', require('./routes/files'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/share', require('./routes/share'));
app.use('/api/projects', require('./routes/members'));
app.use('/api/logs', require('./routes/logs'));  // 日志查询路由

// 评论、头像、统计（部分路由带 /api/ 前缀，由内部处理）
const commentsModule = require('./routes/comments');
app.use('/', commentsModule.router);

// 前端 SPA 路由回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件（必须放在最后）
app.use((err, req, res, next) => {
  const meta = logger.getMetaFromRequest(req);
  
  // 生产环境不暴露堆栈
  if (!isProduction) {
    meta.stack = err.stack;
  }
  
  // multer 文件过大错误（如果在其他路由中出现）
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件过大，最大支持200MB' });
  }
  
  logger.error(`Unhandled error: ${err.message}`, meta);
  
  res.status(500).json({
    success: false,
    message: isProduction ? '服务器内部错误' : err.message
  });
});

// 启动服务器
function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Axure Review Platform running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// 检查数据库是否就绪
if (db.onDBReady) {
  db.onDBReady(() => {
    console.log('Database ready, initializing schema synchronously...');
    initSchemaSync();
    console.log('Starting server...');
    startServer();
  });
} else {
  // 如果 onDBReady 不存在，直接初始化并启动
  initSchemaSync();
  startServer();
}
