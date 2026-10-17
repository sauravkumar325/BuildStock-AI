import 'dotenv/config';
import { Sequelize } from 'sequelize';
export const db = new Sequelize(process.env.DB_NAME || 'buildstock', process.env.DB_USER || 'buildstock', process.env.DB_PASSWORD || '', {
 host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), dialect: 'mysql',
 logging: false, timezone: '+00:00', pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
 dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {},
 define: { underscored: true }
});
