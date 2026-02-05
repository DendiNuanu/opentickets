'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { type Ticket as TicketType } from '@/lib/types';

export default function StatusPage() {
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllTickets();
    }, []);

    const fetchAllTickets = async () => {
        setLoading(true);

        try {
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
                // Demo mode
                await new Promise((resolve) => setTimeout(resolve, 1000));
                setTickets([]);
            } else {
                const { data, error } = await supabase
                    .from('tickets')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTickets(data as TicketType[] || []);
            }
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN':
                return <AlertCircle size={20} color="#ff5555" />;
            case 'IN_PROGRESS':
                return <Clock size={20} color="#f1fa8c" />;
            case 'RESOLVED':
                return <CheckCircle size={20} color="#50fa7b" />;
            case 'CLOSED':
                return <XCircle size={20} color="#6272a4" />;
            default:
                return <Ticket size={20} />;
        }
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem 0' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 32, height: 32, background: 'var(--accent-color)', borderRadius: 8 }}></div>
                        <span className="h3" style={{ fontWeight: 700 }}>Open Tickets Nuanu</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Button variant="secondary" size="sm" onClick={() => window.location.href = '/'}>
                            Create Ticket
                        </Button>
                        <ThemeToggle />
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="container" style={{ flex: 1, padding: '4rem 1.5rem' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                    {/* Hero Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ textAlign: 'center', marginBottom: '3rem' }}
                    >
                        <h1 className="h1" style={{ marginBottom: '1rem', background: 'linear-gradient(to right, var(--accent-color), #bd93f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            All Support Tickets
                        </h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
                            View all submitted support requests
                        </p>
                    </motion.div>

                    {/* Results */}
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                style={{
                                    width: 48,
                                    height: 48,
                                    border: '4px solid rgba(189, 147, 249, 0.2)',
                                    borderTopColor: 'var(--accent-color)',
                                    borderRadius: '50%',
                                    margin: '0 auto',
                                }}
                            />
                            <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading tickets...</p>
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 className="h3">
                                    {tickets.length > 0 ? `${tickets.length} Total Ticket${tickets.length > 1 ? 's' : ''}` : 'No Tickets Yet'}
                                </h2>
                                <motion.button
                                    onClick={fetchAllTickets}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        backdropFilter: 'blur(10px)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    🔄 Refresh
                                </motion.button>
                            </div>

                            {tickets.length === 0 ? (
                                <Card>
                                    <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                                        <div style={{ background: 'var(--bg-primary)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                            <Ticket size={32} color="var(--text-secondary)" />
                                        </div>
                                        <h3 className="h3" style={{ marginBottom: '0.5rem' }}>No tickets yet</h3>
                                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                            No support tickets have been submitted yet.
                                        </p>
                                        <Button onClick={() => window.location.href = '/'}>Create First Ticket</Button>
                                    </div>
                                </Card>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {tickets.map((ticket) => (
                                        <Card key={ticket.id} className="hover-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                                        {getStatusIcon(ticket.status)}
                                                        <span style={{ fontWeight: 700, color: 'var(--accent-color)' }}>{ticket.status}</span>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>•</span>
                                                        <span className={`badge badge-${ticket.priority?.toLowerCase() || 'medium'}`}>
                                                            {ticket.priority || 'MEDIUM'}
                                                        </span>
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>•</span>
                                                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ticket.topic}</span>
                                                    </div>
                                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                                        {ticket.title}
                                                    </h3>
                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                                                        {ticket.description}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                                        {ticket.contact_email && <span>📧 {ticket.contact_email}</span>}
                                                        <span>ID: #{ticket.id.substring(0, 8)}</span>
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                        {new Date(ticket.created_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                        {new Date(ticket.created_at).toLocaleTimeString('en-US', {
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>

            <style jsx global>{`
        .badge {
          padding: 0.25rem 0.6rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .badge-low { background: rgba(80, 250, 123, 0.2); color: var(--success); }
        .badge-medium { background: rgba(241, 250, 140, 0.2); color: var(--warning); }
        .badge-high { background: rgba(255, 184, 108, 0.2); color: #ffb86c; }
        .badge-critical { background: rgba(255, 85, 85, 0.2); color: var(--error); }
      `}</style>
        </main>
    );
}
