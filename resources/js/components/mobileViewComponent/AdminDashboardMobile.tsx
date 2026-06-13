import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import '../../../css/AdminDashboardMobile.css';

// Types
interface DashboardStats {
    total_users: number;
    total_drivers: number;
    active_rides: number;
    completed_rides: number;
    total_revenue: number;
    pending_withdrawals: number;
    pending_count: number;
}

interface User {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    created_at: string;
    is_verified: boolean;
}

interface Driver {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    verification_status: string;
    driver_status: string;
    vehicle_count: number;
    ride_count: number;
}

interface Ride {
    id: string;
    ride_number: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    status: string;
    payment_status: string;
    client_name: string;
    driver_name: string;
}

interface Withdrawal {
    id: string;
    driver_name: string;
    amount: number;
    bank_name: string;
    account_number: string;
    status: string;
    created_at: string;
}

interface KYCDocument {
    id: string;
    full_name: string;
    email: string;
    document_type: string;
    document_url: string;
    verification_status: string;
    created_at: string;
}

interface Dispute {
    id: string;
    dispute_number: string;
    ride_number: string;
    type: string;
    priority: string;
    status: string;
    message_count: number;
    raised_by: string;
    raised_against?: string;
}

interface SupportTicketItem {
    id: string;
    ticket_number: string;
    user_name: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    created_at: string;
}

interface AdminDashboardMobileProps {
    stats: DashboardStats;
    users: User[];
    drivers: Driver[];
    rides: Ride[];
    withdrawals: Withdrawal[];
    kycDocuments: KYCDocument[];
    disputes: Dispute[];
    supportTickets: SupportTicketItem[];
    openTicketsCount: number;
    notificationCount: number;
    adminName: string;
    onLogout: () => void;
    formatCurrency: (amount: number) => string;
    getStatusBadgeClass: (status: string) => string;
    onTabChange?: (tab: string) => void;
}

