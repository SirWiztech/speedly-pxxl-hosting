import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import DriverNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api, { setToken } from '../../services/api';
import '../../../css/DriverSettingsMobile.css';

// Types
interface DriverData {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    profile_picture_url: string | null;
    driver_status: string;
    verification_status: string;
}

interface BankDetails {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    is_default: boolean;
}

interface NotificationSettings {
    ride_requests: boolean;
    earnings_notif: boolean;
    sound_alerts: boolean;
    promotions: boolean;
}

const DriverSettingsMobile: React.FC = () => {
    // State
    const [driverData, setDriverData] = useState<DriverData | null>(null);
    const [licenseNumber, setLicenseNumber] = useState<string>('');
    const [licenseExpiry, setLicenseExpiry] = useState<string>('');
    const [vehicleModel, setVehicleModel] = useState<string>('');
    const [plateNumber, setPlateNumber] = useState<string>('');
    const [bankAccounts, setBankAccounts] = useState<BankDetails[]>([]);
    const [todayEarnings, setTodayEarnings] = useState<number>(0);
    const [totalEarnings, setTotalEarnings] = useState<number>(0);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        ride_requests: true,
        earnings_notif: true,
        sound_alerts: true,
        promotions: false
    });
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch settings data
    const fetchSettingsData = useCallback(async () => {
        try {
            const [profileResult, bankResult] = await Promise.allSettled([
                api.driver.profile(),
                api.driver.bankDetails()
            ]);

            if (profileResult.status === 'fulfilled') {
                const profileData = profileResult.value;
                if (profileData.success || profileData.data) {
                    const d = profileData.data?.user || profileData.user || profileData.data;
                    setDriverData(d);
                    setLicenseNumber(d.license?.license_number || '');
                    setLicenseExpiry(d.license?.license_expiry || '');
                    setVehicleModel(d.vehicle?.vehicle_model || '');
                    setPlateNumber(d.vehicle?.plate_number || '');
                    setTodayEarnings(d.today_earnings || 0);
                    setTotalEarnings(d.total_earnings || 0);
                    setNotificationCount(profileData.data?.notification_count || profileData.notification_count || 0);
                    setNotificationSettings(d.notification_settings || { ride_requests: true, earnings_notif: true, sound_alerts: true, promotions: false });
                }
            }
            if (bankResult.status === 'fulfilled') {
                const bankData = bankResult.value;
                if (bankData.success || bankData.data) {
                    const b = bankData.data || bankData;
                    setBankAccounts(b.bank_accounts || b.accounts || []);
                }
            }
        } catch (error) {
            console.error('Error fetching settings data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Toggle setting
    const toggleSetting = (setting: keyof NotificationSettings, value: boolean) => {
        setNotificationSettings(prev => ({ ...prev, [setting]: value }));
        
        api.driver.updateProfile({ [setting]: String(value) }).catch(error => console.error('Error updating setting:', error));
    };

    // Save driver profile
    const saveDriverProfile = () => {
        Swal.fire({
            title: 'Edit Profile',
            html: `
                <input type="text" id="profile-name" class="swal2-input" placeholder="Full Name" value="${driverData?.full_name || ''}">
                <input type="email" id="profile-email" class="swal2-input" placeholder="Email" value="${driverData?.email || ''}">
                <input type="tel" id="profile-phone" class="swal2-input" placeholder="Phone" value="${driverData?.phone_number || ''}">
                <input type="date" id="profile-dob" class="swal2-input" placeholder="Date of Birth" value="${(driverData as any)?.date_of_birth || ''}">
                <select id="profile-gender" class="swal2-input">
                    <option value="male" ${(driverData as any)?.gender === 'male' ? 'selected' : ''}>Male</option>
                    <option value="female" ${(driverData as any)?.gender === 'female' ? 'selected' : ''}>Female</option>
                    <option value="other" ${(driverData as any)?.gender === 'other' ? 'selected' : ''}>Other</option>
                    <option value="prefer-not-to-say" ${(driverData as any)?.gender === 'prefer-not-to-say' ? 'selected' : ''}>Prefer not to say</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const name = (document.getElementById('profile-name') as HTMLInputElement)?.value;
                const email = (document.getElementById('profile-email') as HTMLInputElement)?.value;
                const phone = (document.getElementById('profile-phone') as HTMLInputElement)?.value;
                const dob = (document.getElementById('profile-dob') as HTMLInputElement)?.value;
                const gender = (document.getElementById('profile-gender') as HTMLSelectElement)?.value;
                return { full_name: name, email, phone_number: phone, date_of_birth: dob, gender };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const data = await api.driver.updateProfile(result.value);
                    
                    Swal.close();
                    if (data.success) {
                        Swal.fire({ icon: 'success', title: 'Profile Updated', timer: 1500, showConfirmButton: false }).then(() => {
                            fetchSettingsData();
                        });
                    }
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Update Failed', text: 'An error occurred while updating your profile', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    // Save license
    const saveLicense = () => {
        Swal.fire({
            title: 'License Information',
            html: `
                <input type="text" id="license-number" class="swal2-input" placeholder="License Number" value="${licenseNumber}">
                <input type="date" id="license-expiry" class="swal2-input" placeholder="Expiry Date" value="${licenseExpiry}">
            `,
            showCancelButton: true,
            confirmButtonText: 'Save License',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const number = (document.getElementById('license-number') as HTMLInputElement)?.value;
                const expiry = (document.getElementById('license-expiry') as HTMLInputElement)?.value;
                return { number, expiry };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const data = await api.driver.updateProfile({ license_number: result.value.number, license_expiry: result.value.expiry });
                    
                    Swal.close();
                    if (data.success) {
                        setLicenseNumber(result.value.number);
                        setLicenseExpiry(result.value.expiry);
                        Swal.fire({ icon: 'success', title: 'License Saved', timer: 1500, showConfirmButton: false });
                    }
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred while saving license information', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    // Save vehicle
    const saveVehicle = () => {
        Swal.fire({
            title: 'Vehicle Details',
            html: `
                <input type="text" id="vehicle-model" class="swal2-input" placeholder="Model" value="${vehicleModel}">
                <input type="text" id="plate-number" class="swal2-input" placeholder="Plate Number" value="${plateNumber}">
                <select id="vehicle-type" class="swal2-input">
                    <option value="economy">Economy</option>
                    <option value="comfort">Comfort</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Vehicle',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const model = (document.getElementById('vehicle-model') as HTMLInputElement)?.value;
                const plate = (document.getElementById('plate-number') as HTMLInputElement)?.value;
                const type = (document.getElementById('vehicle-type') as HTMLSelectElement)?.value;
                return { model, plate, type };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const { model, plate, type } = result.value;
                    await api.driver.updateVehicle({
                        vehicle_model: model,
                        plate_number: plate,
                        vehicle_type: type,
                    });
                    Swal.close();
                    Swal.fire({ icon: 'success', title: 'Saved!', text: 'Vehicle updated successfully', timer: 1500, showConfirmButton: false });
                    fetchSettingsData();
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update vehicle', timer: 1500, showConfirmButton: false });
                }
            }
        });
    };

    // Add bank account
    const addBankAccount = () => {
        Swal.fire({
            title: 'Add Bank Account',
            html: `
                <select id="bank-name" class="swal2-input">
                    <option value="">Select Bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="GTBank">GTBank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="UBA">UBA</option>
                    <option value="Zenith">Zenith Bank</option>
                    <option value="Fidelity">Fidelity Bank</option>
                    <option value="Union Bank">Union Bank</option>
                </select>
                <input type="text" id="account-number" class="swal2-input" placeholder="Account Number (10 digits)" maxlength="10">
                <input type="text" id="account-name" class="swal2-input" placeholder="Account Name">
            `,
            showCancelButton: true,
            confirmButtonText: 'Add Account',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const bank = (document.getElementById('bank-name') as HTMLSelectElement)?.value;
                const account = (document.getElementById('account-number') as HTMLInputElement)?.value;
                const name = (document.getElementById('account-name') as HTMLInputElement)?.value;
                
                if (!bank || !account || !name) {
                    Swal.showValidationMessage('Please fill all fields');
                    return false;
                }
                if (account.length !== 10 || !/^\d+$/.test(account)) {
                    Swal.showValidationMessage('Please enter a valid 10-digit account number');
                    return false;
                }
                return { bank, account, name };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Saving...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const data = await api.driver.saveBankDetails({ bank_name: result.value.bank, account_number: result.value.account, account_name: result.value.name });
                    
                    Swal.close();
                    if (data.success) {
                        Swal.fire({ icon: 'success', title: 'Bank Added', timer: 1500, showConfirmButton: false }).then(() => {
                            fetchSettingsData();
                        });
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#ff5e00' });
                    }
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Connection Error', text: 'Failed to save bank details', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    // Set default bank
    const setDefaultBank = (bankId: string) => {
        Swal.fire({
            title: 'Set as Default?',
            text: 'Make this your default bank account for withdrawals',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Yes, set as default'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.driver.setDefaultBank(bankId);
                    Swal.fire({ icon: 'success', title: 'Default Set', text: 'Default bank account updated', timer: 1500, showConfirmButton: false, confirmButtonColor: '#ff5e00' });
                    fetchSettingsData();
                } catch (error) {
                    console.error('Error setting default bank:', error);
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to set default bank', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    // Remove bank account
    const removeBankAccount = (bankId: string) => {
        Swal.fire({
            title: 'Remove Account?',
            text: 'Are you sure you want to remove this bank account?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, remove',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Removing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const data = await api.driver.removeBankAccount(bankId);
                    Swal.close();
                    if (data.success) {
                        Swal.fire({ icon: 'success', title: 'Removed', text: 'Bank account removed', timer: 1500, showConfirmButton: false });
                        fetchSettingsData();
                    } else {
                        Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#ff5e00' });
                    }
                } catch (error: any) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to remove bank account', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifs = data.notifications || data.data?.notifications || [];
            
            if (notifs.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifs.forEach((notif: any) => {
                    html += `
                        <div style="padding: 12px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title || 'Notification'}</strong></p>
                            <p style="font-size: 13px; color: #666;">${notif.message || ''}</p>
                            <p style="font-size: 11px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';
                
                Swal.fire({
                    title: `Notifications (${notifs.length})`,
                    html: html,
                    icon: 'info',
                    confirmButtonColor: '#ff5e00',
                    confirmButtonText: 'Close'
                });
            } else {
                Swal.fire({ title: 'Notifications', text: 'No new notifications', icon: 'info', confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.fire({ title: 'Notifications', text: 'No new notifications', icon: 'info', confirmButtonColor: '#ff5e00' });
        }
    };

    // Logout
    const logout = () => {
        Swal.fire({
            title: 'Log Out',
            text: 'Are you sure you want to log out?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Yes, log out',
            cancelButtonText: 'Cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.auth.logout();
                } catch {
                    // Ignore API errors — clear locally regardless
                } finally {
                    setToken(null);
                    window.location.href = '/home';
                }
            }
        });
    };

    // Delete account
    const deleteAccount = () => {
        Swal.fire({
            title: 'Delete Account',
            html: `
                <p class="mb-4 text-gray-600">This action is permanent and cannot be undone.</p>
                <input type="text" id="delete-confirm" class="swal2-input" placeholder='Type "DELETE" to confirm'>
            `,
            showCancelButton: true,
            confirmButtonText: 'Delete Account',
            confirmButtonColor: '#ef4444',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const confirmText = (document.getElementById('delete-confirm') as HTMLInputElement)?.value;
                if (confirmText !== 'DELETE') {
                    Swal.showValidationMessage('Please type "DELETE" to confirm');
                    return false;
                }
                return true;
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    await api.auth.deleteAccount();
                    Swal.close();
                    Swal.fire({
                        icon: 'success',
                        title: 'Account Deleted',
                        text: 'Your account has been deleted successfully',
                        confirmButtonColor: '#ff5e00'
                    }).then(() => {
                        setToken(null);
                        window.location.href = '/home';
                    });
                } catch (error: any) {
                    Swal.close();
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: error.message || 'Failed to delete account',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            }
        });
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const firstName = driverData?.full_name?.split(' ')[0] || 'Driver';
    const userInitial = driverData?.full_name?.charAt(0)?.toUpperCase() || 'D';
    const driverStatus = driverData?.driver_status || 'offline';
    const verificationStatus = driverData?.verification_status || 'pending';

    useEffect(() => {
        fetchSettingsData();
    }, [fetchSettingsData]);

    return (
        <>
            {/* Force full width inline styles */}
            <style>{`
                /* Force full width - no white space */
                .mobile-driver-settings-container,
                .mobile-driver-settings-view {
                    width: 100vw !important;
                    max-width: 100vw !important;
                    min-width: 100vw !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    background: white !important;
                    overflow-x: hidden !important;
                }
                
                .mobile-driver-settings-view {
                    overflow-y: auto !important;
                    padding-bottom: 80px !important;
                }
                
                /* Remove all side margins and paddings from all child elements */
                .mobile-driver-settings-container * {
                    max-width: 100vw !important;
                }
                
                /* Ensure body and html have no margins */
                html, body, #app, .app-container, main {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow-x: hidden !important;
                    background: white !important;
                }
                
                /* Remove any border radius and side margins from profile summary */
                .mobile-profile-summary {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    border-radius: 0 !important;
                    width: 100% !important;
                    padding-left: 16px !important;
                    padding-right: 16px !important;
                }
                
                /* Full width for all settings items */
                .settings-item,
                .settings-toggle-item,
                .bank-item {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    border-radius: 0 !important;
                    width: 100% !important;
                }
                
                /* Remove any max-width constraints */
                .mobile-settings-sections,
                .settings-section {
                    max-width: 100% !important;
                    width: 100% !important;
                }
            `}</style>
            
            <div className="mobile-driver-settings-container">
                <div className="mobile-driver-settings-view">
                    {/* Header */}
                    <div className="mobile-driver-settings-header">
                        <div className="mobile-driver-settings-user-info">
                            <h1>Settings</h1>
                            <p>Manage your driver account</p>
                        </div>
                        <button className="mobile-driver-settings-notification-btn" onClick={checkNotifications}>
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="mobile-quick-stats">
                        <div className="quick-stat-card">
                            <div className="stat-value font-roboto-number">{formatCurrency(todayEarnings)}</div>
                            <div className="stat-label">Today</div>
                        </div>
                        <div className="quick-stat-card">
                            <div className="stat-value font-roboto-number">{formatCurrency(totalEarnings)}</div>
                            <div className="stat-label">Total</div>
                        </div>
                        <div className="quick-stat-card">
                            <div className="stat-value">{driverStatus === 'online' ? '🟢' : '⚫'}</div>
                            <div className="stat-label">{driverStatus === 'online' ? 'Online' : 'Offline'}</div>
                        </div>
                    </div>

                    {/* Profile Summary */}
                    <div className="mobile-profile-summary">
                        <div className="profile-avatar">
                            {userInitial}
                        </div>
                        <div className="profile-info">
                            <h2>{driverData?.full_name}</h2>
                            <p>{driverData?.email}</p>
                            <div className="profile-badges">
                                <span className={`badge ${verificationStatus === 'approved' ? 'verified' : 'pending'}`}>
                                    {verificationStatus === 'approved' ? '✓ Verified' : '⏳ Pending'}
                                </span>
                                <span className={`badge ${driverStatus === 'online' ? 'online' : 'offline'}`}>
                                    {driverStatus === 'online' ? '🟢 Online' : '⚫ Offline'}
                                </span>
                            </div>
                        </div>
                        <button className="edit-profile-btn" onClick={saveDriverProfile}>
                            <i className="fas fa-edit"></i>
                        </button>
                    </div>

                    {/* Settings Sections */}
                    <div className="mobile-settings-sections">
                        {/* Driver Account Section */}
                        <div className="settings-section">
                            <div className="section-header">
                                <i className="fas fa-id-card"></i>
                                <h2>Driver Account</h2>
                            </div>
                            
                            <div className="settings-item" onClick={saveDriverProfile}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-user"></i></div>
                                    <div className="item-details">
                                        <h3>Driver Profile</h3>
                                        <p>Name, email, phone, photo</p>
                                    </div>
                                </div>
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>

                            <div className="settings-item" onClick={saveLicense}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-id-card"></i></div>
                                    <div className="item-details">
                                        <h3>License Information</h3>
                                        <p>{licenseNumber ? `License #${licenseNumber.slice(-4)}` : 'Not added'}</p>
                                    </div>
                                </div>
                                {licenseExpiry && <div className="item-value">{new Date(licenseExpiry).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>}
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>

                            <div className="settings-item" onClick={addBankAccount}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-university"></i></div>
                                    <div className="item-details">
                                        <h3>Bank Details</h3>
                                        <p>{bankAccounts.length > 0 ? bankAccounts[0].bank_name : 'Add bank for withdrawals'}</p>
                                    </div>
                                </div>
                                {bankAccounts.length > 0 && (
                                    <div className="item-value">••••{bankAccounts[0].account_number.slice(-4)}</div>
                                )}
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>

                            {/* Bank Accounts List */}
                            {bankAccounts.length > 1 && (
                                <div className="bank-accounts-list">
                                    {bankAccounts.slice(1).map((bank) => (
                                        <div key={bank.id} className="bank-item">
                                            <div className="bank-info">
                                                <i className="fas fa-university"></i>
                                                <div>
                                                    <div className="bank-name">{bank.bank_name}</div>
                                                    <div className="bank-number">****{bank.account_number.slice(-4)}</div>
                                                </div>
                                            </div>
                                            <div className="bank-actions">
                                                {!bank.is_default && (
                                                    <button className="bank-action-btn default" onClick={() => setDefaultBank(bank.id)}>
                                                        <i className="fas fa-check-circle"></i>
                                                    </button>
                                                )}
                                                <button className="bank-action-btn remove" onClick={() => removeBankAccount(bank.id)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Vehicle Section */}
                        <div className="settings-section">
                            <div className="section-header">
                                <i className="fas fa-car"></i>
                                <h2>Vehicle Information</h2>
                            </div>
                            
                            <div className="settings-item" onClick={saveVehicle}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-truck"></i></div>
                                    <div className="item-details">
                                        <h3>Vehicle Details</h3>
                                        <p>{vehicleModel ? `${vehicleModel} • ${plateNumber}` : 'Add your vehicle information'}</p>
                                    </div>
                                </div>
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>
                        </div>

                        {/* Driving Preferences */}
                        <div className="settings-section">
                            <div className="section-header">
                                <i className="fas fa-sliders-h"></i>
                                <h2>Driving Preferences</h2>
                            </div>
                            
                            <div className="settings-item" onClick={() => {
                                Swal.fire({
                                    title: 'Work Schedule',
                                    html: `<p class="text-center text-gray-500">Coming soon</p>`,
                                    confirmButtonColor: '#ff5e00'
                                });
                            }}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-clock"></i></div>
                                    <div className="item-details">
                                        <h3>Work Schedule</h3>
                                        <p>Set your available hours</p>
                                    </div>
                                </div>
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className="settings-section">
                            <div className="section-header">
                                <i className="fas fa-bell"></i>
                                <h2>Driver Notifications</h2>
                            </div>
                            
                            <div className="settings-toggle-item">
                                <div className="toggle-info">
                                    <i className="fas fa-car"></i>
                                    <div>
                                        <h3>New Ride Requests</h3>
                                        <p>Get notified of new rides</p>
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.ride_requests} 
                                        onChange={(e) => toggleSetting('ride_requests', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="settings-toggle-item">
                                <div className="toggle-info">
                                    <i className="fas fa-money-bill"></i>
                                    <div>
                                        <h3>Earnings Updates</h3>
                                        <p>Payment notifications</p>
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.earnings_notif} 
                                        onChange={(e) => toggleSetting('earnings_notif', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            <div className="settings-toggle-item">
                                <div className="toggle-info">
                                    <i className="fas fa-volume-up"></i>
                                    <div>
                                        <h3>Sound Alerts</h3>
                                        <p>Play sound for new rides</p>
                                    </div>
                                </div>
                                <label className="toggle-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notificationSettings.sound_alerts} 
                                        onChange={(e) => toggleSetting('sound_alerts', e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>
                        </div>

                        {/* Support */}
                        <div className="settings-section">
                            <div className="section-header">
                                <i className="fas fa-question-circle"></i>
                                <h2>Driver Support</h2>
                            </div>
                            
                            <div className="settings-item" onClick={() => {
                                Swal.fire({
                                    title: 'Driver Help Center',
                                    html: `
                                        <div class="mobile-help-links">
                                            <div class="help-link" onclick="window.open('https://speedly.com/driver-guide', '_blank')">📚 Driver Guide</div>
                                            <div class="help-link" onclick="window.open('https://speedly.com/earnings-faq', '_blank')">💰 Earnings FAQ</div>
                                            <div class="help-link" onclick="window.open('https://speedly.com/vehicle-requirements', '_blank')">🛠️ Vehicle Requirements</div>
                                            <div class="help-link" onclick="window.location.href='support.php'">📞 Contact Driver Support</div>
                                        </div>
                                    `,
                                    confirmButtonColor: '#ff5e00',
                                    didOpen: () => {
                                        document.querySelectorAll('.help-link').forEach(link => {
                                            link.addEventListener('click', () => Swal.close());
                                        });
                                    }
                                });
                            }}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-headset"></i></div>
                                    <div className="item-details">
                                        <h3>Driver Help Center</h3>
                                        <p>FAQs, tutorials, driver support</p>
                                    </div>
                                </div>
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>

                            <div className="settings-item" onClick={() => {
                                Swal.fire({
                                    title: 'About Speedly Driver',
                                    html: `
                                        <div style="text-align: center;">
                                            <img src="/main-assets/logo-no-background.png" alt="Speedly" style="max-width: 120px; margin-bottom: 20px;">
                                            <h3 style="font-size: 20px; font-weight: bold;">Speedly Driver</h3>
                                            <p>Version 2.5.1</p>
                                            <p class="text-gray-500 mt-2">© 2026 Speedly. All rights reserved.</p>
                                        </div>
                                    `,
                                    confirmButtonColor: '#ff5e00'
                                });
                            }}>
                                <div className="item-info">
                                    <div className="item-icon"><i className="fas fa-info-circle"></i></div>
                                    <div className="item-details">
                                        <h3>About Speedly Driver</h3>
                                        <p>Version 2.5.1 • Driver app</p>
                                    </div>
                                </div>
                                <div className="item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mobile-action-buttons">
                            <button className="mobile-logout-btn" onClick={logout}>
                                <i className="fas fa-sign-out-alt"></i> Log Out
                            </button>
                            <button className="mobile-delete-account-btn" onClick={deleteAccount}>
                                <i className="fas fa-trash-alt"></i> Delete Account
                            </button>
                        </div>
                    </div>

                    {/* Bottom Navigation */}
                    <DriverNavMobile />
                </div>
            </div>
        </>
    );
};

export default DriverSettingsMobile;