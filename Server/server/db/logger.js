// 日志模块 - 提供日志记录功能
// 日志会先缓存在内存中，达到阈值或定时写入数据库

const db = require('./sqlite');
const fs = require('fs');
const path = require('path');

// 日志级别
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

// 内存中的日志缓存
let logBuffer = [];
let logBufferTimer = null;

// 配置
const BUFFER_SIZE_THRESHOLD = 5;   // 缓存达到 5 条就写入数据库（测试用，生产环境可改回 20）
const BUFFER_TIME_THRESHOLD = 10000; // 10 秒定时写入（测试用，生产环境可改回 30000）
const LOG_FILE_PATH = path.join(__dirname, '..', 'logs'); // 日志文件目录

// 确保日志目录存在
if (!fs.existsSync(LOG_FILE_PATH)) {
  fs.mkdirSync(LOG_FILE_PATH, { recursive: true });
}

// 初始化日志表
function initLogTable() {
  db.onDBReady(() => {
    try {
      // 检查表是否存在
      const tables = db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='logs'");
      if (tables.length === 0) {
        // 创建日志表
        db.run(`
          CREATE TABLE logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            created_at TEXT NOT NULL
          )
        `);
        console.log('[Logger] Created logs table');
      }

      // 检查并添加新版字段（兼容旧表）
      try {
        db.get("SELECT url FROM logs LIMIT 1");
      } catch (e) {
        // 字段不存在，添加新列
        db.run("ALTER TABLE logs ADD COLUMN user_id TEXT");
        db.run("ALTER TABLE logs ADD COLUMN username TEXT");
        db.run("ALTER TABLE logs ADD COLUMN ip TEXT");
        db.run("ALTER TABLE logs ADD COLUMN url TEXT");
        db.run("ALTER TABLE logs ADD COLUMN method TEXT");
        db.run("ALTER TABLE logs ADD COLUMN stack TEXT");
        console.log('[Logger] Added new columns to logs table');
      }
    } catch (e) {
      console.error('[Logger] initLogTable error:', e.message);
    }
  });
}

// 生成 ISO 时间戳
function getTimestamp() {
  return new Date().toISOString();
}

// 格式化日志消息
function formatMessage(level, message, meta = {}) {
  const timestamp = getTimestamp();
  const levelName = LEVEL_NAMES[level] || 'INFO';
  
  let formatted = `[${timestamp}] [${levelName}]`;
  
  if (meta.username) {
    formatted += ` [${meta.username}]`;
  }
  
  if (meta.url) {
    formatted += ` ${meta.method || 'GET'} ${meta.url}`;
  }
  
  formatted += `: ${message}`;
  
  if (meta.stack) {
    formatted += `\n${meta.stack}`;
  }
  
  return formatted;
}

// 写入日志文件（作为备份）
function writeToFile(logEntry) {
  const date = new Date().toISOString().split('T')[0];
  const fileName = path.join(LOG_FILE_PATH, `app-${date}.log`);
  const line = formatMessage(logEntry.level, logEntry.message, logEntry) + '\n';
  
  fs.appendFileSync(fileName, line, 'utf8');
}

