'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function getTickets(status?: string, driverId?: string) {
    try {
        let sql = 'SELECT * FROM tickets';
        const params = [];

        const conditions = [];
        if (status && status !== 'USERS') {
            conditions.push(`status = $${params.length + 1}`);
            params.push(status === 'DONE' ? 'CLOSED' : status);
        }
        if (driverId) {
            conditions.push(`driver_id = $${params.length + 1}`);
            params.push(driverId);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC';

        const result = await query(sql, params);
        return result.rows;
    } catch (error) {
        console.error('Error fetching tickets:', error);
        return [];
    }
}

export async function createTicket(data: {
    title: string;
    description: string;
    topic: string;
    contact_email?: string;
    contact_phone?: string;
    driver_id?: string;
    priority?: string;
    image_url?: string;
}) {
    try {
        const sql = `
      INSERT INTO tickets (title, description, topic, contact_email, contact_phone, driver_id, priority, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        const params = [
            data.title,
            data.description,
            data.topic,
            data.contact_email,
            data.contact_phone,
            data.driver_id,
            data.priority || 'MEDIUM',
            data.image_url
        ];

        const result = await query(sql, params);

        // Create a notification for the new ticket
        await query(`
      INSERT INTO notifications (ticket_id, title, content)
      VALUES ($1, $2, $3)
    `, [result.rows[0].id, 'New Ticket Created', `A new ticket "${data.title}" has been submitted.`]);

        revalidatePath('/dashboard');
        return { success: true, ticket: result.rows[0] };
    } catch (error) {
        console.error('Error creating ticket:', error);
        return { success: false, error: 'Failed to create ticket' };
    }
}

export async function updateTicketStatus(ticketId: string, status: string) {
    try {
        await query('UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2', [status, ticketId]);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error updating status:', error);
        return { success: false };
    }
}

export async function getNotifications() {
    try {
        const result = await query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10');
        return result.rows;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

export async function markAllAsRead() {
    try {
        await query('UPDATE notifications SET is_read = true WHERE is_read = false');
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return { success: false };
    }
}

export async function getComments(ticketId: string) {
    try {
        const sql = `
            SELECT m.*, p.full_name, p.role
            FROM messages m
            LEFT JOIN profiles p ON m.user_id = p.id
            WHERE m.ticket_id = $1
            ORDER BY m.created_at ASC
        `;
        const result = await query(sql, [ticketId]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
}

export async function createComment(ticketId: string, content: string, userId?: string) {
    try {
        const result = await query(
            'INSERT INTO messages (ticket_id, content, user_id) VALUES ($1, $2, $3) RETURNING *',
            [ticketId, content, userId]
        );
        revalidatePath('/dashboard');
        return { success: true, comment: result.rows[0] };
    } catch (error) {
        console.error('Error creating comment:', error);
        return { success: false };
    }
}

export async function updateTicketPriority(ticketId: string, priority: string) {
    try {
        await query('UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = $2', [priority, ticketId]);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error updating priority:', error);
        return { success: false };
    }
}
export async function updateTicket(ticketId: string, data: { status?: string, priority?: string, admin_notes?: string | null }) {
    try {
        const fields = [];
        const params = [];
        if (data.status) {
            fields.push(`status = $${params.length + 1}`);
            params.push(data.status);
        }
        if (data.priority) {
            fields.push(`priority = $${params.length + 1}`);
            params.push(data.priority);
        }
        if (data.admin_notes !== undefined) {
            fields.push(`admin_notes = $${params.length + 1}`);
            params.push(data.admin_notes);
        }

        if (fields.length === 0) return { success: true };

        params.push(ticketId);
        const sql = `UPDATE tickets SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${params.length}`;
        await query(sql, params);
        revalidatePath('/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error updating ticket:', error);
        return { success: false };
    }
}
