
import { Sequelize, DataTypes } from 'sequelize';
import 'dotenv/config';

// File ini mungkin tidak diperlukan jika Abang menggunakan mysql2 langsung di index.js
// Tapi kita perbaiki agar tidak error saat di-load Node.js
const sequelize = new Sequelize(
    process.env.DB_NAME || 'nexus_wms',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

export { sequelize, DataTypes };
