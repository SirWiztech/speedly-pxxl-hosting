import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import DriverNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/DriverDashboardMobile.css';

// Types
interface DriverData {
    id: string;
    fullname: string;
    full_name?: string;
    email: string;
    phone_number: string;
    profile_picture_url: string | null;
    driver_status: string;
    verification_status: string;
    avg_rating: number;
    total_reviews: number;
}

interface Earnings {
    today_earnings: number;
    total_earnings: number;
    available_balance: number;
    total_withdrawn: number;
    pending_clearance: number;
    week_earnings: number;
    month_earnings: number;
}

interface RideStats {
    total_rides: number;
    completed_rides: number;
    cancelled_rides: number;
    today_rides: number;
    acceptance_rate: number;
    total_fare_amount: number;
    total_commission: number;
}

interface Ride {
    id: string;
    status: string;
    request_type: 'private' | 'public';
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    driver_payout: number;
    distance_km: number;
    created_at: string;
    client_name: string;
    client_phone: string;
    client_photo: string | null;
    pickup_latitude: number | null;
    pickup_longitude: number | null;
    formatted_date: string;
    formatted_time: string;
}

interface RecentRide {
    id: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    driver_payout: number;
    platform_commission: number;
    created_at: string;
    client_name: string;
    formatted_time: string;
}

