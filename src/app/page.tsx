'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, HelpCircle, FilePlus, Wrench,
  ArrowRight, CheckCircle, ChevronLeft
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { supabase } from '@/lib/supabase';

// Animation Variants
const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function Home() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    topic: '',
    subject: '',
    description: '',
    email: '',
    phoneNumber: '',
    imageFile: null as File | null,
  });

  const topics = [
    { id: 'new-request', label: 'New Request', icon: FilePlus },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Fallback for demo if no ENV set
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.warn("Supabase keys missing, running in demo mode");
      } else {
        let imageUrl = '';
        if (formData.imageFile) {
          const file = formData.imageFile;
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `attachments/${fileName}`;

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('ticket-attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(filePath);

          imageUrl = publicUrl;
        }

        const { data: ticketData, error: insertError } = await supabase
          .from('tickets')
          .insert([
            {
              topic: topics.find(t => t.id === formData.topic)?.label || formData.topic,
              title: formData.subject,
              description: formData.description,
              contact_email: formData.email,
              contact_phone: formData.phoneNumber,
              status: 'OPEN',
              priority: 'MEDIUM',
              image_url: imageUrl || null
            }
          ])
          .select()
          .single();

        if (insertError) throw insertError;

        // Create a notification for the new ticket
        if (ticketData) {
          await supabase.from('notifications').insert([{
            ticket_id: ticketData.id,
            title: 'New Ticket Received',
            content: `Subject: ${ticketData.title}`,
          }]);
        }
      }

      setStep(4);
    } catch (err: any) {
      console.error('Error submitting ticket:', err);
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <nav className="glass" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: 32, height: 32, background: 'var(--accent-color)', borderRadius: 8 }}></div>
            <span className="h3" style={{ fontWeight: 700 }}>Open Tickets</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>

          <AnimatePresence mode='wait'>
            {step === 0 && (
              <motion.div key="step0" variants={staggerContainer} initial="initial" animate="animate" exit="exit">
                <motion.div variants={fadeIn} style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h1 className="h1" style={{ marginBottom: '1rem', background: 'linear-gradient(to right, var(--accent-color), var(--success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    How can we help you today?
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>
                    Select a topic to get started with your support request.
                  </p>
                </motion.div>

                <motion.div variants={staggerContainer} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  {topics.map((topic) => (
                    <motion.div key={topic.id} variants={fadeIn} whileHover={{ y: -5 }}>
                      <Card className="hover-card">
                        <button
                          onClick={() => { setFormData({ ...formData, topic: topic.id }); handleNext(); }}
                          style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
                        >
                          <topic.icon size={48} color="var(--accent-color)" style={{ marginBottom: '1rem' }} />
                          <h3 className="h3" style={{ marginBottom: '0.5rem' }}>{topic.label}</h3>
                          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Get help with {topic.label.toLowerCase()} issues.</p>
                        </button>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step1" variants={fadeIn} initial="initial" animate="animate" exit="exit">
                <motion.button
                  onClick={handleBack}
                  whileHover={{ x: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </motion.button>
                <Card>
                  <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Contact Information</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email Address</label>
                      <input
                        type="email"
                        placeholder="So we can contact you"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Your phone number"
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                        value={formData.phoneNumber}
                        onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Subject</label>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <motion.button
                          onClick={() => setFormData({ ...formData, subject: 'HT (Handy Talky)' })}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '12px',
                            border: formData.subject === 'HT (Handy Talky)' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                            background: formData.subject === 'HT (Handy Talky)' ? 'rgba(189, 147, 249, 0.1)' : 'var(--bg-secondary)',
                            color: formData.subject === 'HT (Handy Talky)' ? 'var(--accent-color)' : 'var(--text-primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          HT (Handy Talky)
                        </motion.button>
                      </div>
                      <input
                        type="text"
                        placeholder="Or enter other subject..."
                        style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                        value={formData.subject === 'HT (Handy Talky)' ? '' : formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button onClick={handleNext} disabled={!formData.subject || !formData.email || !formData.phoneNumber}>
                        Next Step <ArrowRight size={16} style={{ marginLeft: 8 }} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" variants={fadeIn} initial="initial" animate="animate" exit="exit">
                <motion.button
                  onClick={handleBack}
                  whileHover={{ x: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </motion.button>
                <Card>
                  <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Problem Description</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description</label>
                      <textarea
                        rows={5}
                        placeholder="Detailed explanation of the problem..."
                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Attach Image <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.875rem' }}>(optional)</span>
                      </label>

                      {!formData.imageFile ? (
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '2px dashed var(--border-color)',
                            background: 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setFormData({ ...formData, imageFile: file });
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                          <span style={{ color: 'var(--text-secondary)' }}>Click to upload image</span>
                        </label>
                      ) : (
                        <div style={{
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: 40,
                              height: 40,
                              borderRadius: '6px',
                              background: 'var(--bg-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              📷
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formData.imageFile.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {(formData.imageFile.size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setFormData({ ...formData, imageFile: null })}
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.875rem',
                              color: 'var(--error)',
                              background: 'rgba(255, 85, 85, 0.1)',
                              border: '1px solid rgba(255, 85, 85, 0.3)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button onClick={handleNext} disabled={!formData.description}>
                        Review Request <ArrowRight size={16} style={{ marginLeft: 8 }} />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" variants={fadeIn} initial="initial" animate="animate" exit="exit">
                <motion.button
                  onClick={handleBack}
                  whileHover={{ x: -5, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    marginBottom: '1rem',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ChevronLeft size={18} />
                  <span>Back</span>
                </motion.button>
                <Card>
                  <h2 className="h2" style={{ marginBottom: '1.5rem' }}>Review Request</h2>
                  <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Topic</span>
                      <div style={{ fontWeight: 600 }}>{topics.find(t => t.id === formData.topic)?.label}</div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Email</span>
                      <div style={{ fontWeight: 600 }}>{formData.email}</div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Phone</span>
                      <div style={{ fontWeight: 600 }}>{formData.phoneNumber}</div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Subject</span>
                      <div style={{ fontWeight: 600 }}>{formData.subject}</div>
                    </div>
                    <div>
                      <span className="text-label" style={{ color: 'var(--text-secondary)' }}>Description</span>
                      <div style={{ color: 'var(--text-secondary)' }}>{formData.description}</div>
                    </div>
                  </div>

                  {error && (
                    <div style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>
                      {error}
                    </div>
                  )}

                  <motion.button
                    onClick={handleSubmit}
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    style={{
                      width: '100%',
                      padding: '1rem 2rem',
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#fff',
                      background: loading
                        ? 'linear-gradient(135deg, #666 0%, #888 100%)'
                        : 'linear-gradient(135deg, var(--accent-color) 0%, #bd93f9 100%)',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: loading
                        ? 'none'
                        : '0 8px 24px rgba(189, 147, 249, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {loading && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{
                          width: 20,
                          height: 20,
                          border: '3px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                    <span>{loading ? 'Submitting...' : 'Submit Ticket'}</span>
                    {!loading && <ArrowRight size={20} />}
                  </motion.button>
                </Card>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" variants={fadeIn} initial="initial" animate="animate" exit="exit" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                    style={{ background: 'var(--success)', width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
                  >
                    <CheckCircle size={40} color="#fff" />
                  </motion.div>
                </div>
                <h2 className="h2" style={{ marginBottom: '1rem' }}>Ticket Created Successfully!</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  We have received your request and will get back to you shortly at {formData.email}.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={() => { setStep(0); setFormData({ topic: '', subject: '', description: '', email: '', phoneNumber: '', imageFile: null }); }}>
                    Create Another
                  </Button>
                  <Button onClick={() => window.location.href = '/status'}>
                    View Status
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </main>
  );
}
