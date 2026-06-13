import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import '../../../css/home.css';

export default function HomeMobileView() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="home-page">
            <div className="hero-section" style={{ gridTemplateColumns: '1fr', padding: '40px 20px' }}>
                <div className="hero-content">
                    <div className="hero-badge">Premium Ride Experience</div>
                    <h1 className="hero-title" style={{ fontSize: '36px' }}>
                        Redefining <span className="gradient-text">Urban Mobility</span>
                    </h1>
                    <p className="hero-description" style={{ fontSize: '16px' }}>
                        Fast, safe, and affordable rides at your fingertips.
                    </p>
                    <div className="hero-buttons" style={{ flexDirection: 'column' }}>
                        <Link href="/register" className="btn-hero btn-hero-primary" style={{ textAlign: 'center' }}>
                            Get Started
                        </Link>
                        <Link href="/login" className="btn-hero btn-hero-secondary" style={{ textAlign: 'center' }}>
                            Sign In
                        </Link>
                    </div>
                    <div className="hero-stats" style={{ flexWrap: 'wrap', gap: '24px' }}>
                        <div className="stat-item">
                            <span className="stat-number">50K+</span>
                            <span className="stat-label">Active Users</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">4.8</span>
                            <span className="stat-label">App Rating</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-number">1M+</span>
                            <span className="stat-label">Rides</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="features-section" style={{ padding: '40px 20px' }}>
                <h2 className="section-title" style={{ fontSize: '28px' }}>Why Choose Speedly</h2>
                <div className="features-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="feature-card">
                        <div className="feature-icon">⚡</div>
                        <h3>Book Instantly</h3>
                        <p>Get a ride in minutes with just a few taps.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">📍</div>
                        <h3>Track Live</h3>
                        <p>Real-time driver tracking for peace of mind.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">🛡️</div>
                        <h3>Safe & Secure</h3>
                        <p>Verified drivers and secure payments.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
