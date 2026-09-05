const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
}

function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateToken, generateShareToken };
