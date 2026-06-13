import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import DriverSidebarDesktop from '../components/navbars/DriverSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import DriverWalletMobile from '../components/mobileViewComponent/DriverWalletMobile';
import '../../css/DriverWallet.css';

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
    destination_address: string;
    client_name: string;
}

interface Withdrawal {
    id: string;
    amount: number;
    bank_name: string;
    account_number: string;
    account_name: string;
    status: 'pending' | 'approved' | 'paid' | 'rejected' | 'processing';
    created_at: string;
    formatted_date: string;
    reference?: string;
}

interface WalletStats {
    wallet_balance: number;
    total_earnings: number;
    total_withdrawn: number;
    today_earnings: number;
    week_earnings: number;
    month_earnings: number;
    pending_withdrawals: number;
}

interface SavedBank {
    id: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    is_default: boolean;
    bank_code?: string;
}

interface Bank {
    bank_name: string;
    bank_code: string;
}

const DriverWallet: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [stats, setStats] = useState<WalletStats>({
        wallet_balance: 0,
        total_earnings: 0,
        total_withdrawn: 0,
        today_earnings: 0,
        week_earnings: 0,
        month_earnings: 0,
        pending_withdrawals: 0
    });
    const [recentRides, setRecentRides] = useState<RideEarning[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [savedBanks, setSavedBanks] = useState<SavedBank[]>([]);
    const [banksList, setBanksList] = useState<Bank[]>([]);
    const [loadingBanks, setLoadingBanks] = useState<boolean>(false);

    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    // Fetch wallet data
    const fetchWalletData = useCallback(async () => {
        setLoading(true);
        setApiError(null);

        const results = await Promise.allSettled([
            api.driver.wallet(),
            api.driver.transactions(),
            api.driver.profile()
        ]);

        const [walletResult, txResult, profileResult] = results;

        if (walletResult.status === 'fulfilled') {
            const walletData = walletResult.value;
            const w = walletData.data || walletData;
            if (w.stats) setStats(w.stats);
            if (w.user) setUserData(w.user);
            if (w.notification_count !== undefined) setNotificationCount(w.notification_count);
        } else {
            setApiError('Network error. Unable to load wallet data.');
        }

        if (txResult.status === 'fulfilled') {
            const txData = txResult.value;
            const t = txData.data || txData;
            if (t.recent_rides) setRecentRides(t.recent_rides);
            if (t.withdrawals) setWithdrawals(t.withdrawals);
        }

        if (profileResult.status === 'fulfilled') {
            const profileData = profileResult.value;
            const user = profileData.data?.user || profileData.user || profileData.data;
            if (user) setUserData(user);
        }

        setLoading(false);
    }, []);

    // Fetch saved banks
    const fetchSavedBanks = useCallback(async () => {
        try {
            const response = await api.driver.getBankDetails();
            if (response.success && response.data) {
                setSavedBanks(response.data);
            }
        } catch (error) {
            console.error('Error fetching bank details:', error);
        }
    }, []);

    // Fetch banks list from API
    const fetchBanksList = useCallback(async () => {
        setLoadingBanks(true);
        try {
            const response = await api.payment.getBanks('NGN');
            console.log('Banks API Response:', response);
            
            if (response.success && response.data && Array.isArray(response.data)) {
                const banks = response.data.map((bank: any) => ({
                    bank_name: bank.bank_name || bank.name,
                    bank_code: bank.bank_code || bank.code
                }));
                setBanksList(banks);
                console.log('Banks loaded:', banks.length);
            } else {
                console.log('Using fallback banks list');
                setBanksList(getFallbackBanks());
            }
        } catch (error) {
            console.error('Error fetching banks list:', error);
            setBanksList(getFallbackBanks());
        } finally {
            setLoadingBanks(false);
        }
    }, []);

    // Fallback banks list with correct OPay code
    const getFallbackBanks = (): Bank[] => {
        return [
            { bank_name: 'Access Bank', bank_code: '044' },
            { bank_name: 'GTBank', bank_code: '058' },
            { bank_name: 'First Bank of Nigeria', bank_code: '011' },
            { bank_name: 'United Bank for Africa (UBA)', bank_code: '033' },
            { bank_name: 'Zenith Bank', bank_code: '057' },
            { bank_name: 'Fidelity Bank', bank_code: '070' },
            { bank_name: 'Union Bank', bank_code: '032' },
            { bank_name: 'Sterling Bank', bank_code: '232' },
            { bank_name: 'EcoBank', bank_code: '050' },
            { bank_name: 'Polaris Bank', bank_code: '076' },
            { bank_name: 'Stanbic IBTC', bank_code: '221' },
            { bank_name: 'Opay', bank_code: '305' },
            { bank_name: 'PalmPay', bank_code: '999991' },
            { bank_name: 'Moniepoint', bank_code: '50515' },
            { bank_name: 'Providus Bank', bank_code: '101' },
            { bank_name: 'Wema Bank', bank_code: '035' },
            { bank_name: 'Kuda Bank', bank_code: '50211' },
        ];
    };

    // Verify bank account - IMPROVED VERSION
    const verifyBankAccount = async (bankCode: string, accountNumber: string): Promise<{ success: boolean; account_name?: string; message?: string }> => {
        console.log('Verifying account:', { bankCode, accountNumber });
        
        try {
            const response = await api.payment.verifyAccount({ 
                bank_code: bankCode, 
                account_number: accountNumber 
            });
            
            console.log('Verification API response:', response);
            
            // Check if response exists
            if (!response) {
                console.error('No response from API');
                return { 
                    success: false, 
                    message: 'No response from server' 
                };
            }
            
            // Check if verification was successful
            if (response.success === true) {
                return {
                    success: true,
                    account_name: response.account_name || 'Account Holder',
                    message: response.message || 'Account verified'
                };
            }
            
            // Verification failed
            return { 
                success: false, 
                message: response?.message || 'Invalid account number. Please check and try again.'
            };
            
        } catch (error: any) {
            console.error('Verification error details:', error);
            
            // Handle different error types
            if (error.response) {
                console.error('Server error:', error.response.data);
                return { 
                    success: false, 
                    message: error.response.data?.message || 'Server error. Please try again.'
                };
            } else if (error.request) {
                console.error('No response from server');
                return { 
                    success: false, 
                    message: 'No response from server. Please check your connection.'
                };
            } else {
                console.error('Error:', error.message);
                return { 
                    success: false, 
                    message: 'Error: ' + error.message
                };
            }
        }
    };

    // Save new bank account
    const saveBankDetails = async (bankData: { bank_name: string; account_number: string; account_name: string; bank_code?: string }) => {
        try {
            const response = await api.driver.saveBankDetails(bankData);
            if (response.success) {
                await fetchSavedBanks();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error saving bank details:', error);
            return false;
        }
    };

    // Debug function to test API directly
    const testVerificationDirectly = async () => {
        console.log('Testing verification directly...');
        
        try {
            const response = await fetch('/api/payment/verify-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    bank_code: '305',
                    account_number: '8108787625'
                })
            });
            
            const data = await response.json();
            console.log('Direct API test result:', data);
            
            Swal.fire({
                title: 'API Test Result',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Success:</strong> ${data.success}</p>
                        <p><strong>Message:</strong> ${data.message}</p>
                        <p><strong>Account Name:</strong> ${data.account_name || 'N/A'}</p>
                        <p><strong>Status Code:</strong> ${response.status}</p>
                    </div>
                `,
                icon: data.success ? 'success' : 'error',
                confirmButtonColor: '#ff5e00'
            });
        } catch (error) {
            console.error('Direct API test error:', error);
            Swal.fire({
                title: 'API Test Failed',
                text: error instanceof Error ? error.message : 'Unknown error',
                icon: 'error',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Show withdrawal modal
    const withdrawFunds = () => {
        if (stats.wallet_balance < 100) {
            Swal.fire({
                title: 'Insufficient Balance',
                html: `
                    <div style="text-align: center;">
                        <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px;"></i>
                        <p>Minimum withdrawal amount is <strong>₦100</strong></p>
                        <p class="font-roboto-number">Your balance: <strong>₦${stats.wallet_balance.toLocaleString()}</strong></p>
                    </div>
                `,
                icon: 'warning',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        // Build bank options HTML
        const bankOptionsHtml = banksList.length > 0 
            ? banksList.map((bank: Bank) => 
                `<option value="${bank.bank_name}" data-code="${bank.bank_code}">${bank.bank_name}</option>`
            ).join('')
            : '<option value="">Loading banks...</option>';

        // Build saved banks HTML
        let savedBanksHtml = '';
        if (savedBanks.length > 0) {
            savedBanksHtml = `
                <div class="withdrawal-section">
                    <label class="withdrawal-label">Saved Bank Accounts</label>
                    <div class="saved-banks-container">
                        ${savedBanks.map((bank: SavedBank) => `
                            <div class="saved-bank-card" data-bank-id="${bank.id}" 
                                 data-bank-name="${bank.bank_name}" 
                                 data-bank-code="${bank.bank_code || ''}" 
                                 data-account-number="${bank.account_number}" 
                                 data-account-name="${bank.account_name}">
                                <div class="saved-bank-radio">
                                    <div class="radio-custom ${bank.is_default ? 'checked' : ''}"></div>
                                </div>
                                <div class="saved-bank-info">
                                    <div class="saved-bank-name">
                                        <i class="fas fa-university"></i>
                                        <span>${bank.bank_name}</span>
                                        ${bank.is_default ? '<span class="default-badge">Default</span>' : ''}
                                    </div>
                                    <div class="saved-bank-details">
                                        <span class="account-number">•••• ${bank.account_number.slice(-4)}</span>
                                        <span class="account-name">${bank.account_name}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="add-new-bank-btn" id="add-new-bank-trigger">
                        <i class="fas fa-plus-circle"></i> Add New Bank Account
                    </button>
                </div>
            `;
        } else {
            savedBanksHtml = `
                <div class="withdrawal-section">
                    <button type="button" class="add-bank-primary" id="add-new-bank-trigger">
                        <i class="fas fa-plus-circle"></i> Add Bank Account
                    </button>
                </div>
            `;
        }

        Swal.fire({
            title: '<span style="font-family: Syne">Withdraw Funds</span>',
            html: `
                <div class="withdrawal-modal-content">
                    <div class="balance-preview">
                        <div class="balance-preview-label">Available Balance</div>
                        <div class="balance-preview-amount font-roboto-number">₦${stats.wallet_balance.toLocaleString()}</div>
                    </div>
                    
                    ${savedBanksHtml}
                    
                    <div id="new-bank-form" class="new-bank-form" style="display: none;">
                        <div class="withdrawal-section">
                            <label class="withdrawal-label">Select Bank</label>
                            <div class="custom-select-wrapper">
                                <select id="bank-name" class="custom-select">
                                    <option value="">-- Select a bank --</option>
                                    ${bankOptionsHtml}
                                </select>
                                <i class="fas fa-chevron-down select-arrow"></i>
                            </div>
                        </div>
                        
                        <div class="withdrawal-section">
                            <label class="withdrawal-label">Account Number</label>
                            <div class="input-with-icon">
                                <i class="fas fa-hashtag"></i>
                                <input type="text" id="new-account-number" class="custom-input" placeholder="10-digit account number" maxlength="10">
                            </div>
                            <div id="account-verification-status" class="verification-status"></div>
                        </div>
                        
                        <div class="withdrawal-section">
                            <label class="withdrawal-label">Account Name</label>
                            <div class="input-with-icon">
                                <i class="fas fa-user"></i>
                                <input type="text" id="new-account-name" class="custom-input" placeholder="Account holder name" readonly>
                            </div>
                        </div>
                        
                        <label class="checkbox-label">
                            <input type="checkbox" id="save-bank-checkbox" checked>
                            <span class="checkbox-custom"></span>
                            Save this bank account for future withdrawals
                        </label>
                    </div>
                    
                    <div class="withdrawal-section">
                        <label class="withdrawal-label">Amount to Withdraw</label>
                        <div class="amount-quick-select">
                            <button type="button" class="quick-amount" data-amount="5000">₦5,000</button>
                            <button type="button" class="quick-amount" data-amount="10000">₦10,000</button>
                            <button type="button" class="quick-amount" data-amount="25000">₦25,000</button>
                            <button type="button" class="quick-amount" data-amount="50000">₦50,000</button>
                        </div>
                        <div class="input-with-icon">
                            <i class="fas fa-naira-sign"></i>
                            <input type="number" id="withdraw-amount" class="custom-input" placeholder="Enter amount" min="100" max="${stats.wallet_balance}" step="100">
                        </div>
                    </div>
                    
                    <div class="withdrawal-section">
                        <label class="withdrawal-label">Confirm Password</label>
                        <div class="input-with-icon">
                            <i class="fas fa-lock"></i>
                            <input type="password" id="withdraw-password" class="custom-input" placeholder="Enter your password">
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-hand-holding-usd"></i> Withdraw',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#ff5e00',
            cancelButtonColor: '#6c757d',
            width: '580px',
            padding: '0',
            customClass: {
                popup: 'modern-withdrawal-popup',
                confirmButton: 'withdrawal-confirm-btn',
                cancelButton: 'withdrawal-cancel-btn'
            },
            didOpen: () => {
                // Inject styles
                if (!document.getElementById('withdrawal-modal-styles')) {
                    const styles = document.createElement('style');
                    styles.id = 'withdrawal-modal-styles';
                    styles.textContent = `
                        .modern-withdrawal-popup { border-radius: 24px !important; padding: 0 !important; }
                        .withdrawal-modal-content { padding: 8px 24px 24px 24px; }
                        .balance-preview { background: linear-gradient(135deg, #ff5e00, #ff8c3a); padding: 20px; border-radius: 20px; text-align: center; margin-bottom: 24px; color: white; }
                        .balance-preview-label { font-size: 12px; opacity: 0.8; margin-bottom: 8px; }
                        .balance-preview-amount { font-size: 36px; font-weight: 800; font-family: 'Roboto', sans-serif; }
                        .withdrawal-section { margin-bottom: 20px; }
                        .withdrawal-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #1a1a1a; }
                        .saved-banks-container { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; max-height: 250px; overflow-y: auto; }
                        .saved-bank-card { display: flex; align-items: center; gap: 14px; padding: 14px; border: 2px solid #e5e7eb; border-radius: 14px; cursor: pointer; transition: all 0.2s; background: white; }
                        .saved-bank-card:hover { border-color: #ff5e00; background: #fff5f0; }
                        .saved-bank-card.selected { border-color: #ff5e00; background: #fff5f0; }
                        .radio-custom { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 50%; position: relative; transition: all 0.2s; }
                        .radio-custom.checked { border-color: #ff5e00; background: #ff5e00; box-shadow: inset 0 0 0 4px white; }
                        .saved-bank-info { flex: 1; }
                        .saved-bank-name { display: flex; align-items: center; gap: 8px; font-weight: 600; margin-bottom: 6px; }
                        .saved-bank-name i { color: #ff5e00; }
                        .default-badge { background: #ff5e00; color: white; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 500; }
                        .saved-bank-details { display: flex; gap: 16px; font-size: 12px; color: #6b7280; }
                        .add-new-bank-btn, .add-bank-primary { width: 100%; padding: 12px; background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 12px; color: #ff5e00; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
                        .add-new-bank-btn:hover, .add-bank-primary:hover { background: #fff5f0; border-color: #ff5e00; }
                        .new-bank-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
                        .custom-select-wrapper { position: relative; }
                        .custom-select { width: 100%; padding: 12px 14px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; appearance: none; background: white; cursor: pointer; }
                        .custom-select:focus { outline: none; border-color: #ff5e00; }
                        .select-arrow { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; pointer-events: none; }
                        .input-with-icon { position: relative; }
                        .input-with-icon i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
                        .custom-input { width: 100%; padding: 12px 14px 12px 40px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; transition: all 0.2s; }
                        .custom-input:focus { outline: none; border-color: #ff5e00; box-shadow: 0 0 0 3px rgba(255, 94, 0, 0.1); }
                        .amount-quick-select { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
                        .quick-amount { flex: 1; padding: 10px; background: #f3f4f6; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                        .quick-amount:hover { background: #ff5e00; color: white; }
                        .checkbox-label { display: flex; align-items: center; gap: 10px; cursor: pointer; margin-top: 12px; }
                        .checkbox-custom { width: 18px; height: 18px; border: 2px solid #d1d5db; border-radius: 4px; display: inline-block; position: relative; }
                        input[type="checkbox"]:checked + .checkbox-custom { background: #ff5e00; border-color: #ff5e00; }
                        input[type="checkbox"]:checked + .checkbox-custom::after { content: '✓'; position: absolute; top: -2px; left: 2px; color: white; font-size: 12px; }
                        input[type="checkbox"] { display: none; }
                        .verification-status { font-size: 11px; margin-top: 6px; padding-left: 12px; }
                        .verification-status.verified { color: #10b981; }
                        .verification-status.error { color: #ef4444; }
                        .verification-status.loading { color: #f59e0b; }
                        .withdrawal-confirm-btn { background: linear-gradient(135deg, #ff5e00, #ff8c3a) !important; font-weight: 600 !important; padding: 12px 24px !important; }
                        .withdrawal-cancel-btn { background: #f3f4f6 !important; color: #6b7280 !important; font-weight: 500 !important; }
                    `;
                    document.head.appendChild(styles);
                }

                // Handle saved bank selection
                document.querySelectorAll('.saved-bank-card').forEach(card => {
                    card.addEventListener('click', function() {
                        document.querySelectorAll('.saved-bank-card').forEach(c => c.classList.remove('selected'));
                        document.querySelectorAll('.radio-custom').forEach(r => r.classList.remove('checked'));
                        this.classList.add('selected');
                        this.querySelector('.radio-custom')?.classList.add('checked');
                        
                        (window as any).selectedBankData = {
                            id: this.getAttribute('data-bank-id'),
                            bank_name: this.getAttribute('data-bank-name'),
                            bank_code: this.getAttribute('data-bank-code'),
                            account_number: this.getAttribute('data-account-number'),
                            account_name: this.getAttribute('data-account-name')
                        };
                    });
                });

                // Auto-select default bank
                const defaultBank = document.querySelector('.saved-bank-card:has(.default-badge)');
                if (defaultBank) {
                    (defaultBank as HTMLElement).click();
                }

                // Handle add new bank trigger
                const addBtn = document.getElementById('add-new-bank-trigger');
                if (addBtn) {
                    addBtn.addEventListener('click', () => {
                        const form = document.getElementById('new-bank-form');
                        if (form) {
                            form.style.display = form.style.display === 'none' ? 'block' : 'none';
                        }
                        (window as any).selectedBankData = null;
                        document.querySelectorAll('.saved-bank-card').forEach(c => c.classList.remove('selected'));
                        document.querySelectorAll('.radio-custom').forEach(r => r.classList.remove('checked'));
                        
                        const bankSelect = document.getElementById('bank-name') as HTMLSelectElement;
                        if (bankSelect) bankSelect.value = '';
                        const accountInput = document.getElementById('new-account-number') as HTMLInputElement;
                        if (accountInput) accountInput.value = '';
                        const nameInput = document.getElementById('new-account-name') as HTMLInputElement;
                        if (nameInput) nameInput.value = '';
                        const statusDiv = document.getElementById('account-verification-status');
                        if (statusDiv) {
                            statusDiv.innerHTML = '';
                            statusDiv.className = 'verification-status';
                        }
                    });
                }

                // Handle account number input for verification - UPDATED VERSION
                const accountInput = document.getElementById('new-account-number');
                const bankSelect = document.getElementById('bank-name') as HTMLSelectElement;
                let verificationTimeout: any;
                
                if (accountInput) {
                    accountInput.addEventListener('input', function() {
                        clearTimeout(verificationTimeout);
                        const accountNumber = (this as HTMLInputElement).value;
                        const selectedOption = bankSelect?.selectedOptions?.[0];
                        const bankCode = selectedOption?.getAttribute('data-code');
                        
                        const nameInput = document.getElementById('new-account-name') as HTMLInputElement;
                        const statusDiv = document.getElementById('account-verification-status');
                        
                        // Reset name input
                        if (nameInput) nameInput.value = '';
                        
                        // Clear status for invalid input
                        if (statusDiv && accountNumber.length !== 10) {
                            statusDiv.innerHTML = '';
                            statusDiv.className = 'verification-status';
                        }
                        
                        // Only try to verify if we have both bank code AND full account number
                        if (accountNumber.length === 10 && /^\d+$/.test(accountNumber) && bankCode) {
                            // Show loading immediately
                            if (statusDiv) {
                                statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying account...';
                                statusDiv.className = 'verification-status loading';
                            }
                            
                            // Clear previous timeout
                            if (verificationTimeout) clearTimeout(verificationTimeout);
                            
                            // Set new timeout for verification
                            verificationTimeout = setTimeout(async () => {
                                try {
                                    console.log('Starting verification for:', { bankCode, accountNumber });
                                    
                                    const result = await verifyBankAccount(bankCode, accountNumber);
                                    
                                    console.log('Verification result:', result);
                                    
                                    if (result.success && result.account_name) {
                                        if (nameInput) nameInput.value = result.account_name;
                                        if (statusDiv) {
                                            statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> Account verified successfully';
                                            statusDiv.className = 'verification-status verified';
                                        }
                                    } else {
                                        if (nameInput) nameInput.value = '';
                                        if (statusDiv) {
                                            statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + (result.message || 'Invalid account number');
                                            statusDiv.className = 'verification-status error';
                                        }
                                    }
                                } catch (error) {
                                    console.error('Verification failed:', error);
                                    if (statusDiv) {
                                        statusDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i> Verification failed. Please try again.';
                                        statusDiv.className = 'verification-status error';
                                    }
                                }
                            }, 1000);
                        } else if (accountNumber.length === 10 && !bankCode) {
                            if (statusDiv) {
                                statusDiv.innerHTML = '<i class="fas fa-info-circle"></i> Please select a bank first';
                                statusDiv.className = 'verification-status error';
                            }
                        } else if (accountNumber.length > 0 && accountNumber.length !== 10) {
                            if (statusDiv) {
                                statusDiv.innerHTML = '<i class="fas fa-info-circle"></i> Account number must be 10 digits';
                                statusDiv.className = 'verification-status error';
                            }
                        }
                    });
                }

                // Handle bank selection change
                if (bankSelect) {
                    bankSelect.addEventListener('change', function() {
                        const accountNumber = (document.getElementById('new-account-number') as HTMLInputElement)?.value;
                        if (accountNumber && accountNumber.length === 10) {
                            const event = new Event('input');
                            accountInput?.dispatchEvent(event);
                        }
                    });
                }

                // Handle quick amount buttons
                document.querySelectorAll('.quick-amount').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const amount = this.getAttribute('data-amount');
                        const amountInput = document.getElementById('withdraw-amount') as HTMLInputElement;
                        if (amountInput && amount) {
                            amountInput.value = amount;
                            document.querySelectorAll('.quick-amount').forEach(b => {
                                (b as HTMLElement).style.background = '#f3f4f6';
                                (b as HTMLElement).style.color = '#1a1a1a';
                            });
                            (this as HTMLElement).style.background = '#ff5e00';
                            (this as HTMLElement).style.color = 'white';
                        }
                    });
                });
            },
            preConfirm: () => {
                const amount = parseFloat((document.getElementById('withdraw-amount') as HTMLInputElement)?.value);
                const password = (document.getElementById('withdraw-password') as HTMLInputElement)?.value;
                
                const newBankForm = document.getElementById('new-bank-form');
                const isUsingNewBank = newBankForm && (newBankForm as HTMLElement).style.display === 'block';
                let bankData = (window as any).selectedBankData;
                
                if (isUsingNewBank) {
                    const bankSelect = document.getElementById('bank-name') as HTMLSelectElement;
                    const selectedOption = bankSelect?.selectedOptions?.[0];
                    const bankName = bankSelect?.value;
                    const bankCode = selectedOption?.getAttribute('data-code');
                    const accountNumber = (document.getElementById('new-account-number') as HTMLInputElement)?.value;
                    const accountName = (document.getElementById('new-account-name') as HTMLInputElement)?.value;
                    const saveBank = (document.getElementById('save-bank-checkbox') as HTMLInputElement)?.checked;
                    
                    if (!bankName) {
                        Swal.showValidationMessage('Please select a bank');
                        return false;
                    }
                    if (!bankCode) {
                        Swal.showValidationMessage('Invalid bank selected');
                        return false;
                    }
                    if (!accountNumber || accountNumber.length !== 10 || !/^\d+$/.test(accountNumber)) {
                        Swal.showValidationMessage('Please enter a valid 10-digit account number');
                        return false;
                    }
                    if (!accountName || accountName.trim().length < 3) {
                        Swal.showValidationMessage('Please wait for account verification to complete');
                        return false;
                    }
                    
                    bankData = {
                        bank_name: bankName,
                        bank_code: bankCode,
                        account_number: accountNumber,
                        account_name: accountName,
                        save_bank: saveBank
                    };
                } else if (!bankData && savedBanks.length > 0) {
                    Swal.showValidationMessage('Please select a bank account');
                    return false;
                } else if (!bankData && savedBanks.length === 0) {
                    Swal.showValidationMessage('Please add a bank account first');
                    return false;
                }
                
                if (!amount || isNaN(amount) || amount < 100) {
                    Swal.showValidationMessage('Minimum withdrawal amount is ₦100');
                    return false;
                }
                if (amount > stats.wallet_balance) {
                    Swal.showValidationMessage(`Insufficient balance. Maximum withdrawal is ₦${stats.wallet_balance.toLocaleString()}`);
                    return false;
                }
                if (!password) {
                    Swal.showValidationMessage('Please enter your password');
                    return false;
                }
                
                return { amount, password, bankData, isUsingNewBank };
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                Swal.fire({
                    title: 'Processing Withdrawal',
                    html: '<div class="processing-spinner"></div><p>Please wait while we process your payout...</p>',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const v = result.value;
                    
                    if (v.isUsingNewBank && v.bankData.save_bank) {
                        const saved = await saveBankDetails({
                            bank_name: v.bankData.bank_name,
                            account_number: v.bankData.account_number,
                            account_name: v.bankData.account_name,
                            bank_code: v.bankData.bank_code
                        });
                        if (saved) {
                            await fetchSavedBanks();
                        }
                    }
                    
                    const data = await api.driver.requestWithdrawal({
                        amount: v.amount,
                        password: v.password,
                        bank_name: v.bankData.bank_name,
                        bank_code: v.bankData.bank_code || '',
                        account_number: v.bankData.account_number,
                        account_name: v.bankData.account_name,
                    });

                    if (data.success) {
                        Swal.fire({
                            title: '🎉 Withdrawal Initiated!',
                            html: `
                                <div style="text-align: center;">
                                    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 24px; border-radius: 20px; margin-bottom: 20px;">
                                        <i class="fas fa-check-circle" style="font-size: 48px; color: white; margin-bottom: 8px;"></i>
                                        <p style="font-size: 32px; font-weight: 800; color: white; margin: 0; font-family: 'Roboto', sans-serif;">₦${v.amount.toLocaleString()}</p>
                                    </div>
                                    <div style="text-align: left; background: #f9fafb; padding: 16px; border-radius: 16px;">
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                            <span style="color: #6b7280;">Bank:</span>
                                            <strong>${v.bankData.bank_name}</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                                            <span style="color: #6b7280;">Account:</span>
                                            <strong>${v.bankData.account_number}</strong>
                                        </div>
                                        <div style="display: flex; justify-content: space-between;">
                                            <span style="color: #6b7280;">Name:</span>
                                            <strong>${v.bankData.account_name}</strong>
                                        </div>
                                    </div>
                                    <p style="margin-top: 16px; font-size: 12px; color: #6b7280;">
                                        <i class="fas fa-clock"></i> Funds will be sent to your bank account within 24-48 hours
                                    </p>
                                </div>
                            `,
                            icon: 'success',
                            confirmButtonColor: '#ff5e00',
                            confirmButtonText: 'Done',
                            background: 'white',
                            borderRadius: '24px'
                        }).then(() => {
                            fetchWalletData();
                            fetchSavedBanks();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Withdrawal Failed',
                            text: data.message || 'Failed to process withdrawal.',
                            confirmButtonColor: '#ff5e00'
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Connection Error',
                        text: (error instanceof Error ? error.message : '') || 'Network error. Please try again.',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            }
        });
    };

    // Quick add funds
    const addFunds = () => {
        Swal.fire({
            title: 'Add Funds to Wallet',
            html: `
                <div style="text-align: center;">
                    <div style="background: linear-gradient(135deg, #ff5e00, #ff8c3a); padding: 20px; border-radius: 20px; margin-bottom: 20px;">
                        <p style="color: white; opacity: 0.9; margin-bottom: 8px;">Current Balance</p>
                        <p style="font-size: 32px; font-weight: 800; color: white; font-family: 'Roboto', sans-serif;">₦${stats.wallet_balance.toLocaleString()}</p>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
                        <button type="button" class="fund-amount-option" data-amount="5000" style="padding: 14px; background: #f3f4f6; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">₦5,000</button>
                        <button type="button" class="fund-amount-option" data-amount="10000" style="padding: 14px; background: #f3f4f6; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">₦10,000</button>
                        <button type="button" class="fund-amount-option" data-amount="25000" style="padding: 14px; background: #f3f4f6; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">₦25,000</button>
                        <button type="button" class="fund-amount-option" data-amount="50000" style="padding: 14px; background: #f3f4f6; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">₦50,000</button>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; text-align: left;">Custom Amount</label>
                        <input type="number" id="custom-amount" class="swal2-input" placeholder="Enter amount" style="width: 100%; padding: 12px; border-radius: 12px;">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-arrow-right"></i> Proceed to Payment',
            confirmButtonColor: '#ff5e00',
            cancelButtonText: 'Cancel',
            didOpen: () => {
                document.querySelectorAll('.fund-amount-option').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.fund-amount-option').forEach(b => {
                            (b as HTMLElement).style.background = '#f3f4f6';
                            (b as HTMLElement).style.color = '#1a1a1a';
                        });
                        (this as HTMLElement).style.background = '#ff5e00';
                        (this as HTMLElement).style.color = 'white';
                        const amount = this.getAttribute('data-amount');
                        const customInput = document.getElementById('custom-amount') as HTMLInputElement;
                        if (customInput && amount) {
                            customInput.value = amount;
                        }
                    });
                });
            },
            preConfirm: () => {
                const customAmount = (document.getElementById('custom-amount') as HTMLInputElement)?.value;
                const amount = customAmount ? parseFloat(customAmount) : null;
                
                if (!amount || amount < 100) {
                    Swal.showValidationMessage('Please enter a valid amount (minimum ₦100)');
                    return false;
                }
                return { amount };
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                Swal.fire({
                    title: 'Processing Payment',
                    html: 'Redirecting to payment gateway...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const data = await api.payment.initiate({
                        amount: result.value.amount,
                        email: userData?.email || '',
                        name: userData?.fullname || userData?.full_name || 'Driver',
                    });

                    if (data.success && data.data?.checkout_url) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Redirecting...',
                            text: 'You will be redirected to the payment page.',
                            confirmButtonColor: '#ff5e00',
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            window.location.href = data.data.checkout_url;
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Payment Initiation Failed',
                            text: data.message || 'Failed to initiate payment.',
                            confirmButtonColor: '#ff5e00'
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Payment Failed',
                        text: error instanceof Error ? error.message : 'Network error. Please try again.',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            }
        });
    };

    // View all transactions
    const viewAllTransactions = () => {
        router.visit('/driverbookhistory');
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const response = await api.notifications.list();
            const payload = response.data || response;
            const notifications = payload.data || [];

            if (notifications.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifications.forEach((notif: any) => {
                    html += `
                        <div style="padding: 14px; border-bottom: 1px solid #f0f0f0;">
                            <p style="font-weight: 600; margin-bottom: 6px;">${notif.title || 'Notification'}</p>
                            <p style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">${notif.message || ''}</p>
                            <p style="font-size: 11px; color: #9ca3af;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    title: `<span style="font-family: Syne">Notifications (${notifications.length})</span>`,
                    html: html,
                    icon: 'info',
                    confirmButtonColor: '#ff5e00',
                    confirmButtonText: 'Close'
                });
            } else {
                Swal.fire({
                    title: 'No Notifications',
                    text: 'You have no new notifications',
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'No Notifications',
                text: 'You have no new notifications',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

    const getWithdrawalStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="status-badge-pending"><i className="fas fa-clock"></i> Pending</span>;
            case 'processing':
                return <span className="status-badge-pending"><i className="fas fa-spinner fa-pulse"></i> Processing</span>;
            case 'approved':
                return <span className="status-badge-approved"><i className="fas fa-check-circle"></i> Approved</span>;
            case 'paid':
                return <span className="status-badge-paid"><i className="fas fa-check-double"></i> Paid</span>;
            case 'rejected':
                return <span className="status-badge-rejected"><i className="fas fa-times-circle"></i> Rejected</span>;
            default:
                return <span className="status-badge">{status}</span>;
        }
    };

    useEffect(() => {
        fetchWalletData();
        fetchSavedBanks();
        fetchBanksList();
    }, [fetchWalletData, fetchSavedBanks, fetchBanksList]);

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    if (isMobile) {
        return <DriverWalletMobile />;
    }

    return (
        <div className="driver-wallet-desktop-container">
            <DriverSidebarDesktop 
                userName={userData?.fullname || userData?.full_name || 'Driver'} 
                userRole="driver"
                profilePictureUrl={userData?.profile_picture_url}
            />

            <div className="driver-wallet-desktop-main">
                <div className="wallet-desktop-header">
                    <div className="wallet-header-title">
                        <h1>Driver Wallet</h1>
                        <p>Manage your earnings and withdrawals</p>
                    </div>
                    <button className="wallet-desktop-notification" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="notif-badge-desktop font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {apiError && (
                    <div className="api-alert">
                        <i className="fas fa-info-circle"></i>
                        <span>{apiError}</span>
                    </div>
                )}

                <div className="wallet-desktop-scroll-content">
                    <div className="wallet-hero-card">
                        <div className="hero-card-bg"></div>
                        <div className="hero-card-content">
                            <div className="hero-balance-section">
                                <p className="hero-balance-label">Available Balance</p>
                                <p className="hero-balance-amount font-roboto-number">{formatCurrency(stats.wallet_balance)}</p>
                                <div className="hero-balance-actions">
                                    <button className="hero-withdraw-btn" onClick={withdrawFunds}>
                                        <i className="fas fa-hand-holding-usd"></i> Withdraw
                                    </button>
                                    <button className="hero-add-btn" onClick={addFunds}>
                                        <i className="fas fa-plus-circle"></i> Add Funds
                                    </button>
                                </div>
                            </div>
                            <div className="hero-stats-section">
                                <div className="hero-stat">
                                    <span className="hero-stat-label">Today's Earnings</span>
                                    <span className="hero-stat-value font-roboto-number">{formatCurrency(stats.today_earnings)}</span>
                                </div>
                                <div className="hero-stat">
                                    <span className="hero-stat-label">This Week</span>
                                    <span className="hero-stat-value font-roboto-number">{formatCurrency(stats.week_earnings)}</span>
                                </div>
                                <div className="hero-stat">
                                    <span className="hero-stat-label">This Month</span>
                                    <span className="hero-stat-value font-roboto-number">{formatCurrency(stats.month_earnings)}</span>
                                </div>
                                <div className="hero-stat">
                                    <span className="hero-stat-label">Total Earned</span>
                                    <span className="hero-stat-value font-roboto-number">{formatCurrency(stats.total_earnings)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="wallet-desktop-grid">
                        <div className="wallet-card earnings-card">
                            <div className="card-header-custom">
                                <h3><i className="fas fa-chart-simple"></i> Recent Earnings</h3>
                                <button className="view-all-link" onClick={viewAllTransactions}>
                                    View All <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>
                            <div className="earnings-list-desktop">
                                {recentRides.length > 0 ? (
                                    recentRides.map((ride, index) => (
                                        <div key={ride.id} className={`earning-row ${index === recentRides.length - 1 ? 'last' : ''}`}>
                                            <div className="earning-icon-wrapper">
                                                <i className="fas fa-taxi"></i>
                                            </div>
                                            <div className="earning-details">
                                                <div className="earning-route">
                                                    <span className="pickup">{ride.pickup_address?.split(',')[0] || 'Pickup'}</span>
                                                    <i className="fas fa-arrow-right arrow-icon"></i>
                                                    <span className="destination">{ride.destination_address?.split(',')[0] || 'Destination'}</span>
                                                </div>
                                                <div className="earning-meta">
                                                    <span><i className="far fa-calendar-alt"></i> {ride.formatted_date}</span>
                                                    <span><i className="far fa-clock"></i> {ride.formatted_time}</span>
                                                    <span><i className="fas fa-user"></i> {ride.client_name}</span>
                                                </div>
                                            </div>
                                            <div className="earning-amount-desktop positive font-roboto-number">
                                                +{formatCurrency(ride.driver_payout)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state-desktop">
                                        <i className="fas fa-chart-line"></i>
                                        <p>No recent earnings</p>
                                        <span>Complete rides to see your earnings</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="wallet-card withdrawals-card">
                            <div className="card-header-custom">
                                <h3><i className="fas fa-history"></i> Withdrawal History</h3>
                                <button className="view-all-link" onClick={withdrawFunds}>
                                    New Request <i className="fas fa-plus"></i>
                                </button>
                            </div>
                            <div className="withdrawals-list-desktop">
                                {withdrawals.length > 0 ? (
                                    withdrawals.map((withdrawal) => (
                                        <div key={withdrawal.id} className="withdrawal-row">
                                            <div className="withdrawal-icon">
                                                <i className="fas fa-university"></i>
                                            </div>
                                            <div className="withdrawal-details">
                                                <div className="withdrawal-amount font-roboto-number">{formatCurrency(withdrawal.amount)}</div>
                                                <div className="withdrawal-meta">
                                                    <span>{withdrawal.bank_name}</span>
                                                    <span>•</span>
                                                    <span>{withdrawal.formatted_date}</span>
                                                </div>
                                            </div>
                                            <div className="withdrawal-status-badge">
                                                {getWithdrawalStatusBadge(withdrawal.status)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state-desktop">
                                        <i className="fas fa-receipt"></i>
                                        <p>No withdrawal history</p>
                                        <span>Your withdrawal requests will appear here</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="withdrawal-summary">
                                <div className="summary-item">
                                    <span className="summary-label">Total Withdrawn</span>
                                    <span className="summary-value font-roboto-number">{formatCurrency(stats.total_withdrawn)}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Pending</span>
                                    <span className="summary-value pending font-roboto-number">{formatCurrency(stats.pending_withdrawals)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="wallet-tips-card">
                        <div className="tips-icon">
                            <i className="fas fa-lightbulb"></i>
                        </div>
                        <div className="tips-content">
                            <h4>Quick Tips</h4>
                            <p>Complete more rides to increase your earnings. Withdrawals are processed within 24-48 hours to your registered bank account.</p>
                        </div>
                        <div className="tips-stat">
                            <span className="tips-stat-label">Available Balance</span>
                            <span className="tips-stat-value font-roboto-number">₦{(stats.wallet_balance || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Debug Button - Remove in production */}
            <button 
                onClick={testVerificationDirectly}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 9999,
                    background: '#ff5e00',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px'
                }}
            >
                Test API
            </button>
        </div>
    );
};

export default DriverWallet;