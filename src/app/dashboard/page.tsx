'use client';

import React, { useState, useEffect } from 'react';
import {
    Home, Ticket, CheckCircle, Search,
    Settings, Bell, Menu, Plus, X, Clock, AlertCircle, XCircle as XCircleIcon, MessageSquare,
    Edit, Trash2, Image as ImageIcon, Paperclip
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';
import Card from '@/components/Card';
import {
    getCurrentUser,
    signOut,
    getAllUsers,
    signUp as createUserAction,
    updateUser,
    deleteUser
} from '@/lib/actions/auth';
import {
    getTickets,
    updateTicketStatus,
    updateTicketPriority,
    getNotifications,
    markAllAsRead,
    getComments,
    createComment,
    updateTicket
} from '@/lib/actions/tickets';
import { type Ticket as TicketType, type Notification as NotificationType } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

export default function Dashboard() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [filter, setFilter] = useState<'OPEN' | 'IN_PROGRESS' | 'DONE' | 'USERS'>('OPEN');

    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [notifications, setNotifications] = useState<NotificationType[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [users, setUsers] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUserData, setNewUserData] = useState({
        email: '',
        password: '',
        fullName: '',
        username: '',
        role: 'USER'
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState<{ full_name: string; role: string; id: string } | null>(null);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [confirmDeleteModal, setConfirmDeleteModal] = useState<{ show: boolean; userId: string; userName: string }>({
        show: false,
        userId: '',
        userName: ''
    });

    // Check authentication and fetch profile
    useEffect(() => {
        const checkAuth = async () => {
            const auth = localStorage.getItem('adminAuth');
            if (!auth || auth !== 'true') {
                router.push('/admin/login');
                return;
            }

            const profile = await getCurrentUser();
            if (!profile) {
                router.push('/admin/login');
                return;
            }

            setUserProfile(profile);
            setIsAuthenticated(true);
        };

        checkAuth();
    }, [router]);

    useEffect(() => {
        if (!isAuthenticated) return;

        if (filter === 'USERS') {
            fetchUsers();
        } else {
            handleFetchTickets();
        }

        fetchNotifications();

        // Real-time PostgreSQL subscription is removed for vanilla Postgres
        // In a production app, you might use polling or a dedicated WebSocket server
        const interval = setInterval(() => {
            fetchNotifications();
            if (filter === 'OPEN') {
                handleFetchTickets();
            } else if (filter === 'USERS') {
                fetchUsers();
            }
        }, 30000); // Poll every 30 seconds as fallback

        return () => clearInterval(interval);
    }, [filter, isAuthenticated, userProfile]);

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data as NotificationType[] || []);
            setUnreadCount((data as NotificationType[])?.filter(n => !n.is_read).length || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking notifications as read:', err);
        }
    };

    useEffect(() => {
        if (selectedTicket) {
            setAdminNotes(selectedTicket.admin_notes || '');
            fetchComments(selectedTicket.id);
        }
    }, [selectedTicket]);

    const fetchComments = async (ticketId: string) => {
        try {
            const data = await getComments(ticketId);
            setComments(data || []);
        } catch (err) {
            console.error('Error fetching comments:', err);
        }
    };

    const addComment = async () => {
        if (!commentText.trim() || !selectedTicket) return;

        setIsUploading(true);
        try {
            const res = await createComment(selectedTicket.id, commentText.trim(), userProfile?.id);

            if (!res.success) throw new Error('Failed to add comment');

            setCommentText('');
            fetchComments(selectedTicket.id);
        } catch (err: any) {
            console.error('Error adding comment:', err);
            setToast({ message: `Failed to add comment: ${err.message || 'Unknown error'}`, type: 'error' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setIsUploading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data || []);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            const res = await createUserAction(
                newUserData.email,
                newUserData.password,
                newUserData.fullName,
                newUserData.username,
                newUserData.role
            );

            if (!res.success) throw new Error(res.error);

            setToast({ message: 'User created successfully!', type: 'success' });
            setShowAddUserModal(false);
            setNewUserData({ email: '', password: '', fullName: '', username: '', role: 'USER' });
            fetchUsers();
        } catch (err: any) {
            console.error('Error creating user:', err);
            setToast({ message: err.message || 'Failed to create user', type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setUpdating(true);
        try {
            const res = await updateUser(editingUser.id, {
                fullName: editingUser.full_name,
                role: editingUser.role
            });

            if (!res.success) throw new Error(res.error);

            setToast({ message: 'User updated successfully!', type: 'success' });
            setShowEditUserModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err: any) {
            console.error('Error updating user:', err);
            setToast({ message: err.message || 'Failed to update user', type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        setUpdating(true);
        try {
            const res = await deleteUser(userId);
            if (!res.success) throw new Error(res.error);

            setToast({ message: 'User deleted successfully!', type: 'success' });
            setConfirmDeleteModal({ show: false, userId: '', userName: '' });
            fetchUsers();
        } catch (err: any) {
            console.error('Error deleting user:', err);
            setToast({ message: err.message || 'Failed to delete user', type: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const handleLogout = async () => {
        await signOut();
        localStorage.removeItem('adminAuth');
        router.push('/admin/login');
    };

    const handleFetchTickets = async () => {
        setLoading(true);
        try {
            const data = await getTickets(filter, userProfile?.role === 'USER' ? userProfile.id : undefined);
            setTickets(data as TicketType[] || []);
        } catch (err) {
            console.error('Error fetching tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    // Replace references to fetchTickets with handleFetchTickets
    useEffect(() => {
        if (isAuthenticated) handleFetchTickets();
    }, [filter, isAuthenticated, userProfile]);

    const handleUpdateTicketStatus = async (ticketId: string, newStatus: string) => {
        setUpdating(true);
        try {
            const res = await updateTicketStatus(ticketId, newStatus);
            if (!res.success) throw new Error('Failed to update status');

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

    const handleUpdateTicketPriority = async (ticketId: string, newPriority: string) => {
        setUpdating(true);
        try {
            const res = await updateTicketPriority(ticketId, newPriority);
            if (!res.success) throw new Error('Failed to update priority');

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
            case 'CLOSED':
                return <XCircleIcon size={20} color="#6272a4" />;
            default:
                return <Ticket size={20} />;
        }
    };

    // Show loading while checking auth
    if (!isAuthenticated) {
        return (
            <div style={{
                display: 'flex',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)'
            }}>
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
            {/* Mobile Overlay */}
            <div
                className={`${styles.overlay} ${isSidebarOpen ? styles.open : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ''}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <Ticket size={24} color="#fff" />
                    </div>
                    <span className="h3" style={{ fontWeight: 700 }}>OpenTickets</span>
                </div>

                <nav className={styles.sidebarNav}>
                    <a href="/dashboard" className={`${styles.navItem} ${styles.navItemActive}`}>
                        <Home size={18} /> Overview
                    </a>
                    <a href="/open-tickets" className={styles.navItem}>
                        <Ticket size={18} /> Open Tickets
                    </a>
                    <a href="/closed-tickets" className={styles.navItem}>
                        <CheckCircle size={18} /> Done Tickets
                    </a>
                    {userProfile?.role === 'ADMIN' && (
                        <button onClick={() => { setFilter('USERS'); setIsSidebarOpen(false); }} className={`${styles.navItem} ${filter === 'USERS' ? styles.navItemActive : ''}`}>
                            <Plus size={18} /> User Management
                        </button>
                    )}
                </nav>

                <div className={styles.logoutWrapper}>
                    <button
                        onClick={handleLogout}
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
                            <h1 className={`h1 ${styles.pageTitle}`}>Dashboard</h1>
                            <p className={styles.welcomeText}>Welcome back, {userProfile?.full_name || 'Admin'}</p>
                            {!userProfile && isAuthenticated && (
                                <p style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.25rem' }}>⚠️ Profile not found. Please run the SQL fix.</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.actions}>
                        <button
                            className="icon-button"
                            onClick={() => setShowNotifications(!showNotifications)}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: 'var(--error)', borderRadius: '50%' }}></span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showNotifications && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '0.75rem',
                                        width: '320px',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '16px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                                        zIndex: 100,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Notifications</h4>
                                        <button
                                            onClick={markAllAsRead}
                                            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Mark all as read
                                        </button>
                                    </div>
                                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                No notifications yet
                                            </div>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    style={{
                                                        padding: '1rem',
                                                        borderBottom: '1px solid var(--border-color)',
                                                        background: notif.is_read ? 'transparent' : 'rgba(189, 147, 249, 0.05)',
                                                        display: 'flex',
                                                        gap: '0.75rem',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setShowNotifications(false)}
                                                >
                                                    <div style={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        background: notif.is_read ? 'var(--bg-primary)' : 'var(--accent-color)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <Ticket size={16} color={notif.is_read ? 'var(--text-secondary)' : '#fff'} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.1rem' }}>{notif.title}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{notif.content}</div>
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                                                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <ThemeToggle />
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className={styles.tabs}>
                    {['OPEN', 'IN_PROGRESS', 'DONE', 'USERS'].map((f) => {
                        if (f === 'USERS' && userProfile?.role !== 'ADMIN') return null;
                        return (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`${styles.tabBtn} ${filter === f ? styles.tabBtnActive : ''}`}
                            >
                                {f.replace('_', ' ')}
                            </button>
                        );
                    })}
                </div>

                {/* Ticket List or User List */}
                <div style={{ marginBottom: '2rem' }}>
                    <div className={styles.sectionHeader}>
                        <h3 className={`h3 ${styles.sectionTitle}`}>
                            {filter === 'USERS' ? 'User Management' : `${filter.replace('_', ' ')} Tickets`}
                            ({filter === 'USERS' ? users.length : tickets.length})
                        </h3>
                        {filter !== 'USERS' && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => window.location.href = '/'}
                                className={styles.newTicketBtn}
                            >
                                <Plus size={18} /> New Ticket
                            </motion.button>
                        )}
                        {filter === 'USERS' && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddUserModal(true)}
                                className={styles.newTicketBtn}
                            >
                                <Plus size={18} /> Add Member
                            </motion.button>
                        )}
                    </div>

                    {loading && filter !== 'USERS' ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
                    ) : filter === 'USERS' ? (
                        <div className={styles.grid}>
                            {users.map(user => (
                                <motion.div
                                    key={user.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(109, 40, 217, 0.15)' }}
                                    style={{ height: '100%' }}
                                >
                                    <Card className={styles.card}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                <div style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: '16px',
                                                    background: 'linear-gradient(135deg, rgba(109, 40, 217, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.5rem',
                                                    fontWeight: 700,
                                                    color: 'var(--accent-color)',
                                                    boxShadow: 'inset 0 0 10px rgba(109, 40, 217, 0.1)'
                                                }}>
                                                    {user.full_name?.charAt(0) || user.username?.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{user.full_name || user.username}</div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: user.role === 'ADMIN' ? 'var(--accent-color)' : 'var(--text-secondary)',
                                                        fontWeight: 700,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.05em',
                                                        marginTop: '0.25rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.4rem'
                                                    }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: user.role === 'ADMIN' ? 'var(--accent-color)' : '#6272a4' }}></div>
                                                        {user.role || 'USER'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, background: 'rgba(109, 40, 217, 0.1)' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        setEditingUser({ ...user });
                                                        setShowEditUserModal(true);
                                                    }}
                                                    style={{ width: 38, height: 38, borderRadius: '10px', border: '1px solid rgba(109, 40, 217, 0.2)', background: 'transparent', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                                                    title="Edit User"
                                                >
                                                    <Edit size={16} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1, background: 'rgba(239, 68, 68, 0.1)' }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => setConfirmDeleteModal({ show: true, userId: user.id, userName: user.full_name || user.username })}
                                                    style={{ width: 38, height: 38, borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
                                                    title="Delete User"
                                                    disabled={user.id === userProfile?.id}
                                                >
                                                    <Trash2 size={16} />
                                                </motion.button>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
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
                                            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-color)' }}></div>
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

            {/* Premium Confirmation Modal */}
            <AnimatePresence>
                {confirmDeleteModal.show && (
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
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000,
                            padding: '2rem',
                        }}
                        onClick={() => setConfirmDeleteModal({ show: false, userId: '', userName: '' })}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '28px',
                                maxWidth: '400px',
                                width: '100%',
                                padding: '2.5rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)',
                                textAlign: 'center'
                            }}
                        >
                            <div style={{
                                width: '70px',
                                height: '70px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                                color: '#ef4444'
                            }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Are you sure?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>
                                You are about to delete <strong style={{ color: 'var(--text-primary)' }}>{confirmDeleteModal.userName}</strong>. This action is permanent and cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Button
                                    variant="secondary"
                                    style={{ flex: 1, padding: '0.875rem' }}
                                    onClick={() => setConfirmDeleteModal({ show: false, userId: '', userName: '' })}
                                >
                                    Cancel
                                </Button>
                                <motion.button
                                    whileHover={{ scale: 1.02, background: '#dc2626' }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleDeleteUser(confirmDeleteModal.userId)}
                                    disabled={updating}
                                    style={{
                                        flex: 2,
                                        padding: '0.875rem',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: '1rem',
                                        cursor: updating ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {updating ? 'Deleting...' : 'Yes, Delete User'}
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit User Modal */}
            <AnimatePresence>
                {showEditUserModal && editingUser && (
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
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '2rem',
                        }}
                        onClick={() => {
                            setShowEditUserModal(false);
                            setEditingUser(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '24px',
                                maxWidth: '480px',
                                width: '100%',
                                overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            }}
                        >
                            <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(109, 40, 217, 0.05), transparent)' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Edit Member</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>Refine account details and permissions</p>
                                </div>
                                <motion.button
                                    whileHover={{ rotate: 90, background: 'rgba(0,0,0,0.05)' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                        setShowEditUserModal(false);
                                        setEditingUser(null);
                                    }}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            <form onSubmit={handleUpdateUser} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            required
                                            value={editingUser.full_name || ''}
                                            onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                            style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '16px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '1rem' }}
                                            placeholder="Enter full name"
                                            onFocus={e => {
                                                e.target.style.borderColor = 'var(--accent-color)';
                                                e.target.style.background = 'rgba(109, 40, 217, 0.02)';
                                                e.target.style.boxShadow = '0 0 0 4px rgba(109, 40, 217, 0.1)';
                                            }}
                                            onBlur={e => {
                                                e.target.style.borderColor = 'var(--border-color)';
                                                e.target.style.background = 'rgba(255,255,255,0.03)';
                                                e.target.style.boxShadow = 'none';
                                            }}
                                        />
                                    </div>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Role</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={editingUser.role || 'USER'}
                                            onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                            style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '16px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', appearance: 'none', transition: 'all 0.3s ease', fontSize: '1rem', cursor: 'pointer' }}
                                        >
                                            <option value="USER">User (Standard Access)</option>
                                            <option value="ADMIN">Admin (Full Control)</option>
                                        </select>
                                        <div style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                                            <Menu size={18} />
                                        </div>
                                    </div>
                                </motion.div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                    <Button
                                        variant="secondary"
                                        type="button"
                                        style={{ flex: 1, padding: '1rem', borderRadius: '16px', fontWeight: 600 }}
                                        onClick={() => {
                                            setShowEditUserModal(false);
                                            setEditingUser(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <motion.button
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={updating}
                                        style={{
                                            flex: 1.5,
                                            padding: '1rem',
                                            borderRadius: '16px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%)',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '1rem',
                                            cursor: updating ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 10px 20px -5px rgba(109, 40, 217, 0.3)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {updating ? 'Updating...' : 'Update Permissions'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add User Modal */}
            <AnimatePresence>
                {showAddUserModal && (
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
                            background: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            padding: '2rem',
                        }}
                        onClick={() => setShowAddUserModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'var(--bg-secondary)',
                                borderRadius: '24px',
                                maxWidth: '480px',
                                width: '100%',
                                overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            }}
                        >
                            <div style={{ padding: '2rem 2rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(109, 40, 217, 0.05), transparent)' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>New Member</h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 500 }}>Expand your team with a new account</p>
                                </div>
                                <motion.button
                                    whileHover={{ rotate: 90, background: 'rgba(0,0,0,0.05)' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setShowAddUserModal(false)}
                                    style={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <X size={20} />
                                </motion.button>
                            </div>

                            <form onSubmit={handleCreateUser} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUserData.fullName}
                                            onChange={e => setNewUserData({ ...newUserData, fullName: e.target.value })}
                                            style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s ease' }}
                                            placeholder="John Doe"
                                        />
                                    </motion.div>

                                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Username</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUserData.username}
                                            onChange={e => setNewUserData({ ...newUserData, username: e.target.value })}
                                            style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s ease' }}
                                            placeholder="johndoe"
                                        />
                                    </motion.div>
                                </div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        value={newUserData.email}
                                        onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                                        style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s ease' }}
                                        placeholder="name@company.com"
                                    />
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Secure Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newUserData.password}
                                        onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                                        style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', transition: 'all 0.2s ease' }}
                                        placeholder="Min. 6 characters"
                                        minLength={6}
                                    />
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Assign Role</label>
                                    <select
                                        value={newUserData.role}
                                        onChange={e => setNewUserData({ ...newUserData, role: e.target.value })}
                                        style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '14px', border: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.03)', color: 'var(--text-primary)', outline: 'none', appearance: 'none', transition: 'all 0.2s ease', cursor: 'pointer' }}
                                    >
                                        <option value="USER">User (Standard Access)</option>
                                        <option value="ADMIN">Admin (Full Control)</option>
                                    </select>
                                </motion.div>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <motion.button
                                        whileHover={{ scale: 1.02, boxShadow: '0 10px 25px -5px rgba(109, 40, 217, 0.4)' }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={updating}
                                        style={{
                                            width: '100%',
                                            padding: '1.125rem',
                                            borderRadius: '16px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, var(--accent-color) 0%, var(--accent-hover) 100%)',
                                            color: '#fff',
                                            fontWeight: 800,
                                            fontSize: '1.125rem',
                                            cursor: updating ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.75rem'
                                        }}
                                    >
                                        {updating ? <Clock size={20} className="animate-spin" /> : <Plus size={20} />}
                                        {updating ? 'Processing...' : 'Create Account'}
                                    </motion.button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Ticket Detail Modal */}
            <AnimatePresence>
                {
                    selectedTicket && (
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
                                            <span className={`${styles.badge} ${styles['badge' + (selectedTicket.priority || 'MEDIUM')]}`}>
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
                                                {['OPEN', 'IN_PROGRESS', 'CLOSED'].map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => handleUpdateTicketStatus(selectedTicket.id, status)}
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
                                                        onClick={() => handleUpdateTicketPriority(selectedTicket.id, priority)}
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
                                                const res = await updateTicket(selectedTicket.id, {
                                                    admin_notes: adminNotes.trim() || null,
                                                    status: selectedTicket.status,
                                                    priority: selectedTicket.priority
                                                });

                                                if (!res.success) throw new Error('Failed to update ticket');

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
                    )
                }
            </AnimatePresence >

            {/* Toast Notification */}
            <AnimatePresence>
                {
                    toast && (
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
                    )
                }
            </AnimatePresence >

            {/* Centralized Success Popup */}
            <AnimatePresence>
                {
                    showSuccess && (
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
                    )
                }
            </AnimatePresence >


        </div >
    );
}
