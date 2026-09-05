const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        params: req.params,
        query: req.query
      });

      // Attach only the relevant part
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.params !== undefined) req.params = parsed.params;
      if (parsed.query !== undefined) req.query = parsed.query;

      next();
    } catch (error) {
      if (error.errors && error.errors.length > 0) {
        return res.status(400).json({
          error: error.errors[0].message,
          code: 'VALIDATION_ERROR'
        });
      }
      next(error);
    }
  };
}

module.exports = { validate };
