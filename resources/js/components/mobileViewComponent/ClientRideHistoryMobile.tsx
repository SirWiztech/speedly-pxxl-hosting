import React, { useState, useEffect, useCallback } from 'react';
import { router } from '@inertiajs/react';
import ClientNavMobile from '../../components/navbars/ClientNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/ClientRideHistoryMobile.css';

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
    vehicle_model: string;
    ride_type: string;
    distance_km: number;
    user_rating: number | null;
    user_review: string | null;
    can_rate: boolean;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

const ClientRideHistoryMobile: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [stats, setStats] = useState<RideStats>({
        total_rides: 0,
        total_spent: 0,
        avg_rating_given: 0,
        completed_rides: 0,
        upcoming_rides: 0
    });
    const [rides, setRides] = useState<Ride[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedRating, setSelectedRating] = useState<number>(0);

    // Fetch ride history data
    const fetchRideHistory = useCallback(async () => {
        try {
            const data = await api.client.rideHistory();

            if (data.success && data.data) {
                const d = data.data;
                setUserData(d.user || null);
                setStats(d.stats || { total_rides: 0, total_spent: 0, avg_rating_given: 0, completed_rides: 0, upcoming_rides: 0 });
                setRides(d.rides || []);
                setNotificationCount(d.notification_count || 0);
            } else {
                console.error('Failed to fetch ride history:', data.message);
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

            if (data.success && (data.ride || data.data)) {
                displayRideDetails(data.ride || data.data);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to load ride details',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.close();
            console.error('Error fetching ride details:', error);
            Swal.fire({
                icon: 'error',
                title: 'Connection Error',
                text: 'Failed to load ride details',
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
            'cancelled_by_client': '#F44336',
            'cancelled_by_driver': '#F44336',
            'cancelled_by_admin': '#F44336'
        };

        const status = ride.status || 'pending';
        const statusDisplay = ride.status_display || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
        const rideNumber = ride.ride_number || 'N/A';
        const pickupAddress = ride.pickup_address || 'N/A';
        const destinationAddress = ride.destination_address || 'N/A';
        const formattedDate = ride.formatted_date || new Date(ride.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = ride.formatted_time || new Date(ride.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const distance = ride.distance_km ? ride.distance_km.toFixed(1) + ' km' : 'N/A';
        const fare = ride.total_fare ? parseFloat(ride.total_fare).toLocaleString() : '0';
        const rideType = ride.ride_type ? ride.ride_type.charAt(0).toUpperCase() + ride.ride_type.slice(1) : 'Economy';
        const driverName = ride.driver_name || null;
        const vehicleDisplay = ride.vehicle_display || 'Vehicle not specified';
        const canRate = ride.status === 'completed' && !ride.user_rating;

        let html = `
            <div style="text-align: left; max-height: 70vh; overflow-y: auto; padding: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span style="background: ${statusColors[status] || '#999'}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;">
                        ${statusDisplay}
                    </span>
                    <span style="color: #666; font-size: 12px;">#${rideNumber}</span>
                </div>
                
                <div style="background: #f8f9fa; padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                    <p style="margin-bottom: 8px; font-size: 13px;"><strong>Pickup:</strong> ${pickupAddress}</p>
                    <p style="font-size: 13px;"><strong>Destination:</strong> ${destinationAddress}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 12px;">
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <p style="color: #666; font-size: 10px;">Date & Time</p>
                        <p style="font-weight: 600; font-size: 12px;">${formattedDate}<br>${formattedTime}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <p style="color: #666; font-size: 10px;">Distance</p>
                        <p style="font-weight: 600; font-size: 12px;">${distance}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <p style="color: #666; font-size: 10px;">Ride Type</p>
                        <p style="font-weight: 600; font-size: 12px;">${rideType}</p>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <p style="color: #666; font-size: 10px;">Total Fare</p>
                        <p style="font-weight: 700; font-size: 14px; color: #ff5e00; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${fare}</p>
                    </div>
                </div>
        `;

        if (driverName) {
            html += `
                <div style="background: #e8f5e9; padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                    <h4 style="margin-bottom: 10px; font-size: 14px;">Driver Information</h4>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 45px; height: 45px; background: linear-gradient(135deg, #ff5e00 0%, #ff8c3a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
                            ${driverName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p style="font-weight: 600; margin-bottom: 3px;">${driverName}</p>
                            <p style="color: #666; font-size: 12px;">${vehicleDisplay}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        if (canRate) {
            html += `
                <div style="background: #fff3e0; padding: 12px; border-radius: 10px;">
                    <h4 style="margin-bottom: 10px; font-size: 14px;">Rate Your Driver</h4>
                    <div style="font-size: 28px; text-align: center; color: #FFC107; margin-bottom: 10px;" id="ratingStars">
                        <i class="far fa-star" data-rating="1" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="2" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="3" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="4" style="cursor: pointer;"></i>
                        <i class="far fa-star" data-rating="5" style="cursor: pointer;"></i>
                    </div>
                    <textarea id="reviewText" placeholder="Share your experience (optional)" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 10px; font-family: inherit; font-size: 13px;" rows="2"></textarea>
                    <button onclick="window.submitRatingFromModal('${ride.id}')" style="width: 100%; padding: 10px; background: #ff5e00; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Submit Rating
                    </button>
                </div>
            `;
        } else if (ride.user_rating) {
            html += `
                <div style="background: #e8f5e9; padding: 12px; border-radius: 8px;">
                    <p style="font-size: 13px;"><i class="fas fa-star" style="color: #FFC107;"></i> <strong>Your Rating:</strong> ${ride.user_rating}/5</p>
                    ${ride.user_review ? `<p style="margin-top: 5px; font-size: 12px;"><i class="fas fa-comment"></i> ${ride.user_review}</p>` : ''}
                </div>
            `;
        }

        html += `</div>`;

        Swal.fire({
            title: 'Ride Details',
            html: html,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Close',
            width: '500px',
            didOpen: () => {
                if (canRate) {
                    let selectedRatingValue = 0;
                    const stars = document.querySelectorAll('#ratingStars i');

                    const highlightStars = (rating: number) => {
                        stars.forEach((star, index) => {
                            if (index < rating) {
                                star.className = 'fas fa-star';
                            } else {
                                star.className = 'far fa-star';
                            }
                        });
                    };

                    stars.forEach((star) => {
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
                text: 'Please select a rating',
                confirmButtonColor: '#ff5e00'
            });
            return false;
        }

        Swal.fire({
            title: 'Submitting...',
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
                    text: 'Rating submitted',
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    fetchRideHistory();
                });
                return true;
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to submit',
                    confirmButtonColor: '#ff5e00'
                });
                return false;
            }
        } catch (error) {
            Swal.close();
            Swal.fire({
                icon: 'success',
                title: 'Thank You!',
                text: 'Rating submitted',
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
            const notifs = data.data?.data || data.data?.notifications || [];

            if (notifs.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifs.forEach((notif: Notification) => {
                    html += `
                        <div style="padding: 10px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title}</strong></p>
                            <p style="font-size: 12px;">${notif.message}</p>
                            <p style="font-size: 10px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    icon: 'info',
                    title: `Notifications (${notifs.length})`,
                    html: html,
                    confirmButtonColor: '#ff5e00'
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
                text: 'No notifications',
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

        return () => {
            delete (window as any).submitRatingFromModal;
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
            'cancelled_by_client': '#F44336',
            'cancelled_by_driver': '#F44336',
            'cancelled_by_admin': '#F44336'
        };
        return colors[status] || '#9E9E9E';
    };

    const getStatusDisplay = (status: string): string => {
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    };


    return (
        <div className="mobile-ride-history-container">
            <div className="mobile-ride-history-view">
                {/* Header */}
                <div className="mobile-ride-history-header">
                    <div className="mobile-ride-history-user-info">
                        <h1>Ride History</h1>
                        <p>Welcome back, {userData?.fullname?.split(' ')[0] || userData?.full_name?.split(' ')[0] || 'Guest'}</p>
                    </div>
                    <button className="mobile-ride-history-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Stats Card */}
                <div className="mobile-ride-history-stats-card">
                    <div className="mobile-stats-value font-roboto-number">{stats.total_rides}</div>
                    <div className="mobile-stats-label">Total Rides</div>
                    <div className="mobile-stats-rating">
                        <i className="fas fa-star"></i>
                        <span>Avg. Rating: <span className="font-roboto-number">{stats.avg_rating_given.toFixed(1)}</span></span>
                    </div>
                </div>

                {/* Rides List */}
                <div className="mobile-ride-history-list">
                    <div className="mobile-list-header">
                        <div className="mobile-list-title">Recent Rides</div>
                        <button className="mobile-see-all-btn" onClick={() => window.location.href = '#all'}>See All</button>
                    </div>
                    <div className="mobile-rides-list">
                        {rides.length > 0 ? (
                            rides.map((ride) => {
                                const pickupShort = ride.pickup_address?.substring(0, 25) || 'Pickup';
                                const date = ride.formatted_date;
                                const time = ride.formatted_time;
                                const icon = ride.ride_type === 'comfort' ? 'fa-car-side' : 'fa-car';
                                const iconBg = ride.ride_type === 'comfort' ? 'rgba(156, 39, 176, 0.1)' : 'rgba(33, 150, 243, 0.1)';
                                const iconColor = ride.ride_type === 'comfort' ? '#9C27B0' : '#2196F3';

                                return (
                                    <div
                                        key={ride.id}
                                        className="mobile-ride-item"
                                        onClick={() => viewRideDetails(ride.id)}
                                    >
                                        <div className="mobile-ride-icon" style={{ backgroundColor: iconBg, color: iconColor }}>
                                            <i className={`fas ${icon}`}></i>
                                        </div>
                                        <div className="mobile-ride-info">
                                            <h4>{pickupShort}</h4>
                                            <p>{date} • {time}</p>
                                            {ride.driver_name && (
                                                <p className="mobile-driver-name">Driver: {ride.driver_name}</p>
                                            )}
                                        </div>
                                        <div className="mobile-ride-amount font-roboto-number">
                                            {formatCurrency(ride.total_fare)}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="mobile-no-rides">
                                <i className="fas fa-history"></i>
                                <p>No rides yet</p>
                                <button className="mobile-book-ride-btn" onClick={() => router.visit('/clientbookride')}>
                                    Book your first ride
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Book Ride Button */}
                <button className="mobile-book-ride-fab" onClick={() => router.visit('/clientbookride')}>
                    <i className="fas fa-car"></i>
                    <span>Book New Ride</span>
                </button>

                {/* Bottom Navigation */}
                <ClientNavMobile />
            </div>
        </div>
    );
};

export default ClientRideHistoryMobile;