// 将缓存的日志写入数据库
function flushLogs() {
  if (logBuffer.length === 0) return;
  
  const logsToWrite = [...logBuffer];
  logBuffer = [];
  
  db.onDBReady(() => {
    try {
      // 使用事务批量插入
      logsToWrite.forEach(entry => {
        db.run(`
          INSERT INTO logs (timestamp, level, level_name, message, user_id, username, ip, url, method, stack, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          entry.timestamp,
          entry.level,
          entry.level_name,
          entry.message,
          entry.user_id || null,
          entry.username || null,
          entry.ip || null,
          entry.url || null,
          entry.method || null,
          entry.stack || null,
          entry.timestamp
        ]);
      });
      
      console.log(`[Logger] Flushed ${logsToWrite.length} log entries to database`);
    } catch (e) {
      console.error('[Logger] flushLogs error:', e.message);
      // 如果写入失败，把日志重新放回缓冲区（避免丢失）
      logBuffer = [...logsToWrite, ...logBuffer].slice(0, 100);
    }
  });
}

// 启动定时刷新定时器
function startBufferTimer() {
  if (logBufferTimer) return;
  
  logBufferTimer = setInterval(() => {
    flushLogs();
  }, BUFFER_TIME_THRESHOLD);
  
  // 进程退出时刷新
  process.on('exit', () => flushLogs());
  process.on('SIGINT', () => { flushLogs(); process.exit(); });
  process.on('SIGTERM', () => { flushLogs(); process.exit(); });
}

// 核心日志函数
function log(level, message, meta = {}) {
  const entry = {
    timestamp: getTimestamp(),
    level: level,
    level_name: LEVEL_NAMES[level] || 'INFO',
    message: typeof message === 'string' ? message : JSON.stringify(message),
    user_id: meta.user_id || null,
    username: meta.username || null,
    ip: meta.ip || null,
    url: meta.url || null,
    method: meta.method || null,
    stack: meta.stack || null
  };
  
  // 同时输出到控制台
  const consoleMethod = level >= LOG_LEVEL.ERROR ? 'error' : 
                        level >= LOG_LEVEL.WARN ? 'warn' : 'log';
  console[consoleMethod](formatMessage(level, entry.message, meta));
  
  // 写入文件备份
  writeToFile(entry);
  
  // 添加到内存缓存
  logBuffer.push(entry);
  
  // 达到阈值时刷新到数据库
  if (logBuffer.length >= BUFFER_SIZE_THRESHOLD) {
    flushLogs();
  }
  
  // 确保定时器在运行
  startBufferTimer();
}

// 导出便捷方法
function debug(message, meta = {}) {
  log(LOG_LEVEL.DEBUG, message, meta);
}

function info(message, meta = {}) {
  log(LOG_LEVEL.INFO, message, meta);
}

function warn(message, meta = {}) {
  log(LOG_LEVEL.WARN, message, meta);
}

function error(message, meta = {}) {
  // 如果是 Error 对象，提取堆栈
  if (message instanceof Error) {
    meta.stack = message.stack;
    message = message.message;
  }
  log(LOG_LEVEL.ERROR, message, meta);
}

// 从 Express 请求中提取元信息
function getMetaFromRequest(req, additionalMeta = {}) {
  const meta = { ...additionalMeta };
  
  if (req) {
    meta.ip = req.ip || req.connection?.remoteAddress || null;
    meta.url = req.originalUrl || req.url || null;
    meta.method = req.method || null;
    
    // 尝试从 token 中获取用户信息
    if (req.user) {
      meta.user_id = req.user.id || null;
      meta.username = req.user.username || null;
    }
  }
  
  return meta;
}

// 查询日志（用于后台查看）
function queryLogs(options = {}) {
  return new Promise((resolve, reject) => {
    db.onDBReady(() => {
      try {
        let sql = 'SELECT * FROM logs WHERE 1=1';
        const params = [];
        
        if (options.level !== undefined) {
          sql += ' AND level = ?';
          params.push(options.level);
        }
        
        if (options.user_id) {
          sql += ' AND user_id = ?';
          params.push(options.user_id);
        }
        
        if (options.startTime) {
          sql += ' AND timestamp >= ?';
          params.push(options.startTime);
        }
        
        if (options.endTime) {
          sql += ' AND timestamp <= ?';
          params.push(options.endTime);
        }
        
        if (options.keyword) {
          sql += ' AND message LIKE ?';
          params.push(`%${options.keyword}%`);
        }
        
        sql += ' ORDER BY timestamp DESC';
        
        if (options.limit) {
          sql += ' LIMIT ?';
          params.push(options.limit);
        }
        
        const logs = db.all(sql, params);
        resolve(logs);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// 清理旧日志（保留最近 N 天）
function cleanOldLogs(daysToKeep = 30) {
  return new Promise((resolve, reject) => {
    db.onDBReady(() => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffStr = cutoffDate.toISOString();
        
        const result = db.run('DELETE FROM logs WHERE timestamp < ?', [cutoffStr]);
        resolve(result.changes);
      } catch (e) {
        reject(e);
      }
    });
  });
}

// 初始化
initLogTable();

module.exports = {
  LOG_LEVEL,
  debug,
  info,
  warn,
  error,
  log,
  getMetaFromRequest,
  queryLogs,
  cleanOldLogs,
  flushLogs
};
