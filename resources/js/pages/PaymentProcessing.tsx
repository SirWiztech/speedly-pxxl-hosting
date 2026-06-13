import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/PaymentProcessing.css';

const PaymentProcessing: React.FC = () => {
    const [status, setStatus] = useState<'processing' | 'success' | 'error' | 'expired'>('processing');
    const [amount, setAmount] = useState<number>(0);
    const [reference, setReference] = useState<string>('');
    
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('reference');
        const amt = parseFloat(urlParams.get('amount') || '0');
        
        if (!ref) {
            router.visit('/wallet');
            return;
        }
        
        setReference(ref);
        setAmount(amt);
        
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkStatus = async () => {
            attempts++;
            
            try {
                const data = await api.payment.verify(ref);
                
                if (data.status === 'success') {
                    setStatus('success');
                    setTimeout(() => {
                        router.visit(`/wallet?payment_status=completed&reference=${ref}`);
                    }, 1000);
                } else if (data.status === 'failed') {
                    setStatus('error');
                } else if (data.status === 'expired') {
                    setStatus('expired');
                } else if (attempts >= maxAttempts) {
                    setStatus('error');
                } else {
                    setTimeout(checkStatus, 2000);
                }
            } catch (error) {
                if (attempts >= maxAttempts) {
                    setStatus('error');
                } else {
                    setTimeout(checkStatus, 2000);
                }
            }
        };
        
        setTimeout(checkStatus, 1000);
        
        const timeout = setTimeout(() => {
            if (status === 'processing') {
                setStatus('error');
            }
        }, 60000);
        
        return () => clearTimeout(timeout);
    }, []);

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    return (
        <div className="payment-processing-container">
            {status === 'processing' && (
                <div className="processing-card">
                    <div className="spinner"></div>
                    <h2>Processing Payment</h2>
                    <div className="amount">₦{amount.toLocaleString()}</div>
                    <p className="status-text">Verifying your payment...</p>
                    <div className="reference">Ref: {reference.substring(0, 20)}...</div>
                </div>
            )}
            
            {status === 'success' && (
                <div className="processing-card success">
                    <div className="success-icon">
                        <i className="fas fa-check"></i>
                    </div>
                    <h2>Payment Successful!</h2>
                    <div className="amount" id="successAmount">₦{amount.toLocaleString()}</div>
                    <p className="status-text">Redirecting to wallet...</p>
                </div>
            )}
            
            {status === 'error' && (
                <div className="processing-card error">
                    <div className="error-icon">
                        <i className="fas fa-times"></i>
                    </div>
                    <h2>Payment Failed</h2>
                    <p className="status-text">Your payment could not be processed</p>
                    <button onClick={() => router.visit('/wallet')} className="back-btn">
                        Back to Wallet
                    </button>
                </div>
            )}
            
            {status === 'expired' && (
                <div className="processing-card expired">
                    <div className="error-icon">
                        <i className="fas fa-clock"></i>
                    </div>
                    <h2>Payment Expired</h2>
                    <p className="status-text">This payment session has expired</p>
                    <button onClick={() => router.visit('/wallet')} className="back-btn">
                        Back to Wallet
                    </button>
                </div>
            )}
        </div>
    );
};

export default PaymentProcessing;