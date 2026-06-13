import { useState, useEffect } from 'react';

export function usePreloader(duration?: number) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, duration || 1500);

        return () => clearTimeout(timer);
    }, [duration]);

    return loading;
}
