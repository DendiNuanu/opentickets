'use server';

import { query } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function signIn(email: string, password: string) {
    try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return { success: false, error: 'Invalid email or password' };
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

        (await cookies()).set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/'
        });

        return { success: true };
    } catch (error) {
        console.error('Sign in error:', error);
        return { success: false, error: 'Authentication failed' };
    }
}

export async function signUp(email: string, password: string, fullName: string, username: string, role = 'USER') {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        await query('BEGIN');

        const userResult = await query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
            [email, hashedPassword]
        );

        const userId = userResult.rows[0].id;

        await query(
            'INSERT INTO profiles (id, full_name, username, role, updated_at) VALUES ($1, $2, $3, $4, NOW())',
            [userId, fullName, username, role]
        );

        await query('COMMIT');

        return { success: true };
    } catch (error: any) {
        await query('ROLLBACK');
        console.error('Sign up error:', error);
        return { success: false, error: error.message || 'Failed to create account' };
    }
}

export async function getCurrentUser() {
    try {
        const token = (await cookies()).get('auth_token')?.value;
        if (!token) return null;

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

        const result = await query(
            'SELECT p.*, u.email FROM profiles p JOIN users u ON p.id = u.id WHERE p.id = $1',
            [decoded.userId]
        );

        return result.rows[0] || null;
    } catch (error) {
        return null;
    }
}

export async function signOut() {
    (await cookies()).delete('auth_token');
    return { success: true };
}

export async function getAllUsers() {
    try {
        const result = await query('SELECT * FROM profiles ORDER BY updated_at DESC');
        return result.rows;
    } catch (error) {
        return [];
    }
}

export async function updateUser(userId: string, data: { fullName?: string, role?: string }) {
    try {
        const fields = [];
        const params = [];
        if (data.fullName) {
            fields.push(`full_name = $${params.length + 1}`);
            params.push(data.fullName);
        }
        if (data.role) {
            fields.push(`role = $${params.length + 1}`);
            params.push(data.role);
        }

        if (fields.length === 0) return { success: true };

        params.push(userId);
        const sql = `UPDATE profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`;
        await query(sql, params);
        return { success: true };
    } catch (error: any) {
        console.error('Update user error:', error);
        return { success: false, error: error.message || 'Failed to update user' };
    }
}

export async function deleteUser(userId: string) {
    try {
        await query('BEGIN');
        await query('DELETE FROM profiles WHERE id = $1', [userId]);
        await query('DELETE FROM users WHERE id = $1', [userId]);
        await query('COMMIT');
        return { success: true };
    } catch (error: any) {
        await query('ROLLBACK');
        console.error('Delete user error:', error);
        return { success: false, error: error.message || 'Failed to delete user' };
    }
}
