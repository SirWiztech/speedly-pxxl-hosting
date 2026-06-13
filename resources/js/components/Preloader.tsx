import { useEffect, useState } from 'react';
import '../../css/Preloader.css';

interface PreloaderProps {
    onLoadComplete?: () => void;
}

export default function Preloader({ onLoadComplete }: PreloaderProps) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
            onLoadComplete?.();
        }, 1500);

        return () => clearTimeout(timer);
    }, [onLoadComplete]);

    if (!loading) return null;

    return (
        <div className="page-preloader" id="pagePreloader">
            <div className="preloader-content">
                <div className="preloader-logo">
                    <div className="preloader-orbit">
                        <div className="preloader-path">
                            <div className="preloader-dot"></div>
                        </div>
                    </div>
                    <img src="/main-assets/logo.png" alt="Speedly Logo" />
                </div>
                <p className="preloader-text">LOADING...</p>
            </div>
        </div>
    );
}
