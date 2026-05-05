import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@eves.io' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@eves.io',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // Create demo customer
  const customerPassword = await bcrypt.hash('user123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'user@eves.io' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@eves.io',
      password: customerPassword,
      role: 'CUSTOMER',
    },
  });
  console.log(`Customer user: ${customer.email}`);

  // Create demo events
  const trainEvent = await prisma.event.create({
    data: {
      title: 'Mumbai Rajdhani Express',
      type: 'TRAIN',
      source: 'Mumbai Central',
      destination: 'New Delhi',
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      totalSeats: 80,
      rows: 10,
      columns: 8,
    },
  });

  const cinemaEvent = await prisma.event.create({
    data: {
      title: 'Avengers: Secret Wars - IMAX',
      type: 'CINEMA',
      venue: 'PVR IMAX Phoenix Mall',
      eventDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      totalSeats: 150,
      rows: 15,
      columns: 10,
    },
  });

  const stadiumEvent = await prisma.event.create({
    data: {
      title: 'IPL Final 2026 - CSK vs MI',
      type: 'STADIUM',
      venue: 'Wankhede Stadium, Mumbai',
      eventDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      totalSeats: 200,
      rows: 20,
      columns: 10,
    },
  });

  // Generate seats for each event
  for (const event of [trainEvent, cinemaEvent, stadiumEvent]) {
    const seats = [];
    for (let r = 0; r < event.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= event.columns; c++) {
        seats.push({
          eventId: event.id,
          seatNumber: `${rowLabel}${c}`,
          rowLabel,
          columnNumber: c,
          status: 'AVAILABLE' as const,
        });
      }
    }
    await prisma.seat.createMany({ data: seats });
    console.log(`Generated ${seats.length} seats for: ${event.title}`);
  }

  console.log('Seed completed!');
  console.log('\nLogin credentials:');
  console.log('  Admin: admin@eves.io / admin123');
  console.log('  User:  user@eves.io / user123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
