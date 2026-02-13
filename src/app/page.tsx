'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server, HelpCircle, FilePlus, Wrench, Printer,
  ArrowRight, CheckCircle, ChevronLeft, UserCog
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { createTicket } from '@/lib/actions/tickets';
// Supabase import removed

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
    subject: 'HT (Handy Talky)',
    description: '',
    serialNumber: '',
    email: '',
    phoneNumber: '',
    imageFile: null as File | null,
  });

  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const topics = [
    { id: 'new-request', label: 'New Request', icon: FilePlus },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  ];

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);



  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    console.log('SUBMIT: Form data at start:', { ...formData, topic: formData.topic, subject: formData.subject, description: formData.description, serialNumber: formData.serialNumber, email: formData.email, phoneNumber: formData.phoneNumber, imageFile: formData.imageFile ? `${formData.imageFile.name} (${formData.imageFile.size} bytes)` : 'NULL' });

    try {
      let imageUrl = '';

      if (formData.imageFile) {
        console.log('SUBMIT: Attempting to upload image...');
        const uploadData = new FormData();
        uploadData.append('file', formData.imageFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData,
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json().catch(() => ({ error: 'Unknown error' }));
          console.error('SUBMIT: Upload failed:', errorData);
          throw new Error('Failed to upload image: ' + (errorData.error || uploadRes.statusText));
        }

        const uploadResult = await uploadRes.json();
        imageUrl = uploadResult.url;
        console.log('SUBMIT: Upload success, imageUrl:', imageUrl);
      }

      console.log('SUBMIT: Calling createTicket with image_url:', imageUrl || 'NONE');
      const res = await createTicket({
        topic: topics.find(t => (t as any).id === formData.topic)?.label || formData.topic,
        title: formData.subject,
        description: `Serial Number: ${formData.serialNumber}\n\n${formData.description}`,
        contact_email: formData.email,
        contact_phone: formData.phoneNumber,
        priority: 'MEDIUM',
        image_url: imageUrl || undefined
      });

      if (!res.success) throw new Error(res.error);

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
            <motion.a
              href="/admin/login"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}
            >
              <UserCog size={20} />
            </motion.a>
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
                  <h1 className="h1" style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
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
                        style={{
                          width: '100%',
                          padding: '0.8rem',
                          borderRadius: '8px',
                          border: `1px solid ${emailError ? 'var(--error)' : 'var(--border-color)'}`,
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                        value={formData.email}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData({ ...formData, email: val });
                          if (val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
                            setEmailError('Please enter a valid email address');
                          } else {
                            setEmailError('');
                          }
                        }}
                      />
                      {emailError && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{emailError}</p>}
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone Number</label>
                      <input
                        type="tel"
                        placeholder="Your phone number"
                        style={{
                          width: '100%',
                          padding: '0.8rem',
                          borderRadius: '8px',
                          border: `1px solid ${phoneError ? 'var(--error)' : 'var(--border-color)'}`,
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                        value={formData.phoneNumber}
                        onChange={e => {
                          const val = e.target.value;
                          // Allow only digits, plus, spaces, dashes, parentheses
                          if (!/^[\d\s\-\+\(\)]*$/.test(val)) return;

                          setFormData({ ...formData, phoneNumber: val });
                          if (val && !/^[\d\s\-\+\(\)]{10,}$/.test(val)) {
                            setPhoneError('Please enter a valid phone number (min 10 digits)');
                          } else {
                            setPhoneError('');
                          }
                        }}
                      />
                      {phoneError && <p style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{phoneError}</p>}
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
                            border: formData.subject === 'HT (Handy Talky)' ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                            background: formData.subject === 'HT (Handy Talky)' ? 'rgba(0, 0, 0, 0.05)' : 'var(--bg-secondary)',
                            color: formData.subject === 'HT (Handy Talky)' ? 'var(--text-primary)' : 'var(--text-primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          HT (Handy Talky)
                        </motion.button>
                        <motion.button
                          onClick={() => setFormData({ ...formData, subject: 'Printer Issue' })}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            flex: 1,
                            padding: '1rem',
                            borderRadius: '12px',
                            border: formData.subject === 'Printer Issue' ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                            background: formData.subject === 'Printer Issue' ? 'rgba(0, 0, 0, 0.05)' : 'var(--bg-secondary)',
                            color: formData.subject === 'Printer Issue' ? 'var(--text-primary)' : 'var(--text-primary)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Printer Issue
                        </motion.button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button onClick={handleNext} disabled={!formData.subject || !formData.email || !formData.phoneNumber || !!emailError || !!phoneError}>
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
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Serial Number</label>
                        <input
                          type="text"
                          placeholder="Enter device serial number"
                          style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
                          value={formData.serialNumber}
                          onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                        />
                      </div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Details</label>
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
                  <Button variant="secondary" onClick={() => { setStep(0); setFormData({ topic: '', subject: 'HT (Handy Talky)', description: '', serialNumber: '', email: '', phoneNumber: '', imageFile: null }); }}>
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
