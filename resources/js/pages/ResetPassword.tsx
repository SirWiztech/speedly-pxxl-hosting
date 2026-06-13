import { useState } from 'react';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/ResetPassword.css';

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

export default function ResetPassword() {
    const params = new URLSearchParams(window.location.search);
    const [email, setEmail] = useState(params.get('email') || '');
    const [token, setToken] = useState(params.get('token') || '');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const loading = usePreloader(1000);
    const isMobile = useMobile();

    // Password strength calculation
    const getPasswordStrength = (pwd: string) => {
        let strength = 0;
        if (pwd.length >= 6) strength++;
        if (pwd.length >= 10) strength++;
        if (/[A-Z]/.test(pwd)) strength++;
        if (/[0-9]/.test(pwd)) strength++;
        if (/[^A-Za-z0-9]/.test(pwd)) strength++;
        return Math.min(strength, 5);
    };

    const passwordStrength = getPasswordStrength(password);
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            Toast.fire({ icon: 'warning', title: 'Please enter your email address' });
            return;
        }

        if (!token) {
            Toast.fire({ icon: 'warning', title: 'Please enter the reset code from your email' });
            return;
        }

        if (password.length < 6) {
            Toast.fire({ icon: 'warning', title: 'Password must be at least 6 characters' });
            return;
        }

        if (password !== passwordConfirmation) {
            Toast.fire({ icon: 'warning', title: 'Passwords do not match' });
            return;
        }

        setSubmitting(true);

        try {
            const data = await api.auth.resetPassword({ email, token, password });

            if (data.status === 'success' || data.success) {
                Toast.fire({ icon: 'success', title: 'Password reset successfully!' });
                setSuccess(true);
            } else {
                Toast.fire({ icon: 'error', title: data.message || 'Failed to reset password' });
            }
        } catch (error) {
            Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Connection error. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <DesktopPreloader />;
    }

    return (
        <>
            <Head title="Reset Password | Speedly" />
            <div className="reset-page">
                {/* Animated Background Elements */}
                <div className="bg-orb orb-1"></div>
                <div className="bg-orb orb-2"></div>
                <div className="bg-orb orb-3"></div>
                <div className="bg-orb orb-4"></div>
                <div className="bg-grid"></div>
                
                <div className="reset-container">
                    {/* Decorative elements */}
                    <div className="reset-decor decor-1"></div>
                    <div className="reset-decor decor-2"></div>
                    <div className="reset-decor decor-3"></div>
                    
                    <div className="reset-card">
                        <div className="reset-header">
                            <div className="logo-wrapper">
                                <img src="/main-assets/logo-no-background.png" alt="Speedly" className="reset-logo" />
                            </div>
                            <div className="badge">Secure Reset</div>
                            <h1>Reset <span>Password</span></h1>
                            <p>Enter the verification code sent to your email and create a new password</p>
                        </div>

                        {success ? (
                            <div className="success-section">
                                <div className="success-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <h2>Password Reset Complete!</h2>
                                <p>Your password has been successfully reset. You can now sign in with your new password.</p>
                                <a href="/form" className="btn-signin">
                                    <span>Back to Sign In</span>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </a>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="reset-form">
                                <div className={`input-group ${focusedField === 'email' ? 'focused' : ''} ${email ? 'has-value' : ''}`}>
                                    <div className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                            <path d="M22 6l-10 7L2 6" />
                                        </svg>
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder=" "
                                        autoComplete="email"
                                        required
                                    />
                                    <label>Email Address</label>
                                </div>

                                <div className={`input-group ${focusedField === 'token' ? 'focused' : ''} ${token ? 'has-value' : ''}`}>
                                    <div className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M12 6v6l4 2" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        name="reset_code"
                                        value={token}
                                        onChange={(e) => setToken(e.target.value)}
                                        onFocus={() => setFocusedField('token')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder=" "
                                        autoComplete="off"
                                        required
                                    />
                                    <label>Reset Code</label>
                                </div>

                                <div className={`input-group ${focusedField === 'password' ? 'focused' : ''} ${password ? 'has-value' : ''}`}>
                                    <div className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="new_password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder=" "
                                        autoComplete="new-password"
                                        required
                                    />
                                    <label>New Password</label>
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {password && (
                                    <div className="password-strength">
                                        <div className="strength-bars">
                                            {[...Array(5)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`strength-bar ${i < passwordStrength ? 'active' : ''}`}
                                                    style={{ backgroundColor: i < passwordStrength ? strengthColors[passwordStrength - 1] : '#e5e7eb' }}
                                                />
                                            ))}
                                        </div>
                                        <span className="strength-text" style={{ color: strengthColors[passwordStrength - 1] }}>
                                            {strengthLabels[passwordStrength]}
                                        </span>
                                    </div>
                                )}

                                <div className={`input-group ${focusedField === 'confirm' ? 'focused' : ''} ${passwordConfirmation ? 'has-value' : ''}`}>
                                    <div className="input-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            <path d="M12 15v2" />
                                        </svg>
                                    </div>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirm_password"
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        onFocus={() => setFocusedField('confirm')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder=" "
                                        autoComplete="new-password"
                                        required
                                    />
                                    <label>Confirm Password</label>
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showConfirmPassword ? (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {password && passwordConfirmation && password !== passwordConfirmation && (
                                    <div className="error-message">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <circle cx="12" cy="16" r="0.5" fill="currentColor" />
                                        </svg>
                                        <span>Passwords do not match</span>
                                    </div>
                                )}

                                <button type="submit" className="btn-reset" disabled={submitting}>
                                    {submitting ? (
                                        <>
                                            <svg className="spinner" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" />
                                            </svg>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Reset Password
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                    
                    <div className="reset-footer">
                        <p>Remember your password? <a href="/form">Sign In</a></p>
                    </div>
                </div>
            </div>
        </>
    );
}