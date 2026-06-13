import { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import { usePreloader } from '../hooks/usePreloader';
import '../../css/home.css';
import '../../css/page-transitions.css';

export default function Home({ isLoggedIn = false }) {
    const loading = usePreloader(1500);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileBtnRef = useRef(null);
    const profileDropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileBtnRef.current && profileDropdownRef.current &&
                !profileBtnRef.current.contains(e.target as Node) &&
                !profileDropdownRef.current.contains(e.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Typing effect for Explore section (lightweight)
    useEffect(() => {
        const textToType = "Move Better. Travel Smarter.";
        const typingTarget = document.getElementById("typing-text");
        const section = document.getElementById("explore-section");

        if (!typingTarget || !section) return;

        let index = 0;
        let hasStarted = false;

        const typeEffect = () => {
            if (index < textToType.length) {
                typingTarget.textContent += textToType.charAt(index);
                index++;
                setTimeout(typeEffect, 80);
            }
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !hasStarted) {
                    hasStarted = true;
                    typeEffect();
                }
            });
        }, { threshold: 0.3 });

        observer.observe(section);

        return () => observer.disconnect();
    }, []);

    const link = isLoggedIn ? '/book-ride' : '/form';

    // SIMPLE SCROLL REVEAL - NO LAG, GPU ACCELERATED
    useEffect(() => {
        const handleScrollReveal = () => {
            const elements = document.querySelectorAll('.reveal-on-scroll');
            elements.forEach(el => {
                const rect = el.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const isVisible = rect.top < windowHeight - 80 && rect.bottom > 50;
                
                if (isVisible) {
                    el.classList.add('visible');
                }
            });
        };

        // Initial check
        setTimeout(handleScrollReveal, 100);
        
        // Throttled scroll event for performance
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    handleScrollReveal();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', handleScrollReveal);
        
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', handleScrollReveal);
        };
    }, []);

    // Smooth scroll for anchor links
    useEffect(() => {
        const handleSmoothScroll = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            if (!anchor) return;
            
            const hash = anchor.getAttribute('href');
            if (hash && hash.startsWith('#') && hash !== '#') {
                e.preventDefault();
                const element = document.querySelector(hash);
                if (element) {
                    const offsetTop = element.getBoundingClientRect().top + window.pageYOffset - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    // Update URL without jumping
                    history.pushState(null, '', hash);
                }
            }
        };
        
        document.addEventListener('click', handleSmoothScroll);
        return () => document.removeEventListener('click', handleSmoothScroll);
    }, []);

    // Close mobile menu on resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen]);

    if (loading) {
        return <DesktopPreloader />;
    }

    return (
        <div className="home-page">
            {/* Background Orbs */}
            <div className="bg-effects">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
            </div>

            {/* Navigation */}
            <nav className="navbar">
                <Link href="/home" className="nav-logo">
                    <img src="/main-assets/logo-no-background.png" alt="Speedly Logo" />
                    <span className="logo-text">SPEEDLY</span>
                </Link>

                <div className="nav-links">
                    <Link href="/home" className="nav-link active">
                        <i className='bx bxs-home-circle'></i> Home
                    </Link>
                    <a href="#services" className="nav-link">
                        <i className='bx bxs-car'></i> Services
                    </a>
                    <a href="#about" className="nav-link">
                        <i className='bx bxs-info-circle'></i> About
                    </a>
                    <a href="#features" className="nav-link">
                        <i className='bx bxs-zap'></i> Features
                    </a>
                    <a href="#download" className="nav-link">
                        <i className='bx bxs-download'></i> Download
                    </a>
                    <a href="#contact" className="nav-link">
                        <i className='bx bxs-envelope'></i> Contact
                    </a>
                </div>

                <div className="nav-actions">
                    {isLoggedIn ? (
                        <div className="nav-profile">
                            <button
                                className="profile-btn"
                                ref={profileBtnRef}
                                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                            >
                                Account
                            </button>
                            <div
                                className={`profile-dropdown ${profileDropdownOpen ? 'active' : ''}`}
                                ref={profileDropdownRef}
                            >
                                <a href="/profile" className="dropdown-item"><i className='bx bx-user'></i> Profile</a>
                                <a href="/dashboard" className="dropdown-item"><i className='bx bx-dashboard'></i> Dashboard</a>
                                <hr className="dropdown-divider" />
                                <a href="/logout" className="dropdown-item text-red"><i className='bx bx-log-out'></i> Logout</a>
                            </div>
                        </div>
                    ) : (
                        <Link href="/login" className="auth-btn">
                            <i className='bx bx-user'></i>
                            Register / Login
                        </Link>
                    )}
                </div>

                <button 
                    className="mobile-menu-btn" 
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Open menu"
                >
                    <i className='bx bx-menu'></i>
                </button>
            </nav>

            {/* Mobile Menu - Fixed for no overflow */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
                <div className="mobile-menu-header">
                    <Link href="/home" className="nav-logo">
                        <img src="/main-assets/logo-no-background.png" alt="Speedly Logo" />
                        <span className="logo-text">SPEEDLY</span>
                    </Link>
                    <button 
                        className="mobile-menu-close" 
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Close menu"
                    >
                        <i className='bx bx-x'></i>
                    </button>
                </div>

                <div className="mobile-menu-links">
                    <a href="/home" className="mobile-menu-link active" onClick={() => setMobileMenuOpen(false)}>
                        <i className='bx bxs-home-circle'></i> Home
                    </a>
                    <a href="#services" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <i className='bx bxs-car'></i> Services
                    </a>
                    <a href="#about" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <i className='bx bxs-info-circle'></i> About
                    </a>
                    <a href="#features" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <i className='bx bxs-zap'></i> Features
                    </a>
                    <a href="#download" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <i className='bx bxs-download'></i> Download
                    </a>
                    <a href="#contact" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                        <i className='bx bxs-envelope'></i> Contact
                    </a>
                </div>

                <div className="mobile-menu-buttons">
                    {isLoggedIn ? (
                        <a href="/logout" className="btn-mobile btn-mobile-outline">Sign Out</a>
                    ) : (
                        <Link href="/login" className="auth-btn" style={{width: '100%', justifyContent: 'center'}}>
                            <i className='bx bx-user'></i>
                            Register / Login
                        </Link>
                    )}
                </div>
            </div>

            <main className="home-main">
                {/* Hero Section */}
                <section className="hero reverse visible" id="hero">
                    <div className="hero-bg">
                        <video autoPlay muted loop playsInline preload="none">
                            <source src="/main-assets/5233_New_York_NYC_1920x1080.mp4" type="video/mp4" />
                        </video>
                        <div className="hero-overlay"></div>
                    </div>
                    <div className="hero-content">
                        <div className="hero-badge">
                            <span className="pulse-dot"></span>
                            <span>New: Speedly Pro is here</span>
                        </div>
                        <h1 className="hero-title">
                            We accelerate the<br />
                            <span className="gradient-text">city's movement</span>
                        </h1>
                        <p className="hero-description">
                            At Speedly, we focus on routes where efficiency, reliability, and speed unlock seamless travel and drive urban connection.
                        </p>
                        <div className="hero-buttons">
                            <a href={link} className="btn-hero btn-hero-primary">
                                Book a Ride <i className='bx bx-right-arrow-alt'></i>
                            </a>
                            <a href="#services" className="btn-hero btn-hero-secondary">
                                <i className='bx bx-play-circle'></i> How it Works
                            </a>
                        </div>
                    </div>
                </section>

                {/* Services Section */}
                <section className="section" id="services">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">What We Offer</span>
                            <h2 className="section-title">Our Services</h2>
                            <p className="section-description text-white">Premium ride solutions for every journey</p>
                        </div>

                        <div className="services-grid">
                            <div className="service-card" style={{ backgroundImage: 'url(/main-assets/book-ride-1.jpg)' }}>
                                <div className="service-overlay"></div>
                                <div className="service-content">
                                    <h3 className="service-title">Premium Airport Transfers</h3>
                                    <a href={link} className="btn-service">Book Ride</a>
                                </div>
                            </div>

                            <div className="service-card" style={{ backgroundImage: 'url(/main-assets/book-ride-2.jpg)' }}>
                                <div className="service-overlay"></div>
                                <div className="service-content">
                                    <h3 className="service-title">City-to-City Travel</h3>
                                    <a href={link} className="btn-service">Book Ride</a>
                                </div>
                            </div>

                            <div className="service-card" style={{ backgroundImage: 'url(/main-assets/book-ride-3.jpg)' }}>
                                <div className="service-overlay"></div>
                                <div className="service-content">
                                    <h3 className="service-title">Corporate Chauffeur</h3>
                                    <a href={link} className="btn-service">Book Ride</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Explore Banner */}
                <section className="explore-banner" id="explore-section">
                    <div className="explore-bg" style={{ backgroundImage: 'url(/main-assets/explore.jpg)' }}></div>
                    <div className="explore-overlay"></div>
                    <div className="explore-content">
                        <h2 className="explore-text">
                            <span id="typing-text"></span><span className="typewriter-cursor"></span>
                        </h2>
                    </div>
                </section>

                {/* About Section */}
                <section className="section about-section" id="about">
                    <div className="section-container">
                        <div className="about-grid">
                            <div className="about-brand">
                                <h2 className="brand-large">SPEED<span className="accent">:</span>LY</h2>
                                <p className="brand-tagline">Urban Mobility Redefined</p>
                            </div>

                            <div className="about-content">
                                <p className="about-lead">
                                    Speedly is the <span className="highlight">premier mobility super-app.</span> We build cities for people, not traffic.
                                </p>
                                <p className="about-text">
                                    From instant ride-hailing and shared fleets to scooters and lightning-fast delivery—we provide a better alternative to the private car for every journey.
                                </p>
                                <a href="#features" className="btn-about">Learn More <i className='bx bx-right-arrow-alt'></i></a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="section features-section" id="features">
                    <div className="section-container">
                        <div className="section-header">
                            <span className="section-badge">Why Choose Us</span>
                            <h2 className="section-title">Our Features</h2>
                            <p className="section-description">Experience the Speedly difference</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-image">
                                <img src="/main-assets/driver.png" alt="Premium Interior" loading="lazy" />
                            </div>
                            <div className="feature-content">
                                <span className="feature-badge">Book at Comfort</span>
                                <h3 className="feature-title">Your living room, <span className="gradient-text">on wheels.</span></h3>
                                <p className="feature-text">
                                    Why wait on the curb? Request a premium Speedly ride from the comfort of your sofa and watch your driver arrive in real-time.
                                </p>
                                <a href={link} className="btn-feature btn-feature-primary">Book Now <i className='bx bx-right-arrow-alt'></i></a>
                            </div>
                        </div>

                        <div className="feature-card reverse">
                            <div className="feature-image">
                                <img src="/main-assets/travel.jpg" alt="Safe Travel" loading="lazy" />
                            </div>
                            <div className="feature-content">
                                <span className="feature-badge">Safe Travel</span>
                                <h3 className="feature-title">Travel with <span className="gradient-text">Total Peace of Mind.</span></h3>
                                <p className="feature-text">
                                    Every Speedly captain is vetted and tracked. Share your live trip status with loved ones with a single tap.
                                </p>
                                <a href={link} className="btn-feature btn-feature-dark">Secure Your Ride <i className='bx bx-right-arrow-alt'></i></a>
                            </div>
                        </div>

                        <div className="feature-card">
                            <div className="feature-image">
                                <img src="/main-assets/office.jpg" alt="Drive with Speedly" loading="lazy" />
                            </div>
                            <div className="feature-content">
                                <span className="feature-badge">Drive with Speedly</span>
                                <h3 className="feature-title">Your car, <span className="gradient-text">your office.</span></h3>
                                <p className="feature-text">
                                    Turn your miles into money. With Speedly, you're in the driver's seat of your own business—choose your own hours and earn competitive weekly payouts.
                                </p>
                                <a href="#" className="btn-feature btn-feature-primary">Start Earning <i className='bx bx-right-arrow-alt'></i></a>
                            </div>
                        </div>

                        <div className="feature-card reverse">
                            <div className="feature-image">
                                <img src="https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=800" alt="24/7 Support" loading="lazy" />
                            </div>
                            <div className="feature-content">
                                <span className="feature-badge badge-red">24/7 Support</span>
                                <h3 className="feature-title">Journey didn't go <span className="gradient-text">as planned?</span></h3>
                                <p className="feature-text">
                                    Your safety and satisfaction are our top priorities. If you encountered an issue during your Speedly ride, let us know immediately.
                                </p>
                                <a href="#" className="btn-feature btn-feature-dark">File a Complaint <i className='bx bx-error'></i></a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="section cta-section " id="download">
                    <div className="cta-card">
                        <div className="cta-glow glow-1"></div>
                        <div className="cta-glow glow-2"></div>

                        <div className="cta-content">
                            <span className="cta-badge">Available on iOS & Android</span>
                            <h2 className="cta-title">Ready to move?</h2>
                            <p className="cta-description">Join over 1 million users moving smarter every day. Book rides, track deliveries, and manage your journey all in one place.</p>

                            <div className="cta-buttons">
                                <a href="#" className="btn-cta-store">
                                    <svg width="28" height="28" viewBox="0 0 384 512" fill="currentColor">
                                        <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                                    </svg>
                                    <div className="store-text">
                                        <span className="store-label">Download for</span>
                                        <span className="store-name">iOS</span>
                                    </div>
                                </a>
                                <a href="#" className="btn-cta-store">
                                    <svg width="28" height="28" viewBox="0 0 512 512" fill="currentColor">
                                        <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.7c24.5-14.2 24.5-37.1-1.2-51.2zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/>
                                    </svg>
                                    <div className="store-text">
                                        <span className="store-label">Download for</span>
                                        <span className="store-name">Android</span>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="footer" id="contact">
                <div className="footer-container">
                    <div>
                        <div className="footer-brand" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <img src="/main-assets/logo-no-background.png" alt="Speedly" width="50" style={{ borderRadius: '50%' }} />
                            <span className="logo-text">SPEEDLY</span>
                        </div>
                        <p style={{ maxWidth: '260px', marginTop: '16px' }}>
                            Join our newsletter for regular updates on new features and city launches.
                        </p>
                        <form className="footer-form" action="#" method="POST" onSubmit={(e) => e.preventDefault()}>
                            <input type="email" placeholder="Enter your email" required />
                            <button type="submit" className="btn-subscribe">Subscribe</button>
                        </form>
                    </div>
                    <div style={{ display: 'flex', gap: '48px', flexWrap: 'wrap' }}>
                        <div>
                            <h4 className="footer-heading">Services</h4>
                            <a className="footer-link">Ride Hailing</a>
                            <a className="footer-link">Food Delivery</a>
                            <a className="footer-link">Courier Services</a>
                            <a className="footer-link">Business Accounts</a>
                        </div>

                        <div>
                            <h4 className="footer-heading">Support</h4>
                            <a className="footer-link">Help Center</a>
                            <a className="footer-link">Safety</a>
                            <a className="footer-link">Log a Complaint</a>
                            <a className="footer-link">City Coverage</a>
                        </div>

                        <div>
                            <h4 className="footer-heading">Company</h4>
                            <a className="footer-link">About Us</a>
                            <a className="footer-link">
                                Careers <span className="badge-hiring">HIRING</span>
                            </a>
                            <a className="footer-link">Privacy Policy</a>
                            <a className="footer-link">Terms of Service</a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <div className="copyright">© 2026 Speedly Mobility Solutions</div>
                    <div className="social-links">
                        <a className="social-link"><i className='bx bxl-twitter'></i></a>
                        <a className="social-link"><i className='bx bxl-linkedin'></i></a>
                        <a className="social-link"><i className='bx bxl-instagram'></i></a>
                    </div>
                </div>
            </footer>
        </div>
    );
}