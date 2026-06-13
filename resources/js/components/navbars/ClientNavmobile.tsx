import React from 'react';
import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import '../../../css/NavBar.css';

interface ClientNavMobileProps {}

const ClientNavMobile: React.FC<ClientNavMobileProps> = () => {
  const { url } = usePage();
  const currentPath = url;

  const isActive = (path: string, matchPaths?: string[]): boolean => {
    if (currentPath === path) return true;
    if (matchPaths && matchPaths.some(p => currentPath === p)) return true;
    // For nested routes like /settings/*, check if path is a prefix
    if (path !== '/client-dashboard' && currentPath.startsWith(path)) {
      return true;
    }
    return false;
  };

  const navItems = [
    { path: '/clientdashboard', name: 'Home', icon: 'fas fa-home', matchPaths: ['/client-dashboard'] },
    { path: '/clientbookride', name: 'Rides', icon: 'fas fa-car', matchPaths: ['/client-book-ride'] },
    { path: '/clientwallet', name: 'Wallet', icon: 'fas fa-wallet', matchPaths: ['/client-wallet'] },
    { path: '/clientlocation', name: 'Map', icon: 'fas fa-map-marker-alt', matchPaths: ['/client-location'] },
    { path: '/clientaiassistant', name: 'AI', icon: 'fas fa-robot', matchPaths: ['/client-ai-assistant'] },
    { path: '/clientsupport', name: 'Support', icon: 'fas fa-headset', matchPaths: ['/client-support'] },
    { path: '/clientsettings', name: 'Profile', icon: 'fas fa-user', matchPaths: ['/client-profile', '/settings'] },
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`nav-item ${isActive(item.path, item.matchPaths) ? 'active' : ''}`}
        >
          <div className="nav-icon-wrapper">
            <i className={item.icon}></i>
          </div>
          <span>{item.name}</span>
        </Link>
      ))}
    </div>
  );
};

export default ClientNavMobile;