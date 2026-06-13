import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/ForgotAdminPassword.css';

const ForgotAdminPassword: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');
    
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) {
            setError('Please enter your email address');
            return;
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        
        setLoading(true);
        setError('');
        setMessage('');
        
        try {
            const data = await api.auth.forgotPassword({ email });
            
            if (data.status === 'success' || data.success) {
                setMessage(data.message);
                Swal.fire({
                    icon: 'success',
                    title: 'Reset Link Sent!',
                    text: 'Check your email for password reset instructions.',
                    confirmButtonColor: '#ff5e00'
                });
                setEmail('');
            } else {
                setError(data.message || 'Failed to send reset link');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to send reset link',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                text: 'Unable to connect to the server.',
                confirmButtonColor: '#ff5e00'
            });
        } finally {
            setLoading(false);
        }
    };

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    return (
        <div className="forgot-admin-container">
            <div className="forgot-admin-card">
                <div className="forgot-admin-header">
                    <div className="logo-wrapper">
                        <img src="/main-assets/logo-no-background.png" alt="Speedly Logo" className="logo-image" />
                    </div>
                    <h1>Admin Password Reset</h1>
                    <p>Reset your admin account password</p>
                </div>
                
                <div className="forgot-admin-content">
                    {message && (
                        <div className="alert-message success">
                            <i className="fas fa-check-circle"></i> {message}
                        </div>
                    )}
                    {error && (
                        <div className="alert-message error">
                            <i className="fas fa-exclamation-circle"></i> {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <i className="fas fa-envelope"></i>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="Admin Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Sending...
                                </>
                            ) : (
                                <>
                                    <span>Send Reset Link</span>
                                    <i className="fas fa-paper-plane"></i>
                                </>
                            )}
                        </button>
                        <div className="back-link">
                            <a href="/admin-login">
                                <i className="fas fa-arrow-left"></i> Back to Admin Login
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotAdminPassword;