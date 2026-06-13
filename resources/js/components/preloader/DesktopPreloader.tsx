import { useState, useEffect } from 'react';

interface PreloaderProps {
    id?: string;
    onLoad?: () => void;
}

export default function DesktopPreloader({ id = 'pagePreloader', onLoad }: PreloaderProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Progress counter animation (0 to 100 in 1500ms)
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + 7; // Smooth increment
            });
        }, 100);

        // Hide preloader after loading completes
        const timer = setTimeout(() => {
            const preloader = document.getElementById(id);
            if (preloader) {
                preloader.classList.add('hidden');
                if (onLoad) onLoad();
            }
        }, 1500);

        return () => {
            clearInterval(progressInterval);
            clearTimeout(timer);
        };
    }, [id, onLoad]);

    // Inline styles to prevent FOUC
    const styles = {
        wrapper: {
            position: 'fixed' as const,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#FF4500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            overflow: 'hidden',
            transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.6s ease',
        },
        orangeBg: {
            position: 'absolute' as const,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #FF4500 0%, #FF5000 25%, #FF6B00 50%, #FF8C00 75%, #FF4500 100%)',
            backgroundSize: '200% 200%',
            animation: 'gradientShift 4s ease infinite',
        },
        gradientOverlay: {
            position: 'absolute' as const,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.15) 0%, rgba(255, 80, 0, 0) 70%)',
            animation: 'overlayPulse 3s ease-in-out infinite',
        },
        geometricPattern: {
            position: 'absolute' as const,
            width: '100%',
            height: '100%',
            backgroundImage: `
                repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 2px, transparent 2px, transparent 8px),
                repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0px, rgba(255, 255, 255, 0.05) 2px, transparent 2px, transparent 12px)
            `,
            animation: 'patternShift 20s linear infinite',
            pointerEvents: 'none' as const,
        },
        mainContainer: {
            position: 'relative' as const,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            animation: 'containerFadeIn 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        animationContainer: {
            position: 'relative' as const,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
        },
        logo3dContainer: {
            position: 'relative' as const,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
        },
        logoGlowEffect: {
            position: 'absolute' as const,
            width: '100%',
            height: '100%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3), rgba(255, 215, 0, 0.1))',
            borderRadius: '50%',
            animation: 'logoGlowPulse 2s ease-in-out infinite',
        },
        logoInnerShadow: {
            position: 'absolute' as const,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            boxShadow: 'inset 0 0 30px rgba(255, 255, 255, 0.3)',
            animation: 'shadowRotate 4s linear infinite',
        },
        logoMain: {
            objectFit: 'contain' as const,
            borderRadius: '50%',
            background: 'white',
            animation: 'logoFloat 3s ease-in-out infinite',
            position: 'relative' as const,
            zIndex: 2,
            filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.2))',
        },
        logoReflection: {
            position: 'absolute' as const,
            bottom: '-25px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90px',
            height: '25px',
            background: 'radial-gradient(ellipse, rgba(255, 255, 255, 0.3), transparent)',
            borderRadius: '50%',
            filter: 'blur(6px)',
            animation: 'reflectionPulse 2s ease-in-out infinite',
        },
        textSection: {
            textAlign: 'center' as const,
            marginTop: '20px',
        },
        brandNameContainer: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '20px',
        },
        brandLetter: {
            fontFamily: "'Syne', sans-serif",
            fontSize: '2.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #FFFFFF, #FFFFFF, #FFFFFF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'letterBounce 1s ease-in-out infinite',
            display: 'inline-block',
        },
        loadingStatus: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '30px',
        },
        loadingLabel: {
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.9)',
            letterSpacing: '1px',
        },
        loadingDots: {
            display: 'flex',
            gap: '4px',
        },
        dot: {
            width: '6px',
            height: '6px',
            background: '#FFFFFF',
            borderRadius: '50%',
            animation: 'dotBounce 1.4s ease-in-out infinite',
        },
        progressContainer: {
            margin: '0 auto 20px',
        },
        progressBarBg: {
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative' as const,
            marginBottom: '12px',
        },
        progressBarFill: {
            height: '100%',
            background: 'linear-gradient(90deg, #FFFFFF, #FFFFFF, #FFFFFF)',
            borderRadius: '10px',
            position: 'relative' as const,
            transition: 'width 0.1s linear',
            width: `${progress}%`,
        },
        progressGlow: {
            position: 'absolute' as const,
            top: 0,
            right: 0,
            width: '30px',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
            animation: 'shimmer 1.5s infinite',
        },
        progressPercentage: {
            textAlign: 'center' as const,
            fontFamily: "'Outfit', sans-serif",
        },
        percentageNumber: {
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#FFFFFF',
            animation: 'percentagePulse 1s ease-in-out infinite',
        },
        percentageSymbol: {
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginLeft: '2px',
        },
        loadingMessage: {
            marginTop: '20px',
        },
        messageText: {
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.9)',
            letterSpacing: '0.5px',
            animation: 'messageFade 0.5s ease',
        },
        bottomAccent: {
            position: 'absolute' as const,
            bottom: 0,
            left: 0,
            right: 0,
            height: '3px',
        },
        accentLine: {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, #FFFFFF, #FFFFFF, #FFFFFF, #FFFFFF, transparent)',
            animation: 'accentMove 2s linear infinite',
            backgroundSize: '200% 100%',
        },
    };

    // Inject keyframes into document head (only once)
    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.textContent = `
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes overlayPulse {
                0%, 100% { opacity: 0.5; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }
            @keyframes patternShift {
                0% { background-position: 0 0; }
                100% { background-position: 100px 100px; }
            }
            @keyframes containerFadeIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes pulseRingOrange {
                0% { transform: scale(0.8); opacity: 1; border-width: 3px; border-color: rgba(255, 255, 255, 0.6); }
                100% { transform: scale(1.3); opacity: 0; border-width: 0.5px; border-color: rgba(255, 255, 255, 0); }
            }
            @keyframes orbitRotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes dotGlowOrange {
                0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; box-shadow: 0 0 20px rgba(255, 255, 255, 0.8); }
                50% { transform: translateX(-50%) scale(1.8); opacity: 0.7; box-shadow: 0 0 40px rgba(255, 255, 255, 1); }
            }
            @keyframes logoGlowPulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.2); opacity: 1; }
            }
            @keyframes shadowRotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes logoFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-12px); }
            }
            @keyframes reflectionPulse {
                0%, 100% { opacity: 0.4; transform: translateX(-50%) scale(1); }
                50% { opacity: 0.8; transform: translateX(-50%) scale(1.15); }
            }
            @keyframes letterBounce {
                0%, 100% { transform: translateY(0); opacity: 0.7; }
                50% { transform: translateY(-15px); opacity: 1; }
            }
            @keyframes dotBounce {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                30% { transform: translateY(-8px); opacity: 1; }
            }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
            }
            @keyframes percentagePulse {
                0%, 100% { opacity: 1; text-shadow: 0 0 0px rgba(255, 255, 255, 0); }
                50% { opacity: 0.8; text-shadow: 0 0 15px rgba(255, 255, 255, 0.5); }
            }
            @keyframes messageFade {
                from { opacity: 0; transform: translateY(5px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes accentMove {
                0% { background-position: 100% 0; }
                100% { background-position: -100% 0; }
            }
            
            /* Pulse Rings */
            .pulse-ring {
                position: absolute;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.4);
                animation: pulseRingOrange 2.5s ease-out infinite;
            }
            .ring-1 { width: 280px; height: 280px; animation-delay: 0s; }
            .ring-2 { width: 320px; height: 320px; animation-delay: 0.6s; }
            .ring-3 { width: 360px; height: 360px; animation-delay: 1.2s; }
            .ring-4 { width: 400px; height: 400px; animation-delay: 1.8s; }
            
            /* Orbits */
            .orbital-system {
                position: absolute;
                width: 280px;
                height: 280px;
            }
            .orbit {
                position: absolute;
                top: 50%;
                left: 50%;
                border-radius: 50%;
                border: 1px solid rgba(255, 255, 255, 0.3);
                animation: orbitRotate linear infinite;
            }
            .orbit-primary {
                width: 200px;
                height: 200px;
                margin-left: -100px;
                margin-top: -100px;
                animation-duration: 6s;
                border-color: rgba(255, 255, 255, 0.5);
            }
            .orbit-secondary {
                width: 240px;
                height: 240px;
                margin-left: -120px;
                margin-top: -120px;
                animation-duration: 8s;
                animation-direction: reverse;
                border-color: rgba(255, 255, 255, 0.4);
            }
            .orbit-tertiary {
                width: 280px;
                height: 280px;
                margin-left: -140px;
                margin-top: -140px;
                animation-duration: 10s;
                border-color: rgba(255, 255, 255, 0.3);
            }
            .orbit-quaternary {
                width: 320px;
                height: 320px;
                margin-left: -160px;
                margin-top: -160px;
                animation-duration: 12s;
                animation-direction: reverse;
                border-color: rgba(255, 255, 255, 0.2);
            }
            .orbit-dot {
                position: absolute;
                width: 12px;
                height: 12px;
                background: radial-gradient(circle, #FFFFFF, #FFD700);
                border-radius: 50%;
                top: -6px;
                left: 50%;
                transform: translateX(-50%);
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
                animation: dotGlowOrange 1.5s ease-in-out infinite;
            }
            .primary-dot { width: 10px; height: 10px; top: -5px; }
            .secondary-dot { width: 8px; height: 8px; top: -4px; animation-delay: 0.5s; }
            .tertiary-dot { width: 6px; height: 6px; top: -3px; animation-delay: 1s; }
            .quaternary-dot { width: 5px; height: 5px; top: -2.5px; animation-delay: 1.5s; }
            .orbit-trail {
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.08), transparent);
            }
            
            /* Particles */
            .preloader-particles {
                position: absolute;
                width: 100%;
                height: 100%;
            }
            .particle {
                position: absolute;
                width: 6px;
                height: 6px;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.8), rgba(255, 215, 0, 0.4));
                border-radius: 50%;
                opacity: 0;
                animation: floatParticle 4s ease-in-out infinite;
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            }
            @keyframes floatParticle {
                0% { transform: translateY(0) scale(1); opacity: 0; }
                20% { opacity: 0.8; }
                50% { transform: translateY(-40px) scale(1.5); opacity: 0.5; }
                80% { opacity: 0.8; }
                100% { transform: translateY(0) scale(1); opacity: 0; }
            }
            .particle-1 { top: 15%; left: 25%; animation-delay: 0s; animation-duration: 3.5s; }
            .particle-2 { top: 55%; left: 75%; animation-delay: 0.5s; animation-duration: 4s; }
            .particle-3 { top: 35%; left: 15%; animation-delay: 1s; animation-duration: 3.8s; }
            .particle-4 { top: 75%; left: 55%; animation-delay: 0.3s; animation-duration: 4.2s; }
            .particle-5 { top: 25%; left: 85%; animation-delay: 0.8s; animation-duration: 3.6s; }
            .particle-6 { top: 65%; left: 35%; animation-delay: 1.2s; animation-duration: 4.1s; }
            .particle-7 { top: 45%; left: 10%; animation-delay: 0.2s; animation-duration: 3.9s; }
            .particle-8 { top: 20%; left: 60%; animation-delay: 0.7s; animation-duration: 4.3s; }
            .particle-9 { top: 80%; left: 20%; animation-delay: 1.5s; animation-duration: 3.7s; }
            .particle-10 { top: 10%; left: 50%; animation-delay: 0.4s; animation-duration: 4s; }
            .particle-11 { top: 60%; left: 80%; animation-delay: 0.9s; animation-duration: 3.5s; }
            .particle-12 { top: 40%; left: 40%; animation-delay: 1.1s; animation-duration: 4.2s; }
            .particle-13 { top: 85%; left: 65%; animation-delay: 0.6s; animation-duration: 3.8s; }
            .particle-14 { top: 30%; left: 70%; animation-delay: 1.3s; animation-duration: 4.1s; }
            .particle-15 { top: 70%; left: 45%; animation-delay: 0.1s; animation-duration: 3.9s; }
            
            /* Hidden state */
            .desktop-preloader-wrapper.hidden {
                opacity: 0;
                visibility: hidden;
            }
            
            /* Loading dots children */
            .loading-dots span:nth-child(1) { animation-delay: 0s; }
            .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
            .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
            
            /* Brand letters delay */
            .brand-letter:nth-child(1) { animation-delay: 0s; }
            .brand-letter:nth-child(2) { animation-delay: 0.08s; }
            .brand-letter:nth-child(3) { animation-delay: 0.16s; }
            .brand-letter:nth-child(4) { animation-delay: 0.24s; }
            .brand-letter:nth-child(5) { animation-delay: 0.32s; }
            .brand-letter:nth-child(6) { animation-delay: 0.4s; }
            .brand-letter:nth-child(7) { animation-delay: 0.48s; }
            
            /* Base sizes for responsive elements */
            .preloader-animation-container {
                width: 320px;
                height: 320px;
            }
            .preloader-logo-3d-container {
                width: 130px;
                height: 130px;
            }
            .preloader-logo-main {
                width: 100px;
                height: 100px;
                padding: 10px;
            }
            .progress-container {
                width: 280px;
            }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
                .brand-letter { font-size: 1.8rem !important; }
                .preloader-animation-container { width: 240px; height: 240px; }
                .preloader-logo-3d-container { width: 110px; height: 110px; }
                .preloader-logo-main { width: 80px; height: 80px; padding: 8px; }
                .progress-container { width: 240px; }
                .orbital-system { width: 210px; height: 210px; }
                .ring-1 { width: 200px; height: 200px; }
                .ring-2 { width: 230px; height: 230px; }
                .ring-3 { width: 260px; height: 260px; }
                .ring-4 { width: 290px; height: 290px; }
                .orbit-primary { width: 150px; height: 150px; margin-left: -75px; margin-top: -75px; }
                .orbit-secondary { width: 180px; height: 180px; margin-left: -90px; margin-top: -90px; }
                .orbit-tertiary { width: 210px; height: 210px; margin-left: -105px; margin-top: -105px; }
                .orbit-quaternary { width: 240px; height: 240px; margin-left: -120px; margin-top: -120px; }
                .orbit-dot { width: 8px; height: 8px; top: -4px; }
                .primary-dot { width: 7px; height: 7px; top: -3.5px; }
                .secondary-dot { width: 6px; height: 6px; top: -3px; }
                .tertiary-dot { width: 5px; height: 5px; top: -2.5px; }
                .quaternary-dot { width: 4px; height: 4px; top: -2px; }
            }
            @media (max-width: 480px) {
                .brand-letter { font-size: 1.5rem !important; gap: 6px; }
                .preloader-animation-container { width: 200px; height: 200px; }
                .preloader-logo-3d-container { width: 90px; height: 90px; }
                .preloader-logo-main { width: 70px; height: 70px; padding: 8px; }
                .progress-container { width: 200px; }
                .orbital-system { width: 180px; height: 180px; }
                .ring-1 { width: 180px; height: 180px; }
                .ring-2 { width: 200px; height: 200px; }
                .ring-3 { width: 220px; height: 220px; }
                .ring-4 { width: 240px; height: 240px; }
                .orbit-primary { width: 130px; height: 130px; margin-left: -65px; margin-top: -65px; }
                .orbit-secondary { width: 155px; height: 155px; margin-left: -77.5px; margin-top: -77.5px; }
                .orbit-tertiary { width: 180px; height: 180px; margin-left: -90px; margin-top: -90px; }
                .orbit-quaternary { width: 200px; height: 200px; margin-left: -100px; margin-top: -100px; }
                .orbit-dot { width: 6px; height: 6px; top: -3px; }
                .primary-dot { width: 5px; height: 5px; top: -2.5px; }
                .secondary-dot { width: 4px; height: 4px; top: -2px; }
                .tertiary-dot { width: 3px; height: 3px; top: -1.5px; }
                .quaternary-dot { width: 2px; height: 2px; top: -1px; }
            }
        `;
        document.head.appendChild(styleSheet);
        
        return () => {
            document.head.removeChild(styleSheet);
        };
    }, []);

    return (
        <div className="desktop-preloader-wrapper" id={id} style={styles.wrapper}>
            {/* Orangered Background */}
            <div style={styles.orangeBg}></div>

            {/* Dynamic Gradient Overlay */}
            <div style={styles.gradientOverlay}></div>

            {/* Animated Geometric Pattern */}
            <div style={styles.geometricPattern}></div>

            {/* Floating Particles - White/Gold */}
            <div className="preloader-particles">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className={`particle particle-${i + 1}`}></div>
                ))}
            </div>

            {/* Main Content Container */}
            <div style={styles.mainContainer}>
                {/* Logo & Animations Container */}
                <div className="preloader-animation-container" style={styles.animationContainer}>
                    {/* Outer Pulse Rings - White/Gold */}
                    <div className="pulse-ring ring-1"></div>
                    <div className="pulse-ring ring-2"></div>
                    <div className="pulse-ring ring-3"></div>
                    <div className="pulse-ring ring-4"></div>
                    
                    {/* Orbital Rings */}
                    <div className="orbital-system">
                        <div className="orbit orbit-primary">
                            <div className="orbit-dot primary-dot"></div>
                            <div className="orbit-trail"></div>
                        </div>
                        <div className="orbit orbit-secondary">
                            <div className="orbit-dot secondary-dot"></div>
                            <div className="orbit-trail"></div>
                        </div>
                        <div className="orbit orbit-tertiary">
                            <div className="orbit-dot tertiary-dot"></div>
                            <div className="orbit-trail"></div>
                        </div>
                        <div className="orbit orbit-quaternary">
                            <div className="orbit-dot quaternary-dot"></div>
                            <div className="orbit-trail"></div>
                        </div>
                    </div>

                    {/* Logo with 3D Effect */}
                    <div className="preloader-logo-3d-container" style={styles.logo3dContainer}>
                        <div style={styles.logoGlowEffect}></div>
                        <div style={styles.logoInnerShadow}></div>
                        <img 
                            src="/main-assets/logo-no-background.png" 
                            alt="Speedly" 
                            className="preloader-logo-main"
                            style={styles.logoMain}
                        />
                        <div style={styles.logoReflection}></div>
                    </div>
                </div>

                {/* Loading Text Section */}
                <div style={styles.textSection}>
                    <div style={styles.brandNameContainer}>
                        {['S', 'P', 'E', 'E', 'D', 'L', 'Y'].map((letter, index) => (
                            <span 
                                key={index} 
                                className="brand-letter"
                                style={styles.brandLetter}
                            >
                                {letter}
                            </span>
                        ))}
                    </div>
                    
                    <div style={styles.loadingStatus}>
                        <span style={styles.loadingLabel}>Initializing Experience</span>
                        <div className="loading-dots" style={styles.loadingDots}>
                            <span style={styles.dot}></span>
                            <span style={styles.dot}></span>
                            <span style={styles.dot}></span>
                        </div>
                    </div>

                    {/* Modern Progress Bar */}
                    <div className="progress-container" style={styles.progressContainer}>
                        <div style={styles.progressBarBg}>
                            <div style={styles.progressBarFill}>
                                <div style={styles.progressGlow}></div>
                            </div>
                        </div>
                        <div style={styles.progressPercentage}>
                            <span style={styles.percentageNumber}>{progress}</span>
                            <span style={styles.percentageSymbol}>%</span>
                        </div>
                    </div>

                    {/* Loading Message */}
                    <div style={styles.loadingMessage}>
                        <p style={styles.messageText}>
                            {progress < 30 && "🚀 Launching Speedly..."}
                            {progress >= 30 && progress < 60 && "✨ Preparing your ride..."}
                            {progress >= 60 && progress < 90 && "🎯 Almost there..."}
                            {progress >= 90 && "🎉 Welcome to Speedly!"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Accent Line */}
            <div style={styles.bottomAccent}>
                <div style={styles.accentLine}></div>
            </div>
        </div>
    );
}