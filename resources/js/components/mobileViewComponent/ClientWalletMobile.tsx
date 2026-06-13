import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ClientNavMobile from '../../components/navbars/ClientNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/ClientWalletMobile.css';

// Types
interface Transaction {
    id: string;
    transaction_type: string;
    amount: number;
    formatted_amount: string;
    status: string;
    created_at: string;
    date: string;
    reference: string | null;
    description: string | null;
    balance_before: number;
    balance_after: number;
    ride_number: string | null;
    display_id: string;
    is_credit: boolean;
    type_display: string;
}

interface PaymentMethod {
    id: string;
    method_type: string;
    account_last4: string;
    is_default: boolean;
}

const ClientWalletMobile: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [rideCount, setRideCount] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    // Fetch wallet data
    const fetchWalletData = useCallback(async () => {
        try {
            const [walletData, transactionData] = await Promise.all([
                api.client.wallet(),
                api.client.transactions()
            ]);

            if (walletData.success && walletData.data) {
                const w = walletData.data;
                setUserData(w.user || null);
                setWalletBalance(w.balance || 0);
                setRideCount(w.ride_count || 0);
                setPaymentMethods(w.payment_methods || []);
                setNotificationCount(w.notification_count || 0);
            }
            if (transactionData.success && transactionData.data) {
                setTransactions(transactionData.data.transactions || []);
            }
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Add funds to wallet
    const addFunds = () => {
        Swal.fire({
            title: 'Add Funds to Wallet',
            html: `
                <input type="number" id="amount" class="swal2-input" placeholder="Enter amount" min="100" step="100">
                <div style="margin-top: 10px; text-align: left; font-size: 13px; color: #666;">
                    <p><i class="fas fa-info-circle" style="color: #ff5e00;"></i> Minimum deposit: ₦100</p>
                    <p><i class="fas fa-credit-card" style="color: #ff5e00;"></i> Secured by KoraPay</p>
                    <p><i class="fas fa-clock" style="color: #ff5e00;"></i> Funds added instantly</p>
                </div>
            `,
            confirmButtonText: 'Proceed to Payment',
            confirmButtonColor: '#ff5e00',
            showCancelButton: true,
            preConfirm: () => {
                const amount = (document.getElementById('amount') as HTMLInputElement)?.value;
                if (!amount || parseFloat(amount) < 100) {
                    Swal.showValidationMessage('Please enter a valid amount (minimum ₦100)');
                    return false;
                }
                return { amount: parseFloat(amount) };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                processPayment(result.value.amount);
            }
        });
    };

    // Process payment
    const processPayment = async (amount: number) => {
        Swal.fire({
            title: 'Processing...',
            text: 'Initializing payment gateway',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await api.payment.initiate({ amount, email: userData?.email || '', name: userData?.fullname || userData?.full_name || '' });
            Swal.close();

            const checkoutUrl = res.data?.payment_url || res.data?.checkout_url || res.checkout_url;
            const reference = res.data?.reference || res.reference;

            if (res.success && checkoutUrl) {
                sessionStorage.setItem('payment_reference', reference || '');
                window.location.href = checkoutUrl;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Payment Failed',
                    text: res.message || 'Unable to initialize payment',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.close();
            const msg = error instanceof Error ? error.message : 'Unable to connect to payment gateway';
            Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                text: msg,
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Withdraw funds
    const withdrawFunds = () => {
        if (walletBalance < 1000) {
            Swal.fire({
                icon: 'warning',
                title: 'Insufficient Balance',
                text: 'Minimum withdrawal amount is ₦1,000',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        Swal.fire({
            title: 'Withdraw Funds',
            html: `
                <p style="margin-bottom: 15px;">Available: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${walletBalance.toLocaleString()}</strong></p>
                <input type="number" id="withdraw-amount" class="swal2-input" placeholder="Amount" min="1000" max="${walletBalance}">
                <select id="bank-name" class="swal2-input">
                    <option value="">Select Bank</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="GTBank">GTBank</option>
                    <option value="First Bank">First Bank</option>
                    <option value="UBA">UBA</option>
                    <option value="Zenith">Zenith Bank</option>
                </select>
                <input type="text" id="account-number" class="swal2-input" placeholder="Account Number" maxlength="10">
                <input type="text" id="account-name" class="swal2-input" placeholder="Account Name">
                <div style="margin-top: 10px; font-size: 12px; color: #666;">
                    <p><i class="fas fa-clock"></i> Processed within 24-48 hours</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Withdraw',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const amount = parseFloat((document.getElementById('withdraw-amount') as HTMLInputElement)?.value);
                const bank = (document.getElementById('bank-name') as HTMLSelectElement)?.value;
                const account = (document.getElementById('account-number') as HTMLInputElement)?.value;
                const name = (document.getElementById('account-name') as HTMLInputElement)?.value;

                if (!amount || amount < 1000) {
                    Swal.showValidationMessage('Minimum withdrawal is ₦1,000');
                    return false;
                }
                if (amount > walletBalance) {
                    Swal.showValidationMessage('Insufficient balance');
                    return false;
                }
                if (!bank) {
                    Swal.showValidationMessage('Please select a bank');
                    return false;
                }
                if (!account || account.length !== 10 || !/^\d+$/.test(account)) {
                    Swal.showValidationMessage('Valid 10-digit account number required');
                    return false;
                }
                if (!name) {
                    Swal.showValidationMessage('Please enter account name');
                    return false;
                }
                return { amount, bank, account, name };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Withdrawal Request Submitted',
                    html: `<p>Amount: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${result.value.amount.toLocaleString()}</strong></p><p>Bank: ${result.value.bank}</p><p>Account: ${result.value.account}</p>`,
                    confirmButtonColor: '#ff5e00'
                });
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
            confirmButtonText: 'Add',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const type = (document.getElementById('payment-type') as HTMLSelectElement)?.value;
                const bank = (document.getElementById('bank-name') as HTMLInputElement)?.value;
                const name = (document.getElementById('account-name') as HTMLInputElement)?.value;
                const number = (document.getElementById('account-number') as HTMLInputElement)?.value;
                const isDefault = (document.getElementById('set-default') as HTMLInputElement)?.checked;

                if (!bank || !name || !number) {
                    Swal.showValidationMessage('Please fill all fields');
                    return false;
                }
                return { type, bank, name, number, isDefault };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({ icon: 'success', title: 'Added!', timer: 1500, showConfirmButton: false }).then(() => {
                    fetchWalletData();
                });
            }
        });
    };

    // Check payment status for pending transactions
    const checkPaymentStatus = async (reference: string) => {
        Swal.fire({ title: 'Checking...', text: 'Please wait', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const data = await api.payment.verify(reference);
            Swal.close();
            if (data.data?.status === 'success' || data.status === 'success') {
                Swal.fire({ icon: 'success', title: 'Payment Confirmed!', text: 'Your wallet has been credited.', confirmButtonColor: '#ff5e00' }).then(() => fetchWalletData());
            } else if (data.data?.status === 'failed') {
                Swal.fire({ icon: 'error', title: 'Payment Failed', text: 'Please try again.', confirmButtonColor: '#ff5e00' });
            } else {
                Swal.fire({ icon: 'info', title: 'Still Processing', text: 'Please check back later.', confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Error', text: 'Unable to check payment status.', confirmButtonColor: '#ff5e00' });
        }
    };

    // View transaction details
    const viewTransaction = (transaction: Transaction) => {
        const amountPrefix = transaction.is_credit ? '+' : '-';
        const amountColor = transaction.is_credit ? '#4CAF50' : '#f44336';
        const isPending = transaction.status === 'pending' || transaction.status === 'processing';

        const html = `
            <div style="text-align: left; padding: 10px;">
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                        <span style="font-weight: bold;">Transaction Details</span>
                        <span style="background: ${transaction.status === 'completed' ? '#4CAF50' : '#FF9800'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px;">
                            ${transaction.status.toUpperCase()}
                        </span>
                    </div>
                    <div style="text-align: center; margin-bottom: 15px;">
                        <span style="font-size: 28px; font-weight: bold; color: ${amountColor}; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${amountPrefix}${transaction.formatted_amount}</span>
                    </div>
                    <table style="width: 100%; font-size: 13px;">
                        <tr><td style="padding: 8px 0; color: #666;">ID</td><td style="text-align: right;">${transaction.display_id}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Type</td><td style="text-align: right; text-transform: capitalize;">${transaction.type_display}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="text-align: right;">${transaction.date}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Balance After</td><td style="text-align: right; color: #ff5e00; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${transaction.balance_after.toLocaleString()}</td></tr>
                        ${transaction.reference ? `<tr><td style="padding: 8px 0; color: #666;">Reference</td><td style="text-align: right; font-size: 11px;">${transaction.reference}</td></tr>` : ''}
                    </table>
                    ${isPending && transaction.reference ? `
                    <div style="margin-top: 12px;">
                        <button onclick="window.checkPaymentStatusMobile('${transaction.reference}')" style="width: 100%; padding: 10px; background: #ff5e00; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Check Payment Status
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        Swal.fire({
            title: 'Transaction',
            html: html,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Close',
            width: '450px'
        });
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifs = data.data?.data || data.data?.notifications || [];
            
            if (notifs.length > 0) {
                let html = '<div style="text-align: left;">';
                notifs.forEach((notif: any) => {
                    html += `<div style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${notif.title}</strong><p style="font-size: 12px;">${notif.message}</p></div>`;
                });
                html += '</div>';
                Swal.fire({ icon: 'info', title: `Notifications (${notifs.length})`, html: html, confirmButtonColor: '#ff5e00' });
            } else {
                Swal.fire({ icon: 'info', title: 'Notifications', text: 'No new notifications', confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.fire({ icon: 'info', title: 'Notifications', text: 'No notifications', confirmButtonColor: '#ff5e00' });
        }
    };

    useEffect(() => {
        fetchWalletData();
        (window as any).checkPaymentStatusMobile = (reference: string) => checkPaymentStatus(reference);
        return () => { delete (window as any).checkPaymentStatusMobile; };
    }, [fetchWalletData]);

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;


    return (
        <div className="mobile-wallet-container">
            <div className="mobile-wallet-view">
                {/* Header */}
                <div className="mobile-wallet-header">
                    <div className="mobile-wallet-user-info">
                        <h1>Welcome back, {userData?.fullname?.split(' ')[0] || userData?.full_name?.split(' ')[0] || 'Guest'}!</h1>
                        <p>Manage your funds and transactions</p>
                    </div>
                    <button className="mobile-wallet-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Balance Card */}
                <div className="mobile-wallet-balance-card">
                    <div className="mobile-balance-header">
                        <h2>Total Balance</h2>
                        {rideCount > 10 && (
                            <div className="mobile-reward-badge">
                                <i className="fas fa-gift"></i> Reward
                            </div>
                        )}
                    </div>
                    <div className="mobile-balance-amount font-roboto-number">{formatCurrency(walletBalance)}</div>
                    <div className="mobile-balance-change">
                        <i className="fas fa-arrow-up"></i>
                        <span>Current balance</span>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="mobile-wallet-section">
                    <div className="mobile-section-header">
                        <h3>Payment Methods</h3>
                        <button className="mobile-add-btn" onClick={addPaymentMethod}>+ Add New</button>
                    </div>
                    <div className="mobile-payment-list">
                        {paymentMethods.length > 0 ? (
                            paymentMethods.map((method) => (
                                <div key={method.id} className={`mobile-payment-item ${method.is_default ? 'selected' : ''}`}>
                                    <div className="mobile-payment-icon">
                                        <i className={`fas fa-${method.method_type === 'bank_transfer' ? 'exchange-alt' : 'credit-card'}`}></i>
                                    </div>
                                    <div className="mobile-payment-details">
                                        <h4>{method.method_type === 'bank_transfer' ? 'Bank Transfer' : 'Card'}</h4>
                                        <p>{method.account_last4 ? `**** ${method.account_last4}` : ''}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="mobile-empty-state">No payment methods added</div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mobile-wallet-section">
                    <h3>Quick Actions</h3>
                    <div className="mobile-quick-actions-grid">
                        <button className="mobile-action-btn" onClick={addFunds}>
                            <div className="mobile-action-icon add-wallet"><i className="fas fa-wallet"></i></div>
                            <span>Add Funds</span>
                        </button>
                        <button className="mobile-action-btn" onClick={withdrawFunds}>
                            <div className="mobile-action-icon withdraw"><i className="fas fa-money-check-alt"></i></div>
                            <span>Withdraw</span>
                        </button>
                        <button className="mobile-action-btn" onClick={() => router.visit('/clientridehistory')}>
                            <div className="mobile-action-icon history"><i className="fas fa-history"></i></div>
                            <span>History</span>
                        </button>
                        <button className="mobile-action-btn" onClick={() => router.visit('/clientsupport')}>
                            <div className="mobile-action-icon support"><i className="fas fa-headset"></i></div>
                            <span>Support</span>
                        </button>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="mobile-wallet-section">
                    <div className="mobile-section-header">
                        <h3>Recent Transactions</h3>
                        <button className="mobile-see-all" onClick={() => router.visit('/clientridehistory')}>See All</button>
                    </div>
                    <div className="mobile-transactions-list">
                        {transactions.length > 0 ? (
                            transactions.slice(0, 5).map((transaction) => (
                                <div key={transaction.id} className="mobile-transaction-item" onClick={() => viewTransaction(transaction)}>
                                    <div className={`mobile-transaction-icon ${transaction.is_credit ? 'credit' : 'debit'}`}>
                                        <i className={`fas fa-${transaction.is_credit ? 'plus' : 'minus'}`}></i>
                                    </div>
                                    <div className="mobile-transaction-details">
                                        <h4>{transaction.type_display}</h4>
                                        <p>{transaction.date}</p>
                                        {(transaction.status === 'pending' || transaction.status === 'processing') && (
                                            <p style={{ color: '#FF9800', fontSize: '10px', fontWeight: 600, marginTop: '2px' }}>PENDING</p>
                                        )}
                                    </div>
                                    <div className={`mobile-transaction-amount font-roboto-number ${transaction.is_credit ? 'positive' : 'negative'}`}>
                                        {transaction.is_credit ? '+' : '-'}{transaction.formatted_amount}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="mobile-empty-state">No transactions yet</div>
                        )}
                    </div>
                </div>

                {/* Book Ride Button */}
                <button className="mobile-book-ride-btn" onClick={() => router.visit('/clientbookride')}>
                    <i className="fas fa-car"></i>
                    <span>Book a Ride Now</span>
                </button>

                {/* Bottom Navigation */}
                <ClientNavMobile />
            </div>
        </div>
    );
};

export default ClientWalletMobile;