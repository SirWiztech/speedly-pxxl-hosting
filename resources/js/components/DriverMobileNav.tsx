import { Link, usePage } from '@inertiajs/react';
import { Home, History, Wallet, MapPin, Settings, LucideIcon } from 'lucide-react';

interface NavItemProps {
    icon: LucideIcon;
    label: string;
    path: string;
}

function NavItem({ icon: IconComponent, label, path }: NavItemProps) {
    const { url } = usePage();
    const isActive = url.includes(path);

    return (
        <Link href={path} className={`nav-item ${isActive ? 'active' : ''}`}>
            <div className="nav-icon-wrapper">
                <IconComponent className="nav-icon" />
            </div>
            <span>{label}</span>
        </Link>
    );
}

export default function DriverMobileNav() {
    return (
        <div className="bottom-nav">
            <NavItem icon={Home} label="Home" path="/driver/dashboard" />
            <NavItem icon={History} label="History" path="/driver/ride-history" />
            <NavItem icon={Wallet} label="Wallet" path="/driver/wallet" />
            <NavItem icon={MapPin} label="Map" path="/driver/location" />
            <NavItem icon={Settings} label="Profile" path="/driver/settings" />
        </div>
    );
}
