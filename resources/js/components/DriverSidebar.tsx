import { Link } from '@inertiajs/react';
import { Home, History, Wallet, MapPin, Settings } from 'lucide-react';

const navItems = [
    { icon: Home, label: 'Dashboard', path: '/driver/dashboard' },
    { icon: History, label: 'Ride History', path: '/driver/ride-history' },
    { icon: Wallet, label: 'Wallet', path: '/driver/wallet' },
    { icon: MapPin, label: 'Location', path: '/driver/location' },
    { icon: Settings, label: 'Settings', path: '/driver/settings' },
];

interface DriverSidebarProps {
    userName?: string;
}

export default function DriverSidebar({ userName = 'Driver' }: DriverSidebarProps) {
    return (
        <div className="driver-sidebar">
            <div className="sidebar-header">
                <img src="/main-assets/logo.png" alt="Speedly" className="logo-image" />
                <h2>Speedly</h2>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <div className="nav-section-title">Main</div>
                    {navItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <Link key={item.path} href={item.path} className="sidebar-nav-item">
                                <IconComponent className="sidebar-icon" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            <div className="user-profile">
                <div className="profile-avatar">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <div className="profile-info">
                    <h3>{userName}</h3>
                    <p>Driver Member</p>
                </div>
            </div>
        </div>
    );
}
