import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import AdminDashboardMobile from '../components/mobileViewComponent/AdminDashboardMobile';
import '../../css/AdminDashboard.css';

// Types (same as before)
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
    role: string;
    created_at: string;
    is_verified: boolean;
    is_active: boolean;
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
    raised_against: string;
}

interface SupportTicketItem {
    id: string;
    ticket_number: string;
    user_name: string;
    user_email: string;
    role: string;
    category: string;
    subject: string;
    message: string;
    priority: string;
    status: string;
    admin_reply: string | null;
    created_at: string;
    replied_at: string | null;
    closed_at: string | null;
}

const AdminDashboard: React.FC = () => {
    const [activePage, setActivePage] = useState<string>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [stats, setStats] = useState<DashboardStats>({
        total_users: 0,
        total_drivers: 0,
        active_rides: 0,
        completed_rides: 0,
        total_revenue: 0,
        pending_withdrawals: 0,
        pending_count: 0
    });
    const [users, setUsers] = useState<User[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [rides, setRides] = useState<Ride[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [adminName, setAdminName] = useState<string>('Admin');
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [openTicketsCount, setOpenTicketsCount] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState<number>(1800);
    const [revenueData, setRevenueData] = useState<number[]>([]);
    const [revenueLabels, setRevenueLabels] = useState<string[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState<boolean>(false);
    const [wallets, setWallets] = useState<any[]>([]);
    const [walletsLoading, setWalletsLoading] = useState<boolean>(false);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState<boolean>(false);
    const [reportsData, setReportsData] = useState<any>(null);
    const [reportsLoading, setReportsLoading] = useState<boolean>(false);
    const [places, setPlaces] = useState<any[]>([]);
    const [placesLoading, setPlacesLoading] = useState<boolean>(false);
    const [placesSearch, setPlacesSearch] = useState<string>('');
    const [page, setPage] = useState<number>(1);
    
    let chartInstance: Chart | null = null;
    
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    // Toggle sidebar on mobile
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isMobile && sidebarOpen) {
                const sidebar = document.querySelector('.mobile-sidebar');
                const menuBtn = document.querySelector('.menu-toggle');
                if (sidebar && !sidebar.contains(e.target as Node) && menuBtn && !menuBtn.contains(e.target as Node)) {
                    setSidebarOpen(false);
                }
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [isMobile, sidebarOpen]);

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            const data = await api.admin.stats();
            
            if (data.success) {
                setStats(data.stats);
                setUsers(data.users || []);
                setDrivers(data.drivers || []);
                setRides(data.rides || []);
                setWithdrawals(data.withdrawals || []);
                setKycDocuments(data.kyc_documents || []);
                setDisputes(data.disputes || []);
                setSupportTickets(data.support_tickets || []);
                setOpenTicketsCount(data.open_tickets_count || 0);
                setNotificationCount(data.notification_count || 0);
                setAdminName(data.admin_name || 'Admin');
                setRevenueData(data.revenue_data || []);
                setRevenueLabels(data.revenue_labels || []);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            const msg = error instanceof Error ? error.message : 'Failed to load dashboard data';
            Swal.fire({ title: 'Error', text: msg, icon: 'error', confirmButtonColor: '#ff4500' });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        setPaymentsLoading(true);
        try {
            const data = await api.admin.payments();
            if (data.success) {
                setPayments(data.data?.data || []);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setPaymentsLoading(false);
        }
    }, []);

    const fetchWallets = useCallback(async () => {
        setWalletsLoading(true);
        try {
            const data = await api.admin.wallets();
            if (data.success) {
                setWallets(data.data?.data || []);
            }
        } catch (error) {
            console.error('Error fetching wallets:', error);
        } finally {
            setWalletsLoading(false);
        }
    }, []);

    const fetchFullWithdrawals = useCallback(async () => {
        setPaymentsLoading(true);
        try {
            const data = await api.admin.withdrawals({ status: filterStatus === 'all' ? undefined : filterStatus, page });
            if (data.success) {
                setWithdrawals(data.data?.data || []);
            }
        } catch { } finally { setPaymentsLoading(false); }
    }, [filterStatus, page]);

    const fetchSettings = useCallback(async () => {
        setSettingsLoading(true);
        try {
            const data = await api.admin.settings();
            if (data.success) {
                setSettings(data.data || {});
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    }, []);

    const fetchActivityLogs = useCallback(async () => {
        setActivityLoading(true);
        try {
            const data = await api.admin.activityLogs();
            if (data.success) {
                setActivityLogs(data.data?.data || []);
            }
        } catch { } finally { setActivityLoading(false); }
    }, []);

    const fetchPlaces = useCallback(async () => {
        setPlacesLoading(true);
        try {
            const data = await api.admin.listPlaces({ search: placesSearch || undefined, page });
            if (data.success) {
                setPlaces(data.data?.data || []);
            }
        } catch { } finally { setPlacesLoading(false); }
    }, [placesSearch, page]);

    const handleAddPlace = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Add New Place',
            html: `
                <input id="swal-place-name" class="swal2-input" placeholder="Place Name *" style="margin-bottom:10px">
                <input id="swal-place-state" class="swal2-input" placeholder="State (e.g. Anambra)" style="margin-bottom:10px">
                <div style="display:flex;gap:10px">
                    <input id="swal-place-lat" class="swal2-input" placeholder="Latitude *" type="number" step="any" style="flex:1">
                    <input id="swal-place-lng" class="swal2-input" placeholder="Longitude *" type="number" step="any" style="flex:1">
                </div>
                <input id="swal-place-address" class="swal2-input" placeholder="Full Address" style="margin-top:10px;margin-bottom:10px">
                <input id="swal-place-code" class="swal2-input" placeholder="Feature Code (e.g. PPL, SCH, HSP)" style="margin-bottom:10px">
            `,
            showCancelButton: true,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Add Place',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const name = (document.getElementById('swal-place-name') as HTMLInputElement)?.value?.trim();
                const lat = parseFloat((document.getElementById('swal-place-lat') as HTMLInputElement)?.value);
                const lng = parseFloat((document.getElementById('swal-place-lng') as HTMLInputElement)?.value);
                if (!name || isNaN(lat) || isNaN(lng)) {
                    Swal.showValidationMessage('Name, Latitude, and Longitude are required');
                    return false;
                }
                return {
                    name,
                    state: (document.getElementById('swal-place-state') as HTMLInputElement)?.value?.trim() || '',
                    lat,
                    lng,
                    full_address: (document.getElementById('swal-place-address') as HTMLInputElement)?.value?.trim() || '',
                    feature_code: (document.getElementById('swal-place-code') as HTMLInputElement)?.value?.trim() || 'PPL',
                };
            }
        });

        if (formValues) {
            try {
                const data = await api.admin.addPlace(formValues);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Added', text: 'Place added successfully', timer: 1500, showConfirmButton: false });
                    fetchPlaces();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to add place', confirmButtonColor: '#ff5e00' });
                }
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to add place', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const fetchReports = useCallback(async () => {
        setReportsLoading(true);
        try {
            const data = await api.admin.reports({ type: 'daily', from: '', to: '' });
            if (data.success) {
                setReportsData(data.data || {});
            }
        } catch (error: any) {
            console.error('Error fetching reports:', error);
            if (error?.message) {
                Swal.fire({ title: 'Reports Error', text: error.message, icon: 'error', confirmButtonColor: '#ff4500' });
            }
        } finally {
            setReportsLoading(false);
        }
    }, []);

    const fetchFullDrivers = useCallback(async (pageNum = 1) => {
        try {
            const data = await api.admin.drivers({ page: pageNum });
            if (data.success) {
                setDrivers(data.data?.data || []);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Error fetching full drivers:', error);
        }
    }, []);

    const fetchFullRides = useCallback(async (params?: { status?: string; page?: number }) => {
        try {
            const data = await api.admin.rides({ ...params, page: params?.page || 1, per_page: 15 });
            if (data.success) {
                setRides(data.data?.data || []);
                if (params?.page) setPage(params.page);
            }
        } catch (error) {
            console.error('Error fetching full rides:', error);
        }
    }, []);

    // Initialize chart
    const initChart = useCallback(async () => {
        const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
        if (!canvas || !revenueData.length) return;
        
        try {
            const { Chart, registerables } = await import('chart.js');
            Chart.register(...registerables);
            
            if (chartInstance) {
                chartInstance.destroy();
            }
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: revenueLabels,
                        datasets: [{
                            label: 'Revenue (₦)',
                            data: revenueData,
                            borderColor: '#ff4500',
                            backgroundColor: 'rgba(255, 69, 0, 0.08)',
                            borderWidth: 2.5,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: '#ff4500',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '₦' + context.parsed.y.toLocaleString();
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                                ticks: {
                                    callback: function(value) {
                                        return '₦' + (typeof value === 'number' ? value.toLocaleString() : value);
                                    }
                                }
                            },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('Chart.js not available. Charts disabled.', error);
        }
    }, [revenueData, revenueLabels]);

    // Session timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleLogout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        return () => clearInterval(timer);
    }, []);

    // Fetch data on mount
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Fetch full support tickets when support page is active
    useEffect(() => {
        if (activePage === 'support' && !loading) {
            fetchSupportTickets(filterStatus === 'all' ? undefined : filterStatus);
        }
    }, [activePage]);

    useEffect(() => {
        if (activePage === 'drivers' && !loading) {
            fetchFullDrivers();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'rides' && !loading) {
            fetchFullRides();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'payments' && !loading) {
            fetchPayments();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'wallets' && !loading) {
            fetchWallets();
        } else if (activePage === 'withdrawals' && !loading) {
            fetchFullWithdrawals();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'reports' && !loading) {
            fetchReports();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'settings' && !loading) {
            fetchSettings();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'activity' && !loading) {
            fetchActivityLogs();
        }
    }, [activePage, loading]);

    useEffect(() => {
        if (activePage === 'places' && !loading) {
            fetchPlaces();
        }
    }, [activePage, loading]);

    // Initialize chart when data loads
    useEffect(() => {
        if (!loading && revenueData.length) {
            initChart();
        }
    }, [loading, revenueData, initChart]);

    const handleLogout = () => {
        Swal.fire({
            title: 'Logout',
            text: 'Are you sure you want to logout?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ff4500',
            confirmButtonText: 'Yes, logout',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                api.auth.adminLogout().then(() => {
                    router.visit('/admin-login');
                });
            }
        });
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const formatTime = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getStatusBadgeClass = (status: string) => {
        switch(status) {
            case 'pending': return 'status-badge pending';
            case 'approved': return 'status-badge approved';
            case 'paid': return 'status-badge paid';
            case 'rejected': return 'status-badge rejected';
            case 'active': return 'status-badge active';
            case 'suspended': return 'status-badge suspended';
            case 'completed': return 'status-badge completed';
            case 'ongoing': return 'status-badge ongoing';
            default: return 'status-badge';
        }
    };

    // SHOW PRELOADER FIRST - This is critical
    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    // SHOW LOADING STATE AFTER PRELOADER
    if (loading) {
        return <DesktopPreloader />;
    }

    // Render mobile view after loading is complete
    if (isMobile) {
        return (
            <AdminDashboardMobile
                stats={stats}
                users={users}
                drivers={drivers}
                rides={rides}
                withdrawals={withdrawals}
                kycDocuments={kycDocuments}
                disputes={disputes}
                supportTickets={supportTickets}
                openTicketsCount={openTicketsCount}
                notificationCount={notificationCount}
                adminName={adminName}
                onLogout={handleLogout}
                formatCurrency={formatCurrency}
                getStatusBadgeClass={getStatusBadgeClass}
                onTabChange={(tab) => {
                    if (tab === 'drivers') fetchFullDrivers();
                    if (tab === 'rides') fetchFullRides();
                }}
            />
        );
    }

    // Desktop navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-home' },
        { id: 'users', label: 'Users', icon: 'fa-users' },
        { id: 'drivers', label: 'Drivers', icon: 'fa-id-card' },
        { id: 'rides', label: 'Rides', icon: 'fa-car' },
        { id: 'payments', label: 'Payments', icon: 'fa-credit-card' },
        { id: 'withdrawals', label: 'Withdrawals', icon: 'fa-hand-holding-usd' },
        { id: 'wallets', label: 'Wallets', icon: 'fa-wallet' },
        { id: 'kyc', label: 'KYC Approvals', icon: 'fa-file-alt' },
        { id: 'disputes', label: 'Disputes', icon: 'fa-exclamation-triangle' },
        { id: 'reports', label: 'Reports', icon: 'fa-chart-line' },
        { id: 'settings', label: 'Settings', icon: 'fa-cog' },
        { id: 'activity', label: 'Activity Log', icon: 'fa-history' },
        { id: 'support', label: 'Support Tickets', icon: 'fa-headset' },
        { id: 'places', label: 'Manage Places', icon: 'fa-map-marker-alt' }
    ];

    // Filter functions for desktop
    const filterUsers = (status: string) => setFilterStatus(status);
    const getFilteredUsers = () => {
        if (filterStatus === 'all') return users;
        const isVerified = filterStatus === 'verified';
        return users.filter(user => user.is_verified === isVerified);
    };
    const getFilteredDrivers = () => {
        if (filterStatus === 'all') return drivers;
        return drivers.filter(driver => driver.verification_status === filterStatus);
    };
    const getFilteredRides = () => {
        if (filterStatus === 'all') return rides;
        if (filterStatus === 'ongoing') {
            return rides.filter(ride => ['accepted', 'driver_assigned', 'driver_arrived', 'ongoing'].includes(ride.status));
        }
        return rides.filter(ride => ride.status === filterStatus);
    };
    const getFilteredWithdrawals = () => {
        if (filterStatus === 'all') return withdrawals;
        return withdrawals.filter(w => w.status === filterStatus);
    };
    const getFilteredKYC = () => {
        if (filterStatus === 'all') return kycDocuments;
        return kycDocuments.filter(doc => doc.verification_status === filterStatus);
    };
    const getFilteredDisputes = () => {
        if (filterStatus === 'all') return disputes;
        return disputes.filter(d => d.status === filterStatus);
    };
    const searchUsers = () => {
        if (!searchTerm) return getFilteredUsers();
        return getFilteredUsers().filter(user =>
            user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handleApproveWithdrawal = async (withdrawalId: string) => {
        const result = await Swal.fire({
            title: 'Approve Withdrawal?',
            text: 'The amount will be deducted from the driver\'s wallet.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, approve',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const data = await api.admin.approveWithdrawal(withdrawalId);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Approved', text: data.message, timer: 2000, showConfirmButton: false });
                    fetchFullWithdrawals();
                    fetchDashboardData();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to approve', confirmButtonColor: '#ff5e00' });
                }
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to approve withdrawal', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const handleRejectWithdrawal = async (withdrawalId: string) => {
        const result = await Swal.fire({
            title: 'Reject Withdrawal?',
            text: 'Are you sure you want to reject this withdrawal?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, reject',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const data = await api.admin.rejectWithdrawal(withdrawalId, { reason: 'Rejected by admin' });
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Rejected', text: data.message, timer: 2000, showConfirmButton: false });
                    fetchFullWithdrawals();
                    fetchDashboardData();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to reject', confirmButtonColor: '#ff5e00' });
                }
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reject withdrawal', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const handleToggleUserActive = async (userId: string, isActive: boolean) => {
        const action = isActive ? 'suspend' : 'activate';
        const result = await Swal.fire({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} User?`,
            text: `Are you sure you want to ${action} this user?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: action === 'suspend' ? '#f59e0b' : '#10b981',
            confirmButtonText: `Yes, ${action}`,
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const data = await api.admin.toggleUserActive(userId);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Done', text: `User ${action}d successfully`, timer: 1500, showConfirmButton: false });
                    fetchDashboardData();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed', confirmButtonColor: '#ff5e00' });
                }
            } catch {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update user', confirmButtonColor: '#ff5e00' });
            }
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
                const data = await api.admin.approveKyc(docId);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Approved', text: 'KYC document approved successfully', timer: 1500, showConfirmButton: false });
                    fetchDashboardData();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to approve', confirmButtonColor: '#ff5e00' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to approve document', confirmButtonColor: '#ff5e00' });
            }
        }
    };

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
                imageWidth: 500,
                imageAlt: doc.document_type,
                confirmButtonColor: '#ff5e00',
                confirmButtonText: 'Close'
            });
        } else {
            window.open(doc.document_url, '_blank');
        }
    };

    const handleRejectKyc = async (docId: string) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Document',
            input: 'textarea',
            inputLabel: 'Reason for rejection',
            inputPlaceholder: 'Enter the reason for rejection...',
            inputAttributes: { required: 'true' },
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
                const data = await api.admin.rejectKyc(docId, { reason });
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Rejected', text: 'KYC document rejected', timer: 1500, showConfirmButton: false });
                    fetchDashboardData();
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to reject', confirmButtonColor: '#ff5e00' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reject document', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const handleApproveDriver = async (driverId: string) => {
        const result = await Swal.fire({
            title: 'Approve Driver?',
            text: 'Are you sure you want to approve this driver?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, approve',
            cancelButtonText: 'Cancel'
        });
        if (result.isConfirmed) {
            try {
                const data = await api.admin.approveDriver(driverId);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Approved', text: 'Driver approved successfully', timer: 1500, showConfirmButton: false });
                    fetchFullDrivers();
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to approve driver', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const handleRejectDriver = async (driverId: string) => {
        const { value: reason } = await Swal.fire({
            title: 'Reject Driver',
            input: 'textarea',
            inputLabel: 'Reason for rejection',
            inputPlaceholder: 'Enter the reason for rejection...',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
            preConfirm: (value) => {
                if (!value) { Swal.showValidationMessage('Please enter a reason'); return false; }
                return value;
            }
        });
        if (reason) {
            try {
                const data = await api.admin.rejectDriver(driverId, { reason });
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Rejected', text: 'Driver rejected', timer: 1500, showConfirmButton: false });
                    fetchFullDrivers();
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reject driver', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const fetchSupportTickets = async (status?: string) => {
        try {
            const data = await api.admin.supportTickets({ status });
            if (data.success) {
                const tickets = data.data?.data || data.data || [];
                setSupportTickets(tickets);
            }
        } catch (error) {
            console.error('Error fetching support tickets:', error);
        }
    };

    const handleReplyTicket = async (ticketId: string) => {
        const { value: reply } = await Swal.fire({
            title: 'Reply to Ticket',
            input: 'textarea',
            inputLabel: 'Your reply',
            inputPlaceholder: 'Type your response to the user...',
            inputAttributes: { required: 'true' },
            showCancelButton: true,
            confirmButtonColor: '#ff4500',
            confirmButtonText: 'Send Reply',
            cancelButtonText: 'Cancel',
            preConfirm: (value) => {
                if (!value || value.trim().length < 5) {
                    Swal.showValidationMessage('Reply must be at least 5 characters');
                    return false;
                }
                return value;
            }
        });

        if (reply) {
            try {
                const data = await api.admin.replyTicket(ticketId, { reply });
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Reply Sent', text: 'Your reply has been sent to the user.', timer: 1500, showConfirmButton: false });
                    fetchSupportTickets(filterStatus === 'all' ? undefined : filterStatus);
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to send reply', confirmButtonColor: '#ff5e00' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: error instanceof Error ? error.message : 'Failed to send reply', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const handleCloseTicket = async (ticketId: string) => {
        const result = await Swal.fire({
            title: 'Close Ticket?',
            text: 'Are you sure you want to close this support ticket?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6b7280',
            confirmButtonText: 'Yes, close',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const data = await api.admin.closeTicket(ticketId);
                if (data.success) {
                    Swal.fire({ icon: 'success', title: 'Closed', text: 'Support ticket closed', timer: 1500, showConfirmButton: false });
                    fetchSupportTickets(filterStatus === 'all' ? undefined : filterStatus);
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Failed to close ticket', confirmButtonColor: '#ff5e00' });
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: error instanceof Error ? error.message : 'Failed to close ticket', confirmButtonColor: '#ff5e00' });
            }
        }
    };

    const viewTicketDetails = (ticket: SupportTicketItem) => {
        const priorityColors: Record<string, string> = { low: '#10b981', normal: '#f59e0b', high: '#ef4444' };
        const priorityLabel = ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1);

        Swal.fire({
            title: `Ticket #${ticket.ticket_number}`,
            html: `
                <div style="text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span><strong>Status:</strong> <span style="text-transform:capitalize">${ticket.status}</span></span>
                        <span><strong>Priority:</strong> <span style="color:${priorityColors[ticket.priority] || '#999'}">${priorityLabel}</span></span>
                    </div>
                    <div style="margin-bottom: 8px;"><strong>From:</strong> ${ticket.user_name} (${ticket.user_email})</div>
                    <div style="margin-bottom: 8px;"><strong>Category:</strong> ${ticket.category}</div>
                    <div style="margin-bottom: 8px;"><strong>Subject:</strong> ${ticket.subject}</div>
                    <hr style="margin: 12px 0; border-color: #eee;">
                    <div style="margin-bottom: 12px; padding: 12px; background: #f9fafb; border-radius: 8px;">
                        <strong>Message:</strong>
                        <p style="margin-top: 8px; white-space: pre-wrap;">${ticket.message}</p>
                    </div>
                    ${ticket.admin_reply ? `
                        <hr style="margin: 12px 0; border-color: #eee;">
                        <div style="padding: 12px; background: #fff7ed; border-radius: 8px; border-left: 3px solid #ff4500;">
                            <strong>Admin Reply:</strong>
                            <p style="margin-top: 8px; white-space: pre-wrap;">${ticket.admin_reply}</p>
                            ${ticket.replied_at ? `<p style="font-size: 11px; color: #999; margin-top: 8px;">Replied: ${new Date(ticket.replied_at).toLocaleString()}</p>` : ''}
                        </div>
                    ` : ''}
                    <p style="font-size: 11px; color: #999; margin-top: 12px;">Created: ${new Date(ticket.created_at).toLocaleString()}</p>
                </div>
            `,
            confirmButtonColor: '#ff4500',
            confirmButtonText: 'Close',
            width: '600px'
        });
    };

    return (
        <div className="admin-desktop-container">
            {/* Desktop Sidebar - same as before */}
            <div className="admin-sidebar">
                <div className="sidebar-logo">
                    <img src="/main-assets/logo-no-background.png" alt="Speedly" className="logo-image" />
                </div>
                
                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => setActivePage(item.id)}
                        >
                            <i className={`fas ${item.icon}`}></i>
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                
                <div className="sidebar-user">
                    <div className="user-avatar">{adminName.charAt(0).toUpperCase()}</div>
                    <div className="user-info">
                        <h4>{adminName}</h4>
                        <p>Super Administrator</p>
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>

            {/* Desktop Main Content */}
            <div className="admin-main">
                <div className="admin-header">
                    <div className="header-title">
                        <h1>{activePage.charAt(0).toUpperCase() + activePage.slice(1)}</h1>
                        <p>Welcome back, {adminName}! Here's what's happening today.</p>
                    </div>
                    <div className="header-actions">
                        <div className="session-timer">
                            <i className="fas fa-clock"></i>
                            <span>{formatTime()}</span>
                        </div>
                        <button className="notification-btn">
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
                        </button>
                    </div>
                </div>

                {/* Desktop content - same as before */}
                {activePage === 'dashboard' && (
                    <div className="dashboard-page">
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon users"><i className="fas fa-users"></i></div>
                                <div className="stat-details">
                                    <h3>Total Users</h3>
                                    <div className="stat-value">{stats.total_users.toLocaleString()}</div>
                                    <div className="stat-change positive">Active</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon drivers"><i className="fas fa-id-card"></i></div>
                                <div className="stat-details">
                                    <h3>Total Drivers</h3>
                                    <div className="stat-value">{stats.total_drivers.toLocaleString()}</div>
                                    <div className="stat-change positive">Registered</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon rides"><i className="fas fa-car"></i></div>
                                <div className="stat-details">
                                    <h3>Active Rides</h3>
                                    <div className="stat-value">{stats.active_rides.toLocaleString()}</div>
                                    <div className="stat-change">Currently on road</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon completed"><i className="fas fa-check-circle"></i></div>
                                <div className="stat-details">
                                    <h3>Completed Rides</h3>
                                    <div className="stat-value">{stats.completed_rides.toLocaleString()}</div>
                                    <div className="stat-change positive">All time</div>
                                </div>
                            </div>
                            <div className="stat-card revenue-stat">
                                <div className="stat-icon revenue"><i className="fas fa-naira-sign"></i></div>
                                <div className="stat-details">
                                    <h3>Total Revenue</h3>
                                    <div className="stat-value stat-currency">{formatCurrency(stats.total_revenue)}</div>
                                    <div className="stat-change positive">+22% this month</div>
                                </div>
                            </div>
                            <div className="stat-card withdrawal-stat">
                                <div className="stat-icon pending"><i className="fas fa-clock"></i></div>
                                <div className="stat-details">
                                    <h3>Pending Withdrawals</h3>
                                    <div className="stat-value stat-currency">{formatCurrency(stats.pending_withdrawals)}</div>
                                    <div className="stat-change negative">{stats.pending_count} requests</div>
                                </div>
                            </div>
                        </div>

                        <div className="dashboard-grid">
                            <div className="card large">
                                <div className="card-header">
                                    <h2>Revenue Overview (Last 7 Days)</h2>
                                </div>
                                <div className="chart-container">
                                    <canvas id="revenueChart"></canvas>
                                </div>
                            </div>
                            
                            <div className="card">
                                <div className="card-header">
                                    <h2>Recent Withdrawals</h2>
                                    <button className="see-all" onClick={() => setActivePage('wallets')}>View All</button>
                                </div>
                                <div className="withdrawal-list">
                                    {withdrawals.slice(0, 5).map(w => (
                                        <div key={w.id} className="withdrawal-item">
                                            <div>
                                                <h4>{w.driver_name}</h4>
                                                <p>Requested: {formatCurrency(w.amount)}</p>
                                            </div>
                                            <span className={getStatusBadgeClass(w.status)}>{w.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="card">
                                <div className="card-header">
                                    <h2>Top Performers</h2>
                                </div>
                                <div className="performer-list">
                                    {drivers.slice(0, 5).map((driver, idx) => (
                                        <div key={driver.id} className="performer-item">
                                            <div className="performer-rank">#{idx + 1}</div>
                                            <div>
                                                <h4>{driver.full_name}</h4>
                                                <p>{driver.ride_count ?? driver.vehicle_count} rides</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Page */}
                {activePage === 'users' && (
                    <div className="users-page">
                        <div className="page-header">
                            <h2>User Management</h2>
                            <div className="search-bar">
                                <i className="fas fa-search"></i>
                                <input type="text" placeholder="Search users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="filter-tabs">
                                <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => filterUsers('all')}>All</button>
                                <button className={`filter-tab ${filterStatus === 'verified' ? 'active' : ''}`} onClick={() => filterUsers('verified')}>Verified</button>
                                <button className={`filter-tab ${filterStatus === 'unverified' ? 'active' : ''}`} onClick={() => filterUsers('unverified')}>Unverified</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {searchUsers().map(user => (
                                        <tr key={user.id}>
                                            <td>{user.id.substring(0, 8)}...</td>
                                            <td>{user.full_name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone_number}</td>
                                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td><span className={`status-badge ${user.is_verified ? 'approved' : 'pending'}`}>{user.is_verified ? 'Verified' : 'Unverified'}</span></td>
                                            <td className="actions-cell">
                                                <button className="action-btn" title="View"><i className="fas fa-eye"></i></button>
                                                <button className={`action-btn ${user.is_active ? 'danger' : 'approve'}`} title={user.is_active ? 'Suspend' : 'Activate'} onClick={() => handleToggleUserActive(user.id, user.is_active)}>
                                                    <i className={`fas fa-${user.is_active ? 'ban' : 'check-circle'}`}></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Drivers Page */}
                {activePage === 'drivers' && (
                    <div className="drivers-page">
                        <div className="page-header">
                            <h2>Driver Management</h2>
                            <div className="filter-tabs">
                                <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => { setFilterStatus('all'); fetchFullDrivers(); }}>All</button>
                                <button className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => { setFilterStatus('pending'); fetchFullDrivers(); }}>Pending</button>
                                <button className={`filter-tab ${filterStatus === 'approved' ? 'active' : ''}`} onClick={() => { setFilterStatus('approved'); fetchFullDrivers(); }}>Approved</button>
                                <button className={`filter-tab ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => { setFilterStatus('rejected'); fetchFullDrivers(); }}>Rejected</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Name</th><th>Email</th><th>Phone</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {drivers.length > 0 ? drivers.map(driver => (
                                        <tr key={driver.id}>
                                            <td>{driver.full_name}</td>
                                            <td>{driver.email}</td>
                                            <td>{driver.phone_number}</td>
                                            <td className="actions-cell">
                                                <button className="action-btn" title="View"><i className="fas fa-eye"></i></button>
                                                {driver.verification_status === 'pending' && (
                                                    <>
                                                        <button className="action-btn approve" title="Approve" onClick={() => handleApproveDriver(driver.id)}><i className="fas fa-check-circle"></i></button>
                                                        <button className="action-btn danger" title="Reject" onClick={() => handleRejectDriver(driver.id)}><i className="fas fa-times-circle"></i></button>
                                                    </>
                                                )}
                                                <button className={`action-btn ${driver.is_active ? 'danger' : 'approve'}`} title={driver.is_active ? 'Suspend' : 'Activate'} onClick={() => handleToggleUserActive(driver.id, driver.is_active)}>
                                                    <i className={`fas fa-${driver.is_active ? 'ban' : 'check-circle'}`}></i>
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                No drivers found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Rides Page */}
                {activePage === 'rides' && (
                    <div className="rides-page">
                        <div className="page-header">
                            <h2>Ride Management</h2>
                            <div className="filter-tabs">
                                <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => { setFilterStatus('all'); fetchFullRides(); }}>All</button>
                                <button className={`filter-tab ${filterStatus === 'ongoing' ? 'active' : ''}`} onClick={() => { setFilterStatus('ongoing'); fetchFullRides({ status: 'ongoing' }); }}>Ongoing</button>
                                <button className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => { setFilterStatus('completed'); fetchFullRides({ status: 'completed' }); }}>Completed</button>
                                <button className={`filter-tab ${filterStatus === 'cancelled' ? 'active' : ''}`} onClick={() => { setFilterStatus('cancelled'); fetchFullRides({ status: 'cancelled' }); }}>Cancelled</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Ride #</th><th>Client</th><th>Driver</th><th>Pickup</th><th>Destination</th><th>Fare</th><th>Status</th><th>Payment</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {rides.length > 0 ? rides.map(ride => (
                                        <tr key={ride.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{ride.ride_number}</td>
                                            <td>{ride.client_name}</td>
                                            <td>{ride.driver_name}</td>
                                            <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ride.pickup_address}</td>
                                            <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ride.destination_address}</td>
                                            <td>{formatCurrency(ride.total_fare)}</td>
                                            <td><span className={getStatusBadgeClass(ride.status)}>{ride.status}</span></td>
                                            <td><span className={getStatusBadgeClass(ride.payment_status)}>{ride.payment_status}</span></td>
                                            <td style={{ fontSize: '12px' }}>{new Date(ride.created_at).toLocaleDateString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                No rides found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* KYC Approvals Page */}
                {activePage === 'kyc' && (
                    <div className="kyc-page">
                        <div className="page-header">
                            <h2>KYC Document Approvals</h2>
                            <div className="filter-tabs">
                                <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
                                <button className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => setFilterStatus('pending')}>Pending</button>
                                <button className={`filter-tab ${filterStatus === 'approved' ? 'active' : ''}`} onClick={() => setFilterStatus('approved')}>Approved</button>
                                <button className={`filter-tab ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => setFilterStatus('rejected')}>Rejected</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Driver</th>
                                        <th>Document Type</th>
                                        <th>Uploaded</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFilteredKYC().length > 0 ? getFilteredKYC().map(doc => (
                                        <tr key={doc.id}>
                                            <td>{doc.full_name}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</td>
                                            <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                            <td><span className={getStatusBadgeClass(doc.verification_status)}>{doc.verification_status}</span></td>
                                            <td className="actions-cell">
                                                <button className="action-btn view" title="View Document" onClick={() => viewKycDocument(doc)} style={{ marginRight: '4px' }}>
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                {doc.verification_status === 'pending' && (
                                                    <>
                                                        <button className="action-btn approve" title="Approve" onClick={() => handleApproveKyc(doc.id)}>
                                                            <i className="fas fa-check-circle"></i>
                                                        </button>
                                                        <button className="action-btn danger" title="Reject" onClick={() => handleRejectKyc(doc.id)}>
                                                            <i className="fas fa-times-circle"></i>
                                                        </button>
                                                    </>
                                                )}
                                                {doc.verification_status !== 'pending' && (
                                                    <span style={{ fontSize: '12px', color: '#999' }}>Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                No KYC documents found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Support Tickets Page */}
                {activePage === 'support' && (
                    <div className="support-tickets-page">
                        <div className="page-header">
                            <h2>Support Tickets {openTicketsCount > 0 ? <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'normal' }}>({openTicketsCount} open)</span> : ''}</h2>
                            <div className="filter-tabs">
                                <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => { setFilterStatus('all'); fetchSupportTickets(); }}>All</button>
                                <button className={`filter-tab ${filterStatus === 'open' ? 'active' : ''}`} onClick={() => { setFilterStatus('open'); fetchSupportTickets('open'); }}>Open</button>
                                <button className={`filter-tab ${filterStatus === 'in_progress' ? 'active' : ''}`} onClick={() => { setFilterStatus('in_progress'); fetchSupportTickets('in_progress'); }}>In Progress</button>
                                <button className={`filter-tab ${filterStatus === 'closed' ? 'active' : ''}`} onClick={() => { setFilterStatus('closed'); fetchSupportTickets('closed'); }}>Closed</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ticket #</th>
                                        <th>User</th>
                                        <th>Subject</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supportTickets.length > 0 ? supportTickets.map((ticket: SupportTicketItem) => (
                                        <tr key={ticket.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{ticket.ticket_number}</td>
                                            <td>{ticket.user_name}</td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                    background: ticket.priority === 'high' ? '#fef2f2' : ticket.priority === 'low' ? '#f0fdf4' : '#fefce8',
                                                    color: ticket.priority === 'high' ? '#ef4444' : ticket.priority === 'low' ? '#10b981' : '#f59e0b'
                                                }}>
                                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                                </span>
                                            </td>
                                            <td><span className={getStatusBadgeClass(ticket.status === 'closed' ? 'completed' : ticket.status === 'in_progress' ? 'ongoing' : 'pending')} style={{ textTransform: 'capitalize' }}>{ticket.status.replace('_', ' ')}</span></td>
                                            <td style={{ fontSize: '12px' }}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                <button className="action-btn" title="View Details" onClick={() => viewTicketDetails(ticket)}>
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                {ticket.status !== 'closed' && (
                                                    <>
                                                        <button className="action-btn" title="Reply" onClick={() => handleReplyTicket(ticket.id)} style={{ color: '#ff4500' }}>
                                                            <i className="fas fa-reply"></i>
                                                        </button>
                                                        <button className="action-btn" title="Close Ticket" onClick={() => handleCloseTicket(ticket.id)} style={{ color: '#6b7280' }}>
                                                            <i className="fas fa-check"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                No support tickets found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Payments Page */}
                {activePage === 'payments' && (
                    <div className="payments-page">
                        <div className="page-header">
                            <h2>Payment Transactions</h2>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>User</th><th>Type</th><th>Amount</th><th>Balance</th><th>Description</th><th>Status</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {payments.length > 0 ? payments.map((p: any) => (
                                        <tr key={p.id}>
                                            <td>{p.user?.full_name || p.user?.name || 'Unknown'}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{p.transaction_type || p.type}</td>
                                            <td>{formatCurrency(p.amount || 0)}</td>
                                            <td>{formatCurrency(p.balance_after || p.balance || 0)}</td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '-'}</td>
                                            <td><span className={getStatusBadgeClass(p.status || 'pending')}>{p.status || 'pending'}</span></td>
                                            <td style={{ fontSize: '12px' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                {paymentsLoading ? 'Loading...' : 'No payment transactions found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Wallets Page */}
                {activePage === 'wallets' && (
                    <div className="wallets-page">
                        <div className="page-header">
                            <h2>User Wallets</h2>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Name</th><th>Email</th><th>Role</th><th>Balance</th></tr>
                                </thead>
                                <tbody>
                                    {wallets.length > 0 ? wallets.map((w: any) => (
                                        <tr key={w.id}>
                                            <td>{w.name || 'Unknown'}</td>
                                            <td>{w.email}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{w.role}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(w.balance || 0)}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                {walletsLoading ? 'Loading...' : 'No wallets found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Withdrawals Page */}
                {activePage === 'withdrawals' && (
                    <div className="withdrawals-page">
                        <div className="page-header">
                            <h2>Withdrawal Management</h2>
                            <div className="filter-tabs">
                                <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => { setFilterStatus('all'); fetchFullWithdrawals(); }}>All</button>
                                <button className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`} onClick={() => { setFilterStatus('pending'); fetchFullWithdrawals(); }}>Pending</button>
                                <button className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => { setFilterStatus('completed'); fetchFullWithdrawals(); }}>Approved</button>
                                <button className={`filter-tab ${filterStatus === 'rejected' ? 'active' : ''}`} onClick={() => { setFilterStatus('rejected'); fetchFullWithdrawals(); }}>Rejected</button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Driver</th><th>Amount</th><th>Bank</th><th>Account</th><th>Status</th><th>Date</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {withdrawals.length > 0 ? withdrawals.map((w: any) => (
                                        <tr key={w.id}>
                                            <td>{w.driver_name || 'Unknown'}</td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(w.amount || 0)}</td>
                                            <td>{w.bank_name || '-'}</td>
                                            <td>{w.account_number || '-'}</td>
                                            <td><span className={`status-badge ${w.status === 'completed' ? 'approved' : w.status}`}>{w.status}</span></td>
                                            <td>{new Date(w.created_at).toLocaleDateString()}</td>
                                            <td className="actions-cell">
                                                {w.status === 'pending' && (
                                                    <>
                                                        <button className="action-btn approve" title="Approve" onClick={() => handleApproveWithdrawal(w.id)}><i className="fas fa-check-circle"></i></button>
                                                        <button className="action-btn danger" title="Reject" onClick={() => handleRejectWithdrawal(w.id)}><i className="fas fa-times-circle"></i></button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                {paymentsLoading ? 'Loading...' : 'No withdrawals found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Reports Page */}
                {activePage === 'reports' && (
                    <div className="reports-page">
                        <div className="page-header">
                            <h2>Reports</h2>
                        </div>
                        <div className="reports-grid">
                            <div className="card">
                                <div className="card-header"><h3>Rides Per Day</h3></div>
                                <div className="card-body" style={{ padding: '16px' }}>
                                    {reportsData?.rides_per_day?.length > 0 ? (
                                        <table className="data-table">
                                            <thead><tr><th>Date</th><th>Count</th></tr></thead>
                                            <tbody>
                                                {reportsData.rides_per_day.slice(0, 10).map((r: any, i: number) => (
                                                    <tr key={i}><td>{r.date}</td><td>{r.count}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>{reportsLoading ? 'Loading...' : 'No ride data'}</p>
                                    )}
                                </div>
                            </div>
                            <div className="card">
                                <div className="card-header"><h3>Revenue Per Day</h3></div>
                                <div className="card-body" style={{ padding: '16px' }}>
                                    {reportsData?.revenue_per_day?.length > 0 ? (
                                        <table className="data-table">
                                            <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
                                            <tbody>
                                                {reportsData.revenue_per_day.slice(0, 10).map((r: any, i: number) => (
                                                    <tr key={i}><td>{r.date}</td><td>{formatCurrency(r.total || 0)}</td></tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>{reportsLoading ? 'Loading...' : 'No revenue data'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Page */}
                {activePage === 'settings' && (
                    <div className="settings-page">
                        <div className="page-header">
                            <h2>System Settings</h2>
                        </div>
                        <div className="card">
                            <div className="card-body" style={{ padding: '24px' }}>
                                {settingsLoading ? (
                                    <p style={{ textAlign: 'center', color: '#999' }}>Loading settings...</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {Object.entries(settings).map(([key, value]) => (
                                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <label style={{ fontWeight: 600, fontSize: '13px', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</label>
                                                <input
                                                    type="text"
                                                    value={String(value)}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                                                    style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' }}
                                                />
                                            </div>
                                        ))}
                                        <button
                                            className="btn-premium"
                                            style={{ marginTop: '12px', alignSelf: 'flex-start' }}
                                            onClick={async () => {
                                                try {
                                                    const data = await api.admin.saveSettings(settings);
                                                    if (data.success) {
                                                        Swal.fire({ icon: 'success', title: 'Saved', text: 'Settings saved successfully', timer: 1500, showConfirmButton: false });
                                                    }
                                                } catch (error) {
                                                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to save settings', confirmButtonColor: '#ff5e00' });
                                                }
                                            }}
                                        >
                                            <i className="fas fa-save"></i> Save Settings
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Log Page */}
                {activePage === 'activity' && (
                    <div className="activity-page">
                        <div className="page-header">
                            <h2>Activity Log</h2>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Admin</th><th>Action</th><th>Details</th><th>IP Address</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    {activityLogs.length > 0 ? activityLogs.map((log: any) => (
                                        <tr key={log.id}>
                                            <td>{log.admin?.name || log.admin?.full_name || 'System'}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{log.action || log.type}</td>
                                            <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details || log.description || '-'}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{log.ip_address || '-'}</td>
                                            <td style={{ fontSize: '12px' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                {activityLoading ? 'Loading...' : 'No activity logs found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Disputes Page */}
                {activePage === 'disputes' && (
                    <div className="disputes-page">
                        <div className="page-header">
                            <h2>Disputes & Reports</h2>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Ticket #</th><th>Raised By</th><th>Type</th><th>Priority</th><th>Messages</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {disputes.length > 0 ? disputes.map((d: any) => (
                                        <tr key={d.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{d.dispute_number}</td>
                                            <td>{d.raised_by}</td>
                                            <td style={{ textTransform: 'capitalize' }}>{d.type}</td>
                                            <td>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                                                    background: d.priority === 'high' ? '#fef2f2' : d.priority === 'low' ? '#f0fdf4' : '#fefce8',
                                                    color: d.priority === 'high' ? '#ef4444' : d.priority === 'low' ? '#10b981' : '#f59e0b'
                                                }}>{d.priority}</span>
                                            </td>
                                            <td><i className="fas fa-comment"></i> {d.message_count}</td>
                                            <td><span className={getStatusBadgeClass(d.status)}>{d.status}</span></td>
                                            <td className="actions-cell">
                                                <button className="action-btn" title="View"><i className="fas fa-eye"></i></button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                No disputes or reports found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Manage Places Page */}
                {activePage === 'places' && (
                    <div className="places-page">
                        <div className="page-header">
                            <h2>Manage Places</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div className="search-bar" style={{ minWidth: '250px' }}>
                                    <i className="fas fa-search"></i>
                                    <input
                                        type="text"
                                        placeholder="Search places..."
                                        value={placesSearch}
                                        onChange={e => { setPlacesSearch(e.target.value); setPage(1); }}
                                    />
                                </div>
                                <button className="btn-premium" onClick={handleAddPlace} style={{ marginLeft: 'auto' }}>
                                    <i className="fas fa-plus"></i> New Place
                                </button>
                            </div>
                        </div>
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr><th>ID</th><th>Name</th><th>State</th><th>Latitude</th><th>Longitude</th><th>Code</th><th>Address</th></tr>
                                </thead>
                                <tbody>
                                    {places.length > 0 ? places.map((p: any) => (
                                        <tr key={p.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.id}</td>
                                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                                            <td>{p.state || '—'}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.lat ? parseFloat(p.lat).toFixed(5) : '—'}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.lng ? parseFloat(p.lng).toFixed(5) : '—'}</td>
                                            <td><span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, background: '#f8f9fa', color: '#6c757d' }}>{p.feature_code || '—'}</span></td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_address || '—'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                                <i className="fas fa-inbox" style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}></i>
                                                {placesLoading ? 'Loading...' : 'No places found'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {places.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: '12px' }}>
                                <button
                                    className="btn-premium"
                                    onClick={() => { setPage(prev => Math.max(1, prev - 1)); fetchPlaces(); }}
                                    disabled={page <= 1}
                                    style={{ opacity: page <= 1 ? 0.5 : 1 }}
                                >
                                    <i className="fas fa-arrow-left"></i> Previous
                                </button>
                                <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 600 }}>Page {page}</span>
                                <button
                                    className="btn-premium"
                                    onClick={() => { setPage(prev => prev + 1); fetchPlaces(); }}
                                    disabled={places.length < 20}
                                    style={{ opacity: places.length < 20 ? 0.5 : 1 }}
                                >
                                    Next <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;