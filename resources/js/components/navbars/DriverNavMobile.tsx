import React from 'react';
import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import '../../../css/NavBar.css';

interface DriverNavMobileProps {
}

const DriverNavMobile: React.FC<DriverNavMobileProps> = () => {
  const { url } = usePage();
  const currentPath = url;

  const isActive = (path: string, alternativePaths: string[] = []) => {
    if (currentPath === path) return true;
    return alternativePaths.some(altPath => currentPath === altPath);
  };

  const navItems = [
    { path: '/driverdashboard', name: 'Home', icon: 'fas fa-home', matchPaths: ['/driverdashboard'] },
    { path: '/driverbookhistory', name: 'Rides', icon: 'fas fa-car', matchPaths: ['/driverbookhistory'] },
    { path: '/driverwallet', name: 'Wallet', icon: 'fas fa-wallet', matchPaths: ['/driverwallet'] },
    { path: '/driverlocation', name: 'Map', icon: 'fas fa-map-marker-alt', matchPaths: ['/driverlocation'] },
    { path: '/driveraiassistant', name: 'AI', icon: 'fas fa-robot', matchPaths: ['/driveraiassistant'] },
    { path: '/driversupport', name: 'Support', icon: 'fas fa-headset', matchPaths: ['/driversupport'] },
    { path: '/driversettings', name: 'Profile', icon: 'fas fa-user', matchPaths: ['/driversettings', '/driver-profile', '/kyc'] },
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

export default DriverNavMobile;