const AdminDashboardMobile: React.FC<AdminDashboardMobileProps> = ({
    stats,
    users,
    drivers,
    rides,
    withdrawals,
    kycDocuments,
    disputes,
    supportTickets,
    openTicketsCount,
    notificationCount,
    adminName,
    onLogout,
    formatCurrency,
    getStatusBadgeClass,
    onTabChange
}) => {
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        onTabChange?.(tab);
    };

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-home', color: '#ff4500' },
        { id: 'users', label: 'Users', icon: 'fa-users', color: '#3b82f6' },
        { id: 'drivers', label: 'Drivers', icon: 'fa-id-card', color: '#ff4500' },
        { id: 'rides', label: 'Rides', icon: 'fa-car', color: '#22c55e' },
        { id: 'wallets', label: 'Wallets', icon: 'fa-wallet', color: '#f59e0b' },
        { id: 'kyc', label: 'KYC', icon: 'fa-file-alt', color: '#8b5cf6' },
        { id: 'support', label: 'Support', icon: 'fa-headset', color: '#06b6d4' },
        { id: 'disputes', label: 'Disputes', icon: 'fa-exclamation-triangle', color: '#ef4444' },
    ];

    const getFilteredUsers = () => {
        if (filterStatus === 'all') return users;
        const isVerified = filterStatus === 'verified';
        return users.filter(user => user.is_verified === isVerified);
    };

    const getFilteredDrivers = () => {
        if (filterStatus === 'all') return drivers;
        return drivers.filter(driver => driver.verification_status === filterStatus);
    };

    const searchUsers = () => {
        if (!searchTerm) return getFilteredUsers();
        return getFilteredUsers().filter(user =>
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const renderDashboard = () => (
        <div className="mobile-dashboard">
            <div className="mobile-stats-grid">
                <div className="mobile-stat-card">
                    <div className="mobile-stat-icon users"><i className="fas fa-users"></i></div>
                    <div className="mobile-stat-info">
                        <h3>Total Users</h3>
                        <p className="stat-value">{stats.total_users.toLocaleString()}</p>
                    </div>
                </div>
                <div className="mobile-stat-card">
                    <div className="mobile-stat-icon drivers"><i className="fas fa-id-card"></i></div>
                    <div className="mobile-stat-info">
                        <h3>Total Drivers</h3>
                        <p className="stat-value">{stats.total_drivers.toLocaleString()}</p>
                    </div>
                </div>
                <div className="mobile-stat-card">
                    <div className="mobile-stat-icon rides"><i className="fas fa-car"></i></div>
                    <div className="mobile-stat-info">
                        <h3>Active Rides</h3>
                        <p className="stat-value">{stats.active_rides.toLocaleString()}</p>
                    </div>
                </div>
                <div className="mobile-stat-card">
                    <div className="mobile-stat-icon revenue"><i className="fas fa-naira-sign"></i></div>
                    <div className="mobile-stat-info">
                        <h3>Total Revenue</h3>
                        <p className="stat-value">{formatCurrency(stats.total_revenue)}</p>
                    </div>
                </div>
            </div>

            <div className="mobile-quick-actions">
                <h3>Quick Actions</h3>
                <div className="quick-actions-grid">
                    <button className="quick-action-btn" onClick={() => handleTabChange('users')}>
                        <i className="fas fa-users"></i>
                        <span>Manage Users</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleTabChange('drivers')}>
                        <i className="fas fa-id-card"></i>
                        <span>Manage Drivers</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleTabChange('rides')}>
                        <i className="fas fa-car"></i>
                        <span>View Rides</span>
                    </button>
                    <button className="quick-action-btn" onClick={() => handleTabChange('wallets')}>
                        <i className="fas fa-wallet"></i>
                        <span>Withdrawals</span>
                    </button>
                </div>
            </div>

            <div className="mobile-recent-activity">
                <h3>Recent Withdrawals</h3>
                {withdrawals.slice(0, 3).map(w => (
                    <div key={w.id} className="mobile-activity-item">
                        <div className="activity-info">
                            <p className="activity-title">{w.driver_name}</p>
                            <p className="activity-amount">{formatCurrency(w.amount)}</p>
                        </div>
                        <span className={getStatusBadgeClass(w.status)}>{w.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="mobile-users">
            <div className="mobile-search-bar">
                <i className="fas fa-search"></i>
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
            <div className="mobile-filter-tabs">
                <button className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
                <button className={`filter-chip ${filterStatus === 'verified' ? 'active' : ''}`} onClick={() => setFilterStatus('verified')}>Verified</button>
                <button className={`filter-chip ${filterStatus === 'unverified' ? 'active' : ''}`} onClick={() => setFilterStatus('unverified')}>Unverified</button>
            </div>
            <div className="mobile-user-list">
                {searchUsers().map(user => (
                    <div key={user.id} className="mobile-user-card">
                        <div className="user-avatar-sm">{user.full_name.charAt(0).toUpperCase()}</div>
                        <div className="user-info">
                            <h4>{user.full_name}</h4>
                            <p>{user.email}</p>
                            <p className="user-phone">{user.phone_number}</p>
                        </div>
                        <span className={`status-badge ${user.is_verified ? 'approved' : 'pending'}`}>
                            {user.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderDrivers = () => (
        <div className="mobile-drivers">
            <div className="mobile-filter-tabs">
                <button className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
                <button className={`filter-chip ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>Pending</button>
                <button className={`filter-chip ${filterStatus === 'approved' ? 'active' : ''}`} onClick={() => setFilterStatus('approved')}>Approved</button>
            </div>
            <div className="mobile-driver-list">
                {getFilteredDrivers().map(driver => (
                    <div key={driver.id} className="mobile-driver-card">
                        <div className="driver-avatar">{driver.full_name.charAt(0).toUpperCase()}</div>
                        <div className="driver-info">
                            <h4>{driver.full_name}</h4>
                            <p>{driver.email}</p>
                            <div className="driver-meta">
                                <span className="vehicle-count"><i className="fas fa-car"></i> {driver.vehicle_count} vehicles</span>
                            </div>
                        </div>
                        <div className="driver-status">
                            <span className={getStatusBadgeClass(driver.verification_status)}>{driver.verification_status}</span>
                            <span className={getStatusBadgeClass(driver.driver_status)}>{driver.driver_status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRides = () => (
        <div className="mobile-rides">
            <div className="mobile-ride-list">
                {rides.slice(0, 10).map(ride => (
                    <div key={ride.id} className="mobile-ride-card">
                        <div className="ride-header">
                            <span className="ride-number">#{ride.ride_number}</span>
                            <span className={getStatusBadgeClass(ride.status)}>{ride.status}</span>
                        </div>
                        <div className="ride-details">
                            <p><i className="fas fa-map-marker-alt"></i> {ride.pickup_address?.substring(0, 30)}...</p>
                            <p><i className="fas fa-flag-checkered"></i> {ride.destination_address?.substring(0, 30)}...</p>
                            <div className="ride-participants">
                                <span><i className="fas fa-user"></i> {ride.client_name}</span>
                                <span><i className="fas fa-user-tie"></i> {ride.driver_name || 'Unassigned'}</span>
                            </div>
                        </div>
                        <div className="ride-footer">
                            <span className="ride-fare">{formatCurrency(ride.total_fare)}</span>
                            <span className={getStatusBadgeClass(ride.payment_status)}>{ride.payment_status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderWallets = () => (
        <div className="mobile-wallets">
            <div className="mobile-withdrawal-list">
                {withdrawals.map(w => (
                    <div key={w.id} className="mobile-withdrawal-card">
                        <div className="withdrawal-info">
                            <h4>{w.driver_name}</h4>
                            <p>{w.bank_name} • ****{w.account_number?.slice(-4)}</p>
                            <p className="withdrawal-date">{new Date(w.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="withdrawal-amount">
                            <p className="amount">{formatCurrency(w.amount)}</p>
                            <span className={getStatusBadgeClass(w.status)}>{w.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const viewKycDocument = (doc: KYCDocument) => {
        if (!doc.document_url) {
            Swal.fire({ icon: 'info', title: 'No Document', text: 'Document URL not available', confirmButtonColor: '#ff5e00' });
            return;
        }
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.document_url);
        if (isImage) {
            Swal.fire({
                title: doc.document_type.replace(/_/g, ' ') + ' - ' + doc.full_name,
                imageUrl: doc.document_url,
                imageWidth: 400,
                imageAlt: doc.document_type,
                confirmButtonColor: '#ff5e00',
                confirmButtonText: 'Close'
            });
        } else {
            window.open(doc.document_url, '_blank');
        }
    };

    const handleApproveKyc = async (docId: string) => {
        const result = await Swal.fire({
            title: 'Approve Document?',
            text: 'Are you sure you want to approve this KYC document?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, approve',
            cancelButtonText: 'Cancel'
        });
        if (result.isConfirmed) {
            try {
                const { default: api } = await import('../../services/api');
                const data = await api.admin.approveKyc(docId);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Approved', text: 'KYC document approved', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to approve', confirmButtonColor: '#ff5e00' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to approve document', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const handleRejectKyc = async (docId: string) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Document',
            input: 'textarea',
            inputLabel: 'Reason for rejection',
            inputPlaceholder: 'Enter the reason...',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            preConfirm: (value) => {
                if (!value) {
                    Swal.showValidationMessage('Please enter a reason');
                    return false;
                }
                return value;
            }
        });
        if (reason) {
            try {
                const { default: api } = await import('../../services/api');
                const data = await api.admin.rejectKyc(docId, { reason });
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Rejected', text: 'KYC document rejected', timer: 1500, showConfirmButton: false });
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to reject', confirmButtonColor: '#ff5e00' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reject document', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const renderKYC = () => (
        <div className="mobile-kyc">
            <div className="mobile-filter-tabs">
                <button className={`filter-chip ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
                <button className={`filter-chip ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>Pending</button>
                <button className={`filter-chip ${filterStatus === 'approved' ? 'active' : ''}`} onClick={() => setFilterStatus('approved')}>Approved</button>
                <button className={`filter-chip ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => setFilterStatus('rejected')}>Rejected</button>
            </div>
            <div className="mobile-kyc-list">
                {kycDocuments.filter(doc => filterStatus === 'all' || doc.verification_status === filterStatus).map(doc => (
                    <div key={doc.id} className="mobile-kyc-card">
                        <div className="kyc-info">
                            <h4>{doc.full_name}</h4>
                            <p>{doc.document_type.replace('_', ' ')}</p>
                            <p className="kyc-date">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="kyc-actions">
                            <span className={getStatusBadgeClass(doc.verification_status)}>{doc.verification_status}</span>
                            <div className="kyc-action-buttons" style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => viewKycDocument(doc)} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                    <i className="fas fa-eye"></i> View
                                </button>
                                {doc.verification_status === 'pending' && (
                                    <>
                                        <button className="action-btn approve" onClick={() => handleApproveKyc(doc.id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                            <i className="fas fa-check"></i> Approve
                                        </button>
                                        <button className="action-btn danger" onClick={() => handleRejectKyc(doc.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                                            <i className="fas fa-times"></i> Reject
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {kycDocuments.filter(doc => filterStatus === 'all' || doc.verification_status === filterStatus).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                        No KYC documents found
                    </div>
                )}
            </div>
        </div>
    );

    const renderDisputes = () => (
        <div className="mobile-disputes">
            <div className="mobile-dispute-list">
                {disputes.map(dispute => (
                    <div key={dispute.id} className="mobile-dispute-card">
                        <div className="dispute-header">
                            <span className="dispute-number">#{dispute.dispute_number}</span>
                            <span className={`badge badge-${dispute.priority}`}>{dispute.priority}</span>
                        </div>
                        <p className="dispute-type"><i className="fas fa-tag"></i> {dispute.type}</p>
                        <p className="dispute-parties">
                            <span>{dispute.raised_by} vs {dispute.raised_against || 'Unknown'}</span>
                        </p>
                        <div className="dispute-footer">
                            <span className={getStatusBadgeClass(dispute.status)}>{dispute.status}</span>
                            <span className="message-count"><i className="fas fa-comment"></i> {dispute.message_count}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const viewTicketDetails = async (ticket: SupportTicketItem) => {
        const { default: Swal } = await import('sweetalert2');
        const priorityColors: Record<string, string> = { low: '#10b981', normal: '#f59e0b', high: '#ef4444' };
        Swal.fire({
            title: `#${ticket.ticket_number}`,
            html: `
                <div style="text-align: left; font-size: 13px;">
                    <p><strong>From:</strong> ${ticket.user_name}</p>
                    <p><strong>Subject:</strong> ${ticket.subject}</p>
                    <p><strong>Category:</strong> ${ticket.category}</p>
                    <p><strong>Priority:</strong> <span style="color:${priorityColors[ticket.priority] || '#999'}">${ticket.priority}</span></p>
                    <p><strong>Status:</strong> ${ticket.status}</p>
                </div>
            `,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Close'
        });
    };

    const renderSupportTickets = () => (
        <div className="mobile-support-tickets">
            <div className="mobile-section-header">
                <h3>Support Tickets {openTicketsCount > 0 ? <span style={{ color: '#ef4444', fontSize: '12px' }}>({openTicketsCount} open)</span> : ''}</h3>
            </div>
            <div className="mobile-ticket-list">
                {supportTickets.length > 0 ? supportTickets.map(ticket => (
                    <div key={ticket.id} className="mobile-ticket-card" style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => viewTicketDetails(ticket)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#999' }}>{ticket.ticket_number}</span>
                            <span className={getStatusBadgeClass(ticket.status === 'closed' ? 'completed' : ticket.status === 'in_progress' ? 'ongoing' : 'pending')} style={{ fontSize: '10px', textTransform: 'capitalize' }}>{ticket.status.replace('_', ' ')}</span>
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{ticket.subject}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>{ticket.user_name} &middot; {ticket.category}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                            <span style={{
                                padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 600,
                                background: ticket.priority === 'high' ? '#fef2f2' : ticket.priority === 'low' ? '#f0fdf4' : '#fefce8',
                                color: ticket.priority === 'high' ? '#ef4444' : ticket.priority === 'low' ? '#10b981' : '#f59e0b'
                            }}>{ticket.priority}</span>
                            <span style={{ fontSize: '11px', color: '#999' }}>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                )) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        <i className="fas fa-ticket-alt" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                        No support tickets
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="admin-mobile-container">
            {/* Header */}
            <div className="mobile-header">
                <button className="menu-toggle" onClick={toggleSidebar}>
                    <i className="fas fa-bars"></i>
                </button>
                <img src="/main-assets/logo-no-background.png" alt="Speedly" className="mobile-logo" />
                <div className="header-right">
                    <button className="mobile-notification-btn">
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
                    </button>
                    <button className="mobile-logout-btn" onClick={onLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>

            {/* Sidebar Drawer */}
            {sidebarOpen && (
                <>
                    <div className="mobile-sidebar-overlay" onClick={toggleSidebar}></div>
                    <div className="mobile-sidebar">
                        <div className="sidebar-header">
                            <img src="/main-assets/logo-no-background.png" alt="Speedly" />
                            <button className="close-sidebar" onClick={toggleSidebar}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="sidebar-user-info">
                            <div className="user-avatar-lg">{adminName.charAt(0).toUpperCase()}</div>
                            <h3>{adminName}</h3>
                            <p>Super Administrator</p>
                        </div>
                        <nav className="mobile-nav">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
                                    onClick={() => {
                                        handleTabChange(item.id);
                                        setSidebarOpen(false);
                                    }}
                                >
                                    <i className={`fas ${item.icon}`} style={{ color: item.color }}></i>
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </nav>
                        <button className="mobile-logout-full" onClick={onLogout}>
                            <i className="fas fa-sign-out-alt"></i>
                            Logout
                        </button>
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className="mobile-main-content">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'drivers' && renderDrivers()}
                {activeTab === 'rides' && renderRides()}
                {activeTab === 'wallets' && renderWallets()}
                {activeTab === 'kyc' && renderKYC()}
                {activeTab === 'support' && renderSupportTickets()}
                {activeTab === 'disputes' && renderDisputes()}
            </div>
        </div>
    );
};

export default AdminDashboardMobile;