import React, { useState, useEffect, useRef } from 'react';
import '../../css/form.css';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import api, { setToken } from '../services/api';

interface Toast {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
}

interface LoginData {
    username: string;
    password: string;
    remember: boolean;
}

interface RegisterData {
    fullname: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    terms: boolean;
}

interface FormProps {
    onLoginSuccess?: () => void;
    onRegisterSuccess?: () => void;
}

export default function Form({ onLoginSuccess, onRegisterSuccess }: FormProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isActive, setIsActive] = useState(false);
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isRegisterLoading, setIsRegisterLoading] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    // Login state
    const [loginData, setLoginData] = useState<LoginData>({
        username: '',
        password: '',
        remember: false
    });
    
    // Register state
    const [registerData, setRegisterData] = useState<RegisterData>({
        fullname: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: '',
        terms: false
    });
    
    // Password strength
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
    
    // Email validation
    const [emailValid, setEmailValid] = useState<boolean | null>(null);
    
    // Refs for password toggle
    const loginPasswordRef = useRef<HTMLInputElement>(null);
    const registerPasswordRef = useRef<HTMLInputElement>(null);
    
    // Generate random phone number for demo
    const generatePhoneNumber = () => {
        return '+234' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    };

    // Toast functions
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
    
    // Password strength checker
    const checkPasswordStrength = (password: string) => {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        
        const score = Object.values(requirements).filter(Boolean).length;
        
        let text, color;
        if (score <= 2) {
            text = 'Weak';
            color = '#EF4444';
        } else if (score <= 3) {
            text = 'Medium';
            color = '#F59E0B';
        } else {
            text = 'Strong';
            color = '#10B981';
        }
        
        return { score, text, color };
    };
    
    // Validators
    const validateEmail = (email: string): boolean => {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    };
    
    const validateUsername = (username: string): boolean => {
        return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
    };
    
    // Handle login input changes
    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setLoginData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    // Handle register input changes
    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        setRegisterData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        
        // Password strength check
        if (name === 'password') {
            const strength = checkPasswordStrength(value);
            setPasswordStrength(strength);
        }
        
        // Email validation
        if (name === 'email') {
            setEmailValid(value ? validateEmail(value) : null);
        }
    };
    
    // Toggle password visibility
    const togglePassword = (inputRef: React.RefObject<HTMLInputElement>) => {
        if (inputRef.current) {
            const type = inputRef.current.type === 'password' ? 'text' : 'password';
            inputRef.current.type = type;
        }
    };
    
    // Switch to register form
    const switchToRegister = () => {
        setIsActive(true);
    };
    
    // Switch to login form
    const switchToLogin = () => {
        setIsActive(false);
    };
    
    // Handle login submit
    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!loginData.username || !loginData.password) {
            showToast('warning', 'Missing Information', 'Please enter your username/email and password');
            return;
        }
        
        setIsLoginLoading(true);
        
        try {
            const data = await api.auth.login({
                login: loginData.username,
                password: loginData.password
            });
            
            if (data.success) {
                setToken(data.data.token);
                showToast('success', 'Welcome Back!', data.message || 'Login successful!');
                setTimeout(() => {
                    if (onLoginSuccess) onLoginSuccess();
                    const role = data.data.user.role;
                    if (role === 'client') window.location.href = '/clientdashboard';
                    else if (role === 'driver') window.location.href = '/driverdashboard';
                    else window.location.href = '/home';
                }, 1500);
            } else {
                showToast('error', 'Login Failed', data.message || 'Invalid credentials');
            }
        } catch (error: any) {
            showToast('error', 'Login Failed', error.message || 'Invalid credentials');
        } finally {
            setIsLoginLoading(false);
        }
    };
    
    // Handle register submit
    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const { fullname, username, email, password, role, terms } = registerData;
        
        if (!fullname || !username || !email || !password || !role) {
            showToast('warning', 'Missing Information', 'Please fill in all required fields');
            return;
        }
        
        if (!validateEmail(email)) {
            showToast('warning', 'Invalid Email', 'Please enter a valid email address');
            return;
        }
        
        if (!validateUsername(username)) {
            showToast('warning', 'Invalid Username', 'Username must be at least 3 characters and contain only letters, numbers, and underscores');
            return;
        }
        
        if (!terms) {
            showToast('warning', 'Terms Required', 'You must agree to the terms and conditions');
            return;
        }
        
        const strength = checkPasswordStrength(password);
        if (strength.score < 3) {
            showToast('warning', 'Weak Password', 'Please use a stronger password with uppercase, lowercase, numbers, and special characters');
            return;
        }
        
        setIsRegisterLoading(true);
        
        try {
            const phone = registerData.phone || generatePhoneNumber();
            
            const data = await api.auth.register({
                full_name: fullname,
                username,
                email,
                phone,
                password,
                role,
            });
            
            if (data.success) {
                showToast('success', 'Account Created!', 'Please check your email for the verification code.');
                setTimeout(() => {
                    if (onRegisterSuccess) onRegisterSuccess();
                    window.location.href = `/verify-otp?email=${encodeURIComponent(email)}`;
                }, 2000);
            } else {
                showToast('error', 'Registration Failed', data.message || 'An error occurred during registration');
            }
        } catch (error: any) {
            showToast('error', 'Registration Failed', error.message || 'Unable to complete registration');
        } finally {
            setIsRegisterLoading(false);
        }
    };
    
    // Social login handlers
    const socialLogin = (provider: string) => {
        window.location.href = '/api/auth/' + provider;
    };
    
    // Handle preloader load complete
    const handlePreloaderComplete = () => {
        setIsLoading(false);
    };
    
    // Stagger animation on mount (only after preloader)
    useEffect(() => {
        if (!isLoading) {
            setTimeout(() => {
                const staggerItems = document.querySelectorAll('.stagger-item');
                staggerItems.forEach((item, index) => {
                    (item as HTMLElement).style.animationDelay = `${0.1 + index * 0.05}s`;
                });
            }, 100);
        }
    }, [isLoading]);
    
    // Show preloader while loading
    if (isLoading) {
        return <DesktopPreloader onLoad={handlePreloaderComplete} />;
    }
    
    return (
        <div className="form-page">
            {/* Background Effects */}
            <div className="bg-effects">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>
            
            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        <i className={`bx ${toast.type === 'success' ? 'bx-check-circle' : toast.type === 'error' ? 'bx-x-circle' : 'bx-alert-circle'} toast-icon`}></i>
                        <div className="toast-content">
                            <div className="toast-title">{toast.title}</div>
                            <div className="toast-message">{toast.message}</div>
                        </div>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>
                            <i className='bx bx-x'></i>
                        </button>
                    </div>
                ))}
            </div>
            
            {/* Main Container */}
            <div className={`main-container ${isActive ? 'active' : ''}`}>
                {/* Brand Panel */}
                <div className="brand-panel">
                    <div className="brand-content">
                        <div className="brand-logo">
                            <div className="comet-orbit">
                                <div className="comet-path">
                                    <div className="comet-dot"></div>
                                </div>
                            </div>
                            <img src="/main-assets/logo.png" alt="Speedly Logo" />
                        </div>
                        <h2 className="brand-title">SPEEDLY</h2>
                        <p className="brand-subtitle">
                            Your trusted delivery partner. Fast, reliable, and always on the move.
                        </p>
                    </div>
                    
                    <div className="register-brand-content">
                        <div className="brand-logo">
                            <div className="comet-orbit">
                                <div className="comet-path">
                                    <div className="comet-dot"></div>
                                </div>
                            </div>
                            <img src="/main-assets/logo.png" alt="Speedly Logo" />
                        </div>
                        <h2 className="brand-title">START TODAY</h2>
                        <p className="brand-subtitle">
                            Join thousands of users who trust Speedly for their delivery needs.
                        </p>
                    </div>
                </div>  
                
                {/* Form Panel */}
                <div className="form-panel" >
                    <div className="form-content">
                        {/* Login Form */}
                        <div className={`form-wrapper login-wrapper ${!isActive ? 'active' : ''}`}>
                            <h1 className="form-title stagger-item">
                                <span className="gradient-text">Welcome Back</span>
                            </h1>
                            <p className="form-subtitle stagger-item">Access your Speedly account</p>
                            
                            {/* Social Register */}
                            {/* Social Login */}
                            <div className="social-buttons stagger-item">
                                <button type="button" className="btn-social" onClick={() => socialLogin('google')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Google
                                </button>
                            </div>
                            
                            <div className="divider stagger-item">or continue with email</div>
                            
                            {/* Login Form */}
                            <form onSubmit={handleLoginSubmit}>
                                <div className="input-group stagger-item">
                                    <i className='bx bxs-user input-icon'></i>
                                    <input 
                                        type="text" 
                                        name="username"
                                        className="input-field" 
                                        placeholder="Username or Email"
                                        autoComplete="username"
                                        value={loginData.username}
                                        onChange={handleLoginChange}
                                        required
                                    />
                                </div>
                                
                                <div className="input-group stagger-item">
                                    <i className='bx bxs-lock-alt input-icon'></i>
                                    <input 
                                        type="password" 
                                        name="password"
                                        ref={loginPasswordRef}
                                        className="input-field" 
                                        placeholder="Password"
                                        autoComplete="current-password"
                                        value={loginData.password}
                                        onChange={handleLoginChange}
                                        required
                                    />
                                    <button type="button" className="password-toggle" onClick={() => togglePassword(loginPasswordRef)}>
                                        <i className='bx bx-hide'></i>
                                    </button>
                                </div>
                                
                                <div className="checkbox-group stagger-item" style={{ justifyContent: 'space-between' }}>
                                    <div className="checkbox-group">
                                        <input 
                                            type="checkbox" 
                                            id="rememberMe" 
                                            name="remember"
                                            className="checkbox-input" 
                                            checked={loginData.remember}
                                            onChange={handleLoginChange}
                                        />
                                        <label htmlFor="rememberMe" className="checkbox-label">Remember me</label>
                                    </div>
                                    <div className="forgot-link">
                                        <a href="/forgot-password">Forgot Password?</a>
                                    </div>
                                </div>
                                
                                <button type="submit" className="btn-primary stagger-item" disabled={isLoginLoading}>
                                    {isLoginLoading ? (
                                        <span className="btn-loading">
                                            <span className="spinner"></span>
                                            Signing in...
                                        </span>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </form>
                            
                            <p className="form-footer stagger-item">
                                Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchToRegister(); }}>Create one</a>
                            </p>

                            
                        </div>
                        
                        {/* Register Form */}
                        <div className={`form-wrapper register-wrapper ${isActive ? 'active' : ''}`}>
                            <h1 className="form-title stagger-item">
                                <span className="gradient-text">Join Speedly</span>
                            </h1>
                            <p className="form-subtitle stagger-item">Create your account to get started</p>
                            
                            {/* Social Login */}
                            <div className="social-buttons stagger-item">
                                <button type="button" className="btn-social" onClick={() => socialLogin('google')}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Google
                                </button>
                                
                            </div>
                            
                            <div className="divider stagger-item">or sign up with email</div>
                            
                            <form onSubmit={handleRegisterSubmit}>
                                <div className="name-fields stagger-item">
                                    <div className="input-group">
                                        <i className='bx bxs-user input-icon'></i>
                                        <input 
                                            type="text" 
                                            name="fullname"
                                            className="input-field" 
                                            placeholder="Full Name"
                                            autoComplete="name"
                                            value={registerData.fullname}
                                            onChange={handleRegisterChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="input-group">
                                        <i className='bx bxs-user-circle input-icon'></i>
                                        <input 
                                            type="text" 
                                            name="username"
                                            className="input-field" 
                                            placeholder="Username"
                                            autoComplete="username"
                                            value={registerData.username}
                                            onChange={handleRegisterChange}
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="input-group stagger-item">
                                    <i className='bx bxs-envelope input-icon'></i>
                                    <input 
                                        type="email" 
                                        name="email"
                                        className="input-field" 
                                        placeholder="Email Address"
                                        autoComplete="email"
                                        value={registerData.email}
                                        onChange={handleRegisterChange}
                                        style={{ borderColor: emailValid === true ? '#10B981' : emailValid === false ? '#EF4444' : '' }}
                                        required
                                    />
                                </div>
                                
                                <div className="input-group stagger-item">
                                    <i className='bx bxs-phone input-icon'></i>
                                    <input 
                                        type="tel" 
                                        name="phone"
                                        className="input-field" 
                                        placeholder="Phone Number (e.g., 08012345678)"
                                        autoComplete="tel"
                                        value={registerData.phone}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                </div>
                                
                                <div className="input-group stagger-item">
                                    <i className='bx bxs-lock-alt input-icon'></i>
                                    <input 
                                        type="password" 
                                        name="password"
                                        ref={registerPasswordRef}
                                        className="input-field" 
                                        placeholder="Password"
                                        autoComplete="new-password"
                                        value={registerData.password}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                    <button type="button" className="password-toggle" onClick={() => togglePassword(registerPasswordRef)}>
                                        <i className='bx bx-hide'></i>
                                    </button>
                                </div>
                                
                                {/* Password strength indicator */}
                                {registerData.password && (
                                    <div className="password-strength" style={{ marginTop: '-8px', marginBottom: '16px' }}>
                                        <div className="strength-bar" style={{ height: '4px', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div className="strength-fill" style={{ 
                                                height: '100%', 
                                                width: `${(passwordStrength.score / 5) * 100}%`, 
                                                backgroundColor: passwordStrength.color,
                                                transition: 'all 0.3s ease'
                                            }}></div>
                                        </div>
                                        <small style={{ display: 'block', textAlign: 'right', fontSize: '12px', marginTop: '4px', color: passwordStrength.color }}>
                                            Password: {passwordStrength.text}
                                        </small>
                                    </div>
                                )}
                                
                                <div className="input-group stagger-item">
                                    <div className="select-wrapper">
                                        <i className='bx bxs-briefcase input-icon'></i>
                                        <select name="role" className="select-field" value={registerData.role} onChange={handleRegisterChange} required>
                                            <option value="" disabled>Select Your Role</option>
                                            <option value="client">Customer</option>
                                            <option value="driver">Driver</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="checkbox-group stagger-item">
                                    <input 
                                        type="checkbox" 
                                        id="terms" 
                                        name="terms"
                                        className="checkbox-input" 
                                        checked={registerData.terms}
                                        onChange={handleRegisterChange}
                                        required
                                    />
                                    <label htmlFor="terms" className="checkbox-label">
                                        I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                                    </label>
                                </div>
                                
                                <button type="submit" className="btn-primary stagger-item" disabled={isRegisterLoading}>
                                    {isRegisterLoading ? (
                                        <span className="btn-loading">
                                            <span className="spinner"></span>
                                            Creating account...
                                        </span>
                                    ) : (
                                        'Create Account'
                                    )}
                                </button>
                            </form>
                            
                            <p className="form-footer stagger-item">
                                Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchToLogin(); }}>Sign in</a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}