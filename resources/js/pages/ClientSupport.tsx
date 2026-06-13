import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ClientSupportMobile from '../components/mobileViewComponent/ClientSupportMobile';
import '../../css/ClientSupport.css';

// Types
interface SupportTicket {
    category: string;
    subject: string;
    message: string;
    priority: string;
}

interface FaqItem {
    question: string;
    answer: string;
    isOpen: boolean;
}

const ClientSupport: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('General Inquiry');
    const [subject, setSubject] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [priority, setPriority] = useState<string>('Normal');
    const [loading, setLoading] = useState<boolean>(true);
    const [charCount, setCharCount] = useState<number>(0);
    const [openFaqIndex, setOpenFaqIndex] = useState<number>(0);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [myTickets, setMyTickets] = useState<any[]>([]);

    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

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
            answer: 'Select the "Safety Concern" category and submit a complaint, or call our hotline for urgent matters. All reports are treated confidentially.',
            isOpen: false
        }
    ];

    // Categories
    const categories = [
        { value: 'General Inquiry', icon: 'fa-question-circle', label: 'General' },
        { value: 'Ride Issue', icon: 'fa-car', label: 'Ride Issue' },
        { value: 'Payment Problem', icon: 'fa-credit-card', label: 'Payment' },
        { value: 'Account Problem', icon: 'fa-user', label: 'Account' },
        { value: 'Safety Concern', icon: 'fa-shield-alt', label: 'Safety' },
        { value: 'Other', icon: 'fa-ellipsis-h', label: 'Other' }
    ];

    // Fetch user data
    const fetchUserData = useCallback(async () => {
        try {
            const data = await api.client.profile();
            
            if (data.success || data.data) {
                setUserData(data.data?.user || data.user || data.data);
                setNotificationCount(data.notification_count || data.data?.notification_count || 0);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

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
                text: 'Please add a short subject so we know what your message is about.',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        if (message.length < 20) {
            Swal.fire({
                icon: 'warning',
                title: 'Message Too Short',
                text: 'Please describe your issue in at least a few words.',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        Swal.fire({
            title: 'Submitting...',
            text: 'Please wait while we submit your request',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const data = await api.client.support({
                category: selectedCategory,
                subject,
                message,
                priority
            });

            if (data.status === 'success' || data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Request Submitted!',
                    html: `
                        <p>Your support request has been submitted successfully!</p>
                        <p class="mt-2">Ticket Number: <strong>${data.ticket_number}</strong></p>
                        <p class="mt-2 text-sm text-gray-500">Our team will respond within 24 hours.</p>
                    `,
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    // Clear form
                    setSubject('');
                    setMessage('');
                    setCharCount(0);
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        router.visit('/client-dashboard');
                    }, 2000);
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Submission Failed',
                    text: data.message || 'Failed to submit support request. Please try again.',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Network error. Please check your connection and try again.',
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

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();

            if ((data.success || data.data) && (data.notifications?.length || data.data?.notifications?.length)) {
                const notifications = data.notifications || data.data?.notifications || [];
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifications.forEach((notif: any) => {
                    html += `
                        <div style="padding: 12px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title || 'Notification'}</strong></p>
                            <p style="font-size: 13px;">${notif.message || ''}</p>
                            <p style="font-size: 11px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    title: `Notifications (${notifications.length})`,
                    html: html,
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            } else {
                Swal.fire({
                    title: 'Notifications',
                    text: 'No new notifications',
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Notifications',
                text: 'No new notifications',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Go back
    const goBack = () => {
        window.history.back();
    };

    const firstName = (userData?.fullname || userData?.full_name)?.split(' ')[0] || 'Guest';
    const userInitial = (userData?.fullname || userData?.full_name)?.charAt(0)?.toUpperCase() || 'U';

    const fetchMyTickets = useCallback(async () => {
        try {
            const data = await api.client.supportTickets();
            if (data.success && data.data) {
                setMyTickets(data.data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        }
    }, []);

    useEffect(() => {
        fetchUserData();
        fetchMyTickets();
    }, [fetchUserData, fetchMyTickets]);

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view
    if (isMobile) {
        return <ClientSupportMobile />;
    }

    const getPriorityIcon = (value: string) => {
        switch (value) {
            case 'Normal': return '🟡 Normal';
            case 'High': return '🔴 High – Urgent';
            case 'Low': return '🟢 Low – No Rush';
            default: return '🟡 Normal';
        }
    };

    const getCharColor = () => {
        if (charCount > 1800) return '#ef4444';
        if (charCount > 1400) return '#ff5e00';
        return '';
    };

    return (
        <div className="support-desktop-container">
            <ClientSidebarDesktop 
                userName={userData?.fullname || userData?.full_name || 'User'} 
                profilePictureUrl={userData?.profile_picture_url}
            />

            <div className="support-desktop-main">
                {/* Header */}
                <div className="support-desktop-header">
                    <div className="support-desktop-title">
                        <h1>Support Center</h1>
                        <p>Tell us what's going on, {firstName}. We're listening.</p>
                    </div>
                    <button className="support-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
                    </button>
                </div>

                {/* Hero Section */}
                <div className="support-hero">
                    <div className="hero-icon">
                        <i className="fas fa-headset"></i>
                    </div>
                    <div className="hero-badges">
                        <span className="hero-badge"><i className="fas fa-clock"></i> Reply within 24h</span>
                        <span className="hero-badge"><i className="fas fa-lock"></i> Secure &amp; Private</span>
                        <span className="hero-badge"><i className="fas fa-envelope"></i> Email Support</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="support-content">
                    {/* Category Selection */}
                    <div className="support-section">
                        <p className="section-label">What's this about?</p>
                        <div className="pills-wrap">
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

                    {/* Subject and Priority */}
                    <div className="support-row">
                        <div className="support-field">
                            <label>Subject</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Brief title of your issue…"
                                maxLength={120}
                            />
                        </div>
                        <div className="support-field">
                            <label>Priority</label>
                            <div className="select-wrapper">
                                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                                    <option value="Normal">🟡 Normal</option>
                                    <option value="High">🔴 High – Urgent</option>
                                    <option value="Low">🟢 Low – No Rush</option>
                                </select>
                                <i className="fas fa-chevron-down select-arrow"></i>
                            </div>
                        </div>
                    </div>

                    {/* Message */}
                    <div className="support-field">
                        <label>Your Message</label>
                        <textarea
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={2000}
                            placeholder="Describe your issue in detail — include your ride ID or transaction reference if relevant…"
                        />
                        <div className="char-row">
                            <span className="char-count" style={{ color: getCharColor() }}>
                                {charCount} / 2000
                            </span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="support-submit">
                        <button className="submit-btn" onClick={handleSubmit}>
                            <i className="fas fa-paper-plane"></i>
                            Submit Support Request
                        </button>
                        <p className="submit-note">
                            Your request will be forwarded to our support team.
                            <strong> Response within 24 hours.</strong>
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="divider">
                        <span>or reach us via</span>
                    </div>

                    {/* Contact Cards */}
                    <div className="contact-grid">
                        <a href="tel:+2348000000000" className="contact-card">
                            <div className="contact-icon phone">
                                <i className="fas fa-phone"></i>
                            </div>
                            <p>Phone</p>
                            <span>Mon – Sat, 8am – 8pm</span>
                        </a>
                        <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer" className="contact-card">
                            <div className="contact-icon whatsapp">
                                <i className="fab fa-whatsapp"></i>
                            </div>
                            <p>WhatsApp</p>
                            <span>Chat with our team</span>
                        </a>
                        <a href="mailto:speedlyentreprise01@gmail.com" className="contact-card">
                            <div className="contact-icon email">
                                <i className="fas fa-envelope"></i>
                            </div>
                            <p>Direct Email</p>
                            <span>speedlyentreprise01@gmail.com</span>
                        </a>
                    </div>

                    {/* My Previous Tickets */}
                    <div className="support-section" style={{ marginTop: '24px' }}>
                        <p className="section-label">My Previous Tickets</p>
                        {myTickets.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>No previous tickets found.</p>
                        ) : (
                            myTickets.map(ticket => (
                                <div key={ticket.id} onClick={() => viewTicketReply(ticket)} style={{
                                    background: '#1a1a2e',
                                    borderRadius: '10px',
                                    padding: '14px',
                                    marginBottom: '10px',
                                    cursor: 'pointer',
                                    border: '1px solid #2a2a4a'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <strong style={{ color: '#fff' }}>#{ticket.ticket_number}</strong>
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
                    <div className="faq-section">
                        <p className="section-label">Common Questions</p>
                        <div className="faq-list">
                            {faqs.map((faq, index) => (
                                <div key={index} className={`faq-item ${openFaqIndex === index ? 'open' : ''}`}>
                                    <button className="faq-btn" onClick={() => toggleFaq(index)}>
                                        <span>{faq.question}</span>
                                        <i className={`fas fa-chevron-down faq-chevron ${openFaqIndex === index ? 'rotated' : ''}`}></i>
                                    </button>
                                    <div className="faq-answer">
                                        <p>{faq.answer}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="support-footer">
                    <p>Speedly Support &middot; <strong>speedlyentreprise01@gmail.com</strong> &middot; Response within 24 hours</p>
                </div>
            </div>
        </div>
    );
};

export default ClientSupport;