import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { Sequelize } from 'sequelize';

const sslEnabled = process.env.DB_SSL === 'true';

const sslOptions = sslEnabled
  ? {
      rejectUnauthorized: true,
      ...(process.env.DB_SSL_CA_PATH
        ? {
            ca: readFileSync(process.env.DB_SSL_CA_PATH, 'utf8'),
          }
        : {}),
    }
  : undefined;

export const db = new Sequelize(
  process.env.DB_NAME || 'buildstock',
  process.env.DB_USER || 'buildstock',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: sslEnabled ? { ssl: sslOptions } : {},
    define: { underscored: true },
  }
);