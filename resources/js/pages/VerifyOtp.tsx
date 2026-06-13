import { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import api, { setToken } from '../services/api';
import '../../css/VerifyOtp.css';

interface Toast {
    id: number;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
}

export default function VerifyOtp() {
    const [error, setError] = useState('');
    const [otp, setOtp] = useState('');
    const [email, setEmail] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const loading = usePreloader(1000);
    const isMobile = useMobile();

    const showToast = (type: Toast['type'], title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 5000);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        if (emailParam) setEmail(emailParam);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        if (!email) {
            setError('Email not found. Please go back and register again.');
            return;
        }

        setIsVerifying(true);
        try {
            const data = await api.auth.verifyOtp({ email, otp });
            if (data.success) {
                showToast('success', 'Verification Successful', 'Your email has been verified successfully!');
                setTimeout(() => {
                    setToken(data.data.token);
                    const role = data.data.user.role;
                    if (role === 'client') window.location.href = '/clientdashboard';
                    else if (role === 'driver') window.location.href = '/driverdashboard';
                    else window.location.href = '/home';
                }, 1500);
            } else {
                showToast('error', 'Verification Failed', data.message || 'Invalid OTP. Please try again.');
                setError(data.message || 'Invalid OTP. Please try again.');
            }
        } catch (err: any) {
            showToast('error', 'Verification Failed', err.message || 'Invalid OTP. Please try again.');
            setError(err.message || 'Invalid OTP. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!email) {
            setError('Email not found');
            return;
        }
        setIsResending(true);
        try {
            await api.auth.resendOtp({ email });
            showToast('success', 'OTP Resent', 'A new verification code has been sent to your email.');
        } catch {
            showToast('error', 'Failed to Resend', 'Unable to resend OTP. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    if (loading) {
        return <DesktopPreloader />;
    }

    return (
        <>
            <Head title="Verify OTP" />
            <div className="verify-otp-page">
                {/* Toast Container */}
                <div className="toast-container">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`toast toast-${toast.type}`}>
                            <i className={`bx ${toast.type === 'success' ? 'bx-check-circle' : toast.type === 'error' ? 'bx-x-circle' : 'bx-alert-circle'} toast-icon`}></i>
                            <div className="toast-content">
                                <div className="toast-title">{toast.title}</div>
                                <div className="toast-message">{toast.message}</div>
                            </div>
                            <button className="toast-close" onClick={() => removeToast(toast.id)}></button>
                        </div>
                    ))}
                </div>

                <div className="otp-container">
                    <div className="otp-header">
                        <img src="/main-assets/logo.png" alt="Speedly" className="otp-logo" />
                        <h1>Verify Your Email</h1>
                        <p>We've sent a 6-digit code to your email address</p>
                    </div>

                    {error && (
                        <div className="error-message">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="otp-form">
                        <div className="otp-input-group">
                            <label>Enter OTP</label>
                            <input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="otp-input"
                                autoComplete="one-time-code"
                            />
                            <p className="otp-hint">Enter the 6-digit code sent to your email</p>
                        </div>

                        <button
                            type="submit"
                            className="btn-premium"
                            disabled={isVerifying || otp.length !== 6}
                        >
                            {isVerifying ? 'Verifying...' : 'Verify OTP'}
                        </button>
                    </form>

                    <div className="resend-section">
                        <p>Didn't receive the code?</p>
                        <button
                            type="button"
                            className="btn-resend"
                            onClick={handleResend}
                        >
                            {isResending ? 'Resending...' : 'Resend OTP'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
