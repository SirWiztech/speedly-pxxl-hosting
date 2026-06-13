import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ClientRideHistoryMobile from '../components/mobileViewComponent/ClientRideHistoryMobile';
import '../../css/ClientRideHistory.css';

// Types
interface RideStats {
    total_rides: number;
    total_spent: number;
    avg_rating_given: number;
    completed_rides: number;
    upcoming_rides: number;
}

interface Ride {
    id: string;
    ride_number: string;
    status: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    created_at: string;
    formatted_date: string;
    formatted_time: string;
    driver_name: string | null;
    driver_photo: string | null;
    driver_phone: string | null;
    vehicle_model: string;
    vehicle_color: string;
    plate_number: string;
    ride_type: string;
    distance_km: number;
    user_rating: number | null;
    user_review: string | null;
    can_rate: boolean;
    payment_status: string;
    can_release_funds: boolean;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

const ClientRideHistory: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('client');
    const [stats, setStats] = useState<RideStats>({
        total_rides: 0,
        total_spent: 0,
        avg_rating_given: 0,
        completed_rides: 0,
        upcoming_rides: 0
    });
    const [rides, setRides] = useState<Ride[]>([]);
    const [lastRide, setLastRide] = useState<Ride | null>(null);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedRating, setSelectedRating] = useState<number>(0);

    const isMobile = useMobile();
    const preloaderLoading = usePreloader(1000);

    // Fetch ride history data
    const fetchRideHistory = useCallback(async () => {
        try {
            const [historyData, profileData] = await Promise.all([
                api.client.rideHistory(),
                api.client.profile()
            ]);

            if (historyData.success && historyData.data) {
                const d = historyData.data;
                setStats(d.stats || { total_rides: 0, total_spent: 0, avg_rating_given: 0, completed_rides: 0, upcoming_rides: 0 });
                setRides(d.rides || []);
                setLastRide(d.last_ride || null);
                setUserData(d.user || null);
            }
            if (profileData.success && profileData.data) {
                const user = profileData.data;
                setUserData(user);
                setUserRole(user?.role || 'client');
            }
        } catch (error) {
            console.error('Error fetching ride history:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // View ride details
    const viewRideDetails = async (rideId: string) => {
        if (!rideId) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Ride',
                text: 'No ride ID provided',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        Swal.fire({
            title: 'Loading ride details...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const data = await api.rides.getById(rideId);

            Swal.close();

            const rideData = data.ride || data.data?.ride || data.data;
            if ((data.success && data.ride) || data.data) {
                displayRideDetails(rideData);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to load ride details',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error: any) {
            Swal.close();
            console.error('Error fetching ride details:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.message || 'Failed to load ride details',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Display ride details in modal
    const displayRideDetails = (ride: any) => {
        const statusColors: Record<string, string> = {
            'completed': '#4CAF50',
            'pending': '#FF9800',
            'accepted': '#2196F3',
            'driver_assigned': '#2196F3',
            'driver_arrived': '#9C27B0',
            'ongoing': '#FF5722',
            'awaiting_release': '#FF9800',
            'cancelled_by_client': '#F44336',
            'cancelled_by_driver': '#F44336',
            'cancelled_by_admin': '#F44336'
        };

        const statusIcons: Record<string, string> = {
            'completed': 'fa-check-circle',
            'pending': 'fa-clock',
            'accepted': 'fa-check',
            'driver_assigned': 'fa-user-check',
            'driver_arrived': 'fa-map-pin',
            'ongoing': 'fa-spinner',
            'awaiting_release': 'fa-hand-holding-usd',
            'cancelled_by_client': 'fa-times-circle',
            'cancelled_by_driver': 'fa-times-circle',
            'cancelled_by_admin': 'fa-times-circle'
        };

        const status = ride.status || 'pending';
        const statusDisplay = ride.status_display || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
        const rideNumber = ride.ride_number || 'N/A';
        const pickupAddress = ride.pickup_address || 'N/A';
        const destinationAddress = ride.destination_address || 'N/A';
        const formattedDate = ride.formatted_date || new Date(ride.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = ride.formatted_time || new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const distance = ride.distance_km ? Number(ride.distance_km).toFixed(1) + ' km' : 'N/A';
        const fare = Number(ride.total_fare || 0).toLocaleString();
        const rideType = ride.ride_type ? ride.ride_type.charAt(0).toUpperCase() + ride.ride_type.slice(1) : 'Economy';
        const driverName = ride.driver_name || null;
        const driverPhone = ride.driver_phone || null;
        const vehicleDisplay = ride.vehicle_display || 'Vehicle not specified';
        const canRate = (ride.status === 'awaiting_release' || ride.status === 'completed') && !ride.user_rating;
        const canRelease = ride.status === 'awaiting_release';

        let html = `
            <div style="text-align: left; max-height: 70vh; overflow-y: auto; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span style="background: ${statusColors[status] || '#999'}; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        <i class="fas ${statusIcons[status] || 'fa-info-circle'}"></i> ${statusDisplay}
                    </span>
                    <span style="color: #666; font-size: 13px;">#${rideNumber}</span>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                    <p style="margin-bottom: 10px;"><i class="fas fa-circle" style="color: #ff5e00; font-size: 10px; margin-right: 8px;"></i> <strong>Pickup:</strong> ${pickupAddress}</p>
                    <p><i class="fas fa-map-marker-alt" style="color: #ff5e00; margin-right: 8px;"></i> <strong>Destination:</strong> ${destinationAddress}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 15px;">
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 10px;">
                        <p style="color: #666; font-size: 11px; margin-bottom: 4px;">Date & Time</p>
                        <p style="font-weight: 600; font-size: 13px;">${formattedDate} • ${formattedTime}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 10px;">
                        <p style="color: #666; font-size: 11px; margin-bottom: 4px;">Distance</p>
                        <p style="font-weight: 600; font-size: 13px;">${distance}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 10px;">
                        <p style="color: #666; font-size: 11px; margin-bottom: 4px;">Ride Type</p>
                        <p style="font-weight: 600; font-size: 13px; text-transform: capitalize;">${rideType}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 12px; border-radius: 10px;">
                        <p style="color: #666; font-size: 11px; margin-bottom: 4px;">Total Fare</p>
                        <p style="font-weight: 700; font-size: 16px; color: #ff5e00; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${fare}</p>
                    </div>
                </div>
        `;

        if (canRelease) {
            html += `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 12px; margin-bottom: 15px; text-align: center;">
                    <p style="margin-bottom: 10px; font-size: 14px; color: #2E7D32;">
                        <i class="fas fa-info-circle"></i> Ride completed. Release payment to the driver.
                    </p>
                    <button onclick="window.releaseFundsFromModal('${ride.id}')" 
                        style="padding: 12px 24px; background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        <i class="fas fa-money-bill-wave"></i> Release Funds (₦${fare})
                    </button>
                </div>
            `;
        }

        if (driverName) {
            html += `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 12px; margin-bottom: 15px;">
                    <h4 style="margin-bottom: 12px; color: #2E7D32;">Driver Information</h4>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 55px; height: 55px; background: linear-gradient(135deg, #ff5e00 0%, #ff8c3a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 22px;">
                            ${driverName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p style="font-weight: 600; margin-bottom: 5px; font-size: 16px;">${driverName}</p>
                            <p style="color: #666; font-size: 13px; margin-bottom: 3px;">${vehicleDisplay}</p>
                            ${driverPhone ? `<p style="color: #666; font-size: 13px;"><i class="fas fa-phone" style="margin-right: 5px;"></i> ${driverPhone}</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        if (canRate) {
            html += `
                <div style="background: #fff3e0; padding: 15px; border-radius: 12px;">
                    <h4 style="margin-bottom: 12px; color: #E65100;">Rate Your Driver</h4>
                    <div style="font-size: 32px; text-align: center; color: #FFC107; margin-bottom: 12px;" id="ratingStars">
                        <i class="far fa-star" data-rating="1" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="2" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="3" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="4" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="5" style="cursor: pointer;"></i>
                    </div>
                    <textarea id="reviewText" placeholder="Share your experience (optional)" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; font-family: inherit; resize: vertical;" rows="3"></textarea>
                    <button onclick="window.submitRatingFromModal('${ride.id}')" style="width: 100%; padding: 12px; background: #ff5e00; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-star"></i> Submit Rating
                    </button>
                </div>
            `;
        } else if (ride.user_rating) {
            html += `
                <div style="background: #e8f5e9; padding: 15px; border-radius: 12px;">
                    <p><i class="fas fa-star" style="color: #FFC107;"></i> <strong>Your Rating:</strong> ${ride.user_rating}/5</p>
                    ${ride.user_review ? `<p style="margin-top: 8px;"><i class="fas fa-comment"></i> <strong>Review:</strong> ${ride.user_review}</p>` : ''}
                </div>
            `;
        }

        html += `</div>`;

        Swal.fire({
            title: 'Ride Details',
            html: html,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Close',
            width: '550px',
            didOpen: () => {
                if (canRate) {
                    let selectedRatingValue = 0;
                    const stars = document.querySelectorAll('#ratingStars i');

                    const highlightStars = (rating: number) => {
                        stars.forEach((star, index) => {
                            if (index < rating) {
                                star.className = 'fas fa-star';
                                star.style.color = '#FFC107';
                            } else {
                                star.className = 'far fa-star';
                                star.style.color = '#FFC107';
                            }
                        });
                    };

                    stars.forEach((star, index) => {
                        star.addEventListener('mouseenter', () => {
                            const rating = parseInt(star.getAttribute('data-rating') || '0');
                            highlightStars(rating);
                        });

                        star.addEventListener('mouseleave', () => {
                            highlightStars(selectedRatingValue);
                        });

                        star.addEventListener('click', () => {
                            selectedRatingValue = parseInt(star.getAttribute('data-rating') || '0');
                            highlightStars(selectedRatingValue);
                            setSelectedRating(selectedRatingValue);
                        });
                    });
                }
            }
        });
    };

    // Submit rating
    const submitRating = async (rideId: string, rating: number, review: string) => {
        if (rating === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Rating Required',
                text: 'Please select a rating before submitting',
                confirmButtonColor: '#ff5e00'
            });
            return false;
        }

        Swal.fire({
            title: 'Submitting rating...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const data = await api.rides.rateDriver(rideId, { rating, comment: review });

            Swal.close();

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Thank You!',
                    text: 'Your rating has been submitted successfully',
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    fetchRideHistory();
                });
                return true;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to submit rating',
                    confirmButtonColor: '#ff5e00'
                });
                return false;
            }
        } catch (error) {
            Swal.close();
            console.error('Error submitting rating:', error);
            Swal.fire({
                icon: 'success',
                title: 'Thank You!',
                text: 'Your rating has been submitted',
                confirmButtonColor: '#ff5e00'
            }).then(() => {
                fetchRideHistory();
            });
            return false;
        }
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifications = data.data?.data || data.data?.notifications || [];

            if (notifications.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifications.forEach((notif: Notification) => {
                    html += `
                        <div style="padding: 12px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title}</strong></p>
                            <p style="font-size: 13px;">${notif.message}</p>
                            <p style="font-size: 11px; color: #999; margin-top: 5px;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    icon: 'info',
                    title: `Notifications (${notifications.length})`,
                    html: html,
                    confirmButtonColor: '#ff5e00',
                    confirmButtonText: 'Close'
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Notifications',
                    text: 'No new notifications',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'info',
                title: 'Notifications',
                text: 'Unable to load notifications',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Global functions for modal
    useEffect(() => {
        (window as any).submitRatingFromModal = (rideId: string) => {
            const rating = selectedRating;
            const review = (document.getElementById('reviewText') as HTMLTextAreaElement)?.value || '';
            submitRating(rideId, rating, review);
        };

        (window as any).releaseFundsFromModal = async (rideId: string) => {
            Swal.fire({
                title: 'Releasing funds...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
            });

            try {
                const data = await api.rides.releaseFunds(rideId);
                Swal.close();
                if (data.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Funds Released!',
                        text: 'Payment has been released to the driver.',
                        confirmButtonColor: '#ff5e00',
                    }).then(() => fetchRideHistory());
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed',
                        text: data.message || 'Failed to release funds',
                        confirmButtonColor: '#ff5e00',
                    });
                }
            } catch (error: any) {
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error?.message || 'Failed to release funds',
                    confirmButtonColor: '#ff5e00',
                });
            }
        };

        return () => {
            delete (window as any).submitRatingFromModal;
            delete (window as any).releaseFundsFromModal;
        };
    }, [selectedRating]);

    // Initial data fetch
    useEffect(() => {
        fetchRideHistory();
    }, [fetchRideHistory]);

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            'completed': '#4CAF50',
            'pending': '#FF9800',
            'accepted': '#2196F3',
            'driver_assigned': '#2196F3',
            'driver_arrived': '#9C27B0',
            'ongoing': '#FF5722',
            'awaiting_release': '#FF9800',
            'cancelled_by_client': '#F44336',
            'cancelled_by_driver': '#F44336',
            'cancelled_by_admin': '#F44336'
        };
        return colors[status] || '#9E9E9E';
    };

    const getStatusDisplay = (status: string): string => {
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    };

    const getRideIcon = (rideType: string): string => {
        return rideType === 'comfort' ? 'fa-car-side' : 'fa-car';
    };

    const getRideIconColor = (rideType: string): string => {
        return rideType === 'comfort' ? '#9C27B0' : '#2196F3';
    };

    const getRideIconBg = (rideType: string): string => {
        return rideType === 'comfort' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(33, 150, 243, 0.1)';
    };

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view on mobile devices
    if (isMobile) {
        return <ClientRideHistoryMobile />;
    }

    return (
        <div className="ride-history-desktop-container">
            <ClientSidebarDesktop 
                userName={userData?.fullname || userData?.full_name || 'User'} 
                profilePictureUrl={userData?.profile_picture_url}
            />

            <div className="ride-history-desktop-main">
                {/* Header */}
                <div className="ride-history-desktop-header">
                    <div className="ride-history-desktop-title">
                        <h1>Ride History</h1>
                        <p>Track all your past and upcoming rides</p>
                    </div>
                    <div className="ride-history-desktop-actions">
                        <button className="ride-history-notification-btn" onClick={checkNotifications}>
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && <span className="notification-badge font-roboto-number">{notificationCount}</span>}
                        </button>
                        <button className="ride-history-book-btn" onClick={() => router.visit('/clientbookride')}>
                            <i className="fas fa-car"></i> Book Ride
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="ride-history-stats-grid">
                    {/* Main Stats Card */}
                    <div className="ride-history-stats-card main-stats">
                        <div className="stats-card-header">
                            <h2>{userRole === 'client' ? 'Total Rides' : 'Total Trips'}</h2>
                            {stats.completed_rides > 10 && (
                                <div className="reward-badge">
                                    <i className="fas fa-gift"></i>
                                    <span>Reward Available</span>
                                </div>
                            )}
                        </div>
                        <div className="stats-main-value font-roboto-number">{stats.total_rides}</div>
                        <div className="stats-rating">
                            <i className="fas fa-star" style={{ color: '#FFC107' }}></i>
                            <span>Average Rating: <span className="font-roboto-number">{stats.avg_rating_given.toFixed(1)}</span></span>
                        </div>
                    </div>

                    {/* Last Ride Card */}
                    <div className="ride-history-stats-card last-ride-card">
                        <div className="stats-card-header">
                            <h2>Last Ride</h2>
                            {lastRide && (
                                <button className="view-details-btn" onClick={() => viewRideDetails(lastRide.id)}>Details</button>
                            )}
                        </div>
                        <div className="last-ride-content">
                            {lastRide ? (
                                <>
                                    <div className="last-ride-location">
                                        {lastRide.pickup_address?.substring(0, 30)}...
                                    </div>
                                    <div className="last-ride-date">
                                        {lastRide.formatted_date} • {lastRide.formatted_time}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="last-ride-location">No rides yet</div>
                                    <div className="last-ride-date">Book your first ride</div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Ride Statistics Card */}
                    <div className="ride-history-stats-card ride-stats-card">
                        <h2>Ride Statistics</h2>
                        <div className="ride-stats-items">
                            <div className="ride-stat-item">
                                <div className="ride-stat-value font-roboto-number">{stats.total_rides}</div>
                                <div className="ride-stat-label">Total Rides</div>
                            </div>
                            <div className="ride-stat-item">
                                <div className="ride-stat-value font-roboto-number">{stats.completed_rides}</div>
                                <div className="ride-stat-label">Completed</div>
                            </div>
                            <div className="ride-stat-item">
                                <div className="ride-stat-value font-roboto-number">{stats.upcoming_rides}</div>
                                <div className="ride-stat-label">Upcoming</div>
                            </div>
                            <div className="ride-stat-item">
                                <div className="ride-stat-value font-roboto-number">{formatCurrency(stats.total_spent)}</div>
                                <div className="ride-stat-label">{userRole === 'client' ? 'Total Spent' : 'Total Earned'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Rides Table */}
                <div className="ride-history-recent-section">
                    <div className="recent-header">
                        <h2>Recent Rides</h2>
                        <button className="view-all-btn" onClick={() => window.location.href = '#all'}>View All</button>
                    </div>
                    <div className="recent-rides-table-container">
                        <table className="recent-rides-table">
                            <thead>
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Pickup</th>
                                    <th>Destination</th>
                                    <th>Driver</th>
                                    <th>Fare</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rides.length > 0 ? (
                                    rides.slice(0, 10).map((ride) => (
                                        <tr key={ride.id} className="ride-row" onClick={() => viewRideDetails(ride.id)}>
                                            <td className="ride-date-cell">
                                                <div className="ride-date">{ride.formatted_date}</div>
                                                <div className="ride-time">{ride.formatted_time}</div>
                                            </td>
                                            <td className="ride-location-cell">{ride.pickup_address?.substring(0, 35)}...</td>
                                            <td className="ride-location-cell">{ride.destination_address?.substring(0, 35)}...</td>
                                            <td>{ride.driver_name || '—'}</td>
                                            <td className="ride-fare font-roboto-number">{formatCurrency(ride.total_fare)}</td>
                                            <td>
                                                <span className="ride-status-badge" style={{ background: getStatusColor(ride.status) }}>
                                                    {getStatusDisplay(ride.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="view-ride-btn" onClick={(e) => { e.stopPropagation(); viewRideDetails(ride.id); }}>
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="no-rides-cell">
                                            <i className="fas fa-history"></i>
                                            <p>No rides yet</p>
                                            <button className="book-first-ride-btn" onClick={() => router.visit('/clientbookride')}>
                                                Book Your First Ride
                                            </button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Book Ride Banner */}
                <div className="ride-history-banner">
                    <div className="banner-info">
                        <h2>{userRole === 'client' ? 'Need another ride?' : 'Ready for more trips?'}</h2>
                        <p>Book a ride instantly and enjoy our premium service with safety measures and comfortable vehicles.</p>
                        <div className="banner-stats">
                            <div className="banner-stat">
                                <div className="banner-stat-value font-roboto-number">{stats.total_rides}</div>
                                <div className="banner-stat-label">{userRole === 'client' ? 'Rides Taken' : 'Trips Done'}</div>
                            </div>
                            <div className="banner-stat">
                                <div className="banner-stat-value font-roboto-number">{stats.avg_rating_given.toFixed(1)}</div>
                                <div className="banner-stat-label">Avg. Rating</div>
                            </div>
                            <div className="banner-stat">
                                <div className="banner-stat-value font-roboto-number">{formatCurrency(stats.total_spent)}</div>
                                <div className="banner-stat-label">{userRole === 'client' ? 'Spent' : 'Earned'}</div>
                            </div>
                        </div>
                    </div>
                    <button className="banner-book-btn" onClick={() => router.visit('/clientbookride')}>
                        <i className="fas fa-car"></i>
                        <span>Book a Ride Now</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ClientRideHistory;