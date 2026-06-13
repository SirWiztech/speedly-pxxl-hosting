import React from 'react';
import { Link } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import '../../../css/NavBar.css';

interface ClientSidebarDesktopProps {
  userName: string;
  userRole?: string;
  profilePictureUrl?: string | null;
}

const ClientSidebarDesktop: React.FC<ClientSidebarDesktopProps> = ({
  userName = 'User',
  userRole = 'client',
  profilePictureUrl = null,
}) => {
  const { url } = usePage();
  const currentPath = url;

  const isActive = (path: string): boolean => {
    // Exact match for dashboard
    if (path === '/client-dashboard' && currentPath === '/client-dashboard') {
      return true;
    }
    // For other routes, check if currentPath starts with the path
    if (path !== '/client-dashboard' && currentPath.startsWith(path)) {
      return true;
    }
    return false;
  };

  const navItems = [
    { path: '/clientdashboard', name: 'Dashboard', icon: 'fas fa-home' },
    { path: '/clientbookride', name: 'Book Ride', icon: 'fas fa-car' },
    { path: '/clientridehistory', name: 'Ride History', icon: 'fas fa-history' },
    { path: '/clientwallet', name: 'Wallet', icon: 'fas fa-wallet' },
    { path: '/clientlocation', name: 'Locations', icon: 'fas fa-map-marker-alt' },
    { path: '/clientaiassistant', name: 'AI Assistant', icon: 'fas fa-robot' },
    { path: '/clientsupport', name: 'ClientSupport', icon: 'fas fa-headset' },
    { path: '/clientsettings', name: 'Settings', icon: 'fas fa-cog' },
  ];

  const getInitial = (name: string): string => {
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

      <Link href="/client-profile" className="user-profile">
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
          <h3>{userName.length > 20 ? userName.substring(0, 20) + '...' : userName}</h3>
          <p>{userRole === 'driver' ? 'Driver Member' : 'Client Member'}</p>
        </div>
      </Link>
    </div>
  );
};

export default ClientSidebarDesktop;