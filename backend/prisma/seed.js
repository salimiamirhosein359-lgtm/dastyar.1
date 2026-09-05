const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@dastyar.ir' },
    update: {},
    create: {
      name: 'مدیر سیستم',
      email: 'admin@dastyar.ir',
      password: hashedPassword,
      role: 'ADMIN',
      bio: 'مدیر پلتفرم دستیار آموزشی'
    }
  });

  // Create professor user
  await prisma.user.upsert({
    where: { email: 'prof@dastyar.ir' },
    update: {},
    create: {
      name: 'دکتر احمدی',
      email: 'prof@dastyar.ir',
      password: hashedPassword,
      role: 'PROFESSOR',
      bio: 'استاد مهندسی کامپیوتر'
    }
  });

  // Create student user
  await prisma.user.upsert({
    where: { email: 'student@dastyar.ir' },
    update: {},
    create: {
      name: 'علی محمدی',
      email: 'student@dastyar.ir',
      password: hashedPassword,
      role: 'STUDENT',
      bio: 'دانشجوی کارشناسی کامپیوتر'
    }
  });

  console.log('✅ Database seeded successfully');
  console.log('All users password: Admin@123');
  console.log('Admin: admin@dastyar.ir');
  console.log('Professor: prof@dastyar.ir');
  console.log('Student: student@dastyar.ir');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.());
