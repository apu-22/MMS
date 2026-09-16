import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { env } from '../config/env';

async function initializeDatabase() {
  console.log('[DB Init] Starting database initialization...');
  console.log(`[DB Init] Target host: ${env.DB_HOST}:${env.DB_PORT}, User: ${env.DB_USER}, DB: ${env.DB_NAME}`);

  let rootConnection: mysql.Connection | null = null;
  let dbConnection: mysql.Connection | null = null;

  try {
    // Step 1: Connect to MySQL server without database to ensure DB exists
    rootConnection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    });

    console.log(`[DB Init] Ensuring database "${env.DB_NAME}" exists...`);
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`[DB Init] Database "${env.DB_NAME}" confirmed.`);
    await rootConnection.end();
    rootConnection = null;

    // Step 2: Connect directly to the database with multipleStatements enabled
    dbConnection = await mysql.createConnection({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      multipleStatements: true,
    });

    // Step 3: Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('[DB Init] Executing schema.sql definitions...');
    await dbConnection.query(schemaSql);
    console.log('[DB Init] Schema execution complete.');

    // Step 4: Verify created tables
    const [rows] = await dbConnection.query('SHOW TABLES;');
    const tables = (rows as any[]).map((r) => Object.values(r)[0]);
    console.log('[DB Init] Verified database tables:');
    tables.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

    console.log('\n[DB Init] Database initialization succeeded with 0 errors! 🎉');
  } catch (error) {
    console.error('\n[DB Init Error] Failed to initialize database:', error);
    process.exit(1);
  } finally {
    if (rootConnection) await rootConnection.end();
    if (dbConnection) await dbConnection.end();
  }
}

initializeDatabase();
