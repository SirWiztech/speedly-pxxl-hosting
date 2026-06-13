import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import '../../css/ClientDashboard.css';
import ClientDashboardMobile from '../components/mobileViewComponent/ClientDashboardMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';


// Types
interface UserData {
    id: string;
    fullname: string;
    full_name?: string;
    profile_picture_url: string | null;
    is_verified: boolean;
    membership_tier: 'basic' | 'premium' | 'gold';
    created_at: string;
}

interface WalletData {
    balance: number;
}

interface RideStats {
    active_count: number;
    completed_count: number;
    monthly_change: number;
}

interface Ride {
    id: string;
    status: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    created_at: string;
    formatted_date: string;
    formatted_time: string;
    driver_name: string | null;
    driver_photo: string | null;
    vehicle_model: string | null;
    distance_km: number;
    notification_type: string | null;
    notification_message: string | null;
    user_rating: number | null;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    destination_latitude: number | null;
    destination_longitude: number | null;
    payment_status?: string;
    ride_number?: string;
}

interface AwaitingReleaseRide {
    id: string;
    ride_number: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    driver_name: string | null;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    created_at: string;
    is_read: boolean;
}

interface PaymentStatus {
    success: boolean;
    amount?: number;
    newBalance?: number;
    failed?: boolean;
}

