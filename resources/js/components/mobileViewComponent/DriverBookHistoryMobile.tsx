import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import DriverNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/DriverBookHistoryMobile.css';

// Types
interface RideStats {
    total_rides: number;
    completed_rides: number;
    cancelled_rides: number;
    declined_count: number;
    total_fare_amount: number;
    total_earnings: number;
    total_commission: number;
    avg_fare: number;
}

interface Ride {
    id: string;
    ride_number: string;
    status: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    driver_payout: number;
    platform_commission: number;
    created_at: string;
    formatted_date: string;
    formatted_time: string;
    client_name: string;
    client_photo: string | null;
    was_declined: boolean;
    declined_at: string | null;
}

interface DeclinedRide {
    id: string;
    ride_number: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    created_at: string;
    formatted_date: string;
    formatted_time: string;
    client_name: string;
    client_photo: string | null;
    declined_at: string;
    auto_decline: boolean;
    response_time_seconds: number;
}

const DriverBookHistoryMobile: React.FC = () => {
    const [userData, setUserData] = useState<any>(null);
    const [stats, setStats] = useState<RideStats>({
        total_rides: 0,
        completed_rides: 0,
        cancelled_rides: 0,
        declined_count: 0,
        total_fare_amount: 0,
        total_earnings: 0,
        total_commission: 0,
        avg_fare: 0
    });
    const [acceptedRides, setAcceptedRides] = useState<Ride[]>([]);
    const [declinedRides, setDeclinedRides] = useState<DeclinedRide[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeTab, setActiveTab] = useState<'accepted' | 'declined'>('accepted');

    const fetchBookHistory = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.driver.rideHistory();
            if (response.success && response.data) {
                const d = response.data;
                if (d.user) setUserData(d.user);
                if (d.stats) setStats(d.stats);
                if (d.accepted_rides) setAcceptedRides(d.accepted_rides);
                if (d.declined_rides) setDeclinedRides(d.declined_rides);
                if (d.notification_count !== undefined) setNotificationCount(d.notification_count);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const viewRideDetails = (rideId: string) => {
        router.visit(`/generatereceipt?rideId=${rideId}`);
    };

    const checkNotifications = async () => {
        try {
            const response = await api.notifications.list();
            const payload = response.data || response;
            const notifs = payload.data || [];
            const count = notifs.length;
            if (count === 0) {
                Swal.fire({
                    title: 'Notifications',
                    text: 'No new notifications',
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            } else {
                const list = (notifs?.data || notifs).slice(0, 5).map((n: any) => n.message || n.title || 'Notification').join('\n• ');
                Swal.fire({
                    title: `Notifications (${count})`,
                    html: `• ${list}`,
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Notifications',
                text: 'Unable to load notifications',
                icon: 'error',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const firstName = userData?.fullname?.split(' ')[0] || userData?.full_name?.split(' ')[0] || 'Driver';

    useEffect(() => {
        fetchBookHistory();
    }, [fetchBookHistory]);


    return (
        <div className="mobile-book-history-root">
            <div className="mobile-book-history-container">
                <div className="mobile-book-history-view">
                    {/* Header */}
                    <div className="mobile-book-history-header">
                        <div className="header-left">
                            <h1>Book History</h1>
                            <p>Welcome, {firstName}</p>
                        </div>
                        <button className="notification-btn" onClick={checkNotifications}>
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && <span className="notif-badge font-roboto-number">{notificationCount}</span>}
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="stats-row">
                        <div className="stat-item">
                            <span className="stat-label">Completed</span>
                            <span className="stat-value green font-roboto-number">{stats.completed_rides}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Cancelled</span>
                            <span className="stat-value red font-roboto-number">{stats.cancelled_rides}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Declined</span>
                            <span className="stat-value gray font-roboto-number">{stats.declined_count}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">You Earned</span>
                            <span className="stat-value orange font-roboto-number">{formatCurrency(stats.total_earnings)}</span>
                        </div>
                    </div>

                    {/* Commission Card */}
                    <div className="commission-card">
                        <div className="commission-item">
                            <span className="commission-label">Total Fares</span>
                            <span className="commission-value font-roboto-number">{formatCurrency(stats.total_fare_amount)}</span>
                        </div>
                        <div className="commission-divider"></div>
                        <div className="commission-item">
                            <span className="commission-label">Platform Commission (20%)</span>
                            <span className="commission-value orange font-roboto-number">-{formatCurrency(stats.total_commission)}</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="tabs-container">
                        <button 
                            className={`tab-btn ${activeTab === 'accepted' ? 'active' : ''}`}
                            onClick={() => setActiveTab('accepted')}
                        >
                            Accepted (<span className="font-roboto-number">{acceptedRides.length}</span>)
                        </button>
                        <button 
                            className={`tab-btn ${activeTab === 'declined' ? 'active' : ''}`}
                            onClick={() => setActiveTab('declined')}
                        >
                            Declined (<span className="font-roboto-number">{declinedRides.length}</span>)
                        </button>
                    </div>

                    {/* Accepted Rides */}
                    {activeTab === 'accepted' && (
                        <div className="rides-list">
                            {acceptedRides.length > 0 ? (
                                acceptedRides.map((ride) => (
                                    <div key={ride.id} className="ride-card" onClick={() => viewRideDetails(ride.id)}>
                                        <div className="card-header">
                                            <div className="date-time">
                                                <span className="date">{ride.formatted_date}</span>
                                                <span className="time">{ride.formatted_time}</span>
                                            </div>
                                            <span className={`status-badge ${ride.status}`}>
                                                {ride.status === 'completed' && <><i className="fas fa-check-circle"></i> Completed</>}
                                                {ride.status === 'pending' && <><i className="fas fa-clock"></i> Pending</>}
                                                {ride.status === 'accepted' && <><i className="fas fa-check"></i> Accepted</>}
                                            </span>
                                        </div>
                                        <div className="card-locations">
                                            <div className="pickup">
                                                <i className="fas fa-circle"></i>
                                                <span>{ride.pickup_address?.substring(0, 30)}</span>
                                            </div>
                                            <div className="destination">
                                                <i className="fas fa-flag-checkered"></i>
                                                <span>{ride.destination_address?.substring(0, 30)}</span>
                                            </div>
                                        </div>
                                        <div className="card-footer">
                                            <div className="client-info">
                                                <div className="client-avatar">
                                                    {ride.client_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className="client-name">{ride.client_name}</span>
                                            </div>
                                            <div className="fare-info">
                                                <span className="fare font-roboto-number">Fare: {formatCurrency(ride.total_fare)}</span>
                                                <span className="earnings green font-roboto-number">+{formatCurrency(ride.driver_payout)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <i className="fas fa-history"></i>
                                    <p>No accepted rides yet</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Declined Rides */}
                    {activeTab === 'declined' && (
                        <div className="rides-list">
                            {declinedRides.length > 0 ? (
                                declinedRides.map((ride) => (
                                    <div key={ride.id} className="ride-card declined" onClick={() => viewRideDetails(ride.id)}>
                                        <div className="card-header">
                                            <div className="date-time">
                                                <span className="date">{ride.formatted_date}</span>
                                                <span className="time">{ride.formatted_time}</span>
                                            </div>
                                            <span className="declined-badge">
                                                {ride.auto_decline ? 'Auto-declined' : 'Declined'}
                                            </span>
                                        </div>
                                        <div className="card-locations">
                                            <div className="pickup">
                                                <i className="fas fa-circle"></i>
                                                <span>{ride.pickup_address?.substring(0, 30)}</span>
                                            </div>
                                            <div className="destination">
                                                <i className="fas fa-flag-checkered"></i>
                                                <span>{ride.destination_address?.substring(0, 30)}</span>
                                            </div>
                                        </div>
                                        <div className="card-footer">
                                            <div className="client-info">
                                                <div className="client-avatar declined">
                                                    {ride.client_name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <span className="client-name">{ride.client_name}</span>
                                            </div>
                                            <div className="fare-info">
                                                <span className="fare font-roboto-number">Fare: {formatCurrency(ride.total_fare)}</span>
                                                <span className="earnings gray">Declined</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">
                                    <i className="fas fa-times-circle"></i>
                                    <p>No declined rides</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bottom Navigation */}
                    <DriverNavMobile />
                </div>
            </div>
        </div>
    );
};

export default DriverBookHistoryMobile;