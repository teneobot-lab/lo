
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  console.log('\n' + '='.repeat(50));
  console.log('🔥 NEXUS WMS - TOTAL DATABASE RESET & SETUP');
  console.log('='.repeat(50));

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  const dbName = process.env.DB_NAME || 'nexus_wms';
  let connection;

  try {
    console.log(`📡 Menghubungkan ke MySQL (${dbConfig.host})...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Terhubung.');

    console.log(`⚠️  MENGHAPUS DATABASE LAMA "${dbName}" (Wiping all data)...`);
    await connection.query(`DROP DATABASE IF EXISTS ${dbName};`);
    console.log('✅ Database lama berhasil dihapus.');

    console.log(`🛠️  Membuat Database baru "${dbName}"...`);
    await connection.query(`CREATE DATABASE ${dbName};`);
    await connection.query(`USE ${dbName};`);
    console.log('✅ Database baru siap.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`File schema.sql tidak ditemukan!`);
    }
    
    console.log('⚡ Menjalankan skema tabel (schema.sql)...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    
    console.log('✅ Tabel Items, Transactions, Users, & Reject Logs dibuat.');
    console.log('✅ User default (admin & staff) ditambahkan (Password: 12345).');
    
    console.log('\n✨ RESET & SETUP SELESAI!');
    console.log('==========================================');
    console.log(`🚀 Jalankan server: pm2 restart index`);
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    console.error('\n❌ RESET GAGAL!');
    console.error(`Error: ${err.message}`);
  } finally {
    if (connection) {
        await connection.end();
        console.log('🔌 Koneksi ditutup.');
    }
    process.exit(0);
  }
}

setupDatabase();
