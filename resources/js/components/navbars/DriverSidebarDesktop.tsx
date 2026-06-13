import React from 'react';
import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import '../../../css/NavBar.css';

interface DriverSidebarDesktopProps {
  userName: string;
  userRole?: string;
  profilePictureUrl?: string | null;
}

const DriverSidebarDesktop: React.FC<DriverSidebarDesktopProps> = ({
  userName = 'User',
  userRole = 'driver',
  profilePictureUrl = null,
}) => {
  const { url } = usePage();
  const currentPath = url;

  const isActive = (path: string) => {
    return currentPath === path;
  };

  const navItems = [
    { path: '/driverdashboard', name: 'Dashboard', icon: 'fas fa-home' },
    { path: '/driverbookhistory', name: 'Book History', icon: 'fas fa-history' },
    { path: '/driverwallet', name: 'Wallet', icon: 'fas fa-wallet' },
    { path: '/driverlocation', name: 'Locations', icon: 'fas fa-map-marker-alt' },
    { path: '/driveraiassistant', name: 'AI Assistant', icon: 'fas fa-robot' },
    { path: '/driverkyc', name: 'KYC', icon: 'fas fa-id-card' },
    { path: '/driversupport', name: 'Support', icon: 'fas fa-headset' },
    { path: '/driversettings', name: 'Settings', icon: 'fas fa-cog' },
  ];

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="desktop-sidebar">
      <div className="logo">
        <img 
          src="/main-assets/logo-no-background.png" 
          alt="Speedly Logo" 
          className="logo-image"
        />
      </div>

      <div className="desktop-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`desktop-nav-item ${isActive(item.path) ? 'active' : ''}`}
          >
            <i className={`${item.icon} desktop-nav-icon`}></i>
            <span>{item.name}</span>
          </Link>
        ))}
      </div>

      <Link href="/driverprofile" className="user-profile">
        <div className="profile-avatar">
          {profilePictureUrl ? (
            <img 
              src={profilePictureUrl} 
              alt={userName} 
            />
          ) : (
            getInitial(userName)
          )}
        </div>
        <div className="profile-info">
          <h3>{userName}</h3>
          <p>{userRole === 'driver' ? 'Driver Member' : 'Client Member'}</p>
        </div>
      </Link>
    </div>
  );
};

export default DriverSidebarDesktop;