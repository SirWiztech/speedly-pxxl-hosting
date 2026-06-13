import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ClientWalletMobile from '../components/mobileViewComponent/ClientWalletMobile';
import '../../css/ClientWallet.css';

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

interface WalletStats {
    balance: number;
    ride_count: number;
    notification_count: number;
}

const ClientWallet: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [rideCount, setRideCount] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    const isMobile = useMobile();
    const preloaderLoading = usePreloader(1000);

    // Fetch wallet data
    const fetchWalletData = useCallback(async () => {
        try {
            const [walletData, txData] = await Promise.all([
                api.client.wallet(),
                api.client.transactions()
            ]);

            if (walletData.success && walletData.data) {
                const w = walletData.data;
                setWalletBalance(w.balance || 0);
                setRideCount(w.ride_count || 0);
                setPaymentMethods(w.payment_methods || []);
                setUserData(w.user || null);
                setNotificationCount(w.notification_count || 0);
            }
            if (txData.success && txData.data) {
                setTransactions(txData.data.transactions || []);
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
                    <p><i class="fas fa-percent" style="color: #ff5e00;"></i> Platform fees are covered by Speedly</p>
                    <p><i class="fas fa-clock" style="color: #ff5e00;"></i> Funds are added instantly after payment</p>
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

    // Process payment with KoraPay
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
                    title: 'Payment Initiation Failed',
                    text: res.message || 'Unable to initialize payment. Please try again.',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.close();
            const msg = error instanceof Error ? error.message : 'Unable to connect to payment gateway. Please try again.';
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
                <p style="margin-bottom: 15px;">Available balance: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${walletBalance.toLocaleString()}</strong></p>
                <input type="number" id="withdraw-amount" class="swal2-input" placeholder="Enter amount" min="1000" max="${walletBalance}" step="100">
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
                <div style="margin-top: 10px; text-align: left; font-size: 13px; color: #666;">
                    <p><i class="fas fa-clock" style="color: #ff5e00;"></i> Withdrawals are processed within 24-48 hours</p>
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
                    Swal.showValidationMessage('Please enter a valid 10-digit account number');
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
                    html: `
                        <p>Amount: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${result.value.amount.toLocaleString()}</strong></p>
                        <p>Bank: ${result.value.bank}</p>
                        <p>Account: ${result.value.account} (${result.value.name})</p>
                        <p style="margin-top: 15px; font-size: 13px; color: #666;">Your withdrawal will be processed within 24-48 hours.</p>
                    `,
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
                <label class="flex items-center gap-2 mt-2" style="justify-content: center;">
                    <input type="checkbox" id="set-default"> 
                    <span class="text-sm">Set as default payment method</span>
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
                const isDefault = (document.getElementById('set-default') as HTMLInputElement)?.checked;

                if (!bank || !name || !number) {
                    Swal.showValidationMessage('Please fill all fields');
                    return false;
                }
                if (number.length !== 10 || !/^\d+$/.test(number)) {
                    Swal.showValidationMessage('Please enter a valid 10-digit account number');
                    return false;
                }
                return { type, bank, name, number, isDefault };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Method Added',
                    text: 'Payment method added successfully',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    fetchWalletData();
                });
            }
        });
    };

    // Show payment options
    const showPaymentOptions = (methodId: string, methodType: string) => {
        Swal.fire({
            title: 'Payment Method Options',
            html: `
                <div style="text-align: left;">
                    <button onclick="window.setDefaultPaymentMethod('${methodId}')" style="width: 100%; padding: 12px; margin-bottom: 10px; background: #f5f5f5; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-check-circle" style="color: #ff5e00; margin-right: 10px;"></i> Set as Default
                    </button>
                    <button onclick="window.removePaymentMethodMethod('${methodId}')" style="width: 100%; padding: 12px; background: #fee2e2; border: none; border-radius: 8px; color: #dc2626; cursor: pointer;">
                        <i class="fas fa-trash" style="margin-right: 10px;"></i> Remove Method
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true
        });
    };

    // View transaction details
    const viewTransaction = (transaction: Transaction) => {
        const amountPrefix = transaction.is_credit ? '+' : '-';
        const amountColor = transaction.is_credit ? '#4CAF50' : '#f44336';
        const isPending = transaction.status === 'pending' || transaction.status === 'processing';

        const html = `
            <div style="text-align: left; padding: 10px;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="font-size: 18px; font-weight: bold;">Transaction Details</span>
                        <span style="background: ${transaction.status === 'completed' ? '#4CAF50' : '#FF9800'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                            ${transaction.status.toUpperCase()}
                        </span>
                    </div>
                    
                    <div style="margin-bottom: 20px; text-align: center;">
                        <span style="font-size: 32px; font-weight: bold; color: ${amountColor}; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">
                            ${amountPrefix}${transaction.formatted_amount}
                        </span>
                    </div>
                    
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Transaction ID</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500;">${transaction.display_id}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Type</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500; text-transform: capitalize;">${transaction.type_display}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Date & Time</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500;">${transaction.date}</td>
                        </tr>
                        ${transaction.reference ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Reference</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500;">${transaction.reference}</td>
                        </tr>
                        ` : ''}
                        ${transaction.description ? `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Description</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500;">${transaction.description}</td>
                        </tr>
                        ` : ''}
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px 0; color: #666;">Balance Before</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${transaction.balance_before.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #666;">Balance After</td>
                            <td style="padding: 10px 0; text-align: right; font-weight: 500; color: #ff5e00; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${transaction.balance_after.toLocaleString()}</td>
                        </tr>
                    </table>
                    ${isPending && transaction.reference ? `
                    <div style="margin-top: 15px;">
                        <button onclick="window.checkPaymentStatus('${transaction.reference}')" style="width: 100%; padding: 12px; background: #ff5e00; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;">
                            <i class="fas fa-sync-alt"></i> Check Payment Status
                        </button>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        Swal.fire({
            title: 'Transaction Details',
            html: html,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Close',
            width: '500px'
        });
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifications = data.data?.data || data.data?.notifications || [];

            if (notifications.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifications.forEach((notif: any) => {
                    html += `
                        <div style="padding: 12px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title}</strong></p>
                            <p>${notif.message}</p>
                            <p style="font-size: 12px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    icon: 'info',
                    title: `Notifications (${notifications.length})`,
                    html: html,
                    confirmButtonColor: '#ff5e00'
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Notifications',
                    text: 'No new notifications',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'info',
                title: 'Notifications',
                text: 'Unable to load notifications',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Check payment status for pending transactions
    const checkPaymentStatus = async (reference: string) => {
        Swal.fire({
            title: 'Checking Payment Status',
            text: 'Please wait...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        try {
            const data = await api.payment.verify(reference);
            Swal.close();
            if (data.data?.status === 'success' || data.status === 'success') {
                Swal.fire({
                    icon: 'success',
                    title: 'Payment Confirmed!',
                    text: 'Your wallet has been credited.',
                    confirmButtonColor: '#ff5e00'
                }).then(() => fetchWalletData());
            } else if (data.data?.status === 'failed') {
                Swal.fire({
                    icon: 'error',
                    title: 'Payment Failed',
                    text: 'The payment was not successful. Please try again.',
                    confirmButtonColor: '#ff5e00'
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Still Processing',
                    text: 'Your payment is still being processed. Please check back later.',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Unable to check payment status. Please try again.',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Set default payment method (global for modal)
    useEffect(() => {
        (window as any).setDefaultPaymentMethod = (methodId: string) => {
            Swal.fire({
                icon: 'success',
                title: 'Default Set',
                text: 'Payment method set as default',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                fetchWalletData();
            });
        };

        (window as any).removePaymentMethodMethod = (methodId: string) => {
            Swal.fire({
                title: 'Remove Payment Method?',
                text: 'Are you sure you want to remove this payment method?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#dc2626',
                confirmButtonText: 'Yes, Remove',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Removed',
                        text: 'Payment method removed successfully',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        fetchWalletData();
                    });
                }
            });
        };

        (window as any).checkPaymentStatus = (reference: string) => {
            checkPaymentStatus(reference);
        };

        return () => {
            delete (window as any).setDefaultPaymentMethod;
            delete (window as any).removePaymentMethodMethod;
            delete (window as any).checkPaymentStatus;
        };
    }, [fetchWalletData]);

    // Initial data fetch
    useEffect(() => {
        fetchWalletData();

        // Check for payment status from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment_status');
        const reference = urlParams.get('reference');

        if (paymentStatus === 'completed' && reference) {
            Swal.fire({
                icon: 'success',
                title: 'Deposit Successful!',
                text: 'Your wallet has been credited.',
                confirmButtonColor: '#ff5e00'
            });
            fetchWalletData();
        } else if (paymentStatus === 'pending' && reference) {
            checkPaymentStatus(reference);
        }
    }, [fetchWalletData]);

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view on mobile devices
    if (isMobile) {
        return <ClientWalletMobile />;
    }

    return (
        <div className="wallet-desktop-container">
            <ClientSidebarDesktop 
                userName={userData?.fullname || userData?.full_name || 'User'} 
                profilePictureUrl={userData?.profile_picture_url}
            />

            <div className="wallet-desktop-main">
                {/* Header */}
                <div className="wallet-desktop-header">
                    <div className="wallet-desktop-title">
                        <h1>Wallet</h1>
                        <p>Manage your funds and transactions</p>
                    </div>
                    <div className="wallet-desktop-actions">
                        <button className="wallet-notification-btn" onClick={checkNotifications}>
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && <span className="notification-badge font-roboto-number">{notificationCount}</span>}
                        </button>
                        <button className="wallet-add-money-btn" onClick={addFunds}>Add Money</button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="wallet-stats-grid">
                    {/* Balance Card */}
                    <div className="wallet-card balance-card">
                        <div className="card-header">
                            <h2>Total Balance</h2>
                            {rideCount > 10 && (
                                <div className="reward-badge">
                                    <i className="fas fa-gift"></i>
                                    <span>Reward Available</span>
                                </div>
                            )}
                        </div>
                        <div className="balance-amount font-roboto-number">{formatCurrency(walletBalance)}</div>
                        <div className="balance-change">
                            <i className="fas fa-arrow-up"></i>
                            <span>Current balance</span>
                        </div>
                    </div>

                    {/* Payment Methods Card */}
                    <div className="wallet-card payment-methods-card">
                        <div className="card-header">
                            <h2>Payment Methods</h2>
                            <button className="see-all-btn" onClick={addPaymentMethod}>+ Add New</button>
                        </div>
                        <div className="payment-methods-list">
                            {paymentMethods.length > 0 ? (
                                paymentMethods.map((method) => (
                                    <div key={method.id} className={`payment-method-item ${method.is_default ? 'selected' : ''}`}>
                                        <div className="payment-method-select">
                                            <div className="payment-radio">
                                                <div className="radio-dot"></div>
                                            </div>
                                        </div>
                                        <div className={`payment-method-icon ${method.method_type === 'bank_transfer' ? 'transfer-icon' : 'card-icon'}`}>
                                            <i className={`fas fa-${method.method_type === 'bank_transfer' ? 'exchange-alt' : 'credit-card'}`}></i>
                                        </div>
                                        <div className="payment-method-details">
                                            <h4>{method.method_type === 'bank_transfer' ? 'Bank Transfer' : 'Credit/Debit Card'}</h4>
                                            <p>{method.account_last4 ? `**** ${method.account_last4}` : ''}</p>
                                        </div>
                                        <div className="payment-method-action" onClick={() => showPaymentOptions(method.id, method.method_type)}>
                                            <i className="fas fa-ellipsis-v"></i>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-gray-500">No payment methods added yet</div>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="wallet-card large">
                        <div className="card-header">
                            <h2>Quick Actions</h2>
                        </div>
                        <div className="desktop-quick-actions">
                            <button className="desktop-action-btn" onClick={addFunds}>
                                <div className="desktop-action-icon add-wallet-icon">
                                    <i className="fas fa-wallet"></i>
                                </div>
                                <span>Add to Wallet</span>
                            </button>
                            <button className="desktop-action-btn" onClick={() => router.visit('/clientsupport')}>
                                <div className="desktop-action-icon refunds-icon">
                                    <i className="fas fa-undo-alt"></i>
                                </div>
                                <span>Refunds</span>
                            </button>
                            <button className="desktop-action-btn" onClick={() => router.visit('/clientsupport')}>
                                <div className="desktop-action-icon pending-icon">
                                    <i className="fas fa-clock"></i>
                                </div>
                                <span>Pending Payment</span>
                            </button>
                            <button className="desktop-action-btn" onClick={() => router.visit('/clientsupport')}>
                                <div className="desktop-action-icon support-icon">
                                    <i className="fas fa-headset"></i>
                                </div>
                                <span>Contact Support</span>
                            </button>
                            <button className="desktop-action-btn" onClick={withdrawFunds}>
                                <div className="desktop-action-icon withdrawal-icon">
                                    <i className="fas fa-money-check-alt"></i>
                                </div>
                                <span>Request Withdrawal</span>
                            </button>
                            <button className="desktop-action-btn" onClick={addPaymentMethod}>
                                <div className="desktop-action-icon payment-methods-icon">
                                    <i className="fas fa-credit-card"></i>
                                </div>
                                <span>Payment Methods</span>
                            </button>
                            <button className="desktop-action-btn" onClick={() => router.visit('/clientridehistory')}>
                                <div className="desktop-action-icon history-icon">
                                    <i className="fas fa-history"></i>
                                </div>
                                <span>Transaction History</span>
                            </button>
                            <button className="desktop-action-btn" onClick={() => router.visit('/clientsupport')}>
                                <div className="desktop-action-icon promo-icon">
                                    <i className="fas fa-tag"></i>
                                </div>
                                <span>Promo Codes</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Transactions Card */}
                    <div className="wallet-card large">
                        <div className="card-header">
                            <h2>Recent Transactions</h2>
                            <button className="see-all-btn" onClick={() => router.visit('/clientridehistory')}>See All</button>
                        </div>
                        <div className="desktop-transactions">
                            <div className="transaction-list">
                                {transactions.length > 0 ? (
                                    transactions.slice(0, 10).map((transaction) => (
                                        <div key={transaction.id} className="transaction-item" onClick={() => viewTransaction(transaction)}>
                                            <div className="transaction-info">
                                                <div className={`transaction-icon ${transaction.is_credit ? 'topup-icon' : 'transfer-icon'}`}>
                                                    <i className={`fas fa-${transaction.is_credit ? 'plus' : 'minus'}`}></i>
                                                </div>
                                                <div className="transaction-details">
                                                    <h4>{transaction.type_display}</h4>
                                                    <p>{transaction.date}</p>
                                                    <p className="text-xs text-gray-400">{transaction.display_id}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {(transaction.status === 'pending' || transaction.status === 'processing') && (
                                                    <span style={{ background: '#FF9800', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                                                        PENDING
                                                    </span>
                                                )}
                                                <div className={`transaction-amount font-roboto-number ${transaction.is_credit ? 'positive' : 'negative'}`}>
                                                    {transaction.is_credit ? '+' : '-'}{transaction.formatted_amount}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4 text-gray-500">No transactions yet</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ride Booking Banner */}
                <div className="ride-booking-banner">
                    <div className="banner-info">
                        <h2>Ready for your next ride?</h2>
                        <p>Book a ride instantly and enjoy our premium service with safety measures and comfortable vehicles.</p>
                        <div className="banner-stats">
                            <div className="banner-stat">
                                <div className="banner-stat-value font-roboto-number">{rideCount}</div>
                                <div className="banner-stat-label">Rides Taken</div>
                            </div>
                            <div className="banner-stat">
                                <div className="banner-stat-value">4.9</div>
                                <div className="banner-stat-label">Avg. Rating</div>
                            </div>
                            <div className="banner-stat">
                                <div className="banner-stat-value font-roboto-number">{formatCurrency(walletBalance)}</div>
                                <div className="banner-stat-label">Balance</div>
                            </div>
                        </div>
                    </div>
                    <button className="banner-book-btn" onClick={() => router.visit('/clientbookride')}>
                        <i className="fas fa-car"></i>
                        <span>Book a Ride Now</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientWallet;