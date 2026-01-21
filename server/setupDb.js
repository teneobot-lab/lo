
import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  console.log('\n--- 🚀 Nexus WMS Database Setup (ESM) ---');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;

  try {
    console.log(`📡 Connecting to MySQL at ${dbConfig.host}...`);
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connection established.');

    const dbName = process.env.DB_NAME || 'nexus_wms';
    console.log(`🛠️ Ensuring database "${dbName}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName};`);
    await connection.query(`USE ${dbName};`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('⚡ Running schema.sql...');
    await connection.query(schemaSql);
    
    console.log('\n✨ DATABASE SETUP SUCCESSFUL!');
  } catch (err) {
    console.error('\n❌ Setup Failed!');
    console.error(`Error: ${err.message}`);
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

setupDatabase();
