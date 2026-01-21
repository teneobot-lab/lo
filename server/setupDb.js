
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env manual to ensure variables are available
const loadEnv = () => {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...val] = line.split('=');
      if (key && val.length > 0) process.env[key.trim()] = val.join('=').trim();
    });
  }
};
loadEnv();

async function init() {
  console.log('\n' + '═'.repeat(60));
  console.log(' 💎 NEXUS WMS - TOTAL SYSTEM RESET');
  console.log('═'.repeat(60));

  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };
  const dbName = process.env.DB_NAME || 'nexus_wms';

  let conn;
  try {
    console.log(`📡 Menghubungkan ke MySQL (${config.host}) sebagai [${config.user}]...`);
    conn = await mysql.createConnection(config);
    console.log('✅ Koneksi Server Terbuka.');

    console.log(`🗑️  Menghapus Database "${dbName}"...`);
    await conn.query(`DROP DATABASE IF EXISTS ${dbName};`);
    
    console.log(`🏗️  Membangun Database Baru "${dbName}"...`);
    await conn.query(`CREATE DATABASE ${dbName};`);
    await conn.query(`USE ${dbName};`);
    console.log('✅ Database Berhasil Dibuat.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('⚡ Mengimpor Skema Tabel (schema.sql)...');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await conn.query(sql);
      console.log('✅ Semua Tabel & Data Awal Berhasil Diimpor.');
    } else {
      console.warn('⚠️  Peringatan: File schema.sql tidak ditemukan!');
    }

    console.log('\n✨ RESET SELESAI! SISTEM SEKARANG BERSIH.');
    console.log('═'.repeat(60));
    console.log('👉 Perintah selanjutnya: pm2 restart all');
    console.log('═'.repeat(60) + '\n');

  } catch (err) {
    console.error('\n❌ GAGAL TOTAL!');
    console.error(`Pesan Error: ${err.message}`);
    
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n💡 SOLUSI ERROR 1410 / ACCESS DENIED:');
      console.log('1. Jalankan: sudo mysql');
      console.log(`2. Ketik: GRANT ALL PRIVILEGES ON *.* TO '${config.user}'@'${config.host}' WITH GRANT OPTION;`);
      console.log('3. Ketik: FLUSH PRIVILEGES;');
      console.log('4. Lalu jalankan script ini lagi.\n');
    }
  } finally {
    if (conn) await conn.end();
    process.exit(0);
  }
}

init();
