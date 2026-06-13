import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import api, { setToken } from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import '../../css/AdminLogin.css';

interface Toast {
    id: number;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    removing?: boolean;
}

const AdminLogin: React.FC = () => {
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [rememberMe, setRememberMe] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    const showToast = useCallback((type: Toast['type'], title: string, message: string) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 300);
        }, 4000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    // Check if already logged in as admin
    useEffect(() => {
        const checkSession = async () => {
            try {
                const data = await api.auth.me();
                if (data.data?.user?.role === 'admin') {
                    router.visit('/admin-dashboard');
                }
            } catch (error) {
                console.error('Session check failed:', error);
            }
        };
        checkSession();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!username || !password) {
            showToast('warning', 'Missing Information', 'Please enter both username and password');
            return;
        }
        
        setLoading(true);
        
        try {
            const data = await api.auth.adminLogin({ login: username, password });
            
            if (data.success) {
                if (data.data?.token) setToken(data.data.token);
                showToast('success', 'Login Successful!', 'Redirecting to dashboard...');
                setTimeout(() => {
                    window.location.href = '/admindashboard';
                }, 1000);
            } else {
                showToast('error', 'Login Failed', data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Admin login raw error:', error); const errMsg = error?.message || String(error) || 'Connection failed'; showToast('error', 'Login Error', errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        window.location.href = '/forgot-password';
    };

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    return (
        <div className="admin-login-container">
            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}${toast.removing ? ' toast-removing' : ''}`}>
                        <i className={`bx ${toast.type === 'success' ? 'bx-check-circle' : toast.type === 'error' ? 'bx-x-circle' : 'bx-alert-circle'} toast-icon`}></i>
                        <div className="toast-content">
                            <div className="toast-title">{toast.title}</div>
                            <div className="toast-message">{toast.message}</div>
                        </div>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>✕</button>
                    </div>
                ))}
            </div>

            <div className="admin-login-card">
                <div className="login-header">
                    <div className="logo-wrapper">
                        <img src="/main-assets/logo-no-background.png" alt="Speedly" className="logo-image" />
                    </div>
                    <h1>Admin Dashboard</h1>
                    <p>Sign in to manage your platform</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <i className="fas fa-user input-icon"></i>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Username or Email"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <i className="fas fa-lock input-icon"></i>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="input-field"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <i 
                            className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`}
                            onClick={() => setShowPassword(!showPassword)}
                        ></i>
                    </div>

                    <div className="login-options">
                        <label className="remember-me">
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span>Remember me</span>
                        </label>
                        <button type="button" className="forgot-password" onClick={() => window.location.href = '/forgot-password'}>
                            Forgot Password?
                        </button>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? (
                            <><span className="spinner"></span> Signing in...</>
                        ) : (
                            <><span className="btn-text">Sign In</span> <i className="fas fa-arrow-right"></i></>
                        )}
                    </button>

                    <div className="security-badge">
                        <i className="fas fa-shield-alt"></i>
                        <span>Secure 256-bit SSL encrypted connection</span>
                    </div>

                    <div className="back-link">
                        <a href="/">
                            <i className="fas fa-arrow-left"></i>
                            Back to Website
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;