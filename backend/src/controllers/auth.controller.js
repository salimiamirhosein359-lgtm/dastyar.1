const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/token');
const prisma = new PrismaClient();

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است' });
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role || 'STUDENT' },
      select: { id: true, name: true, email: true, role: true, avatar: true, bio: true, createdAt: true }
    });
    const token = generateToken(user);
    res.status(201).json({ message: 'ثبت‌نام موفق', user, token });
  } catch (error) {
    res.status(500).json({ error: 'خطا در سرور' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'ایمیل یا رمز عبور اشتباه است' });
    const { password: _, ...safe } = user;
    const token = generateToken(user);
    res.json({ message: 'ورود موفق', user: safe, token });
  } catch (error) {
    res.status(500).json({ error: 'خطا در سرور' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, role: true, avatar: true, bio: true, createdAt: true }
    });
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'خطا در سرور' });
  }
}

async function updateProfile(req, res) {
  try {
    const { name, bio, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { ...(name && { name }), ...(bio && { bio }), ...(avatar && { avatar }) },
      select: { id: true, name: true, email: true, role: true, avatar: true, bio: true, createdAt: true }
    });
    res.json({ message: 'پروفایل بروزرسانی شد', user });
  } catch (error) {
    res.status(500).json({ error: 'خطا در سرور' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'رمز عبور فعلی اشتباه است' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'رمز عبور تغییر کرد' });
  } catch (error) {
    res.status(500).json({ error: 'خطا در سرور' });
  }
}

module.exports = { register, login, getProfile, updateProfile, changePassword };