const DriverDashboardMobile: React.FC = () => {
    // State
    const [driverData, setDriverData] = useState<DriverData | null>(null);
    const [earnings, setEarnings] = useState<Earnings>({
        today_earnings: 0,
        total_earnings: 0,
        available_balance: 0,
        total_withdrawn: 0,
        pending_clearance: 0,
        week_earnings: 0,
        month_earnings: 0
    });
    const [stats, setStats] = useState<RideStats>({
        total_rides: 0,
        completed_rides: 0,
        cancelled_rides: 0,
        today_rides: 0,
        acceptance_rate: 100,
        total_fare_amount: 0,
        total_commission: 0
    });
    const [activeRide, setActiveRide] = useState<Ride | null>(null);
    const [pendingRide, setPendingRide] = useState<Ride | null>(null);
    const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
    const [driverStatus, setDriverStatus] = useState<string>('offline');
    const [verificationStatus, setVerificationStatus] = useState<string>('pending');
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(30);

    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch driver dashboard data
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setApiError(null);
        
        try {
            const results = await Promise.allSettled([
                api.driver.profile(),
                api.driver.stats(),
                api.driver.wallet(),
                api.driver.rides(5),
                api.driver.pendingRides(),
                api.notifications.list()
            ]);

            const [profileResult, statsResult, walletResult, ridesResult, pendingResult, notifResult] = results;

            // Process profile
            const profileData = profileResult.status === 'fulfilled' ? profileResult.value : null;
            if (profileData && (profileData.success || profileData.data)) {
                const p = profileData.data?.user || profileData.user || profileData.data;
                setDriverData(p);
                setDriverStatus(p.driver_status || p.status || 'offline');
                setVerificationStatus(p.verification_status || 'pending');
            }

            // Process stats
            const statsData = statsResult.status === 'fulfilled' ? statsResult.value : null;
            if (statsData && statsData.success) {
                const s = statsData.data || statsData;
                setStats({
                    total_rides: s.total_rides || 0,
                    completed_rides: s.completed_rides || 0,
                    cancelled_rides: s.cancelled_rides || 0,
                    today_rides: s.today_rides || 0,
                    acceptance_rate: s.acceptance_rate || 0,
                    total_fare_amount: s.total_fare_amount || 0,
                    total_commission: s.total_commission || 0,
                });
            } else {
                console.error('Failed to fetch dashboard data:', statsData?.message || 'Stats unavailable');
                setApiError('Failed to load dashboard data.');
            }

            // Process wallet
            const walletData = walletResult.status === 'fulfilled' ? walletResult.value : null;
            if (walletData && (walletData.success || walletData.data)) {
                const s = walletData.data?.stats || walletData.data || walletData;
                setEarnings({
                    total_earnings: s.total_earnings || 0,
                    available_balance: s.wallet_balance || s.balance || 0,
                    pending_clearance: s.pending_clearance || 0,
                    today_earnings: s.today_earnings || 0,
                    week_earnings: s.week_earnings || 0,
                    month_earnings: s.month_earnings || 0,
                });
            }

            // Process rides
            const ridesData = ridesResult.status === 'fulfilled' ? ridesResult.value : null;
            if (ridesData && (ridesData.success || ridesData.data)) {
                const rides = ridesData.data || ridesData;
                const ridesArray = Array.isArray(rides) ? rides : (rides.data || []);

                const active = ridesArray.find((r: any) => r.status === 'accepted' || r.status === 'ongoing');
                setActiveRide(active || null);
                setRecentRides(ridesArray.filter((r: any) => r.status === 'completed').slice(0, 5));
            }

            // Process pending rides
            const pendingData = pendingResult.status === 'fulfilled' ? pendingResult.value : null;
            if (pendingData && pendingData.success && pendingData.data) {
                const pendingArray = Array.isArray(pendingData.data) ? pendingData.data : [];
                setPendingRide(pendingArray.length > 0 ? pendingArray[0] : null);
            }

            // Process notifications
            const notifData = notifResult.status === 'fulfilled' ? notifResult.value : null;
            if (notifData && (notifData.success || notifData.data)) {
                const notifs = notifData.data?.data || notifData.notifications || notifData.data?.notifications || [];
                const unread = notifs.filter((n: any) => n.is_read === false || n.is_read === 0).length;
                setNotificationCount(unread);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setApiError('Network error. Unable to load dashboard data.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Toggle driver status — one click
    const toggleDriverStatus = async () => {
        if (verificationStatus !== 'approved') {
            Swal.fire({
                title: 'Verification Required',
                text: 'Please complete KYC verification before going online',
                icon: 'warning',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        const newStatus = driverStatus === 'online' ? 'offline' : 'online';
        const previousStatus = driverStatus;

        setDriverStatus(newStatus);

        try {
            const data = await api.driver.toggleStatus({ status: newStatus });

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: `You are now ${newStatus}`,
                    timer: 1200,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
                fetchDashboardData();
            } else {
                setDriverStatus(previousStatus);
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Failed to update status',
                    icon: 'error',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            setDriverStatus(previousStatus);
            console.error('Error:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to update status',
                icon: 'error',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Accept ride
    const acceptRide = async (rideId: string) => {
        const result = await Swal.fire({
            title: 'Accept Ride?',
            text: 'Are you sure you want to accept this ride?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, accept',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const data = await api.rides.accept(rideId);

                if (data.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Ride accepted successfully!',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchDashboardData();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: data.message || 'Failed to accept ride',
                        icon: 'error',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to accept ride',
                    icon: 'error',
                    confirmButtonColor: '#ff5e00'
                });
            }
        }
    };

    // Decline ride
    const declineRide = async (rideId: string) => {
        const result = await Swal.fire({
            title: 'Decline Ride?',
            text: 'Are you sure you want to decline this ride?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, decline',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            try {
                const data = await api.rides.decline(rideId);

                if (data.success) {
                    setPendingRide(null);
                    Swal.fire({
                        title: 'Declined',
                        text: data.message || 'Ride declined',
                        icon: 'info',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchDashboardData();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: data.message || 'Failed to decline ride',
                        icon: 'error',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to decline ride',
                    icon: 'error',
                    confirmButtonColor: '#ff5e00'
                });
            }
        }
    };

    // Complete ride
    const completeRide = async (rideId: string, payout: number) => {
        let selectedRating = 0;
        let reviewComment = '';

        const result = await Swal.fire({
            title: 'Complete Ride?',
            html: `
                <p>Have you completed this ride?</p>
                <p class="mt-2 font-bold text-green-600" style="font-weight: bold; color: #10b981; margin-top: 8px;">You will earn: <span style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${payout.toLocaleString()}</span></p>
                <div class="mt-4" style="margin-top: 16px;">
                    <label class="block text-sm text-gray-600 mb-2" style="display: block; font-size: 13px; color: #666; margin-bottom: 8px;">Rate the client (optional)</label>
                    <div class="flex justify-center gap-2 text-2xl rating-stars" style="display: flex; justify-content: center; gap: 8px; font-size: 24px;">
                        <i class="far fa-star rating-star" data-rating="1"></i>
                        <i class="far fa-star rating-star" data-rating="2"></i>
                        <i class="far fa-star rating-star" data-rating="3"></i>
                        <i class="far fa-star rating-star" data-rating="4"></i>
                        <i class="far fa-star rating-star" data-rating="5"></i>
                    </div>
                </div>
                <textarea id="review-comment" class="swal2-textarea mt-4" placeholder="Leave a comment (optional)" style="margin-top: 16px; width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #ddd;"></textarea>
            `,
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Yes, complete',
            cancelButtonText: 'Cancel',
            didOpen: () => {
                const stars = document.querySelectorAll('.rating-star');
                
                stars.forEach((star) => {
                    star.addEventListener('mouseover', () => {
                        const rating = parseInt(star.getAttribute('data-rating') || '0');
                        stars.forEach((s, idx) => {
                            if (idx < rating) {
                                s.className = 'fas fa-star rating-star text-yellow-400';
                                s.setAttribute('style', 'color: #fbbf24;');
                            } else {
                                s.className = 'far fa-star rating-star';
                            }
                        });
                    });
                    
                    star.addEventListener('click', () => {
                        selectedRating = parseInt(star.getAttribute('data-rating') || '0');
                        stars.forEach((s, idx) => {
                            if (idx < selectedRating) {
                                s.className = 'fas fa-star rating-star text-yellow-400';
                                s.setAttribute('style', 'color: #fbbf24;');
                            } else {
                                s.className = 'far fa-star rating-star';
                            }
                        });
                    });
                });
                
                const starsContainer = document.querySelector('.rating-stars');
                starsContainer?.addEventListener('mouseleave', () => {
                    stars.forEach((s, idx) => {
                        if (idx < selectedRating) {
                            s.className = 'fas fa-star rating-star text-yellow-400';
                            s.setAttribute('style', 'color: #fbbf24;');
                        } else {
                            s.className = 'far fa-star rating-star';
                        }
                    });
                });
            }
        });

        if (result.isConfirmed) {
            reviewComment = (document.getElementById('review-comment') as HTMLTextAreaElement)?.value || '';

            try {
                const data = await api.rides.complete(rideId);

                if (data.success) {
                    if (selectedRating > 0) {
                        await api.rides.rateClient(rideId, {
                            rating: selectedRating,
                            comment: reviewComment
                        });
                    }
                    Swal.fire({
                        title: 'Ride Marked Complete!',
                        html: `
                            <p>Awaiting client to release payment</p>
                            <p class="mt-2 font-bold text-green-600" style="font-weight: bold; color: #10b981; margin-top: 8px;">Your earnings will be credited once the client releases funds.</p>
                        `,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    fetchDashboardData();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: data.message || 'Failed to complete ride',
                        icon: 'error',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to complete ride',
                    icon: 'error',
                    confirmButtonColor: '#ff5e00'
                });
            }
        }
    };

    // Cancel active ride
    const cancelActiveRide = async (rideId: string) => {
        const result = await Swal.fire({
            title: 'Cancel Ride?',
            text: 'Are you sure you want to cancel this ride? This may affect your acceptance rate.',
            icon: 'warning',
            input: 'select',
            inputOptions: {
                'emergency': 'Emergency',
                'vehicle_issue': 'Vehicle Issue',
                'traffic': 'Heavy Traffic',
                'client_no_show': 'Client Not at Pickup',
                'other': 'Other Reason'
            },
            inputPlaceholder: 'Select a reason',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, cancel ride',
            cancelButtonText: 'No, keep ride',
            preConfirm: (reason) => {
                if (!reason) {
                    Swal.showValidationMessage('Please select a reason');
                    return false;
                }
                return reason;
            }
        });

        if (result.isConfirmed) {
            try {
                const data = await api.rides.cancel(rideId, { reason: result.value });

                if (data.success) {
                    setActiveRide(null);
                    Swal.fire({
                        title: 'Cancelled',
                        text: 'Ride cancelled successfully',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    fetchDashboardData();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: data.message || 'Failed to cancel ride',
                        icon: 'error',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to cancel ride',
                    icon: 'error',
                    confirmButtonColor: '#ff5e00'
                });
            }
        }
    };

    // Withdraw funds
    const withdrawFunds = () => {
        const availableBalance = earnings.available_balance;

        if (availableBalance < 100) {
            Swal.fire({
                title: 'Insufficient Balance',
                text: 'Minimum withdrawal amount is ₦100',
                icon: 'warning',
                confirmButtonColor: '#ff5e00'
            });
            return;
        }

        Swal.fire({
            title: 'Withdraw Funds',
            html: `
                <p class="mb-4" style="margin-bottom: 16px;">Available balance: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${availableBalance.toLocaleString()}</strong></p>
                <input type="number" id="withdraw-amount" class="swal2-input" placeholder="Enter amount" min="100" max="${availableBalance}" step="100" style="margin-bottom: 12px;">
                <input type="password" id="withdraw-password" class="swal2-input" placeholder="Enter your password" style="margin-bottom: 12px;">
                <select id="bank-name" class="swal2-input" style="margin-bottom: 12px;">
                    <option value="">Select Bank</option>
                    <option value="Access Bank" data-code="044">Access Bank</option>
                    <option value="GTBank" data-code="058">GTBank</option>
                    <option value="First Bank of Nigeria" data-code="011">First Bank</option>
                    <option value="UBA" data-code="033">UBA</option>
                    <option value="Zenith Bank" data-code="057">Zenith Bank</option>
                </select>
                <input type="text" id="account-number" class="swal2-input" placeholder="Account Number" maxlength="10" style="margin-bottom: 12px;">
                <input type="text" id="account-name" class="swal2-input" placeholder="Account Name">
            `,
            showCancelButton: true,
            confirmButtonText: 'Withdraw',
            confirmButtonColor: '#ff5e00',
            preConfirm: () => {
                const amount = parseFloat((document.getElementById('withdraw-amount') as HTMLInputElement)?.value);
                const password = (document.getElementById('withdraw-password') as HTMLInputElement)?.value;
                const bankSelect = document.getElementById('bank-name') as HTMLSelectElement;
                const bank = bankSelect?.value;
                const bankCode = bankSelect?.selectedOptions?.[0]?.getAttribute('data-code') || '';
                const account = (document.getElementById('account-number') as HTMLInputElement)?.value;
                const name = (document.getElementById('account-name') as HTMLInputElement)?.value;

                if (!amount || amount < 100) {
                    Swal.showValidationMessage('Minimum withdrawal is ₦100');
                    return false;
                }
                if (amount > availableBalance) {
                    Swal.showValidationMessage('Insufficient balance');
                    return false;
                }
                if (!password) {
                    Swal.showValidationMessage('Please enter your password');
                    return false;
                }
                if (!bank) {
                    Swal.showValidationMessage('Please select a bank');
                    return false;
                }
                if (!account || account.length !== 10 || !/^\d+$/.test(account)) {
                    Swal.showValidationMessage('Please enter a valid 10-digit account number');
                    return false;
                }
                if (!name) {
                    Swal.showValidationMessage('Please enter account name');
                    return false;
                }
                return { amount, password, bank, bankCode, account, name };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Processing Withdrawal',
                    html: 'Please wait while we process your payout...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading()
                });

                try {
                    const v = result.value;
                    const data = await api.driver.requestWithdrawal({
                        amount: v.amount,
                        password: v.password,
                        bank_name: v.bank,
                        bank_code: v.bankCode,
                        account_number: v.account,
                        account_name: v.name,
                    });

                    if (data.success) {
                        Swal.fire({
                            title: 'Withdrawal Successful',
                            html: `
                                <p>Amount: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${v.amount.toLocaleString()}</strong></p>
                                <p>Bank: ${v.bank}</p>
                                <p>Account: ${v.account} (${v.name})</p>
                                <p class="mt-4 text-sm" style="margin-top: 16px; font-size: 12px; color: #666;">Funds sent to your bank account.</p>
                            `,
                            icon: 'success',
                            confirmButtonColor: '#ff5e00'
                        });
                        fetchDashboardData();
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Withdrawal Failed',
                            text: data.message || 'Failed to process withdrawal.',
                            confirmButtonColor: '#ff5e00'
                        });
                    }
                } catch (error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Connection Error',
                        text: (error instanceof Error ? error.message : '') || 'Network error. Please try again.',
                        confirmButtonColor: '#ff5e00'
                    });
                }
            }
        });
    };

    // Call client
    const callClient = (phone: string) => {
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            Swal.fire({
                title: 'No Phone Number',
                text: 'Client phone number is not available',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Navigate to location
    const navigateTo = (lat: number | null, lng: number | null) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
        } else {
            Swal.fire({
                title: 'Location Unavailable',
                text: 'Pickup location coordinates are not available',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Show detailed stats
    const showDetailedStats = () => {
        Swal.fire({
            title: 'Detailed Statistics',
            html: `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div style="background: #f9fafb; padding: 12px; border-radius: 12px; text-align: center;"><div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Total Rides</div><div style="font-size: 16px; font-weight: 700; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.total_rides}</div></div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 12px; text-align: center;"><div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Completed</div><div style="font-size: 16px; font-weight: 700; color: #10b981; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.completed_rides}</div></div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 12px; text-align: center;"><div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Cancelled</div><div style="font-size: 16px; font-weight: 700; color: #ef4444; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.cancelled_rides}</div></div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 12px; text-align: center;"><div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Acceptance Rate</div><div style="font-size: 16px; font-weight: 700; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.acceptance_rate}%</div></div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 12px; text-align: center;"><div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Total Fare</div><div style="font-size: 16px; font-weight: 700; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${earnings.total_earnings.toLocaleString()}</div></div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 12px; text-align: center;"><div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">Avg. Rating</div><div style="font-size: 16px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px; font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${driverData?.avg_rating || 0} <i class="fas fa-star" style="color: #fbbf24;"></i></div></div>
                </div>
            `,
            confirmButtonColor: '#ff5e00',
            width: '450px'
        });
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();

            if (data.success && data.notifications && data.notifications.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                data.notifications.forEach((notif: any) => {
                    html += `
                        <div style="padding: 12px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title || 'Notification'}</strong></p>
                            <p style="font-size: 13px;">${notif.message || ''}</p>
                            <p style="font-size: 11px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    title: `Notifications (${data.notifications.length})`,
                    html: html,
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            } else {
                Swal.fire({
                    title: 'Notifications',
                    text: 'No new notifications',
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Notifications',
                text: 'No new notifications',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Start countdown for pending ride
    useEffect(() => {
        if (pendingRide && !activeRide) {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
            
            setCountdown(30);
            
            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                        }
                        if (pendingRide) {
                            declineRide(pendingRide.id);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
            }
        };
    }, [pendingRide, activeRide]);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Periodic polling every 10 seconds
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const [ridesResult, pendingResult] = await Promise.allSettled([
                    api.driver.rides(5),
                    api.driver.pendingRides(),
                ]);
                if (ridesResult.status === 'fulfilled') {
                    const ridesData = ridesResult.value;
                    if (ridesData.success || ridesData.data) {
                        const rides = ridesData.data || ridesData;
                        const ridesArray = Array.isArray(rides) ? rides : (rides.data || []);
                        const active = ridesArray.find((r: any) => r.status === 'accepted' || r.status === 'ongoing');
                        setActiveRide(active || null);
                        setRecentRides(ridesArray.filter((r: any) => r.status === 'completed').slice(0, 5));
                    }
                }
                if (pendingResult.status === 'fulfilled') {
                    const data = pendingResult.value;
                    if (data.success && data.data) {
                        const pending = (Array.isArray(data.data) ? data.data : [data.data])
                            .find((r: any) => r.status === 'pending');
                        setPendingRide(pending || null);
                        if (pending) {
                            setCountdown(30);
                        }
                    }
                }
            } catch (e) {
                // silent
            }
        }, 10000);
        return () => clearInterval(pollInterval);
    }, [activeRide]);

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const firstName = (driverData?.full_name || driverData?.fullname || 'Driver').split(' ')[0];


    return (
        <div className="mobile-driver-dashboard-container">
            <div className="mobile-driver-dashboard-view">
                {/* Header */}
                <div className="mobile-driver-header">
                    <div className="mobile-driver-user-info">
                        <h1>Welcome, {firstName}!</h1>
                        <div className="mobile-driver-status">
                            <span className={`status-text-mobile ${driverStatus === 'online' ? 'online' : 'offline'}`}>
                                {driverStatus === 'online' ? '● Online' : '○ Offline'}
                            </span>
                            <span>• <span className="font-roboto-number">{stats.today_rides}</span> rides today</span>
                        </div>
                    </div>
                    <button className="mobile-driver-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* API Error Alert */}
                {apiError && (
                    <div className="mobile-api-alert">
                        <i className="fas fa-info-circle"></i>
                        <span>{apiError}</span>
                    </div>
                )}

                {/* Balance Card */}
                <div className="mobile-driver-balance-card">
                    <div className="balance-header">
                        <div>
                            <h2>Available Balance</h2>
                            <div className="balance-amount font-roboto-number">{formatCurrency(earnings.available_balance)}</div>
                            <p className="total-earnings">Total Earnings: <span className="font-roboto-number">{formatCurrency(earnings.total_earnings)}</span></p>
                        </div>
                        <i className="fas fa-wallet"></i>
                    </div>
                    <div className="today-earnings">
                        <i className="fas fa-arrow-up"></i>
                        <span>+<span className="font-roboto-number">{formatCurrency(earnings.today_earnings)}</span> today</span>
                    </div>
                </div>

                {/* Status Toggle Button */}
                <button 
                    className={`mobile-status-toggle-btn ${driverStatus}`} 
                    onClick={toggleDriverStatus} 
                    disabled={verificationStatus !== 'approved'}
                >
                    <i className="fas fa-power-off"></i>
                    <span>Go {driverStatus === 'online' ? 'Offline' : 'Online'}</span>
                </button>
                {verificationStatus !== 'approved' && (
                    <p className="verification-warning">Complete KYC to go online</p>
                )}

                {/* Withdraw Button */}
                <button className="mobile-withdraw-btn" onClick={withdrawFunds}>
                    <i className="fas fa-hand-holding-usd"></i>
                    <span>Withdraw Earnings (<span className="font-roboto-number">{formatCurrency(earnings.available_balance)}</span>)</span>
                </button>

                {/* Active Ride or Pending Ride */}
                {activeRide && (
                    <div className="mobile-active-ride-card">
                        <div className="ride-header active">
                            <span><i className="fas fa-check-circle"></i> ACTIVE RIDE</span>
                            <span className="live-badge">● Live</span>
                        </div>
                        <div className="ride-content">
                            <h3>{activeRide.pickup_address}</h3>
                            <div className="ride-info">
                                <p><i className="fas fa-user"></i> {activeRide.client_name}</p>
                                <p><i className="fas fa-phone"></i> {activeRide.client_phone}</p>
                            </div>
                            <p className="destination"><i className="fas fa-flag-checkered"></i> To: {activeRide.destination_address}</p>
                            <div className="ride-meta">
                                <span>Fare: <span className="font-roboto-number">{formatCurrency(activeRide.total_fare)}</span></span>
                                <span>Started: {activeRide.formatted_time}</span>
                            </div>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '33%' }}></div>
                        </div>
                        <div className="ride-actions">
                            <button className="action-complete" onClick={() => completeRide(activeRide.id, activeRide.driver_payout)}>
                                <i className="fas fa-check-circle"></i> Complete
                            </button>
                            <button className="action-cancel" onClick={() => cancelActiveRide(activeRide.id)}>
                                <i className="fas fa-times-circle"></i> Cancel
                            </button>
                            <button className="action-call" onClick={() => callClient(activeRide.client_phone)}>
                                <i className="fas fa-phone-alt"></i>
                            </button>
                            <button className="action-navigate" onClick={() => navigateTo(activeRide.pickup_latitude, activeRide.pickup_longitude)}>
                                <i className="fas fa-map-marked-alt"></i>
                            </button>
                        </div>
                    </div>
                )}

                {pendingRide && !activeRide && (
                    <div className={`mobile-pending-ride-card ${(pendingRide.request_type || 'public') === 'private' ? 'private' : 'public'}`}>
                        <div className={`ride-header ${(pendingRide.request_type || 'public') === 'private' ? 'private' : 'public'}`}>
                            <span><i className={`fas fa-${(pendingRide.request_type || 'public') === 'private' ? 'user-tag' : 'clock'}`}></i> {(pendingRide.request_type || 'public') === 'private' ? 'PRIVATE RIDE' : 'NEW RIDE'}</span>
                            <span className="action-badge">Action required</span>
                        </div>
                        <div className="ride-content">
                            <h3>
                                {pendingRide.pickup_address}
                                <span className={`ride-type-badge ${pendingRide.request_type || 'public'}`}>
                                    {(pendingRide.request_type || 'public').toUpperCase()}
                                </span>
                            </h3>
                            <div className="ride-info">
                                <p><i className="fas fa-user"></i> {pendingRide.client_name}</p>
                                <p><i className="fas fa-road"></i> <span className="font-roboto-number">{pendingRide.distance_km}</span> km</p>
                            </div>
                            <p className="destination"><i className="fas fa-flag-checkered"></i> To: {pendingRide.destination_address}</p>
                            <div className="ride-meta">
                                <span className="fare font-roboto-number">{formatCurrency(pendingRide.total_fare)}</span>
                                <span>Est. <span className="font-roboto-number">{Math.round((pendingRide.distance_km || 0) / 30 * 60)}</span> min</span>
                            </div>
                        </div>
                        <div className="countdown-timer">
                            <i className="fas fa-hourglass-half"></i> Accept within: <span className="timer-value font-roboto-number">{countdown}s</span>
                        </div>
                        <div className="ride-actions">
                            <button className="action-accept" onClick={() => acceptRide(pendingRide.id)}>
                                <i className="fas fa-check"></i> Accept Ride
                            </button>
                            <button className="action-decline" onClick={() => declineRide(pendingRide.id)}>
                                <i className="fas fa-times"></i> Decline
                            </button>
                        </div>
                    </div>
                )}

                {!activeRide && !pendingRide && (
                    <div className="mobile-no-ride-card">
                        <i className="fas fa-clock"></i>
                        <h3>No Active Rides</h3>
                        <p>Go online to receive ride requests</p>
                        {driverStatus !== 'online' && verificationStatus === 'approved' && (
                            <button className="go-online-btn" onClick={toggleDriverStatus}>
                                <i className="fas fa-power-off"></i> Go Online
                            </button>
                        )}
                        {verificationStatus !== 'approved' && (
                            <button className="kyc-btn" disabled>Complete KYC First</button>
                        )}
                    </div>
                )}

                {/* Completed Rides Card */}
                <div className="mobile-completed-card">
                    <div className="completed-header">
                        <h2>Completed Rides</h2>
                        <span className="today-badge">+<span className="font-roboto-number">{stats.today_rides}</span> today</span>
                    </div>
                    <div className="completed-count font-roboto-number">{stats.completed_rides}</div>
                    <div className="rating-display">
                        <div className="stars">
                            {[...Array(5)].map((_, i) => (
                                <i key={i} className={`fas fa-star ${i < Math.floor(driverData?.avg_rating || 0) ? 'text-yellow-400' : 'far fa-star text-yellow-400'}`} style={{ color: '#fbbf24' }}></i>
                            ))}
                        </div>
                        <span className="rating-value font-roboto-number">{driverData?.avg_rating || 0}</span>
                        <span className="rating-count">(<span className="font-roboto-number">{driverData?.total_reviews || 0}</span> reviews)</span>
                    </div>
                    <button className="stats-btn" onClick={showDetailedStats}>
                        <i className="fas fa-chart-line"></i> View Stats
                    </button>
                </div>

                {/* Quick Actions Grid */}
                <div className="mobile-quick-actions">
                    <button className="mobile-action-btn" onClick={toggleDriverStatus} disabled={verificationStatus !== 'approved'}>
                        <div className="action-icon"><i className={`fas fa-toggle-${driverStatus === 'online' ? 'on' : 'off'}`}></i></div>
                        <span>Go {driverStatus === 'online' ? 'Offline' : 'Online'}</span>
                    </button>
                    <button className="mobile-action-btn" onClick={() => router.visit('/ride-history')}>
                        <div className="action-icon"><i className="fas fa-calendar-check"></i></div>
                        <span>History</span>
                    </button>
                    <button className="mobile-action-btn" onClick={showDetailedStats}>
                        <div className="action-icon"><i className="fas fa-chart-line"></i></div>
                        <span>Earnings</span>
                    </button>
                    <button className="mobile-action-btn" onClick={() => router.visit('/support')}>
                        <div className="action-icon"><i className="fas fa-headset"></i></div>
                        <span>Support</span>
                    </button>
                    <button className="mobile-action-btn" onClick={() => router.visit('/driver-settings')}>
                        <div className="action-icon"><i className="fas fa-cog"></i></div>
                        <span>Settings</span>
                    </button>
                </div>

                {/* Recent Rides */}
                <div className="mobile-recent-section">
                    <div className="section-header">
                        <div className="section-title">🕒 Recent Rides</div>
                        <button className="see-all-btn" onClick={() => router.visit('/ride-history')}>See All</button>
                    </div>
                    <div className="recent-rides-list">
                        {recentRides.length > 0 ? (
                            recentRides.map((ride) => (
                                <div key={ride.id} className="recent-ride-item" onClick={() => router.visit(`/generatereceipt?rideId=${ride.id}`)}>
                                    <div className="ride-icon success">
                                        <i className="fas fa-check-circle"></i>
                                    </div>
                                    <div className="ride-details">
                                        <h4>{ride.pickup_address?.substring(0, 25)} → {ride.destination_address?.substring(0, 20)}</h4>
                                        <p>{ride.formatted_time} • {ride.client_name}</p>
                                        <p className="commission">Commission: <span className="font-roboto-number">{formatCurrency(ride.platform_commission)}</span></p>
                                    </div>
                                    <div className="ride-amount positive font-roboto-number">+{formatCurrency(ride.driver_payout)}</div>
                                </div>
                            ))
                        ) : (
                            <div className="no-recent">
                                <i className="fas fa-history"></i>
                                <p>No recent rides</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Navigation */}
                <DriverNavMobile />
            </div>
        </div>
    );
};

export default DriverDashboardMobile;