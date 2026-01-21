
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  console.log('\n==========================================');
  console.log('🚀 NEXUS WMS - DATABASE AUTO SETUP');
  console.log('==========================================');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Penting untuk menjalankan banyak SQL sekaligus
  };

  let connection;

  try {
    console.log(`📡 Mencoba koneksi ke MySQL di: ${dbConfig.host}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Koneksi MySQL Berhasil.');

    const dbName = process.env.DB_NAME || 'nexus_wms';
    console.log(`🛠️  Memastikan Database "${dbName}" tersedia...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName};`);
    await connection.query(`USE ${dbName};`);
    console.log(`✅ Database "${dbName}" siap digunakan.`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`File schema.sql tidak ditemukan di: ${schemaPath}`);
    }
    
    console.log('⚡ Membaca dan menjalankan schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Menjalankan seluruh script schema.sql
    await connection.query(schemaSql);
    
    console.log('✅ Semua tabel (users, items, transactions, reject) berhasil dibuat.');
    console.log('✅ Data awal Admin & Staff berhasil dimasukkan.');
    
    console.log('\n✨ SETUP DATABASE SELESAI DENGAN SUKSES!');
    console.log('💡 Silakan jalankan "pm2 restart index" untuk mulai menggunakan.');
    console.log('==========================================\n');

  } catch (err) {
    console.error('\n❌ SETUP GAGAL!');
    console.error(`Pesan Error: ${err.message}`);
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.error('💡 Tip: Periksa password MySQL di file .env server!');
    }
  } finally {
    if (connection) {
        await connection.end();
        console.log('🔌 Koneksi ditutup.');
    }
    process.exit(0);
  }
}

setupDatabase();
