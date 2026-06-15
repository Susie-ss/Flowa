// Vercel Serverless API 入口
let app;

try {
  app = require('../index');
} catch (e) {
  console.error('[API] Failed to load app:', e.message, e.stack);
  app = (req, res) => {
    res.status(500).json({
      error: 'Server initialization failed',
      message: e.message,
      stack: process.env.NODE_ENV !== 'production' ? e.stack : undefined
    });
  };
}

module.exports = (req, res) => {
  return app(req, res);
};
