import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/ClientProfile.css';

interface UserData {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    profile_picture_url: string | null;
    created_at: string;
    is_verified: boolean;
    membership_tier: string;
}

interface UserStats {
    total_rides: number;
    total_spent: number;
    avg_rating: number;
}

const ClientProfile: React.FC = () => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [stats, setStats] = useState<UserStats>({
        total_rides: 0,
        total_spent: 0,
        avg_rating: 0
    });
    const [activeTab, setActiveTab] = useState<string>('view');
    const [loading, setLoading] = useState<boolean>(true);
    const [editName, setEditName] = useState<string>('');
    const [editPhone, setEditPhone] = useState<string>('');
    const [currentPassword, setCurrentPassword] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    // Fetch user data
    const fetchUserData = async () => {
        try {
            const [profileData, statsData] = await Promise.all([
                api.client.profile(),
                api.client.stats()
            ]);
            
            if (profileData.success || profileData.data) {
                const user = profileData.data;
                setUserData(user);
                setEditName(user?.full_name || '');
                setEditPhone(user?.phone_number || '');
            }
            if (statsData.success || statsData.data) {
                const s = statsData.data;
                setStats({ total_rides: s?.total_rides || 0, total_spent: s?.total_spent || 0, avg_rating: s?.average_rating || 0 });
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update profile
    const updateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'Updating...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const data = await api.client.updateProfile({ full_name: editName, phone_number: editPhone });
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Profile Updated',
                    text: 'Your profile has been updated successfully',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    fetchUserData();
                    setActiveTab('view');
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update profile', confirmButtonColor: '#ff5e00' });
        }
    };

    // Change password
    const changePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            Swal.fire({ icon: 'warning', title: 'Passwords Do Not Match', text: 'Please make sure your passwords match', confirmButtonColor: '#ff5e00' });
            return;
        }
        
        if (newPassword.length < 8) {
            Swal.fire({ icon: 'warning', title: 'Password Too Short', text: 'Password must be at least 8 characters', confirmButtonColor: '#ff5e00' });
            return;
        }
        
        Swal.fire({
            title: 'Updating...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            const data = await api.auth.changePassword({
                current_password: currentPassword,
                new_password: newPassword
            });
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Password Changed',
                    text: 'Your password has been changed successfully',
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setActiveTab('view');
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#ff5e00' });
            }
        } catch (error: any) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to change password', confirmButtonColor: '#ff5e00' });
        }
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const userInitial = userData?.full_name?.charAt(0)?.toUpperCase() || 'U';

    useEffect(() => {
        fetchUserData();
    }, []);

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    return (
        <div className="client-profile-container">
            {/* Header */}
            <div className="client-profile-header">
                <h1>My Profile</h1>
                <p>Manage your personal information and preferences</p>
                <button className="back-btn" onClick={() => router.visit('/clientsettings')}>
                    <i className="fas fa-arrow-left"></i> Back to Dashboard
                </button>
            </div>

            <div className="client-profile-content">
                {/* Sidebar */}
                <div className="client-profile-sidebar">
                    <div className="profile-pic-container">
                        <div className="profile-pic-placeholder">
                            {userInitial}
                        </div>
                    </div>
                    <h3>{userData?.full_name}</h3>
                    <p className="profile-email">{userData?.email}</p>
                    <div className="status-badge active">
                        <i className="fas fa-check-circle"></i> Active Account
                    </div>
                    
                    <div className="stats-grid">
                        <div className="stat-card">
                            <i className="fas fa-car"></i>
                            <div className="stat-value">{stats.total_rides}</div>
                            <div className="stat-label">Total Rides</div>
                        </div>
                        <div className="stat-card">
                            <i className="fas fa-naira-sign"></i>
                            <div className="stat-value">{formatCurrency(stats.total_spent)}</div>
                            <div className="stat-label">Total Spent</div>
                        </div>
                    </div>
                    
                    <div className="member-since">
                        <p>Member Since</p>
                        <p className="date">{new Date(userData?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="client-profile-main">
                    <div className="profile-tabs">
                        <button className={`tab-btn ${activeTab === 'view' ? 'active' : ''}`} onClick={() => setActiveTab('view')}>View Profile</button>
                        <button className={`tab-btn ${activeTab === 'edit' ? 'active' : ''}`} onClick={() => setActiveTab('edit')}>Edit Profile</button>
                        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</button>
                    </div>

                    {/* View Profile Tab */}
                    {activeTab === 'view' && (
                        <div className="tab-content active">
                            <h3>Personal Information</h3>
                            <div className="info-row">
                                <div className="info-label">Full Name</div>
                                <div className="info-value">{userData?.full_name}</div>
                            </div>
                            <div className="info-row">
                                <div className="info-label">Email Address</div>
                                <div className="info-value">{userData?.email}</div>
                            </div>
                            <div className="info-row">
                                <div className="info-label">Phone Number</div>
                                <div className="info-value">{userData?.phone_number}</div>
                            </div>
                            <div className="info-row">
                                <div className="info-label">Date Registered</div>
                                <div className="info-value">{new Date(userData?.created_at || '').toLocaleDateString()}</div>
                            </div>
                            <div className="info-row">
                                <div className="info-label">Membership Tier</div>
                                <div className="info-value">
                                    <span className={`tier-badge ${userData?.membership_tier}`}>
                                        {userData?.membership_tier?.charAt(0).toUpperCase() + userData?.membership_tier?.slice(1) || 'Basic'}
                                    </span>
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
                            <h3>Edit Profile</h3>
                            <form onSubmit={updateProfile}>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input type="text" className="form-control" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Email Address (Cannot be changed)</label>
                                    <input type="email" className="form-control" value={userData?.email || ''} disabled />
                                </div>
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input type="tel" className="form-control" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
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

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="tab-content active">
                            <h3>Change Password</h3>
                            <form onSubmit={changePassword}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <div className="input-group">
                                        <input type="password" className="form-control" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="input-group">
                                        <input type="password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                                    </div>
                                    <small className="password-hint">Minimum 8 characters with letters and numbers</small>
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <div className="input-group">
                                        <input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
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
                                <h4>Security Tips</h4>
                                <ul>
                                    <li><i className="fas fa-check-circle"></i> Use a strong, unique password</li>
                                    <li><i className="fas fa-check-circle"></i> Never share your password with anyone</li>
                                    <li><i className="fas fa-check-circle"></i> Change your password regularly</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClientProfile;