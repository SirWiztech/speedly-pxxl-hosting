import React, { useEffect } from 'react';

interface DesktopCSSLoaderProps {
    children: React.ReactNode;
}

const DesktopCSSLoader: React.FC<DesktopCSSLoaderProps> = ({ children }) => {
    useEffect(() => {
        // Dynamically import desktop CSS only when needed
        import('../../css/ClientDashboard.css');
    }, []);

    return <>{children}</>;
};

export default DesktopCSSLoader;