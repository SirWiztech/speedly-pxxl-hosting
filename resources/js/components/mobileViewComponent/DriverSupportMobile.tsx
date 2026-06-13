import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import DriverNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/DriverSupportMobile.css';

// Types
interface FaqItem {
    question: string;
    answer: string;
    isOpen: boolean;
}

const DriverSupportMobile: React.FC = () => {
    // State
    const [userName, setUserName] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('General Inquiry');
    const [subject, setSubject] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [priority, setPriority] = useState<string>('Normal');
    const [loading, setLoading] = useState<boolean>(true);
    const [charCount, setCharCount] = useState<number>(0);
    const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [myTickets, setMyTickets] = useState<any[]>([]);

    // FAQ Data
    const faqs: FaqItem[] = [
        {
            question: 'How do I cancel a ride?',
            answer: 'Open the active ride on your dashboard and tap "Cancel Ride". Free cancellation is available within 2 minutes of booking.',
            isOpen: true
        },
        {
            question: 'Why hasn\'t my wallet been credited?',
            answer: 'Credits can take up to 5 minutes to reflect. If it\'s been more than 30 minutes, contact support with your payment reference number.',
            isOpen: false
        },
        {
            question: 'How do I request a refund?',
            answer: 'Go to Ride History, select the disputed ride, and tap "Request Refund". Our team reviews refunds within 48 hours.',
            isOpen: false
        },
        {
            question: 'How do I report a driver?',
            answer: 'Select the "Safety Concern" category and submit a complaint, or call our hotline for urgent matters.',
            isOpen: false
        }
    ];

    // Categories
    const categories = [
        { value: 'General Inquiry', icon: 'fa-question-circle', label: 'General' },
        { value: 'Ride Issue', icon: 'fa-car', label: 'Ride' },
        { value: 'Payment Problem', icon: 'fa-credit-card', label: 'Payment' },
        { value: 'Account Problem', icon: 'fa-user', label: 'Account' },
        { value: 'Safety Concern', icon: 'fa-shield-alt', label: 'Safety' },
        { value: 'Other', icon: 'fa-ellipsis-h', label: 'Other' }
    ];

    // Fetch user data
    const fetchUserData = async () => {
        try {
            const data = await api.driver.profile();
            
            if (data.success || data.data) {
                const user = data.data?.user || data.user || data.data;
                setUserName(user?.fullname || user?.full_name || 'Guest');
                setNotificationCount(data.data?.notification_count || data.notification_count || 0);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update character count
    useEffect(() => {
        setCharCount(message.length);
    }, [message]);

    // Handle FAQ toggle
    const toggleFaq = (index: number) => {
        const newIndex = openFaqIndex === index ? -1 : index;
        setOpenFaqIndex(newIndex);
    };

    // Submit support ticket
    const handleSubmit = async () => {
        if (!subject.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Subject Required',
                text: 'Please add a short subject for your message.',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        if (message.length < 20) {
            Swal.fire({
                icon: 'warning',
                title: 'Message Too Short',
                text: 'Please describe your issue in more detail.',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        Swal.fire({
            title: 'Submitting...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const formData = new FormData();
        formData.append('category', selectedCategory);
        formData.append('subject', subject);
        formData.append('message', message);
        formData.append('priority', priority);

        try {
            const data = await api.driver.support({
                category: selectedCategory,
                subject: subject,
                message: message,
                priority: priority
            });

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Request Submitted!',
                    html: `
                        <p>Your support request has been submitted!</p>
                        <p class="mt-2">Ticket: <strong>${data.ticket_number}</strong></p>
                        <p class="mt-2 text-sm">Response within 24 hours.</p>
                    `,
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    setSubject('');
                    setMessage('');
                    setCharCount(0);
                    setTimeout(() => {
                        router.visit('/driverdashboard');
                    }, 2000);
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: data.message || 'Please try again.',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Please check your connection.',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    const viewTicketReply = (ticket: any) => {
        let html = `<div style="text-align:left"><p><strong>Your Message:</strong></p><p>${ticket.message}</p>`;
        if (ticket.admin_reply) {
            html += `<hr style="margin:12px 0"><p><strong>Admin Reply:</strong></p><p>${ticket.admin_reply}</p>`;
            if (ticket.replied_at) {
                html += `<p style="font-size:11px;color:#999">Replied: ${new Date(ticket.replied_at).toLocaleString()}</p>`;
            }
        }
        html += `<hr style="margin:12px 0"><p><strong>Status:</strong> <span style="text-transform:capitalize">${ticket.status}</span></p></div>`;

        Swal.fire({
            title: `Ticket #${ticket.ticket_number}`,
            html,
            icon: 'info',
            confirmButtonColor: '#ff5e00'
        });
    };

    // Go back
    const goBack = () => {
        window.history.back();
    };

    const firstName = userName?.split(' ')[0] || 'Guest';

    const fetchMyTickets = async () => {
        try {
            const data = await api.driver.supportTickets();
            if (data.success && data.data) {
                setMyTickets(data.data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        }
    };

    useEffect(() => {
        fetchUserData();
        fetchMyTickets();
    }, []);


    const getCharColor = () => {
        if (charCount > 1800) return '#ef4444';
        if (charCount > 1400) return '#ff5e00';
        return '';
    };

    return (
        <div className="mobile-support-container">
            <div className="mobile-support-view">
                {/* Header */}
                <div className="mobile-support-header">
                    <button className="mobile-back-btn" onClick={goBack}>
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <h1>Support Center</h1>
                    <button className="mobile-notification-btn" onClick={() => router.visit('/notifications')}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Hero */}
                <div className="mobile-support-hero">
                    <div className="hero-icon">
                        <i className="fas fa-headset"></i>
                    </div>
                    <p>Tell us what's going on, {firstName}. We're listening.</p>
                    <div className="hero-badges">
                        <span className="hero-badge"><i className="fas fa-clock"></i> 24h reply</span>
                        <span className="hero-badge"><i className="fas fa-lock"></i> Secure</span>
                    </div>
                </div>

                {/* Form */}
                <div className="mobile-support-form">
                    {/* Category */}
                    <div className="form-group">
                        <label>What's this about?</label>
                        <div className="category-pills">
                            {categories.map((cat) => (
                                <button
                                    key={cat.value}
                                    className={`pill ${selectedCategory === cat.value ? 'active' : ''}`}
                                    onClick={() => setSelectedCategory(cat.value)}
                                >
                                    <i className={`fas ${cat.icon}`}></i> {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="form-group">
                        <label>Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Brief title of your issue…"
                            maxLength={120}
                        />
                    </div>

                    {/* Priority */}
                    <div className="form-group">
                        <label>Priority</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                            <option value="Normal">🟡 Normal</option>
                            <option value="High">🔴 High – Urgent</option>
                            <option value="Low">🟢 Low – No Rush</option>
                        </select>
                    </div>

                    {/* Message */}
                    <div className="form-group">
                        <label>Your Message</label>
                        <textarea
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={2000}
                            placeholder="Describe your issue in detail…"
                        />
                        <div className="char-count" style={{ color: getCharColor() }}>
                            <span className="font-roboto-number">{charCount}</span> / 2000
                        </div>
                    </div>

                    {/* Submit */}
                    <button className="submit-btn" onClick={handleSubmit}>
                        <i className="fas fa-paper-plane"></i> Submit Request
                    </button>
                    <p className="submit-note">Response within 24 hours</p>
                </div>

                {/* Divider */}
                <div className="divider">
                    <span>or reach us via</span>
                </div>

                {/* Contact Options */}
                <div className="mobile-contact-options">
                    <a href="tel:+2348000000000" className="contact-item">
                        <div className="contact-icon phone">
                            <i className="fas fa-phone"></i>
                        </div>
                        <div>
                            <p>Phone</p>
                            <span>Mon – Sat, 8am – 8pm</span>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                    </a>
                    <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" className="contact-item">
                        <div className="contact-icon whatsapp">
                            <i className="fab fa-whatsapp"></i>
                        </div>
                        <div>
                            <p>WhatsApp</p>
                            <span>Chat with our team</span>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                    </a>
                    <a href="mailto:speedlyentreprise01@gmail.com" className="contact-item">
                        <div className="contact-icon email">
                            <i className="fas fa-envelope"></i>
                        </div>
                        <div>
                            <p>Email</p>
                            <span>speedlyentreprise01@gmail.com</span>
                        </div>
                        <i className="fas fa-chevron-right"></i>
                    </a>
                </div>

                {/* My Previous Tickets */}
                <div className="mobile-faq-section" style={{ marginTop: '16px' }}>
                    <h3>My Previous Tickets</h3>
                    {myTickets.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#999', padding: '16px', fontSize: '13px' }}>No previous tickets found.</p>
                    ) : (
                        myTickets.map(ticket => (
                            <div key={ticket.id} onClick={() => viewTicketReply(ticket)} style={{
                                background: '#1a1a2e',
                                borderRadius: '10px',
                                padding: '12px',
                                marginBottom: '10px',
                                cursor: 'pointer',
                                border: '1px solid #2a2a4a'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <strong style={{ color: '#fff', fontSize: '13px' }}>#{ticket.ticket_number}</strong>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '10px', fontSize: '11px',
                                        background: ticket.status === 'closed' ? '#1a3a1a' : ticket.status === 'in_progress' ? '#3a3a1a' : '#1a1a3a',
                                        color: ticket.status === 'closed' ? '#10b981' : ticket.status === 'in_progress' ? '#f59e0b' : '#6366f1'
                                    }}>{ticket.status}</span>
                                </div>
                                <p style={{ color: '#ccc', fontSize: '13px', margin: 0 }}>{ticket.subject}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                    <span style={{ fontSize: '11px', color: '#888', textTransform: 'capitalize' }}>{ticket.category}</span>
                                    <span style={{ fontSize: '11px', color: '#888' }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FAQ Section */}
                <div className="mobile-faq-section">
                    <h3>Common Questions</h3>
                    <div className="faq-list">
                        {faqs.map((faq, index) => (
                            <div key={index} className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}>
                                <button className="faq-btn" onClick={() => toggleFaq(index)}>
                                    <span>{faq.question}</span>
                                    <i className={`fas fa-chevron-down ${openFaqIndex === index ? 'rotated' : ''}`}></i>
                                </button>
                                <div className="faq-answer">
                                    <p>{faq.answer}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="mobile-support-footer">
                    <p>Speedly Support</p>
                    <p className="email">speedlyentreprise01@gmail.com</p>
                </div>

                {/* Bottom Navigation */}
                <DriverNavMobile />
            </div>
        </div>
    );
};

export default DriverSupportMobile;