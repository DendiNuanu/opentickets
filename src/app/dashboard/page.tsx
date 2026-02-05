'use client';

import React, { useState, useEffect } from 'react';
import {
    Home, Ticket, CheckCircle, Search,
    Settings, Bell, Menu, Plus, X, Clock, AlertCircle, XCircle as XCircleIcon, MessageSquare
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { type Ticket as TicketType } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
    const [filter, setFilter] = useState<'OPEN' | 'CLOSED'>('OPEN');
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, [filter]);

    // Load existing notes when ticket is selected
    useEffect(() => {
        if (selectedTicket) {
            setAdminNotes(selectedTicket.admin_notes || '');
        }
    }, [selectedTicket]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                console.warn("Supabase keys missing, running in demo mode");
                setTickets([]);
            } else {
                const statusFilter = filter === 'OPEN' ? ['OPEN', 'IN_PROGRESS'] : ['CLOSED', 'RESOLVED'];

                const { data, error } = await supabase
                    .from('tickets')
                    .select('*')
                    .in('status', statusFilter)
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

    const updateTicketStatus = async (ticketId: string, newStatus: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: newStatus })
                .eq('id', ticketId);

            if (error) throw error;

            setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus as TicketType['status'] } : t));
            if (selectedTicket) {
                setSelectedTicket({ ...selectedTicket, status: newStatus as TicketType['status'] });
            }
        } catch (err) {
            console.error('Error updating status:', err);
        } finally {
            setUpdating(false);
        }
    };

    const updateTicketPriority = async (ticketId: string, newPriority: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ priority: newPriority })
                .eq('id', ticketId);

            if (error) throw error;

            setTickets(tickets.map(t => t.id === ticketId ? { ...t, priority: newPriority as TicketType['priority'] } : t));
            if (selectedTicket) {
                setSelectedTicket({ ...selectedTicket, priority: newPriority as TicketType['priority'] });
            }
        } catch (err) {
            console.error('Error updating priority:', err);
        } finally {
            setUpdating(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN':
                return <AlertCircle size={20} color="#ff5555" />;
            case 'IN_PROGRESS':
                return <Clock size={20} color="#ffb86c" />;
            case 'RESOLVED':
                return <CheckCircle size={20} color="#50fa7b" />;
            case 'CLOSED':
                return <XCircleIcon size={20} color="#6272a4" />;
            default:
                return <Ticket size={20} />;
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
            {/* Sidebar */}
            <aside style={{ width: 240, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', padding: '1.5rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                    <div style={{ width: 32, height: 32, background: 'var(--accent-color)', borderRadius: 8 }}></div>
                    <span className="h3" style={{ fontWeight: 700 }}>OpenTickets</span>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <a href="/dashboard" className="nav-item active" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none' }}>
                        <Home size={18} /> Overview
                    </a>
                    <a href="/open-tickets" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        <Ticket size={18} /> Open Tickets
                    </a>
                    <a href="/closed-tickets" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        <CheckCircle size={18} /> Closed Tickets
                    </a>
                </nav>

                <div style={{ position: 'absolute', bottom: '1.5rem', left: '1rem', right: '1rem' }}>
                    <a href="#" className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        <Settings size={18} /> Settings
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 className="h1">Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Welcome back, Admin</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button className="icon-button" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                            <Bell size={18} />
                            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: 'var(--error)', borderRadius: '50%' }}></span>
                        </button>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setFilter('OPEN')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === 'OPEN' ? '2px solid var(--accent-color)' : '2px solid transparent',
                            color: filter === 'OPEN' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            fontWeight: filter === 'OPEN' ? 600 : 400,
                            cursor: 'pointer',
                        }}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('CLOSED')}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'none',
                            border: 'none',
                            borderBottom: filter === 'CLOSED' ? '2px solid var(--accent-color)' : '2px solid transparent',
                            color: filter === 'CLOSED' ? 'var(--accent-color)' : 'var(--text-secondary)',
                            fontWeight: filter === 'CLOSED' ? 600 : 400,
                            cursor: 'pointer',
                        }}
                    >
                        History
                    </button>
                </div>

                {/* Ticket List */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 className="h3">{filter === 'OPEN' ? 'Active Tickets' : 'Ticket History'} ({tickets.length})</h3>
                        <Button variant="primary" size="sm" onClick={() => window.location.href = '/'}>
                            <Plus size={16} style={{ marginRight: 8 }} /> New Ticket
                        </Button>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                <div style={{ background: 'var(--bg-primary)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <Ticket size={32} color="var(--text-secondary)" />
                                </div>
                                <h3 className="h3" style={{ marginBottom: '0.5rem' }}>No tickets found</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You don't have any {filter.toLowerCase()} tickets at the moment.</p>
                                {filter === 'OPEN' && (
                                    <Button onClick={() => window.location.href = '/'}>Create Ticket</Button>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {tickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <Card className="hover-card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                    <span className={`badge badge-${ticket.priority?.toLowerCase() || 'medium'}`}>{ticket.priority || 'MEDIUM'}</span>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>#{ticket.id.substring(0, 8)} • {ticket.topic}</span>
                                                </div>
                                                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>{ticket.title}</h4>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{ticket.description}</p>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div className={`status-badge status-${ticket.status.toLowerCase()}`} style={{ marginBottom: '0.5rem' }}>
                                                    {ticket.status}
                                                </div>
                                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Ticket Detail Modal */}
            <AnimatePresence>
                {selectedTicket && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '2rem',
                        }}
                        onClick={() => setSelectedTicket(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '16px',
                                maxWidth: '700px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflow: 'auto',
                                border: '1px solid var(--border-color)',
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 className="h2">Ticket Details</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ID: #{selectedTicket.id.substring(0, 8)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: '50%',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '1.5rem' }}>
                                {/* Ticket Info */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                        <span className={`badge badge-${selectedTicket.priority?.toLowerCase() || 'medium'}`}>
                                            {selectedTicket.priority || 'MEDIUM'}
                                        </span>
                                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(189, 147, 249, 0.2)', color: 'var(--accent-color)' }}>
                                            {selectedTicket.topic}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {getStatusIcon(selectedTicket.status)}
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedTicket.status}</span>
                                        </div>
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{selectedTicket.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{selectedTicket.description}</p>

                                    {selectedTicket.image_url && (
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>Attached Image</div>
                                            <a href={selectedTicket.image_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', transition: 'transform 0.2s ease' }}>
                                                <img
                                                    src={selectedTicket.image_url}
                                                    alt="Ticket attachment"
                                                    style={{
                                                        maxWidth: '100%',
                                                        maxHeight: '300px',
                                                        borderRadius: '12px',
                                                        border: '1px solid var(--border-color)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        objectFit: 'contain'
                                                    }}
                                                />
                                            </a>
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Contact Email</div>
                                            <div style={{ fontWeight: 600 }}>{selectedTicket.contact_email || 'N/A'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Created</div>
                                            <div style={{ fontWeight: 600 }}>
                                                {new Date(selectedTicket.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Actions */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Admin Actions</h4>

                                    {/* Status Update */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Update Status</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => updateTicketStatus(selectedTicket.id, status)}
                                                    disabled={updating || selectedTicket.status === status}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        border: selectedTicket.status === status ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                        background: selectedTicket.status === status ? 'rgba(189, 147, 249, 0.1)' : 'var(--bg-primary)',
                                                        color: selectedTicket.status === status ? 'var(--accent-color)' : 'var(--text-primary)',
                                                        cursor: updating || selectedTicket.status === status ? 'not-allowed' : 'pointer',
                                                        opacity: updating || selectedTicket.status === status ? 0.6 : 1,
                                                    }}
                                                >
                                                    {status.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority Update */}
                                    <div style={{ marginBottom: '1rem' }}>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Update Priority</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(priority => (
                                                <button
                                                    key={priority}
                                                    onClick={() => updateTicketPriority(selectedTicket.id, priority)}
                                                    disabled={updating || selectedTicket.priority === priority}
                                                    style={{
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        borderRadius: '8px',
                                                        border: selectedTicket.priority === priority ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                                                        background: selectedTicket.priority === priority ? 'rgba(189, 147, 249, 0.1)' : 'var(--bg-primary)',
                                                        color: selectedTicket.priority === priority ? 'var(--accent-color)' : 'var(--text-primary)',
                                                        cursor: updating || selectedTicket.priority === priority ? 'not-allowed' : 'pointer',
                                                        opacity: updating || selectedTicket.priority === priority ? 0.6 : 1,
                                                    }}
                                                >
                                                    {priority}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Admin Notes */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                            <MessageSquare size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                                            Add Internal Note
                                        </label>
                                        <textarea
                                            value={adminNotes}
                                            onChange={(e) => setAdminNotes(e.target.value)}
                                            placeholder="Add notes for internal tracking..."
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-color)',
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-primary)',
                                                resize: 'vertical',
                                                fontSize: '0.875rem',
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <Button variant="secondary" onClick={() => setSelectedTicket(null)}>
                                        Close
                                    </Button>
                                    <Button onClick={async () => {
                                        if (!selectedTicket) return;

                                        setUpdating(true);
                                        try {
                                            // The individual buttons already update Supabase, but let's make sure 
                                            // the notes and any other changes are fully synced here too.
                                            const { error } = await supabase
                                                .from('tickets')
                                                .update({
                                                    admin_notes: adminNotes.trim() || null,
                                                    status: selectedTicket.status,
                                                    priority: selectedTicket.priority,
                                                    updated_at: new Date().toISOString()
                                                })
                                                .eq('id', selectedTicket.id);

                                            if (error) throw error;

                                            // Re-fetch or update local list to ensure consistency
                                            setTickets(tickets.map(t =>
                                                t.id === selectedTicket.id
                                                    ? { ...selectedTicket, admin_notes: adminNotes.trim() || undefined }
                                                    : t
                                            ));

                                            // setToast({ message: 'All changes saved successfully!', type: 'success' });
                                            // setTimeout(() => setToast(null), 3000);

                                            setShowSuccess(true);
                                            setTimeout(() => {
                                                setShowSuccess(false);
                                                window.location.href = '/dashboard';
                                            }, 2000);
                                        } catch (err) {
                                            console.error('Error saving changes:', err);
                                            setToast({ message: 'Failed to save changes. Check database permissions.', type: 'error' });
                                            setTimeout(() => setToast(null), 3000);
                                        } finally {
                                            setUpdating(false);
                                        }
                                    }}>
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        style={{
                            position: 'fixed',
                            top: '2rem',
                            right: '2rem',
                            zIndex: 2000,
                            padding: '1rem 1.5rem',
                            borderRadius: '12px',
                            background: toast.type === 'success'
                                ? 'linear-gradient(135deg, #50fa7b 0%, #5af78e 100%)'
                                : 'linear-gradient(135deg, #ff5555 0%, #ff6b6b 100%)',
                            color: '#fff',
                            fontWeight: 600,
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            minWidth: '300px',
                        }}
                    >
                        <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {toast.type === 'success' ? '✓' : '✕'}
                        </div>
                        <span>{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Centralized Success Popup */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000,
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            style={{
                                background: 'var(--bg-secondary)',
                                padding: '3rem',
                                borderRadius: '24px',
                                textAlign: 'center',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                border: '1px solid var(--accent-color)',
                                maxWidth: '400px',
                                width: '90%',
                            }}
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'var(--success)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                boxShadow: '0 0 20px rgba(80, 250, 123, 0.4)',
                            }}>
                                <CheckCircle size={48} color="#fff" />
                            </div>
                            <h2 className="h2" style={{ marginBottom: '1rem' }}>Success!</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                                All changes have been saved successfully.
                                Redirecting you back...
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx global>{`
                .nav-item.active {
                    background: rgba(189, 147, 249, 0.1);
                    color: var(--accent-color) !important;
                }
                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }
                .status-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .status-open { background: rgba(255, 85, 85, 0.2); color: #ff5555; }
                .status-in_progress { background: rgba(255, 184, 108, 0.2); color: #ffb86c; }
                .status-resolved { background: rgba(80, 250, 123, 0.2); color: #50fa7b; }
                .status-closed { background: rgba(98, 114, 164, 0.2); color: #6272a4; }
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
        </div>
    );
}
