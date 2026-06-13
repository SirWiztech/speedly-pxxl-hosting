import { useState } from 'react';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/ForgotPassword.css';

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
    }
});

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) {
            Toast.fire({ icon: 'warning', title: 'Please enter your email address' });
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Toast.fire({ icon: 'warning', title: 'Please enter a valid email address' });
            return;
        }
        
        setLoading(true);
        
        try {
            const data = await api.auth.forgotPassword({ email });
            
            if (data.status === 'success' || data.success) {
                Toast.fire({ icon: 'success', title: 'Reset link sent! Check your email.' });
                setTimeout(() => {
                    window.location.href = '/reset-password';
                }, 1500);
            } else {
                Toast.fire({ icon: 'error', title: data.message || 'Failed to send reset link' });
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Connection error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    return (
        <>
            <Head title="Forgot Password | Speedly" />
            <div className="forgot-page">
                <div className="forgot-bg-orb forgot-orb-1"></div>
                <div className="forgot-bg-orb forgot-orb-2"></div>
                <div className="forgot-bg-orb forgot-orb-3"></div>
                <div className="forgot-grid"></div>
                
                <div className="forgot-container">
                    <div className="forgot-decor forgot-decor-1"></div>
                    <div className="forgot-decor forgot-decor-2"></div>
                    
                    <div className="forgot-card">
                        <div className="forgot-header">
                            <div className="logo-wrapper">
                                <img src="/main-assets/logo-no-background.png" alt="Speedly" className="forgot-logo" />
                            </div>
                            <div className="forgot-badge">Password Reset</div>
                            <h1>Forgot <span>Password?</span></h1>
                            <p>Don't worry! Enter your email and we'll send you a secure link to reset your password.</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="forgot-form">
                            <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'has-value' : ''}`}>
                                <div className="input-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <path d="M22 6l-10 7L2 6" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                    placeholder=" "
                                    required
                                />
                                <label>Email Address</label>
                            </div>
                            
                            <button type="submit" className="forgot-btn" disabled={loading}>
                                {loading ? (
                                    <>
                                        <svg className="spinner" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        Send Reset Link
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M22 2L11 13" />
                                            <path d="M22 2L15 22l-4-9-9-4z" />
                                        </svg>
                                    </>
                                )}
                            </button>
                            
                            <div className="forgot-links">
                                <a href="/login">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M19 12H5M12 19l-7-7 7-7" />
                                    </svg>
                                    Back to Login
                                </a>
                            </div>
                            
                            <div className="forgot-security">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0110 0v4" />
                                </svg>
                                For your security, this link will expire in 1 hour
                            </div>
                        </form>
                    </div>
                    
                    <div className="forgot-footer">
                        <p>Remember your password? <a href="/form">Sign In</a></p>
                    </div>
                </div>
            </div>
        </>
    );
}
