import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import DriverNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/DriverWalletMobile.css';

// Types
interface RideEarning {
    id: string;
    ride_number: string;
    total_fare: number;
    driver_payout: number;
    created_at: string;
    formatted_date: string;
    formatted_time: string;
    pickup_address: string;
    client_name: string;
}

interface Withdrawal {
    id: string;
    amount: number;
    bank_name: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    created_at: string;
    formatted_date: string;
}

interface WalletStats {
    wallet_balance: number;
    total_earnings: number;
    total_withdrawn: number;
    today_earnings: number;
    week_earnings: number;
}

const DriverWalletMobile: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [stats, setStats] = useState<WalletStats>({
        wallet_balance: 0,
        total_earnings: 0,
        total_withdrawn: 0,
        today_earnings: 0,
        week_earnings: 0
    });
    const [recentRides, setRecentRides] = useState<RideEarning[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch wallet data
    const fetchWalletData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                api.driver.wallet(),
                api.driver.transactions()
            ]);

            const [walletResult, txResult] = results;

            if (walletResult.status === 'fulfilled') {
                const walletData = walletResult.value;
                const w = walletData.data || walletData;
                if (w.stats) setStats(w.stats);
                if (w.user) setUserData(w.user);
                if (w.notification_count !== undefined) setNotificationCount(w.notification_count);
            }

            if (txResult.status === 'fulfilled') {
                const txData = txResult.value;
                const t = txData.data || txData;
                if (t.recent_rides) setRecentRides(t.recent_rides);
                if (t.withdrawals) setWithdrawals(t.withdrawals);
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Withdraw funds
    const withdrawFunds = () => {
        if (stats.wallet_balance < 100) {
            Swal.fire({
                title: 'Insufficient Balance',
                html: `Minimum withdrawal is ₦100. Balance: <b style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${stats.wallet_balance.toLocaleString()}</b>`,
                icon: 'warning',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        Swal.fire({
            title: 'Withdraw Funds',
            html: `
                <p class="mb-4">Available: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${stats.wallet_balance.toLocaleString()}</strong></p>
                <input type="number" id="withdraw-amount" class="swal2-input" placeholder="Amount" min="100" max="${stats.wallet_balance}">
                <input type="password" id="withdraw-password" class="swal2-input" placeholder="Your password" style="margin-top: 8px;">
                <select id="bank-name" class="swal2-input" style="margin-top: 8px;">
                    <option value="">Select Bank</option>
                    <option value="Access Bank" data-code="044">Access Bank</option>
                    <option value="GTBank" data-code="058">GTBank</option>
                    <option value="First Bank of Nigeria" data-code="011">First Bank</option>
                    <option value="UBA" data-code="033">UBA</option>
                    <option value="Zenith Bank" data-code="057">Zenith Bank</option>
                </select>
                <input type="text" id="account-number" class="swal2-input" placeholder="Account Number (10 digits)" maxlength="10" style="margin-top: 8px;">
                <input type="text" id="account-name" class="swal2-input" placeholder="Account Name" style="margin-top: 8px;">
            `,
            showCancelButton: true,
            confirmButtonText: 'Withdraw',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const amount = parseFloat((document.getElementById('withdraw-amount') as HTMLInputElement)?.value);
                const password = (document.getElementById('withdraw-password') as HTMLInputElement)?.value;
                const bankSelect = document.getElementById('bank-name') as HTMLSelectElement;
                const bank = bankSelect?.value;
                const bankCode = bankSelect?.selectedOptions?.[0]?.getAttribute('data-code') || '';
                const account = (document.getElementById('account-number') as HTMLInputElement)?.value;
                const name = (document.getElementById('account-name') as HTMLInputElement)?.value;
                
                if (!amount || amount < 100) {
                    Swal.showValidationMessage('Minimum withdrawal is ₦100');
                    return false;
                }
                if (amount > stats.wallet_balance) {
                    Swal.showValidationMessage('Insufficient balance');
                    return false;
                }
                if (!password) {
                    Swal.showValidationMessage('Please enter your password');
                    return false;
                }
                if (!bank) {
                    Swal.showValidationMessage('Select a bank');
                    return false;
                }
                if (!account || account.length !== 10 || !/^\d+$/.test(account)) {
                    Swal.showValidationMessage('Valid 10-digit account number required');
                    return false;
                }
                if (!name || name.length < 3) {
                    Swal.showValidationMessage('Enter valid account name');
                    return false;
                }
                return { amount, password, bank, bankCode, account, name };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                try {
                    const v = result.value;
                    const data = await api.driver.requestWithdrawal({
                        amount: v.amount,
                        password: v.password,
                        bank_name: v.bank,
                        bank_code: v.bankCode,
                        account_number: v.account,
                        account_name: v.name,
                    });
                    
                    if (data.success) {
                        Swal.fire({
                            title: 'Success!',
                            html: `<p>Withdrawal sent!</p><p>Amount: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${v.amount.toLocaleString()}</strong></p><p class="mt-2 text-sm">Funds sent to your bank account.</p>`,
                            icon: 'success',
                            confirmButtonColor: '#ff5e00'
                        }).then(() => fetchWalletData());
                    } else {
                        Swal.fire({ title: 'Error', text: data.message || 'Failed to process withdrawal', icon: 'error', confirmButtonColor: '#ff5e00' });
                    }
                } catch (error) {
                    Swal.fire({ title: 'Error', text: (error instanceof Error ? error.message : '') || 'Network error', icon: 'error', confirmButtonColor: '#ff5e00' });
                }
            }
        });
    };

    // View history
    const viewHistory = () => router.visit('/driverbookhistory');

    // Check notifications
    const checkNotifications = async () => {
        try {
            const response = await api.notifications.list();
            const payload = response.data || response;
            const notifs = payload.data || [];
            
            if (notifs.length > 0) {
                let html = '<div style="text-align: left;">';
                notifs.forEach((notif: any) => {
                    html += `<div style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${notif.title}</strong><p>${notif.message}</p></div>`;
                });
                html += '</div>';
                Swal.fire({ title: `Notifications (${notifs.length})`, html: html, confirmButtonColor: '#ff5e00' });
            } else {
                Swal.fire({ title: 'Notifications', text: 'No new notifications', icon: 'info', confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.fire({ title: 'Notifications', text: 'No notifications', icon: 'info', confirmButtonColor: '#ff5e00' });
        }
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const firstName = userData?.fullname?.split(' ')[0] || userData?.full_name?.split(' ')[0] || 'Driver';

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    return (
        <div className="mobile-driver-wallet-container">
            <div className="mobile-driver-wallet-view">
                {/* Header */}
                <div className="mobile-driver-wallet-header">
                    <div className="mobile-driver-wallet-user-info">
                        <h1>Wallet</h1>
                        <p>{firstName}'s earnings</p>
                    </div>
                    <button className="mobile-driver-wallet-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Balance Card */}
                <div className="mobile-wallet-balance-card">
                    <div className="balance-card-content">
                        <div>
                            <p className="balance-label">Available Balance</p>
                            <p className="balance-amount font-roboto-number">{formatCurrency(stats.wallet_balance)}</p>
                            <p className="total-earnings">Lifetime: <span className="font-roboto-number">{formatCurrency(stats.total_earnings)}</span></p>
                        </div>
                        <i className="fas fa-wallet balance-icon"></i>
                    </div>
                    <div className="balance-actions">
                        <button className="withdraw-btn" onClick={withdrawFunds}>
                            <i className="fas fa-hand-holding-usd"></i> Withdraw
                        </button>
                        <button className="history-btn" onClick={viewHistory}>
                            <i className="fas fa-history"></i> History
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="mobile-stats-grid">
                    <div className="mobile-stat-card">
                        <div className="stat-label">Today</div>
                        <div className="stat-value font-roboto-number">{formatCurrency(stats.today_earnings)}</div>
                        <div className={`stat-status ${stats.today_earnings > 0 ? 'active' : 'inactive'}`}>
                            {stats.today_earnings > 0 ? 'Active' : 'No rides'}
                        </div>
                    </div>
                    <div className="mobile-stat-card">
                        <div className="stat-label">This Week</div>
                        <div className="stat-value font-roboto-number">{formatCurrency(stats.week_earnings)}</div>
                        <div className="stat-status">Weekly</div>
                    </div>
                    <div className="mobile-stat-card">
                        <div className="stat-label">Total</div>
                        <div className="stat-value font-roboto-number">{formatCurrency(stats.total_earnings)}</div>
                        <div className="stat-status">Lifetime</div>
                    </div>
                </div>

                {/* Recent Earnings */}
                <div className="mobile-recent-earnings">
                    <h2 className="section-title">Recent Ride Earnings</h2>
                    <div className="earnings-list">
                        {recentRides.length > 0 ? (
                            recentRides.map((ride) => (
                                <div key={ride.id} className="earning-item">
                                    <div className="earning-info">
                                        <div className="earning-date">{ride.formatted_date} • {ride.formatted_time}</div>
                                        <div className="earning-title">Ride #{ride.ride_number?.substring(-8) || ride.id.substring(-8)}</div>
                                        <div className="earning-location">{ride.pickup_address?.substring(0, 25)}...</div>
                                        {ride.client_name && <div className="earning-client">Client: {ride.client_name}</div>}
                                    </div>
                                    <div className="earning-amount">
                                        <div className="amount-positive font-roboto-number">+{formatCurrency(ride.driver_payout)}</div>
                                        <div className="amount-subtext">Fare: <span className="font-roboto-number">{formatCurrency(ride.total_fare)}</span></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <i className="fas fa-coins"></i>
                                <p>No earnings yet</p>
                                <span>Complete rides to see earnings</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Navigation */}
                <DriverNavMobile />
            </div>
        </div>
    );
};

export default DriverWalletMobile;