require('dotenv').config();

module.exports = {
  port:           process.env.PORT           || 3001,
  dbPath:         process.env.DB_PATH        || './expenses.db',
  nodeEnv:        process.env.NODE_ENV       || 'development',
  allowedOrigin:  process.env.ALLOWED_ORIGIN || '*',
};
