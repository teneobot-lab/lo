
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

  // DIAGNOSTIC LOGGING
  console.log(`ℹ️  Configuration loaded:`);
  console.log(`   - Host: ${dbConfig.host}`);
  console.log(`   - User: ${dbConfig.user}`);
  console.log(`   - Password: ${dbConfig.password ? '****** (Present)' : '(Empty/None)'}`);

  let connection;

  try {
    // 1. Connect to MySQL Server (without selecting DB yet)
    console.log('🔄 Connecting to MySQL Server...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL Server');

    // 2. Read Schema File
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('📖 Read schema.sql');

    // 3. Execute Schema
    console.log('⚙️  Executing Schema...');
    await connection.query(schemaSql);
    
    console.log('✅ Database "nexus_wms" setup completed successfully!');
    console.log('   - Tables created');
    console.log('   - Admin user seeded');

  } catch (err) {
    console.error('\n❌ Database Setup Failed!');
    console.error(`   Code: ${err.code}`);
    console.error(`   Message: ${err.message}`);

    if (err.code === 'ER_ACCESS_DENIED_ERROR' || err.code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR') {
        console.error('\n💡 TROUBLESHOOTING HINT:');
        console.error('   Access Denied usually means incorrect User or Password.');
        console.error('   1. Check your .env file in the server directory.');
        console.error('   2. Verify that DB_PASSWORD matches your MySQL root password.');
        console.error('   3. If you see "(Empty/None)" above but have a password, check your .env syntax.');
        console.error('      Format should be: DB_PASSWORD=yourpassword (no spaces around =)');
    }
    if (err.code === 'ECONNREFUSED') {
        console.error('\n💡 TROUBLESHOOTING HINT:');
        console.error('   Could not connect to MySQL Server.');
        console.error('   1. Is MySQL running?');
        console.error('   2. Is the DB_HOST correct?');
    }
  } finally {
    if (connection) await connection.end();
    process.exit(0);
  }
}

setupDatabase();
