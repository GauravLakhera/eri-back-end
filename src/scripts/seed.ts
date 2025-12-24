import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Client } from '../modules/clients/schemas/client.schema';
import { User } from '../modules/users/schemas/user.schema';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const clientModel = app.get<Model<Client>>(getModelToken(Client.name));
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  console.log('🌱 Starting seed...\n');

  // Create Superadmin Client
  let superadminClient = await clientModel.findOne({ code: 'SUPERADMIN' });
  if (!superadminClient) {
    superadminClient = await clientModel.create({
      name: 'Superadmin',
      code: 'SUPERADMIN',
      isActive: true,
    });
    console.log('✅ Created superadmin client');
  } else {
    console.log('ℹ️  Superadmin client already exists');
  }

  // Create Superadmin User
  const superadminEmail = 'superadmin@eritax.com';
  let superadminUser = await userModel.findOne({ email: superadminEmail });
  if (!superadminUser) {
    superadminUser = await userModel.create({
      clientId: superadminClient._id,
      email: superadminEmail,
      passwordHash: await bcrypt.hash('SuperAdmin@123', 10),
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPERADMIN',
      isActive: true,
    });
    console.log('✅ Created superadmin user');
  } else {
    console.log('ℹ️  Superadmin user already exists');
  }

  // Create Demo Client
  let demoClient = await clientModel.findOne({ code: 'DEMO' });
  if (!demoClient) {
    demoClient = await clientModel.create({
      name: 'Demo Tax Consultancy',
      code: 'DEMO',
      isActive: true,
      email: 'contact@demo.com',
      phone: '+91-9876543210',
      address: '123 Business Park, Mumbai, Maharashtra 400001',
    });
    console.log('✅ Created demo client');
  } else {
    console.log('ℹ️  Demo client already exists');
  }

  // Create Client Admin for Demo
  const adminEmail = 'admin@demo.com';
  let adminUser = await userModel.findOne({ email: adminEmail });
  if (!adminUser) {
    adminUser = await userModel.create({
      clientId: demoClient._id,
      email: adminEmail,
      passwordHash: await bcrypt.hash('Admin@123', 10),
      firstName: 'Admin',
      lastName: 'User',
      role: 'CLIENT_ADMIN',
      isActive: true,
    });
    console.log('✅ Created client admin user');
  } else {
    console.log('ℹ️  Client admin user already exists');
  }

  // Create Preparer User
  const preparerEmail = 'preparer@demo.com';
  let preparerUser = await userModel.findOne({ email: preparerEmail });
  if (!preparerUser) {
    preparerUser = await userModel.create({
      clientId: demoClient._id,
      email: preparerEmail,
      passwordHash: await bcrypt.hash('Preparer@123', 10),
      firstName: 'John',
      lastName: 'Preparer',
      role: 'PREPARER',
      isActive: true,
    });
    console.log('✅ Created preparer user');
  } else {
    console.log('ℹ️  Preparer user already exists');
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 Seed completed successfully!');
  console.log('='.repeat(70));
  console.log('\nLogin credentials:\n');
  console.log('Superadmin:');
  console.log('  Email:    superadmin@eritax.com');
  console.log('  Password: SuperAdmin@123\n');
  console.log('Client Admin (Demo):');
  console.log('  Email:    admin@demo.com');
  console.log('  Password: Admin@123\n');
  console.log('Preparer (Demo):');
  console.log('  Email:    preparer@demo.com');
  console.log('  Password: Preparer@123\n');

  await app.close();
  process.exit(0);
}

bootstrap().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});