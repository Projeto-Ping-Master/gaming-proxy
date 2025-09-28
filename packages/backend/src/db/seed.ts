import { prisma } from './index';
import logger from '../utils/logger';

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Seed popular games
    const games = [
      {
        gameId: 'valorant',
        name: 'Valorant',
        processKeywords: ['valorant.exe', 'valorant-win64-shipping.exe'],
        defaultPorts: [7000, 7001, 7002, 7003, 7004, 7005, 7006, 7007, 7008, 7009]
      },
      {
        gameId: 'lol',
        name: 'League of Legends',
        processKeywords: ['league of legends.exe', 'leagueclient.exe'],
        defaultPorts: [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009]
      },
      {
        gameId: 'csgo',
        name: 'Counter-Strike 2',
        processKeywords: ['cs2.exe', 'csgo.exe'],
        defaultPorts: [27015, 27016, 27017, 27018, 27019]
      },
      {
        gameId: 'fortnite',
        name: 'Fortnite',
        processKeywords: ['fortniteclient-win64-shipping.exe'],
        defaultPorts: [9000, 9001, 9002, 9003, 9004]
      },
      {
        gameId: 'apex',
        name: 'Apex Legends',
        processKeywords: ['r5apex.exe'],
        defaultPorts: [37015, 37016, 37017]
      },
      {
        gameId: 'warzone',
        name: 'Call of Duty: Warzone',
        processKeywords: ['modernwarfare.exe', 'warzone.exe'],
        defaultPorts: [3074, 53, 88]
      },
      {
        gameId: 'fifa',
        name: 'EA FC 24',
        processKeywords: ['fc24.exe', 'fifa24.exe'],
        defaultPorts: [3659, 9565, 9570]
      },
      {
        gameId: 'pubg',
        name: 'PUBG',
        processKeywords: ['tslgame.exe'],
        defaultPorts: [7000, 7001, 7002]
      }
    ];

    for (const game of games) {
      await prisma.game.upsert({
        where: { gameId: game.gameId },
        update: game,
        create: game
      });
    }

    // Seed servers
    const servers = [
      {
        region: 'São Paulo',
        ip: '191.232.139.10',
        port: 8080,
        capacity: 1000,
        weight: 100,
        status: 'online'
      },
      {
        region: 'Rio de Janeiro',
        ip: '177.154.102.20',
        port: 8080,
        capacity: 800,
        weight: 90,
        status: 'online'
      },
      {
        region: 'Brasília',
        ip: '164.41.98.30',
        port: 8080,
        capacity: 600,
        weight: 80,
        status: 'online'
      },
      {
        region: 'Miami',
        ip: '173.252.74.40',
        port: 8080,
        capacity: 1200,
        weight: 85,
        status: 'online'
      },
      {
        region: 'Virginia',
        ip: '52.86.145.50',
        port: 8080,
        capacity: 1500,
        weight: 95,
        status: 'online'
      },
      {
        region: 'São Paulo 2',
        ip: '191.232.140.60',
        port: 8080,
        capacity: 900,
        weight: 88,
        status: 'maintenance'
      }
    ];

    for (const server of servers) {
      const existingServer = await prisma.server.findFirst({
        where: { ip: server.ip }
      });

      if (!existingServer) {
        await prisma.server.create({
          data: server
        });
      }
    }

    logger.info('Database seeded successfully');
  } catch (error) {
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();