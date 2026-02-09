'use client';

import React, { useState, useEffect } from 'react';
import {
    Home, Ticket, CheckCircle, Search,
    Settings, Bell, Menu, Plus, X, Clock, AlertCircle, XCircle as XCircleIcon, MessageSquare, Image as ImageIcon, Paperclip
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { type Ticket as TicketType } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from '../dashboard/dashboard.module.css';

export default function ClosedTicketsPage() {
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    // Check authentication
    useEffect(() => {
        const auth = localStorage.getItem('adminAuth');
        if (!auth || auth !== 'true') {
            router.push('/admin/login');
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    useEffect(() => {
        if (!isAuthenticated) return;
        fetchTickets();
    }, [isAuthenticated]);

    useEffect(() => {
        if (selectedTicket) {
            setAdminNotes(selectedTicket.admin_notes || '');
            fetchComments(selectedTicket.id);
        }
    }, [selectedTicket]);

    const fetchComments = async (ticketId: string) => {
        try {
            const { data, error } = await supabase
                .from('messages')
                .select(`
                    *,
                    profiles:user_id (full_name, role)
                `)
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data || []);
        } catch (err) {
            console.error('Error fetching comments:', err);
        }
    };

    const addComment = async () => {
        if ((!commentText.trim() && !attachment) || !selectedTicket) return;

        setIsUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            let attachmentUrl = null;
            let attachmentType = null;

            if (attachment) {
                const fileExt = attachment.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `ticket-attachments/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('ticket-attachments')
                    .upload(filePath, attachment);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('ticket-attachments')
                    .getPublicUrl(filePath);

                attachmentUrl = publicUrl;
                attachmentType = attachment.type.startsWith('image/') ? 'image' : 'video';
            }

            // Fallback: Append attachment info to content to avoid schema dependency
            let finalContent = commentText.trim();
            if (attachmentUrl) {
                finalContent += `\n\n:::attachment|${attachmentType}|${attachmentUrl}:::`;
            }

            const payload: any = {
                ticket_id: selectedTicket.id,
                content: finalContent,
                user_id: user?.id
            };

            // We do NOT send attachment_url/type to DB to avoid "column not found" error
            // if (attachmentUrl) {
            //    payload.attachment_url = attachmentUrl;
            //    payload.attachment_type = attachmentType;
            // }

            const { error } = await supabase
                .from('messages')
                .insert([payload]);

            if (error) throw error;

            setCommentText('');
            setAttachment(null);
            fetchComments(selectedTicket.id);
        } catch (err) {
            console.error('Error adding comment:', err);
            setToast({ message: 'Failed to add comment', type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const fetchTickets = async () => {
        setLoading(true);
        try {
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')) {
                console.warn("Supabase keys missing, running in demo mode");
                setTickets([]);
            } else {
                const { data, error } = await supabase
                    .from('tickets')
                    .select('*')
                    .in('status', ['CLOSED', 'RESOLVED'])
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

    if (!isAuthenticated) {
        return (
            <div className={styles.container} style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                            width: '40px',
                            height: '40px',
                            border: '4px solid var(--border-color)',
                            borderTopColor: 'var(--accent-color)',
                            borderRadius: '50%',
                            margin: '0 auto 1rem'
                        }}
                    />
                    <p style={{ color: 'var(--text-secondary)' }}>Checking authentication...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Mobile Sidebar Overlay */}
            <div
                className={`${styles.overlay} ${isSidebarOpen ? styles.open : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <Ticket size={24} className={styles.logoIcon} />
                    </div>
                    <span className="h3" style={{ fontWeight: 700 }}>OpenTickets</span>
                </div>

                <nav className={styles.sidebarNav}>
                    <a href="/dashboard" className={styles.navItem}>
                        <Home size={18} /> Overview
                    </a>
                    <a href="/open-tickets" className={styles.navItem}>
                        <Ticket size={18} /> Open Tickets
                    </a>
                    <a href="/closed-tickets" className={`${styles.navItem} ${styles.navItemActive}`}>
                        <CheckCircle size={18} /> Done Tickets
                    </a>
                </nav>

                <div className={styles.logoutWrapper}>
                    <button
                        onClick={() => {
                            localStorage.removeItem('adminAuth');
                            router.push('/admin/login');
                        }}
                        className={styles.navItem}
                    >
                        <Settings size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerTop}>
                        <button
                            className={styles.menuButton}
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="h1">Done Tickets</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Completed support requests</p>
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button className="icon-button" style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                            <Bell size={18} />
                            <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: 'var(--error)', borderRadius: '50%' }}></span>
                        </button>
                        <ThemeToggle />
                    </div>
                </div>

                {/* Ticket List */}
                <div style={{ marginBottom: '2rem' }}>
                    <div className={styles.sectionHeader}>
                        <h3 className={`h3 ${styles.sectionTitle}`}>Tickets ({tickets.length})</h3>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => window.location.href = '/'}
                            className={styles.newTicketBtn}
                        >
                            <Plus size={18} /> New Ticket
                        </motion.button>
                    </div>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading tickets...</div>
                    ) : tickets.length === 0 ? (
                        <Card>
                            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                <div style={{ background: 'var(--bg-primary)', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <CheckCircle size={32} color="var(--text-secondary)" />
                                </div>
                                <h3 className="h3" style={{ marginBottom: '0.5rem' }}>No closed tickets</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>You don't have any closed tickets at the moment.</p>
                            </div>
                        </Card>
                    ) : (
                        <div className={styles.grid}>
                            {tickets.map(ticket => (
                                <motion.div
                                    key={ticket.id}
                                    whileHover={{ y: -8, transition: { duration: 0.3 } }}
                                    onClick={() => setSelectedTicket(ticket)}
                                    style={{ cursor: 'pointer', height: '100%' }}
                                >
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <Card className={styles.card}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span className={`${styles.badge} ${styles['badge' + (ticket.priority || 'MEDIUM')]}`}>
                                                        {ticket.priority || 'MEDIUM'}
                                                    </span>
                                                    <div className={`${styles.statusBadge} ${styles['status' + ticket.status]}`}>
                                                        {ticket.status}
                                                    </div>
                                                </div>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>#{ticket.id.substring(0, 8)}</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 className={styles.cardTitle}>{ticket.title}</h4>
                                                <p className={styles.cardDesc}>{ticket.description}</p>
                                            </div>
                                            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-secondary)' }}></div>
                                                    {ticket.topic}
                                                </div>
                                                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </Card>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Ticket Detail Modal - Same as dashboard */}
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
                                    <div style={{ marginBottom: '1.5rem' }}>
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

                                    {/* Comments Section */}
                                    <div style={{ marginTop: '2rem' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Comments</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                                            {comments.length === 0 ? (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center' }}>No comments yet.</p>
                                            ) : (
                                                comments.map(msg => {
                                                    const attachmentMatch = msg.content.match(/:::attachment\|(image|video)\|(.*):::/);
                                                    const cleanContent = msg.content.replace(/:::attachment\|.*:::/, '').trim();
                                                    const attachmentType = msg.attachment_type || (attachmentMatch ? attachmentMatch[1] : null);
                                                    const attachmentUrl = msg.attachment_url || (attachmentMatch ? attachmentMatch[2] : null);

                                                    return (
                                                        <div key={msg.id} style={{ background: msg.profiles?.role === 'ADMIN' ? 'rgba(79, 70, 229, 0.1)' : 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', borderBottomLeftRadius: msg.profiles?.role === 'ADMIN' ? '12px' : '4px', borderBottomRightRadius: msg.profiles?.role === 'ADMIN' ? '4px' : '12px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: msg.profiles?.role === 'ADMIN' ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                                                                    {msg.profiles?.full_name || 'User'}
                                                                    {msg.profiles?.role === 'ADMIN' && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--accent-color)', color: '#fff', borderRadius: '4px', marginLeft: '0.5rem' }}>ADMIN</span>}
                                                                </span>
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                                    {new Date(msg.created_at).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{cleanContent}</div>
                                                            {attachmentUrl && (
                                                                <div style={{ marginTop: '0.75rem' }}>
                                                                    {attachmentType === 'image' ? (
                                                                        <img
                                                                            src={attachmentUrl}
                                                                            alt="Attachment"
                                                                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                                                        />
                                                                    ) : (
                                                                        <video
                                                                            src={attachmentUrl}
                                                                            controls
                                                                            style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '1rem' }}>
                                            {attachment && (
                                                <div style={{
                                                    marginBottom: '0.75rem',
                                                    padding: '0.5rem',
                                                    background: 'var(--bg-primary)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    fontSize: '0.85rem'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Paperclip size={14} />
                                                        <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {attachment.name}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setAttachment(null)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder="Type a message..."
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.8rem',
                                                            paddingRight: '2.5rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--border-color)',
                                                            background: 'var(--bg-primary)',
                                                            color: 'var(--text-primary)',
                                                            outline: 'none'
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                addComment();
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        style={{
                                                            position: 'absolute',
                                                            right: '0.8rem',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            cursor: 'pointer',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                        title="Attach Image/Video"
                                                    >
                                                        <input
                                                            type="file"
                                                            accept="image/*,video/*"
                                                            style={{ display: 'none' }}
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    setAttachment(e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                        <ImageIcon size={18} />
                                                    </label>
                                                </div>
                                                <Button onClick={addComment} disabled={(!commentText.trim() && !attachment) || isUploading}>
                                                    {isUploading ? '...' : <MessageSquare size={18} />}
                                                </Button>
                                            </div>
                                        </div>
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

                                            // Update local state
                                            setTickets(tickets.map(t =>
                                                t.id === selectedTicket.id
                                                    ? { ...selectedTicket, admin_notes: adminNotes.trim() || undefined }
                                                    : t
                                            ));

                                            // setToast({ message: 'Changes saved successfully!', type: 'success' });
                                            // setTimeout(() => setToast(null), 3000);

                                            setShowSuccess(true);
                                            setTimeout(() => {
                                                setShowSuccess(false);
                                                window.location.href = '/dashboard';
                                            }, 2000);
                                        } catch (err) {
                                            console.error('Error saving changes:', err);
                                            setToast({ message: 'Failed to save changes', type: 'error' });
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


        </div>
    );
}
