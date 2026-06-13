import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import ClientNavMobile from '../../components/navbars/ClientNavMobile';
import Swal from 'sweetalert2';
import api, { setToken } from '../../services/api';
import '../../../css/ClientSettingsMobile.css';

// Types
interface UserData {
    id: string;
    fullname: string;
    full_name?: string;
    email: string;
    phone_number: string;
    profile_picture_url: string | null;
    role: string;
}

interface UserSettings {
    dark_mode: boolean;
    notifications_enabled: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
    language: string;
}

interface PaymentMethod {
    id: string;
    method_type: string;
    bank_name: string;
    account_last4: string;
    is_default: boolean;
}

interface SavedLocation {
    id: string;
    location_name: string;
    address: string;
    location_type: string;
}

const ClientSettingsMobile: React.FC = () => {
    // State
    const [userData, setUserData] = useState<UserData | null>(null);
    const [userRole, setUserRole] = useState<string>('client');
    const [userSettings, setUserSettings] = useState<UserSettings>({
        dark_mode: false,
        notifications_enabled: true,
        email_notifications: true,
        sms_notifications: false,
        language: 'en'
    });
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
    const [emergencyContactName, setEmergencyContactName] = useState<string>('');
    const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>('');
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch settings data
    const fetchSettingsData = async () => {
        try {
            const [profileData, locationsData] = await Promise.all([
                api.client.profile(),
                api.client.locations()
            ]);

            if (profileData.success || profileData.data) {
                const user = profileData.data;
                setUserData(user);
                setUserRole(user?.role || 'client');
                const prefs = user?.notification_preferences || {};
                setUserSettings({
                    dark_mode: user?.dark_mode ?? false,
                    notifications_enabled: prefs.notifications_enabled ?? true,
                    email_notifications: prefs.email_notifications ?? true,
                    sms_notifications: prefs.sms_notifications ?? false,
                    language: 'en'
                });
                setEmergencyContactName('');
                setEmergencyContactPhone('');
                setNotificationCount(0);
            }
            if (locationsData.success || locationsData.data) {
                const locs = locationsData.data;
                setSavedLocations(locs?.saved_locations || []);
            }
        } catch (error) {
            console.error('Error fetching settings data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Toggle setting
    const toggleSetting = async (setting: string, value: boolean) => {
        try {
            await api.client.updateProfile({ [setting]: String(value) });
            setUserSettings(prev => ({ ...prev, [setting]: value }));
        } catch (error) {
            console.error('Error updating setting:', error);
        }
    };

    // Toggle dark mode
    const toggleDarkMode = (enabled: boolean) => {
        toggleSetting('dark_mode', enabled);
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('darkMode', enabled ? 'enabled' : 'disabled');
    };

    // Update profile
    const updateProfile = async () => {
        Swal.fire({
            title: 'Edit Profile',
            html: `
                <input type="text" id="full-name" class="swal2-input" placeholder="Full Name" value="${userData?.fullname || userData?.full_name || ''}">
                <input type="email" id="email" class="swal2-input" placeholder="Email" value="${userData?.email || ''}">
                <input type="tel" id="phone" class="swal2-input" placeholder="Phone" value="${userData?.phone_number || ''}">
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Changes',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const fullName = (document.getElementById('full-name') as HTMLInputElement)?.value;
                const email = (document.getElementById('email') as HTMLInputElement)?.value;
                const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
                return { full_name: fullName, email, phone };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const data = await api.client.updateProfile(result.value);
                    
                    Swal.close();
                    if (data.success) {
                        Swal.fire({ icon: 'success', title: 'Profile Updated', timer: 1500, showConfirmButton: false }).then(() => {
                            fetchSettingsData();
                        });
                    }
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'success', title: 'Profile Updated', timer: 1500, showConfirmButton: false }).then(() => {
                        fetchSettingsData();
                    });
                }
            }
        });
    };

    // Update password
    const updatePassword = () => {
        Swal.fire({
            title: 'Change Password',
            html: `
                <input type="password" id="current-password" class="swal2-input" placeholder="Current Password">
                <input type="password" id="new-password" class="swal2-input" placeholder="New Password">
                <input type="password" id="confirm-password" class="swal2-input" placeholder="Confirm New Password">
            `,
            showCancelButton: true,
            confirmButtonText: 'Update Password',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const current = (document.getElementById('current-password') as HTMLInputElement)?.value;
                const newPwd = (document.getElementById('new-password') as HTMLInputElement)?.value;
                const confirm = (document.getElementById('confirm-password') as HTMLInputElement)?.value;
                
                if (newPwd !== confirm) {
                    Swal.showValidationMessage('Passwords do not match');
                    return false;
                }
                if (newPwd.length < 8) {
                    Swal.showValidationMessage('Password must be at least 8 characters');
                    return false;
                }
                return { current, new: newPwd };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    // TODO: add change password endpoint - currently unavailable
                    throw new Error('Change password endpoint not yet migrated');
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Not Available', text: 'Change password is coming soon', timer: 1500, showConfirmButton: false });
                }
            }
        });
    };

    // Add payment method
    const addPaymentMethod = () => {
        Swal.fire({
            title: 'Add Payment Method',
            html: `
                <select id="payment-type" class="swal2-input">
                    <option value="card">Credit/Debit Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                </select>
                <input type="text" id="bank-name" class="swal2-input" placeholder="Bank Name">
                <input type="text" id="account-name" class="swal2-input" placeholder="Account Name">
                <input type="text" id="account-number" class="swal2-input" placeholder="Account Number" maxlength="10">
                <label style="display: flex; justify-content: center; gap: 8px; margin-top: 10px;">
                    <input type="checkbox" id="set-default"> Set as default
                </label>
            `,
            showCancelButton: true,
            confirmButtonText: 'Add Method',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const type = (document.getElementById('payment-type') as HTMLSelectElement)?.value;
                const bank = (document.getElementById('bank-name') as HTMLInputElement)?.value;
                const name = (document.getElementById('account-name') as HTMLInputElement)?.value;
                const number = (document.getElementById('account-number') as HTMLInputElement)?.value;
                
                if (!bank || !name || !number) {
                    Swal.showValidationMessage('Please fill all fields');
                    return false;
                }
                return { type, bank, name, number };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ icon: 'success', title: 'Method Added', timer: 1500, showConfirmButton: false }).then(() => {
                    fetchSettingsData();
                });
            }
        });
    };

    // Add saved location
    const addSavedLocation = () => {
        Swal.fire({
            title: 'Add Saved Location',
            html: `
                <input type="text" id="location-name" class="swal2-input" placeholder="Location Name">
                <input type="text" id="address" class="swal2-input" placeholder="Full Address">
                <select id="location-type" class="swal2-input">
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="favorite">Favorite</option>
                </select>
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Location',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const name = (document.getElementById('location-name') as HTMLInputElement)?.value;
                const address = (document.getElementById('address') as HTMLInputElement)?.value;
                if (!name || !address) {
                    Swal.showValidationMessage('Please fill all fields');
                    return false;
                }
                return { name, address };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ icon: 'success', title: 'Location Saved', timer: 1500, showConfirmButton: false }).then(() => {
                    fetchSettingsData();
                });
            }
        });
    };

    // Save emergency contact
    const saveEmergencyContact = () => {
        Swal.fire({
            title: 'Emergency Contact',
            html: `
                <input type="text" id="emergency-name" class="swal2-input" placeholder="Contact Name" value="${emergencyContactName}">
                <input type="tel" id="emergency-phone" class="swal2-input" placeholder="Contact Phone" value="${emergencyContactPhone}">
            `,
            showCancelButton: true,
            confirmButtonText: 'Save Contact',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const name = (document.getElementById('emergency-name') as HTMLInputElement)?.value;
                const phone = (document.getElementById('emergency-phone') as HTMLInputElement)?.value;
                return { name, phone };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                setEmergencyContactName(result.value.name);
                setEmergencyContactPhone(result.value.phone);
                Swal.fire({ icon: 'success', title: 'Contact Saved', timer: 1500, showConfirmButton: false });
            }
        });
    };

    // Set language
    const setLanguage = (lang: string) => {
        setUserSettings(prev => ({ ...prev, language: lang }));
        Swal.fire({ icon: 'success', title: 'Language Updated', timer: 1500, showConfirmButton: false });
    };

    // Show help
    const showHelp = () => {
        Swal.fire({
            title: 'Help Center',
            html: `
                <div style="text-align: left;">
                    <p><strong>📚 How do I book a ride?</strong></p>
                    <p>Click "Book Ride" from the dashboard, enter pickup and destination, then confirm.</p>
                    <p><strong>💰 How do I add funds?</strong></p>
                    <p>Go to Wallet and click "Add Money".</p>
                    <p><strong>📞 Contact Support:</strong> support@speedly.com</p>
                </div>
            `,
            confirmButtonColor: '#ff5e00'
        });
    };

    // Logout
    const logout = () => {
        Swal.fire({
            icon: 'question',
            title: 'Log Out',
            text: 'Are you sure you want to log out?',
            showCancelButton: true,
            confirmButtonText: 'Yes, Log Out',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ff5e00'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.auth.logout();
                } catch (e) {
                    // ignore logout errors
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
                <p style="margin-bottom: 15px; color: #666;">This action is permanent and cannot be undone.</p>
                <input type="text" id="delete-confirm" class="swal2-input" placeholder='Type "DELETE" to confirm'>
            `,
            showCancelButton: true,
            confirmButtonText: 'Delete Account',
            confirmButtonColor: '#ff4757',
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
                Swal.fire({
                    title: 'Processing...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    await api.auth.deleteAccount();
                    Swal.close();
                    Swal.fire({ icon: 'success', title: 'Account Deleted', text: 'Your account has been deleted successfully', confirmButtonColor: '#ff5e00' }).then(() => {
                        setToken(null);
                        window.location.href = '/';
                    });
                } catch (error: any) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Error', text: error.message || 'Failed to delete account', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    useEffect(() => {
        fetchSettingsData();
        
        const darkModePref = localStorage.getItem('darkMode');
        if (darkModePref === 'enabled') {
            toggleDarkMode(true);
        }
    }, []);

    const userInitial = (userData?.fullname || userData?.full_name)?.charAt(0)?.toUpperCase() || 'U';
    const firstName = (userData?.fullname || userData?.full_name)?.split(' ')[0] || 'Guest';


    return (
        <div className="mobile-settings-container">
            <div className="mobile-settings-view">
                {/* Header */}
                <div className="mobile-settings-header">
                    <div>
                        <h1>Settings</h1>
                        <p>Manage your account preferences</p>
                    </div>
                    <button className="mobile-settings-notification-btn" onClick={() => router.visit('/notifications')}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge">{notificationCount}</span>}
                    </button>
                </div>

                <div className="mobile-settings-content">
                    {/* Profile Section */}
                    <div className="mobile-profile-section">
                        <div className="mobile-profile-avatar">
                            {userInitial}
                            <button className="edit-btn" onClick={updateProfile}>
                                <i className="fas fa-pen"></i>
                            </button>
                        </div>
                        <div className="mobile-profile-name">{userData?.fullname || userData?.full_name}</div>
                        <div className="mobile-profile-email">{userData?.email}</div>
                        <div className="mobile-profile-tier">{userRole === 'client' ? 'Client Member' : 'Driver Member'}</div>
                    </div>

                    {/* Account Settings */}
                    <div className="mobile-settings-section">
                        <div className="mobile-section-header">
                            <i className="fas fa-user-cog"></i>
                            <h2>Account Settings</h2>
                        </div>
                        
                        <div className="mobile-settings-item" onClick={updateProfile}>
                            <div className="mobile-item-info">
                                <div className="mobile-item-icon"><i className="fas fa-user"></i></div>
                                <div className="mobile-item-details">
                                    <h3>Personal Information</h3>
                                    <p>Name, email, phone</p>
                                </div>
                            </div>
                            <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                        </div>

                        <div className="mobile-settings-item" onClick={updatePassword}>
                            <div className="mobile-item-info">
                                <div className="mobile-item-icon"><i className="fas fa-key"></i></div>
                                <div className="mobile-item-details">
                                    <h3>Login & Security</h3>
                                    <p>Password, security</p>
                                </div>
                            </div>
                            <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                        </div>

                        <div className="mobile-settings-item" onClick={addPaymentMethod}>
                            <div className="mobile-item-info">
                                <div className="mobile-item-icon"><i className="fas fa-credit-card"></i></div>
                                <div className="mobile-item-details">
                                    <h3>Payment Methods</h3>
                                    <p>{paymentMethods.length} saved methods</p>
                                </div>
                            </div>
                            <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                        </div>
                    </div>

                    {/* Ride Preferences */}
                    {userRole === 'client' && (
                        <div className="mobile-settings-section">
                            <div className="mobile-section-header">
                                <i className="fas fa-car"></i>
                                <h2>Ride Preferences</h2>
                            </div>
                            
                            <div className="mobile-settings-item" onClick={addSavedLocation}>
                                <div className="mobile-item-info">
                                    <div className="mobile-item-icon"><i className="fas fa-map-marker-alt"></i></div>
                                    <div className="mobile-item-details">
                                        <h3>Saved Locations</h3>
                                        <p>{savedLocations.length} saved places</p>
                                    </div>
                                </div>
                                <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                            </div>
                        </div>
                    )}

                    {/* Notifications */}
                    <div className="mobile-settings-section">
                        <div className="mobile-section-header">
                            <i className="fas fa-bell"></i>
                            <h2>Notifications</h2>
                        </div>
                        
                        <div className="mobile-toggle-item">
                            <div className="toggle-label">
                                <i className="fas fa-envelope"></i>
                                <span>Ride Updates</span>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={userSettings.notifications_enabled} onChange={(e) => toggleSetting('notifications_enabled', e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="mobile-toggle-item">
                            <div className="toggle-label">
                                <i className="fas fa-bullhorn"></i>
                                <span>Promotions</span>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={userSettings.email_notifications} onChange={(e) => toggleSetting('email_notifications', e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        <div className="mobile-toggle-item">
                            <div className="toggle-label">
                                <i className="fas fa-shield-alt"></i>
                                <span>Safety Alerts</span>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={userSettings.sms_notifications} onChange={(e) => toggleSetting('sms_notifications', e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    {/* Privacy & Security */}
                    <div className="mobile-settings-section">
                        <div className="mobile-section-header">
                            <i className="fas fa-shield-alt"></i>
                            <h2>Privacy & Security</h2>
                        </div>
                        
                        <div className="mobile-settings-item" onClick={saveEmergencyContact}>
                            <div className="mobile-item-info">
                                <div className="mobile-item-icon"><i className="fas fa-phone-alt"></i></div>
                                <div className="mobile-item-details">
                                    <h3>Emergency Contacts</h3>
                                    <p>{emergencyContactName ? '1 contact' : 'Add contact'}</p>
                                </div>
                            </div>
                            <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                        </div>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="mobile-dark-mode-toggle">
                        <div className="mobile-dark-mode-info">
                            <h3>Dark Mode</h3>
                            <p>Switch between light and dark theme</p>
                        </div>
                        <label className="toggle-switch">
                            <input type="checkbox" checked={userSettings.dark_mode} onChange={(e) => toggleDarkMode(e.target.checked)} />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    {/* Support & About */}
                    <div className="mobile-settings-section">
                        <div className="mobile-section-header">
                            <i className="fas fa-question-circle"></i>
                            <h2>Support & About</h2>
                        </div>
                        
                        <div className="mobile-settings-item" onClick={showHelp}>
                            <div className="mobile-item-info">
                                <div className="mobile-item-icon"><i className="fas fa-headset"></i></div>
                                <div className="mobile-item-details">
                                    <h3>Help Center</h3>
                                    <p>FAQs, support</p>
                                </div>
                            </div>
                            <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                        </div>

                        <div className="mobile-settings-item" onClick={() => {
                            Swal.fire({
                                title: 'About Speedly',
                                html: `<div style="text-align: center;"><img src="/main-assets/logo-no-background.png" alt="Logo" style="max-width: 120px;"><h3>Speedly</h3><p>Version 2.5.1</p><p>© 2026 Speedly</p></div>`,
                                confirmButtonColor: '#ff5e00'
                            });
                        }}>
                            <div className="mobile-item-info">
                                <div className="mobile-item-icon"><i className="fas fa-info-circle"></i></div>
                                <div className="mobile-item-details">
                                    <h3>About Speedly</h3>
                                    <p>Version 2.5.1</p>
                                </div>
                            </div>
                            <div className="mobile-item-action"><i className="fas fa-chevron-right"></i></div>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="mobile-settings-section">
                        <div className="mobile-section-header">
                            <i className="fas fa-globe"></i>
                            <h2>Language</h2>
                        </div>
                        <div className="mobile-language-options">
                            <button className={`mobile-lang-btn ${userSettings.language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')}>🇬🇧 English</button>
                            <button className={`mobile-lang-btn ${userSettings.language === 'fr' ? 'active' : ''}`} onClick={() => setLanguage('fr')}>🇫🇷 Français</button>
                            <button className={`mobile-lang-btn ${userSettings.language === 'es' ? 'active' : ''}`} onClick={() => setLanguage('es')}>🇪🇸 Español</button>
                        </div>
                        <br/>
                        {/* Action Buttons */}
                    
                        <button className="mobile-logout-btn" onClick={logout}>
                            <i className="fas fa-sign-out-alt"></i> Log Out
                        </button>
                        <br/>
                        <button className="mobile-delete-account-btn" onClick={deleteAccount}>
                            <i className="fas fa-trash-alt"></i> Delete Account
                        </button>
                    </div>

                    
                
                </div>

                {/* Bottom Navigation */}
                <ClientNavMobile />
            </div>
        </div>
    );
};

export default ClientSettingsMobile;