const ClientDashboard: React.FC = () => {
    // State
    const [userData, setUserData] = useState<UserData | null>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [rideStats, setRideStats] = useState<RideStats>({
        active_count: 0,
        completed_count: 0,
        monthly_change: 0
    });
    const [recentRides, setRecentRides] = useState<Ride[]>([]);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [selectedRating, setSelectedRating] = useState<number>(0);
    const [reviewText, setReviewText] = useState<string>('');
    const [awaitingReleaseRides, setAwaitingReleaseRides] = useState<AwaitingReleaseRide[]>([]);

    const notificationIntervalRef = useRef<number | null>(null);
    const isMobile = useMobile();

    // Get status color
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

    // Get status display text
    const getStatusDisplay = (status: string): string => {
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    };

    // Format currency
    const formatCurrency = (amount: number): string => {
        return `₦${amount.toLocaleString()}`;
    };

    // Format date
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Format time
    const formatTime = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            const [profileData, statsData, ridesData, walletData, historyData] = await Promise.all([
                api.client.profile(),
                api.client.stats(),
                api.client.rides(5),
                api.client.wallet(),
                api.client.rideHistory({ status: 'awaiting_release' })
            ]);

            if (profileData.success) {
                const p = profileData.data;
                setUserData({
                    id: p.id || '',
                    fullname: p.full_name || '',
                    profile_picture_url: p.profile_picture_url || null,
                    is_verified: p.is_verified || false,
                    membership_tier: (p.membership_tier || 'basic') as 'basic' | 'premium' | 'gold',
                    created_at: p.created_at || ''
                });
            }

            if (statsData.success) {
                const s = statsData.data;
                setRideStats({
                    active_count: s.active_rides || 0,
                    completed_count: s.completed_rides || 0,
                    monthly_change: s.monthly_change || 0
                });
            }

            if (ridesData.success && Array.isArray(ridesData.data)) {
                const rides = ridesData.data.map((ride: any) => ({
                    id: ride.id,
                    status: ride.status,
                    pickup_address: ride.pickup_location || '',
                    destination_address: ride.dropoff_location || '',
                    total_fare: parseFloat(ride.fare_amount) || 0,
                    created_at: ride.created_at,
                    formatted_date: '',
                    formatted_time: '',
                    driver_name: ride.driver_name || null,
                    driver_photo: null,
                    vehicle_model: ride.vehicle_type || null,
                    distance_km: 0,
                    notification_type: null,
                    notification_message: null,
                    user_rating: null,
                    pickup_latitude: null,
                    pickup_longitude: null,
                    destination_latitude: null,
                    destination_longitude: null
                }));
                setRecentRides(rides);
            }

            if (walletData.success) {
                setWalletBalance(parseFloat(walletData.data.balance) || 0);
            }

            if (historyData?.success && historyData.data?.rides) {
                const awaiting = historyData.data.rides
                    .filter((r: any) => r.status === 'awaiting_release')
                    .map((r: any) => ({
                        id: r.id,
                        ride_number: r.ride_number || '',
                        pickup_address: r.pickup_address || '',
                        destination_address: r.destination_address || '',
                        total_fare: r.total_fare || 0,
                        driver_name: r.driver_name || 'Driver',
                    }));
                setAwaitingReleaseRides(awaiting);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check for payment status from URL params
    const checkPaymentStatus = useCallback(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatusParam = urlParams.get('payment_status');
        const reference = urlParams.get('reference');

        if (paymentStatusParam === 'completed' && reference) {
            try {
                const data = await api.payment.verify(reference);
                if (data.success) {
                    setPaymentStatus({
                        success: true,
                        amount: data.amount,
                        newBalance: data.new_balance
                    });

                    Swal.fire({
                        icon: 'success',
                        title: 'Deposit Successful! 💰',
                        html: `
                <div style="text-align: center;">
                  <p style="font-size: 18px; margin-bottom: 10px;">Your wallet has been credited with</p>
                  <p style="font-size: 28px; font-weight: bold; color: #ff5e00; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${formatCurrency(data.amount)}</p>
                  <p style="margin-top: 10px;">New balance: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${formatCurrency(data.new_balance)}</strong></p>
                </div>
              `,
                        confirmButtonColor: '#ff5e00',
                        confirmButtonText: 'Great!',
                        timer: 5000,
                        timerProgressBar: true
                    });

                    fetchDashboardData();
                    window.history.replaceState({}, '', window.location.pathname);
                } else {
                    setPaymentStatus({ success: false, message: data.message || 'Payment verification failed' });
                }
            } catch (error: any) {
                console.error('Payment verification error:', error);
                setPaymentStatus({ success: false, message: error.message || 'Payment verification failed' });
            }
        }
    }, []);

    // Check for new notifications silently
    const checkForNewNotifications = useCallback(async () => {
        try {
            const data = await api.notifications.list();
            const notifications = data.data?.data || [];
            const unread = notifications.filter((n: any) => !n.is_read).length;
            setNotificationCount(unread);
        } catch (error) {
            // Silently fail
        }
    }, []);

    // Start notification checking interval
    useEffect(() => {
        if (notificationIntervalRef.current) {
            clearInterval(notificationIntervalRef.current);
        }

        // Check if we've already shown notifications this session
        if (!sessionStorage.getItem('notifications_checked')) {
            sessionStorage.setItem('notifications_checked', 'true');
        }

        notificationIntervalRef.current = setInterval(checkForNewNotifications, 30000);

        return () => {
            if (notificationIntervalRef.current) {
                clearInterval(notificationIntervalRef.current);
            }
        };
    }, [checkForNewNotifications]);

    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();
        checkPaymentStatus();
    }, [fetchDashboardData, checkPaymentStatus]);

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

        // Show loading
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

            const rideData = data.data;
            if (data.success || data.data) {
                displayRideDetails(rideData);
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
        const driver = ride.driver || null;
        const driverUser = driver?.user || null;
        const vehicles = driver?.vehicles || [];
        const primaryVehicle = vehicles[0] || null;

        const driverName = driverUser?.full_name || null;
        const driverPhone = driverUser?.phone_number || null;
        const vehicleDisplay = primaryVehicle
            ? `${primaryVehicle.vehicle_type || ''} - ${primaryVehicle.plate_number || ''}`.trim()
            : null;

        const rideDate = formatDate(ride.created_at);
        const rideTime = formatTime(ride.created_at);
        const statusColor = getStatusColor(ride.status);
        const distanceKm = ride.distance_km ? parseFloat(ride.distance_km).toFixed(1) + ' km' : 'N/A';
        const clientRating = ride.client_rating || null;
        const clientReview = ride.client_review || null;
        const canRate = ride.status === 'completed' && !clientRating;

        let html = `
      <div style="text-align: left; max-height: 70vh; overflow-y: auto; padding: 10px;">
        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 18px; font-weight: bold;">Ride Details</span>
            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
              ${getStatusDisplay(ride.status)}
            </span>
          </div>
          <p><strong>Ride #:</strong> ${ride.ride_number || ride.id}</p>
          <p><strong>Date:</strong> ${rideDate} at ${rideTime}</p>
          <p><strong>From:</strong> ${ride.pickup_address || 'N/A'}</p>
          <p><strong>To:</strong> ${ride.destination_address || 'N/A'}</p>
          <p><strong>Distance:</strong> ${distanceKm}</p>
          <p><strong>Fare:</strong> <span style="color: #4CAF50; font-weight: bold; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${formatCurrency(ride.total_fare)}</span></p>
    `;

        if (ride.platform_commission) {
            html += `<p><strong>Platform Fee:</strong> ${formatCurrency(ride.platform_commission)}</p>`;
        }

        html += `<p><strong>Payment Status:</strong> <span style="color: ${ride.payment_status === 'paid' ? '#4CAF50' : '#FF9800'};">${ride.payment_status ? ride.payment_status.toUpperCase() : 'PENDING'}</span></p>`;
        html += `</div>`;

        if (driverName) {
            html += `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin-bottom: 15px;">
          <h4 style="margin-bottom: 10px; color: #2E7D32;">Driver Information</h4>
          <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <div style="width: 50px; height: 50px; background: #4CAF50; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
              ${driverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">${driverName}</p>
              ${vehicleDisplay ? `<p style="color: #666; margin-bottom: 3px;">${vehicleDisplay}</p>` : ''}
              ${driverPhone ? `<p style="color: #666; font-size: 14px; margin-top: 5px;"><i class="fas fa-phone" style="margin-right: 5px;"></i> ${driverPhone}</p>` : ''}
            </div>
          </div>
        </div>
      `;
        } else {
            html += `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
          <p style="color: #666;">No driver assigned yet</p>
          <p style="font-size: 13px; color: #999;">Waiting for a driver to accept your ride</p>
        </div>
      `;
        }

        if (canRate) {
            html += `
        <div style="background: #fff3e0; padding: 15px; border-radius: 10px;">
          <h4 style="margin-bottom: 15px; color: #E65100;">Rate Your Driver</h4>
          <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 15px; font-size: 30px;" id="ratingStars">
            <i class="fas fa-star" data-rating="1" style="color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
            <i class="fas fa-star" data-rating="2" style="color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
            <i class="fas fa-star" data-rating="3" style="color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
            <i class="fas fa-star" data-rating="4" style="color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
            <i class="fas fa-star" data-rating="5" style="color: #ddd; cursor: pointer; transition: color 0.2s;"></i>
          </div>
          <textarea id="reviewText" placeholder="Share your experience with this driver (optional)" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; font-family: inherit;" rows="3"></textarea>
          <button onclick="window.submitRatingFromModal('${ride.id}')" style="background: #ff5e00; color: white; border: none; padding: 12px 20px; border-radius: 8px; width: 100%; font-weight: bold; font-size: 16px; cursor: pointer;">
            <i class="fas fa-star"></i> Submit Rating
          </button>
        </div>
      `;
        } else if (clientRating) {
            html += `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 10px;">
          <h4 style="margin-bottom: 10px; color: #2E7D32;">Your Rating</h4>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <div style="color: #FFD700; font-size: 24px;">
              ${'★'.repeat(clientRating)}${'☆'.repeat(5 - clientRating)}
            </div>
            <span style="font-weight: bold;">${clientRating}/5</span>
          </div>
          ${clientReview ? `<p style="background: white; padding: 10px; border-radius: 8px;"><strong>Your review:</strong> ${clientReview}</p>` : ''}
        </div>
      `;
        }

        if (['pending', 'accepted', 'driver_assigned', 'driver_arrived', 'ongoing'].includes(ride.status)) {
            html += `
        <div style="display: flex; gap: 10px; margin-top: 15px;">
          ${driverPhone ? `
            <a href="tel:${driverPhone}" style="flex: 1; background: #4CAF50; color: white; text-decoration: none; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600;">
              <i class="fas fa-phone"></i> Call Driver
            </a>
          ` : ''}
          ${ride.pickup_latitude && ride.pickup_longitude ? `
            <a href="https://www.google.com/maps/dir/?api=1&destination=${ride.pickup_latitude},${ride.pickup_longitude}" target="_blank" style="flex: 1; background: #2196F3; color: white; text-decoration: none; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600;">
              <i class="fas fa-map-marked-alt"></i> Track
            </a>
          ` : ''}
          <button onclick="window.cancelRideFromModal('${ride.id}')" style="flex: 1; background: #f44336; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">
            <i class="fas fa-times"></i> Cancel
          </button>
        </div>
      `;
        }

        html += `</div>`;

        Swal.fire({
            title: 'Ride Details',
            html: html,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Close',
            width: '600px',
            didOpen: () => {
                if (canRate) {
                    let selectedRatingValue = 0;
                    const stars = document.querySelectorAll('#ratingStars i');

                    const highlightStars = (rating: number) => {
                        stars.forEach((star, index) => {
                            if (index < rating) {
                                (star as HTMLElement).style.color = '#FFD700';
                            } else {
                                (star as HTMLElement).style.color = '#ddd';
                            }
                        });
                    };

                    stars.forEach(star => {
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
                    fetchDashboardData();
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
                icon: 'error',
                title: 'Connection Error',
                text: 'Failed to connect to server. Please try again.',
                confirmButtonColor: '#ff5e00'
            });
            return false;
        }
    };

    // Cancel ride
    const cancelRide = async (rideId: string) => {
        const result = await Swal.fire({
            title: 'Cancel Ride?',
            text: 'Are you sure you want to cancel this ride?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f44336',
            confirmButtonText: 'Yes, Cancel',
            cancelButtonText: 'No, Keep It'
        });

        if (result.isConfirmed) {
            Swal.fire({
                title: 'Processing...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                const data = await api.rides.cancel(rideId, { reason: 'Cancelled by client' });

                Swal.close();

                if (data.success) {
                    if (data.data?.new_balance !== undefined) {
                        setWalletBalance(data.data.new_balance);
                    }
                    fetchDashboardData();
                    const refundAmt = data.data?.refund_amount;
                    const refundText = refundAmt ? `₦${refundAmt.toLocaleString()} has been refunded to your wallet.` : 'Your refund has been processed.';
                    Swal.fire({
                        icon: 'success',
                        title: 'Ride Cancelled',
                        text: refundText,
                        confirmButtonColor: '#ff5e00'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: data.message || 'Failed to cancel ride',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            } catch (error) {
                Swal.close();
                console.error('Error:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to cancel ride',
                    confirmButtonColor: '#ff5e00'
                });
            }
        }
    };

    // Show coming soon
    const showComingSoon = (feature: string) => {
        Swal.fire({
            icon: 'info',
            title: 'Coming Soon!',
            text: `${feature} feature will be available in the next update.`,
            confirmButtonColor: '#ff5e00'
        });
    };

    // Release funds
    const releaseFunds = async (rideId: string) => {
        const result = await Swal.fire({
            title: 'Release Payment?',
            text: 'This will transfer the fare to the driver. This action cannot be undone.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#4CAF50',
            confirmButtonText: 'Yes, Release Funds',
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;

        Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            const data = await api.rides.releaseFunds(rideId);
            Swal.close();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Funds Released!', text: 'Payment has been sent to the driver.', confirmButtonColor: '#ff5e00' });
                fetchDashboardData();
            } else {
                Swal.fire({ icon: 'error', title: 'Failed', text: data.message || 'Could not release funds', confirmButtonColor: '#ff5e00' });
            }
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Error', text: error?.message || 'Failed to release funds', confirmButtonColor: '#ff5e00' });
        }
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifications = data.data?.data || [];

            if (notifications.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifications.forEach((notif: Notification) => {
                    html += `
            <div style="padding: 10px; border-bottom: 1px solid #eee;">
              <p><strong>${notif.title}</strong></p>
              <p>${notif.message}</p>
              <p style="font-size: 12px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
            </div>
          `;
                });
                html += '</div>';

                const result = await Swal.fire({
                    icon: 'info',
                    title: `Notifications (${notifications.length})`,
                    html: html,
                    confirmButtonColor: '#ff5e00',
                    confirmButtonText: 'Close',
                    showDenyButton: true,
                    denyButtonColor: '#f44336',
                    denyButtonText: 'Clear All',
                    width: '600px'
                });

                if (result.isDenied) {
                    await api.notifications.clearAll();
                    Swal.fire({ icon: 'success', title: 'Cleared!', text: 'All notifications cleared', confirmButtonColor: '#ff5e00' });
                    setNotificationCount(0);
                } else {
                    await api.notifications.list();
                    setNotificationCount(0);
                }
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Notifications',
                    text: 'No new notifications',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load notifications',
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

        (window as any).cancelRideFromModal = (rideId: string) => {
            cancelRide(rideId);
        };

        return () => {
            delete (window as any).submitRatingFromModal;
            delete (window as any).cancelRideFromModal;
        };
    }, [selectedRating]);

    const tierColors: Record<string, string> = {
        basic: '#6c757d',
        premium: '#ff5e00',
        gold: '#ffd700'
    };

    const tierColor = userData?.membership_tier ? tierColors[userData.membership_tier] : '#6c757d';

    const preloaderLoading = usePreloader(1000);

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    if (loading) {
        return <DesktopPreloader />;
    }

    // Render mobile view on mobile devices ONLY
    if (isMobile) {
        return <ClientDashboardMobile />;
    }

    // Render desktop view for non-mobile devices
    return (
        <div className="dashboard-container">
            {/* DESKTOP VIEW ONLY */}
            <div className="desktop-view">
                <ClientSidebarDesktop
                    userName={userData?.fullname || userData?.full_name || 'User'}
                    profilePictureUrl={userData?.profile_picture_url}
                />

                {/* Main Content */}
                <div className="desktop-main">
                    {/* Header */}
                    <div className="desktop-header">
                        <div className="desktop-title">
                            <h1>Welcome back, {userData?.fullname?.split(' ')[0] || userData?.full_name?.split(' ')[0] || 'Guest'}!</h1>
                            <p className="text-gray-600">Ready for your next ride?</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="wallet-info bg-gray-100 px-4 py-2 rounded-xl">
                                <span className="text-sm text-gray-600">Wallet Balance</span>
                                <span className="text-xl font-bold text-[#ff5e00] ml-2 font-roboto-number">{formatCurrency(walletBalance)}</span>
                            </div>
                            <button className="notification-btn bg-gray-100 p-3 rounded-xl relative hover:bg-gray-200 transition" onClick={checkNotifications}>
                                <i className="fas fa-bell text-gray-700 text-xl"></i>
                                {notificationCount > 0 && (
                                    <span className="notification-badge notification-pulse font-roboto-number">{notificationCount}</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-6 mt-6">
                        <div className="desktop-card bg-gradient-to-br from-[#ff5e00] to-[#ff8c3a] text-white">
                            <h3 className="text-lg font-medium opacity-100" style={{color: 'white'}}>Active Rides</h3>
                            <div className="text-4xl font-bold mt-2 font-roboto-number">{rideStats.active_count}</div>
                            <div className="mt-4 text-sm opacity-75">
                                <i className="fas fa-arrow-up"></i> +<span className="font-roboto-number">{Math.abs(rideStats.monthly_change)}</span> from last month
                            </div>
                        </div>

                        <div className="desktop-card">
                            <h3 className="text-lg font-medium text-gray-600">Completed Rides</h3>
                            <div className="text-4xl font-bold mt-2 font-roboto-number">{rideStats.completed_count}</div>
                            <div className="mt-4 text-sm text-gray-500">
                                Member since {userData?.created_at ? formatDate(userData.created_at) : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </div>
                        </div>

                        <div className="desktop-card">
                            <h3 className="text-lg font-medium text-gray-600">Membership</h3>
                            <div className="text-2xl font-bold mt-2 capitalize">{userData?.membership_tier || 'basic'}</div>
                            <div className="mt-4 text-sm text-gray-500">
                                {userData?.membership_tier === 'basic' && 'Earn points to reach Premium'}
                                {userData?.membership_tier === 'premium' && '5% cashback on all rides'}
                                {userData?.membership_tier === 'gold' && '10% cashback + priority support'}
                            </div>
                        </div>
                    </div>

                    {/* Release Funds Card */}
                    {awaitingReleaseRides.length > 0 && (
                        <div className="mt-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <i className="fas fa-hand-holding-usd text-[#ff5e00]"></i> Release Payment
                            </h2>
                            <div className="grid gap-4">
                                {awaitingReleaseRides.map((ride) => (
                                    <div key={ride.id} className="bg-gradient-to-r from-[#fff3e0] to-white border-2 border-[#ff5e00] border-dashed rounded-xl p-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500">Ride #{ride.ride_number}</p>
                                            <p className="font-semibold">{ride.pickup_address} → {ride.destination_address}</p>
                                            <p className="text-sm text-gray-600 mt-1">Driver: {ride.driver_name || 'Assigned'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-[#ff5e00] font-roboto-number">₦{ride.total_fare.toLocaleString()}</p>
                                            <button
                                                className="mt-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                                                onClick={() => releaseFunds(ride.id)}
                                            >
                                                <i className="fas fa-check-circle mr-2"></i> Release Funds
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-4 gap-4">
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientbookride')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-car"></i></div>
                                <span className="font-medium">Book a Ride</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientridehistory')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-history"></i></div>
                                <span className="font-medium">Ride History</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientwallet')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-wallet"></i></div>
                                <span className="font-medium">Wallet</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientsettings')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-cog"></i></div>
                                <span className="font-medium">Settings</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientlocation')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-map-marked-alt"></i></div>
                                <span className="font-medium">Saved Locations</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientaiassistant')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-robot"></i></div>
                                <span className="font-medium">AI Assistant</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/client-profile')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-user"></i></div>
                                <span className="font-medium">Profile</span>
                            </button>
                            <button className="desktop-action-btn bg-gray-50 hover:bg-gray-100 p-6 rounded-xl transition flex flex-col items-center gap-3" onClick={() => router.visit('/clientsupport')}>
                                <div className="text-3xl text-[#ff5e00]"><i className="fas fa-headset"></i></div>
                                <span className="font-medium">Support</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Rides Table */}
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Recent Rides</h2>
                            <button className="text-[#ff5e00] font-medium hover:underline" onClick={() => router.visit('/clientridehistory')}>View All →</button>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Date & Time</th>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Pickup</th>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Destination</th>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Driver</th>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Fare</th>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {recentRides.length > 0 ? (
                                        recentRides.map((ride) => {
                                            const hasNotification = ride.notification_type !== null;
                                            const date = ride.formatted_date || formatDate(ride.created_at);
                                            const time = ride.formatted_time || formatTime(ride.created_at);

                                            return (
                                                <tr key={ride.id} className={`hover:bg-gray-50 cursor-pointer ${hasNotification ? 'bg-orange-50' : ''}`} onClick={() => viewRideDetails(ride.id)}>
                                                    <td className="px-6 py-4 text-sm">{date} • {time}</td>
                                                    <td className="px-6 py-4 text-sm">{ride.pickup_address?.substring(0, 30) || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm">{ride.destination_address?.substring(0, 30) || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-sm">{ride.driver_name || 'Pending'}</td>
                                                    <td className="px-6 py-4 text-sm font-medium font-roboto-number">{formatCurrency(ride.total_fare)}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 text-xs rounded-full" style={{
                                                            background: ride.status === 'completed' ? '#E8F5E9' : '#FFF3E0',
                                                            color: ride.status === 'completed' ? '#2E7D32' : '#E65100'
                                                        }}>
                                                            {getStatusDisplay(ride.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button className="text-[#ff5e00] hover:underline text-sm" onClick={(e) => { e.stopPropagation(); viewRideDetails(ride.id); }}>
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                <i className="fas fa-car-side text-4xl mb-2 opacity-50"></i>
                                                <p>No rides yet</p>
                                                <button className="mt-4 bg-[#ff5e00] text-white px-6 py-2 rounded-xl text-sm font-medium" onClick={() => router.visit('/clientbookride')}>
                                                    Book Your First Ride
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ClientDashboard;