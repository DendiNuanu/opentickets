import { Pool } from 'pg';

if (process.env.NODE_ENV === 'production') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for DigitalOcean managed Postgres
    }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
