import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Get admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  if (!adminEmail || !adminPassword) {
    console.log('⚠️  ADMIN_EMAIL and ADMIN_PASSWORD not set in environment');
    console.log('   Skipping admin user creation.');
    console.log('   Set these in your .env file to create an admin user.');
    return;
  }

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });

  if (existingAdmin) {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(adminPassword, salt);

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: adminName,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Admin user created successfully:`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   Name: ${admin.name}`);
  console.log(`   Role: ${admin.role}`);
  console.log(`   ID: ${admin.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
