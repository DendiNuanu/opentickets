require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initDb() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to PostgreSQL...');
        const schema = fs.readFileSync(path.join(__dirname, '..', 'pg_schema.sql'), 'utf8');

        console.log('Running schema migration...');
        await pool.query(schema);

        console.log('Schema migration completed successfully!');

        // Check if tables exist
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        console.log('Tables created:', res.rows.map(r => r.table_name).join(', '));

    } catch (err) {
        console.error('Error migrating schema:', err);
    } finally {
        await pool.end();
    }
}

initDb();
