require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = !!process.env.VERCEL;

// CORS
app.use(cors({
  origin: isProduction ? (process.env.CORS_ORIGIN || '*') : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 安全头
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// Gzip
app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志（Vercel 上跳过，使用 Vercel 自带的 monitoring）
if (!isVercel) {
  app.use('/api', (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (res.statusCode >= 400) {
        console.warn(`API ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });
}

// 静态文件：前端页面（Vercel 上由 public/ 目录自动服务，express.static 会被忽略）
if (!isVercel) {
  app.use(express.static(path.join(__dirname, 'public')));
}

// 数据库（自动检测 Postgres/SQLite）
const db = require('./db/connector');

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/product-lines', require('./routes/product-lines'));
app.use('/api/projects/:id/files', require('./routes/files'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/share', require('./routes/share'));
app.use('/api/projects', require('./routes/members'));
app.use('/api/logs', require('./routes/logs'));

// 评论、头像、统计
app.use('/', require('./routes/comments'));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: process.env.DATABASE_URL ? 'postgres' : 'sqlite', vercel: isVercel });
});

// 前端 SPA 路由回退（Vercel 上 public/ 由 CDN 处理，其他路由由 Express 处理）
if (!isVercel) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件过大，最大支持200MB' });
  }
  res.status(500).json({
    success: false,
    message: isProduction ? '服务器内部错误' : err.message
  });
});

// 只在本地运行时启动服务器（Vercel 上由 serverless 函数处理）
if (!isVercel && require.main === module) {
  function startServer() {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Framo running on http://0.0.0.0:${PORT}`);
    });
  }

  if (db.onDBReady) {
    db.onDBReady(() => {
      console.log('Database ready');
      startServer();
    });
  } else {
    startServer();
  }
}

module.exports = app;
