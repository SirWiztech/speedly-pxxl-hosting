import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ActiveRide {
    id: string;
    ride_number: string;
    status: string;
    driver_name?: string;
    client_name?: string;
    user_role: 'client' | 'driver';
}

interface ActiveRideContextType {
    activeRide: ActiveRide | null;
    setActiveRide: (ride: ActiveRide | null) => void;
    refreshActiveRide: () => Promise<void>;
}

const ActiveRideContext = createContext<ActiveRideContextType>({
    activeRide: null,
    setActiveRide: () => {},
    refreshActiveRide: async () => {},
});

export const useActiveRide = () => useContext(ActiveRideContext);

export const ActiveRideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);

    const refreshActiveRide = useCallback(async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            const res = await fetch('/api/active-ride', {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.data) setActiveRide(data.data);
            else setActiveRide(null);
        } catch {}
    }, []);

    useEffect(() => {
        refreshActiveRide();
        const interval = setInterval(refreshActiveRide, 15000);
        return () => clearInterval(interval);
    }, [refreshActiveRide]);

    return (
        <ActiveRideContext.Provider value={{ activeRide, setActiveRide, refreshActiveRide }}>
            {children}
        </ActiveRideContext.Provider>
    );
};
