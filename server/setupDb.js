
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Starting Database Setup...');

  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Required to run schema.sql file
  };

  let connection;

  try {
    // 1. Connect to MySQL Server (without selecting DB yet)
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL Server');

    // 2. Read Schema File
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📖 Read schema.sql');

    // 3. Execute Schema
    console.log('⚙️  Executing Schema...');
    await connection.query(schemaSql);
    
    console.log('✅ Database "nexus_wms" setup completed successfully!');
    console.log('   - Tables created');
    console.log('   - Admin user seeded');

  } catch (err) {
    console.error('❌ Database Setup Failed:', err);
  } finally {
    if (connection) await connection.end();
    process.exit();
  }
}

setupDatabase();
