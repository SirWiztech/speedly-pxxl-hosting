import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/DriverProfile.css';

interface DriverData {
    id: string;
    user_id: string;
    fullname: string;
    full_name?: string;
    email: string;
    phone: string;
    address: string | null;
    city: string | null;
    state: string | null;
    vehicle_type: string | null;
    vehicle_model: string | null;
    vehicle_year: string | null;
    license_plate: string | null;
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
    kyc_status: string | null;
    license_document: string | null;
    id_document: string | null;
    created_at: string;
    updated_at: string;
}

interface DriverStats {
    total_rides: number;
    total_earnings: number;
    wallet_balance: number;
    avg_rating: number;
    completed_rides: number;
    cancelled_rides: number;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

const DriverProfile: React.FC = () => {
    const [driverData, setDriverData] = useState<DriverData | null>(null);
    const [stats, setStats] = useState<DriverStats>({
        total_rides: 0,
        total_earnings: 0,
        wallet_balance: 0,
        avg_rating: 0,
        completed_rides: 0,
        cancelled_rides: 0
    });
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [activeTab, setActiveTab] = useState<string>('view');
    const [loading, setLoading] = useState<boolean>(true);
    
    // Form states
    const [editFullname, setEditFullname] = useState<string>('');
    const [editPhone, setEditPhone] = useState<string>('');
    const [editAddress, setEditAddress] = useState<string>('');
    const [editCity, setEditCity] = useState<string>('');
    const [editState, setEditState] = useState<string>('');
    const [vehicleType, setVehicleType] = useState<string>('');
    const [vehicleModel, setVehicleModel] = useState<string>('');
    const [vehicleYear, setVehicleYear] = useState<string>('');
    const [licensePlate, setLicensePlate] = useState<string>('');
    const [bankName, setBankName] = useState<string>('');
    const [accountNumber, setAccountNumber] = useState<string>('');
    const [accountName, setAccountName] = useState<string>('');
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [idFile, setIdFile] = useState<File | null>(null);
    
    // Password states
    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    
    // Availability status
    const [isAvailable, setIsAvailable] = useState<boolean>(true);
    
    // Withdrawal states
    const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
    const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);

    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    // Fetch driver data
    const fetchDriverData = async () => {
        try {
            const [profileData, statsData] = await Promise.all([
                api.driver.profile(),
                api.driver.stats()
            ]);
            
            if (profileData.success || profileData.data) {
                const d = profileData.data?.user || profileData.user || profileData.data;
                setDriverData(d);
                setWithdrawalHistory(d.withdrawal_history || []);
                setEditFullname(d.fullname || d.full_name || '');
                setEditPhone(d.phone || '');
                setEditAddress(d.address || '');
                setEditCity(d.city || '');
                setEditState(d.state || '');
                setVehicleType(d.vehicle_type || '');
                setVehicleModel(d.vehicle_model || '');
                setVehicleYear(d.vehicle_year || '');
                setLicensePlate(d.license_plate || '');
                setBankName(d.bank_name || '');
                setAccountNumber(d.account_number || '');
                setAccountName(d.account_name || '');
                setIsAvailable(d.is_available ?? true);
            }
            if (statsData.success || statsData.data) {
                const s = statsData.data || statsData;
                setStats(s.stats || s);
            }
        } catch (error) {
            console.error('Error fetching driver data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const data = await api.notifications.list();
            if (data.success || data.data) {
                const d = data.data || data;
                setNotifications(d.notifications || []);
                setUnreadCount(d.unread_count || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    // Update profile
    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'Updating Profile...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const data = await api.driver.updateProfile({
                full_name: editFullname,
                phone: editPhone,
                address: editAddress,
                city: editCity,
                state: editState,
                vehicle_type: vehicleType,
                vehicle_model: vehicleModel,
                vehicle_year: vehicleYear,
                license_plate: licensePlate,
                bank_name: bankName,
                account_number: accountNumber,
                account_name: accountName
            });
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Profile Updated',
                    text: 'Your profile has been updated successfully',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    fetchDriverData();
                    setActiveTab('view');
                });
            } else {
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Update Failed', 
                    text: data.message || 'Failed to update profile',
                    confirmButtonColor: '#ff5e00' 
                });
            }
        } catch (error) {
            Swal.fire({ 
                icon: 'error', 
                title: 'Error', 
                text: 'Failed to update profile',
                confirmButtonColor: '#ff5e00' 
            });
        }
    };

    // Upload KYC documents
    const uploadDocuments = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!licenseFile && !idFile) {
            Swal.fire({
                icon: 'warning',
                title: 'No Files Selected',
                text: 'Please select at least one document to upload',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }
        
        Swal.fire({
            title: 'Uploading Documents...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const formData = new FormData();
            if (licenseFile) formData.append('license_file', licenseFile);
            if (idFile) formData.append('id_file', idFile);
            
            const data = await api.driver.uploadKyc(formData);
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Documents Uploaded',
                    text: 'Your documents have been submitted for review',
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    fetchDriverData();
                    setActiveTab('view');
                    setLicenseFile(null);
                    setIdFile(null);
                });
            } else {
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Upload Failed', 
                    text: data.message || 'Failed to upload documents',
                    confirmButtonColor: '#ff5e00' 
                });
            }
        } catch (error) {
            Swal.fire({ 
                icon: 'error', 
                title: 'Error', 
                text: 'Failed to upload documents',
                confirmButtonColor: '#ff5e00' 
            });
        }
    };

    // Change password
    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            Swal.fire({ 
                icon: 'warning', 
                title: 'Passwords Do Not Match', 
                text: 'Please make sure your passwords match',
                confirmButtonColor: '#ff5e00' 
            });
            return;
        }
        
        if (newPassword.length < 8) {
            Swal.fire({ 
                icon: 'warning', 
                title: 'Password Too Short', 
                text: 'Password must be at least 8 characters',
                confirmButtonColor: '#ff5e00' 
            });
            return;
        }
        
        Swal.fire({
            title: 'Changing Password...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const data = await api.auth.changePassword({
                current_password: currentPassword,
                new_password: newPassword
            });
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Password Changed', text: 'Your password has been changed successfully', confirmButtonColor: '#ff5e00' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#ff5e00' });
            }
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to change password', confirmButtonColor: '#ff5e00' });
        }
    };

    // Toggle availability
    const toggleAvailability = async (status: boolean) => {
        setIsAvailable(status);
        
        try {
            const data = await api.driver.toggleStatus({ status: status ? 'online' : 'offline' });
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: status ? 'You are now Available' : 'You are now Offline',
                    text: status ? 'You will receive ride requests' : 'You will not receive ride requests',
                    timer: 2000,
                    showConfirmButton: false,
                    position: 'top-end'
                });
            }
        } catch (error) {
            console.error('Error toggling availability:', error);
            setIsAvailable(!status);
        }
    };

    // Request withdrawal
    const requestWithdrawal = async () => {
        if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Amount',
                text: 'Please enter a valid withdrawal amount',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }
        
        if (parseFloat(withdrawalAmount) > stats.wallet_balance) {
            Swal.fire({
                icon: 'error',
                title: 'Insufficient Balance',
                html: `Your wallet balance is <span style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${formatCurrency(stats.wallet_balance)}</span>`,
                confirmButtonColor: '#ff5e00'
            });
            return;
        }
        
        Swal.fire({
            title: 'Processing Withdrawal...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const data = await api.driver.requestWithdrawal({ amount: parseFloat(withdrawalAmount) });
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Withdrawal Request Submitted',
                    text: 'Your request is being processed',
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    setShowWithdrawalModal(false);
                    setWithdrawalAmount('');
                    fetchDriverData();
                });
            } else {
                Swal.fire({ 
                    icon: 'error', 
                    title: 'Request Failed', 
                    text: data.message || 'Failed to process withdrawal',
                    confirmButtonColor: '#ff5e00' 
                });
            }
        } catch (error) {
            Swal.fire({ 
                icon: 'error', 
                title: 'Error', 
                text: 'Failed to process withdrawal',
                confirmButtonColor: '#ff5e00' 
            });
        }
    };

    // Mark notification as read
    const markNotificationAsRead = async (notificationId: number) => {
        try {
            await api.notifications.clear({ notification_id: String(notificationId) });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking notification:', error);
        }
    };

    // Show notifications
    const showNotifications = () => {
        if (notifications.length === 0) {
            Swal.fire({
                title: 'No Notifications',
                text: 'You have no new notifications',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }
        
        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        notifications.forEach(notif => {
            html += `
                <div style="padding: 12px; border-bottom: 1px solid #eee; ${!notif.is_read ? 'background: #fff8f0;' : ''}">
                    <strong style="color: #333;">${notif.title}</strong>
                    <p style="color: #666; font-size: 13px; margin-top: 4px;">${notif.message}</p>
                    <small style="color: #999;">${new Date(notif.created_at).toLocaleString()}</small>
                </div>
            `;
        });
        html += '</div>';
        
        Swal.fire({
            title: 'Notifications',
            html: html,
            confirmButtonColor: '#ff5e00',
            width: '400px'
        }).then(() => {
            // Mark all as read when closed
            notifications.forEach(notif => {
                if (!notif.is_read) markNotificationAsRead(notif.id);
            });
        });
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const userInitial = (driverData?.fullname || driverData?.full_name)?.charAt(0)?.toUpperCase() || 'D';

    useEffect(() => {
        fetchDriverData();
        fetchNotifications();
        
        // Refresh data every 30 seconds
        const interval = setInterval(() => {
            fetchDriverData();
            fetchNotifications();
        }, 30000);
        
        return () => clearInterval(interval);
    }, []);

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    const getKycStatusBadge = () => {
        switch (driverData?.kyc_status) {
            case 'approved':
                return <span className="kyc-badge approved"><i className="fas fa-check-circle"></i> KYC Verified</span>;
            case 'pending':
                return <span className="kyc-badge pending"><i className="fas fa-clock"></i> KYC Pending</span>;
            case 'rejected':
                return <span className="kyc-badge rejected"><i className="fas fa-times-circle"></i> KYC Rejected</span>;
            default:
                return <span className="kyc-badge missing"><i className="fas fa-exclamation-triangle"></i> KYC Required</span>;
        }
    };

    return (
        <div className="driver-profile-container">
            {/* Header */}
            <div className="driver-profile-header">
                <h1>Driver Profile</h1>
                <p>Manage your personal information, vehicle details, and documents</p>
                <button className="back-btn" onClick={() => router.visit('/driversettings')}>
                    <i className="fas fa-arrow-left"></i> Back to Dashboard
                </button>
                <button className="notification-btn" onClick={showNotifications}>
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && <span className="notification-badge font-roboto-number">{unreadCount}</span>}
                </button>
            </div>

            <div className="driver-profile-content">
                {/* Sidebar */}
                <div className="driver-profile-sidebar">
                    <div className="profile-pic-container">
                        <div className="profile-pic-placeholder">
                            {userInitial}
                        </div>
                        <label className="upload-pic-btn">
                            <i className="fas fa-camera"></i>
                            <input type="file" accept="image/*" style={{ display: 'none' }} />
                        </label>
                    </div>
                    <h3>{driverData?.fullname || driverData?.full_name}</h3>
                    <p className="profile-email">{driverData?.email}</p>
                    
                    {getKycStatusBadge()}
                    
                    {/* Availability Toggle */}
                    <div className="availability-toggle">
                        <button 
                            className={`availability-option available ${isAvailable ? 'active' : ''}`}
                            onClick={() => toggleAvailability(true)}
                        >
                            <i className="fas fa-check-circle"></i> Available
                        </button>
                        <button 
                            className={`availability-option offline ${!isAvailable ? 'active' : ''}`}
                            onClick={() => toggleAvailability(false)}
                        >
                            <i className="fas fa-minus-circle"></i> Offline
                        </button>
                    </div>
                    
                    {/* Rating Badge */}
                    <div className="rating-badge">
                        <i className="fas fa-star"></i>
                        <span className="font-roboto-number">{stats.avg_rating.toFixed(1)}</span>
                        <span className="rating-count">(<span className="font-roboto-number">{stats.total_rides}</span> rides)</span>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon earnings">
                                <i className="fas fa-chart-line"></i>
                            </div>
                            <div className="stat-details">
                                <div className="stat-label">Total Earnings</div>
                                <div className="stat-value font-roboto-number">{formatCurrency(stats.total_earnings)}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon rides">
                                <i className="fas fa-car"></i>
                            </div>
                            <div className="stat-details">
                                <div className="stat-label">Total Rides</div>
                                <div className="stat-value font-roboto-number">{stats.total_rides}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon wallet">
                                <i className="fas fa-wallet"></i>
                            </div>
                            <div className="stat-details">
                                <div className="stat-label">Wallet Balance</div>
                                <div className="stat-value font-roboto-number">{formatCurrency(stats.wallet_balance)}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Withdrawal Button */}
                    <button className="withdraw-btn" onClick={() => setShowWithdrawalModal(true)}>
                        <i className="fas fa-money-bill-wave"></i> Request Withdrawal
                    </button>
                    
                    {/* Member Since */}
                    <div className="member-since">
                        <p><i className="fas fa-calendar-alt"></i> Member Since</p>
                        <p className="date">{new Date(driverData?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="driver-profile-main">
                    <div className="profile-tabs">
                        <button className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>
                            <i className="fas fa-user"></i> View Profile
                        </button>
                        <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>
                            <i className="fas fa-edit"></i> Edit Profile
                        </button>
                        <button className={`tab-btn ${activeTab === 'vehicle' ? 'active' : ''}`} onClick={() => setActiveTab('vehicle')}>
                            <i className="fas fa-truck"></i> Vehicle
                        </button>
                        <button className={`tab-btn ${activeTab === 'bank' ? 'active' : ''}`} onClick={() => setActiveTab('bank')}>
                            <i className="fas fa-university"></i> Bank Details
                        </button>
                        <button className={`tab-btn ${activeTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveTab('kyc')}>
                            <i className="fas fa-id-card"></i> KYC
                        </button>
                        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
                            <i className="fas fa-lock"></i> Security
                        </button>
                    </div>

                    {/* View Profile Tab */}
                    {activeTab === 'view' && (
                        <div className="tab-content active">
                            <div className="tab-header">
                                <h3>Personal Information</h3>
                            </div>
                            <div className="info-grid">
                                <div className="info-row">
                                    <div className="info-label">Full Name</div>
                                    <div className="info-value">{driverData?.fullname || driverData?.full_name}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Email Address</div>
                                    <div className="info-value">{driverData?.email}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Phone Number</div>
                                    <div className="info-value">{driverData?.phone}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Address</div>
                                    <div className="info-value">{driverData?.address || 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">City / State</div>
                                    <div className="info-value">{driverData?.city ? `${driverData.city}, ${driverData.state}` : 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Date Registered</div>
                                    <div className="info-value">{new Date(driverData?.created_at || '').toLocaleDateString()}</div>
                                </div>
                            </div>

                            <div className="tab-header">
                                <h3>Vehicle Information</h3>
                            </div>
                            <div className="info-grid">
                                <div className="info-row">
                                    <div className="info-label">Vehicle Type</div>
                                    <div className="info-value">{driverData?.vehicle_type?.toUpperCase() || 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Vehicle Model</div>
                                    <div className="info-value">{driverData?.vehicle_model || 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Vehicle Year</div>
                                    <div className="info-value">{driverData?.vehicle_year || 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">License Plate</div>
                                    <div className="info-value">{driverData?.license_plate || 'Not provided'}</div>
                                </div>
                            </div>

                            <div className="tab-header">
                                <h3>Bank Details</h3>
                            </div>
                            <div className="info-grid">
                                <div className="info-row">
                                    <div className="info-label">Bank Name</div>
                                    <div className="info-value">{driverData?.bank_name || 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Account Number</div>
                                    <div className="info-value">{driverData?.account_number ? `****${driverData.account_number.slice(-4)}` : 'Not provided'}</div>
                                </div>
                                <div className="info-row">
                                    <div className="info-label">Account Name</div>
                                    <div className="info-value">{driverData?.account_name || 'Not provided'}</div>
                                </div>
                            </div>

                            <div className="action-buttons">
                                <button className="btn btn-primary" onClick={() => setActiveTab('edit')}>
                                    <i className="fas fa-edit"></i> Edit Profile
                                </button>
                                <button className="btn btn-secondary" onClick={() => setActiveTab('security')}>
                                    <i className="fas fa-key"></i> Change Password
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Edit Profile Tab */}
                    {activeTab === 'edit' && (
                        <div className="tab-content active">
                            <h3>Edit Profile Information</h3>
                            <form onSubmit={updateProfile}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editFullname} 
                                            onChange={(e) => setEditFullname(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email Address</label>
                                        <input 
                                            type="email" 
                                            className="form-control" 
                                            value={driverData?.email || ''} 
                                            disabled 
                                        />
                                        <small>Email cannot be changed</small>
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input 
                                            type="tel" 
                                            className="form-control" 
                                            value={editPhone} 
                                            onChange={(e) => setEditPhone(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Address</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editAddress} 
                                            onChange={(e) => setEditAddress(e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>City</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editCity} 
                                            onChange={(e) => setEditCity(e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>State</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editState} 
                                            onChange={(e) => setEditState(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                <div className="action-buttons">
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save"></i> Save Changes
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('view')}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Vehicle Tab */}
                    {activeTab === 'vehicle' && (
                        <div className="tab-content active">
                            <h3>Vehicle Information</h3>
                            <form onSubmit={updateProfile}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Vehicle Type</label>
                                        <select 
                                            className="form-control" 
                                            value={vehicleType} 
                                            onChange={(e) => setVehicleType(e.target.value)}
                                        >
                                            <option value="">Select Vehicle Type</option>
                                            <option value="sedan">Sedan</option>
                                            <option value="suv">SUV</option>
                                            <option value="hatchback">Hatchback</option>
                                            <option value="mpv">MPV</option>
                                            <option value="luxury">Luxury</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Vehicle Model</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="e.g., Toyota Camry"
                                            value={vehicleModel} 
                                            onChange={(e) => setVehicleModel(e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Vehicle Year</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            placeholder="e.g., 2020"
                                            value={vehicleYear} 
                                            onChange={(e) => setVehicleYear(e.target.value)} 
                                            min="2000"
                                            max="2025"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>License Plate Number</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="ABC-123-XY"
                                            value={licensePlate} 
                                            onChange={(e) => setLicensePlate(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="vehicle-info-card">
                                    <h4><i className="fas fa-info-circle"></i> Important Information</h4>
                                    <p>Ensure your vehicle information is accurate. This information will be visible to passengers when you accept rides.</p>
                                </div>
                                
                                <div className="action-buttons">
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save"></i> Save Vehicle Info
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('view')}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Bank Details Tab */}
                    {activeTab === 'bank' && (
                        <div className="tab-content active">
                            <h3>Bank Account Details</h3>
                            <form onSubmit={updateProfile}>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label>Bank Name</label>
                                        <select 
                                            className="form-control" 
                                            value={bankName} 
                                            onChange={(e) => setBankName(e.target.value)}
                                        >
                                            <option value="">Select Bank</option>
                                            <option value="Access Bank">Access Bank</option>
                                            <option value="GTBank">GTBank</option>
                                            <option value="First Bank">First Bank</option>
                                            <option value="UBA">UBA</option>
                                            <option value="Zenith Bank">Zenith Bank</option>
                                            <option value="Fidelity Bank">Fidelity Bank</option>
                                            <option value="Sterling Bank">Sterling Bank</option>
                                            <option value="Union Bank">Union Bank</option>
                                            <option value="Wema Bank">Wema Bank</option>
                                            <option value="Polaris Bank">Polaris Bank</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Account Number</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="10-digit account number"
                                            value={accountNumber} 
                                            onChange={(e) => setAccountNumber(e.target.value)} 
                                            maxLength={10}
                                            pattern="\d{10}"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Account Name</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            placeholder="Account holder name"
                                            value={accountName} 
                                            onChange={(e) => setAccountName(e.target.value)} 
                                        />
                                    </div>
                                </div>
                                
                                <div className="bank-info-card">
                                    <h4><i className="fas fa-shield-alt"></i> Secure Payment</h4>
                                    <p>Your bank details are encrypted and used only for processing withdrawals. Earnings will be sent to this account.</p>
                                </div>
                                
                                <div className="action-buttons">
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save"></i> Save Bank Details
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('view')}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* KYC Tab */}
                    {activeTab === 'kyc' && (
                        <div className="tab-content active">
                            <h3>KYC Verification</h3>
                            
                            {driverData?.kyc_status === 'approved' ? (
                                <div className="kyc-approved">
                                    <i className="fas fa-check-circle"></i>
                                    <h4>KYC Verification Complete</h4>
                                    <p>Your documents have been verified. You are eligible to receive rides and process withdrawals.</p>
                                </div>
                            ) : (
                                <form onSubmit={uploadDocuments}>
                                    <div className="kyc-info">
                                        <p>Please upload the following documents to complete your KYC verification. This is required to start receiving ride requests and process withdrawals.</p>
                                    </div>
                                    
                                    <div className="kyc-upload-grid">
                                        <div className="kyc-upload-card">
                                            <i className="fas fa-id-card"></i>
                                            <h4>Driver's License</h4>
                                            <p>Upload a clear photo of your driver's license</p>
                                            <div className="file-input-wrapper">
                                                <input 
                                                    type="file" 
                                                    id="licenseFile"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                                                />
                                                <label htmlFor="licenseFile" className="file-label">
                                                    {licenseFile ? licenseFile.name : 'Choose File'}
                                                </label>
                                            </div>
                                        </div>
                                        <div className="kyc-upload-card">
                                            <i className="fas fa-passport"></i>
                                            <h4>Government ID</h4>
                                            <p>Upload a valid government-issued ID (passport, national ID, voter's card)</p>
                                            <div className="file-input-wrapper">
                                                <input 
                                                    type="file" 
                                                    id="idFile"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                                                />
                                                <label htmlFor="idFile" className="file-label">
                                                    {idFile ? idFile.name : 'Choose File'}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {driverData?.kyc_status === 'pending' && (
                                        <div className="kyc-pending">
                                            <i className="fas fa-clock"></i>
                                            <p>Your documents are currently under review. This typically takes 1-2 business days.</p>
                                        </div>
                                    )}
                                    
                                    {driverData?.kyc_status === 'rejected' && (
                                        <div className="kyc-rejected">
                                            <i className="fas fa-exclamation-triangle"></i>
                                            <p>Your previous submission was rejected. Please upload clear, valid documents and try again.</p>
                                        </div>
                                    )}
                                    
                                    <div className="action-buttons">
                                        <button type="submit" className="btn btn-primary">
                                            <i className="fas fa-upload"></i> Upload Documents
                                        </button>
                                        <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('view')}>
                                            <i className="fas fa-times"></i> Cancel
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="tab-content active">
                            <h3>Change Password</h3>
                            <form onSubmit={changePassword}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <div className="input-group">
                                        <input 
                                            type="password" 
                                            className="form-control" 
                                            value={currentPassword} 
                                            onChange={(e) => setCurrentPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="input-group">
                                        <input 
                                            type="password" 
                                            className="form-control" 
                                            value={newPassword} 
                                            onChange={(e) => setNewPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                    <small className="password-hint">Minimum 8 characters with letters and numbers</small>
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <div className="input-group">
                                        <input 
                                            type="password" 
                                            className="form-control" 
                                            value={confirmPassword} 
                                            onChange={(e) => setConfirmPassword(e.target.value)} 
                                            required 
                                        />
                                    </div>
                                </div>
                                <div className="action-buttons">
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-key"></i> Update Password
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('view')}>
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </form>

                            <div className="security-tips">
                                <h4><i className="fas fa-shield-alt"></i> Security Tips</h4>
                                <ul>
                                    <li><i className="fas fa-check-circle"></i> Use a strong, unique password</li>
                                    <li><i className="fas fa-check-circle"></i> Never share your password with anyone</li>
                                    <li><i className="fas fa-check-circle"></i> Change your password regularly</li>
                                    <li><i className="fas fa-check-circle"></i> Enable two-factor authentication for extra security</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Withdrawal Modal */}
            {showWithdrawalModal && (
                <div className="modal show" onClick={() => setShowWithdrawalModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Request Withdrawal</h3>
                            <button className="close-modal" onClick={() => setShowWithdrawalModal(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="balance-info">
                                <p>Available Balance</p>
                                <h2 className="font-roboto-number">{formatCurrency(stats.wallet_balance)}</h2>
                            </div>
                            <div className="form-group">
                                <label>Withdrawal Amount</label>
                                <div className="input-group">
                                    <span className="currency-symbol">₦</span>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        placeholder="Enter amount"
                                        value={withdrawalAmount} 
                                        onChange={(e) => setWithdrawalAmount(e.target.value)} 
                                        min="100"
                                        max={stats.wallet_balance}
                                        step="100"
                                    />
                                </div>
                            </div>
                            <div className="bank-info-display">
                                <p><strong>Bank:</strong> {driverData?.bank_name || 'Not set'}</p>
                                <p><strong>Account:</strong> {driverData?.account_number ? `****${driverData.account_number.slice(-4)}` : 'Not set'}</p>
                            </div>
                            <div className="withdrawal-note">
                                <i className="fas fa-info-circle"></i>
                                <small>Withdrawals are processed within 1-3 business days. Minimum withdrawal amount is ₦1,000.</small>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowWithdrawalModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={requestWithdrawal}>
                                Request Withdrawal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Withdrawal History Section */}
            {withdrawalHistory.length > 0 && (
                <div className="withdrawal-history">
                    <h3><i className="fas fa-history"></i> Withdrawal History</h3>
                    <div className="withdrawal-list">
                        {withdrawalHistory.map((item, index) => (
                            <div key={index} className="withdrawal-item">
                                <div className="withdrawal-info">
                                    <h4 className="font-roboto-number">{formatCurrency(item.amount)}</h4>
                                    <p>{new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                                <span className={`withdrawal-status ${item.status}`}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverProfile;