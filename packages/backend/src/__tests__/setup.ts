import { prisma } from '../db';

// Setup test database
beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data before each test
  await cleanupTestData();
});

async function cleanupTestData() {
  // Delete test data in correct order (respecting foreign keys)
  await prisma.session.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test'
        }
      }
    }
  });

  await prisma.subscription.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test'
        }
      }
    }
  });

  await prisma.refreshToken.deleteMany({
    where: {
      user: {
        email: {
          contains: 'test'
        }
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test'
      }
    }
  });
}