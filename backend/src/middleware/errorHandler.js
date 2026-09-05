const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

// Global error handler middleware
function errorHandler(err, req, res, next) {
  logger.error(`${err.message} | `, {
    stack: err.stack,
    userId: req.user?.id
  });

  // Prisma known errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'این مقدر قبلاً ثبت شده است', code: 'DUPLICATE_ENTRY' });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'رکورد مورد نظر یافت نشد', code: 'NOT_FOUND' });
  }

  // Default 500
  res.status(err.status || 500).json({
    error: err.message || 'خطای داخلی سرور',
    code: err.code || 'INTERNAL_ERROR'
  });
}

// Not found handler
function notFound(req, res) {
  res.status(404).json({ error: 'endpoint مورد نظر یافت نشد', code: 'ROUTE_NOT_FOUND' });
}

module.exports = { errorHandler, notFound };
