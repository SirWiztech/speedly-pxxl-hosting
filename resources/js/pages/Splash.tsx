import { useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import '@/../css/Splash.css';

export default function Splash() {
    const typewriterTextRef = useRef(null);
    const cursorRef = useRef(null);
    const loadingDotsRef = useRef(null);

    useEffect(() => {
        const textElement = typewriterTextRef.current;
        const cursorElement = cursorRef.current;
        const loadingDots = loadingDotsRef.current;
        const fullText = "Speedly";
        const subText = "your Everyday Ride Partner";
        let charIndex = 0;
        let subCharIndex = 0;
        let phase = 'typing-brand';
        let isNavigating = false;

        const typeSpeed = 80;
        const pauseBetween = 1200;
        const pauseBeforeRedirect = 1500;

        function typeEffect() {
            if (isNavigating) return;

            if (phase === 'typing-brand') {
                const currentText = fullText.substring(0, charIndex);
                textElement.innerHTML = currentText;

                if (charIndex < fullText.length) {
                    charIndex++;
                    setTimeout(typeEffect, typeSpeed);
                } else {
                    textElement.innerHTML = `<span class="gradient-text">${fullText}</span>`;
                    phase = 'typing-tagline';
                    cursorElement.classList.add('typing');
                    setTimeout(typeEffect, pauseBetween);
                }
            } else if (phase === 'typing-tagline') {
                const typedBrand = `<span class="gradient-text">${fullText}</span>`;
                const currentSub = subText.substring(0, subCharIndex);
                textElement.innerHTML = `${typedBrand}, ${currentSub}`;

                if (subCharIndex < subText.length) {
                    subCharIndex++;
                    setTimeout(typeEffect, typeSpeed * 0.9);
                } else {
                    phase = 'complete';
                    cursorElement.classList.remove('typing');
                    cursorElement.classList.add('complete');
                    loadingDots.classList.add('complete');
                    setTimeout(() => {
                        isNavigating = true;
                        router.visit('/home');
                    }, pauseBeforeRedirect);
                }
            }
        }

        const timer = setTimeout(typeEffect, 800);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title="Speedly | Fast & Affordable Ride Booking Platform" />
            
           
            <div className="bg-effects">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            <div className="splash-container">
                <div className="brand-panel">
                    <div className="brand-content">
                        <div className="logo-wrapper">
                            <div className="comet-orbit">
                                <div className="comet-path">
                                    <div className="comet-dot"></div>
                                </div>
                            </div>
                            <div className="logo-ring"></div>
                            <img src="/main-assets/logo.png" alt="Speedly Logo" className="logo-img" />
                        </div>
                        <h1 className="brand-title">SPEEDLY</h1>
                        <p className="brand-tagline">Your Everyday Ride Partner</p>
                    </div>
                </div>

                <div className="content-panel">
                    <div className="typewriter-container">
                        <div className="typewriter-prefix">Welcome to</div>
                        <h2 
                            className="typewriter-text" 
                            ref={typewriterTextRef}
                        ></h2>
                        <span 
                            className="typewriter-cursor" 
                            ref={cursorRef}
                        ></span>
                    </div>

                    <p className="typewriter-subtext">Fast, safe, and affordable rides at your fingertips.</p>

                    <div 
                        className="loading-dots" 
                        ref={loadingDotsRef}
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </>
    );
}
