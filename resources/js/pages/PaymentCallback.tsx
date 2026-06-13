import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/PaymentCallback.css';

const PaymentCallback: React.FC = () => {
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [amount, setAmount] = useState<number>(0);
    const [reference, setReference] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        const ref = urlParams.get('reference');
        
        if (!sessionId || !ref) {
            setStatus('error');
            setErrorMessage('Invalid payment session');
            return;
        }
        
        setReference(ref);
        
        // Check transaction status
        const checkStatus = async () => {
            try {
                const data = await api.payment.verify(ref);
                
                if (data.status === 'success') {
                    setAmount(data.amount || 0);
                    setStatus('success');
                    
                    setTimeout(() => {
                        router.visit(`/wallet?payment_status=completed&reference=${ref}`);
                    }, 2000);
                } else if (data.status === 'failed') {
                    setStatus('error');
                    setErrorMessage(data.failure_reason || 'Payment failed');
                } else {
                    // Still processing, check again after 2 seconds
                    setTimeout(checkStatus, 2000);
                }
            } catch (error) {
                console.error('Error checking status:', error);
                setStatus('error');
                setErrorMessage('Connection error');
            }
        };
        
        // Start checking after 1 second
        setTimeout(checkStatus, 1000);
        
        // Fallback timeout
        const timeout = setTimeout(() => {
            if (status === 'processing') {
                setStatus('error');
                setErrorMessage('Payment processing timeout');
            }
        }, 30000);
        
        return () => clearTimeout(timeout);
    }, []);

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    return (
        <div className="payment-callback-container">
            {/* Processing State */}
            {status === 'processing' && (
                <div className="callback-card processing">
                    <div className="payment-animation">
                        <div className="pulse-ring"></div>
                        <div className="spinner-wrapper">
                            <div className="spinner"></div>
                            <i className="fas fa-credit-card spinner-icon"></i>
                        </div>
                    </div>
                    <h2>Processing Your Payment</h2>
                    <div className="amount-wrapper">
                        <span className="amount-label">Amount</span>
                        <div className="amount">₦{amount.toLocaleString()}</div>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill"></div>
                    </div>
                    <p className="status-text">
                        <i className="fas fa-spinner fa-pulse"></i>
                        Verifying your payment...
                    </p>
                    <div className="reference-box">
                        <span className="ref-label">Transaction Reference</span>
                        <span className="ref-value">{reference.substring(0, 20)}...</span>
                    </div>
                    <div className="payment-tips">
                        <p><i className="fas fa-clock"></i> This may take a few moments</p>
                        <p><i className="fas fa-lock"></i> Securely processing your transaction</p>
                    </div>
                </div>
            )}
            
            {/* Success State */}
            {status === 'success' && (
                <div className="callback-card success">
                    <div className="success-animation">
                        <div className="success-circle">
                            <div className="success-checkmark">
                                <i className="fas fa-check"></i>
                            </div>
                        </div>
                        <div className="confetti-burst"></div>
                    </div>
                    <h2>Payment Successful!</h2>
                    <div className="amount-wrapper success-amount">
                        <span className="amount-label">Amount Paid</span>
                        <div className="amount">₦{amount.toLocaleString()}</div>
                    </div>
                    <div className="success-details">
                        <div className="detail-item">
                            <i className="fas fa-receipt"></i>
                            <span>Transaction completed successfully</span>
                        </div>
                        <div className="detail-item">
                            <i className="fas fa-envelope"></i>
                            <span>Receipt sent to your email</span>
                        </div>
                        <div className="detail-item">
                            <i className="fas fa-wallet"></i>
                            <span>Funds added to your wallet</span>
                        </div>
                    </div>
                    <p className="status-text success-text">
                        <i className="fas fa-arrow-right"></i>
                        Redirecting to wallet...
                    </p>
                    <div className="reference-box success-ref">
                        <span className="ref-label">Transaction ID</span>
                        <span className="ref-value">{reference}</span>
                    </div>
                </div>
            )}
            
            {/* Error State */}
            {status === 'error' && (
                <div className="callback-card error">
                    <div className="error-animation">
                        <div className="error-circle">
                            <i className="fas fa-times"></i>
                        </div>
                        <div className="error-shake"></div>
                    </div>
                    <h2>Payment Failed</h2>
                    <div className="error-message-box">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p>{errorMessage || 'Your payment could not be processed'}</p>
                    </div>
                    <div className="error-suggestions">
                        <h4>Possible reasons:</h4>
                        <ul>
                            <li><i className="fas fa-ban"></i> Insufficient wallet balance</li>
                            <li><i className="fas fa-clock"></i> Transaction timeout</li>
                            <li><i className="fas fa-shield-alt"></i> Security verification failed</li>
                        </ul>
                    </div>
                    <div className="action-buttons-group">
                        <button onClick={() => router.visit('/wallet')} className="btn-primary">
                            <i className="fas fa-wallet"></i> Back to Wallet
                        </button>
                        <button onClick={() => window.location.reload()} className="btn-secondary">
                            <i className="fas fa-redo-alt"></i> Try Again
                        </button>
                    </div>
                    <div className="support-link">
                        <i className="fas fa-headset"></i>
                        <a href="/support">Need help? Contact Support</a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentCallback;