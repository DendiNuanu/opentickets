export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'RESOLVED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Ticket {
    id: string;
    title: string;
    description: string;
    topic: string; // 'Billing', 'Technical', 'Account'
    status: TicketStatus;
    priority: TicketPriority;
    created_at: string;
    updated_at?: string;
    driver_id?: string; // User who created
    contact_email?: string; // For guest tickets
    admin_notes?: string; // Internal admin notes
    image_url?: string; // Attached image URL
}

export const MOCK_TICKETS: Ticket[] = [
    {
        id: '1',
        title: 'Cannot access my server instance',
        description: 'I tried logging in via SSH but it times out.',
        topic: 'Technical',
        status: 'OPEN',
        priority: 'HIGH',
        created_at: new Date().toISOString(),
        driver_id: 'user-123',
    },
    {
        id: '2',
        title: 'Billing cycle question',
        description: 'Why was I charged twice this month?',
        topic: 'Billing',
        status: 'CLOSED',
        priority: 'MEDIUM',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        driver_id: 'user-123',
    },
];
