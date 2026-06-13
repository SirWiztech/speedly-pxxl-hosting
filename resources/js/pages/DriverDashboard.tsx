import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import DriverSidebarDesktop from '../components/navbars/DriverSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import DriverDashboardMobile from '../components/mobileViewComponent/DriverDashboardMobile';
import ErrorBoundary from '../components/ErrorBoundary';
import DriverQRScanner from '../components/DriverQRScanner';
import '../../css/DriverDashboard.css';

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
}

interface RideStats {
    total_rides: number;
    completed_rides: number;
    cancelled_rides: number;
    today_rides: number;
    acceptance_rate: number;
    total_fare_amount: number;
    total_commission: number;
    avg_fare: number;
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

const DriverDashboard: React.FC = () => {
    // State
    const [driverData, setDriverData] = useState<DriverData | null>(null);
    const [earnings, setEarnings] = useState<Earnings>({
        today_earnings: 0,
        total_earnings: 0,
        available_balance: 0,
        total_withdrawn: 0
    });
    const [stats, setStats] = useState<RideStats>({
        total_rides: 0,
        completed_rides: 0,
        cancelled_rides: 0,
        today_rides: 0,
        acceptance_rate: 100,
        total_fare_amount: 0,
        total_commission: 0,
        avg_fare: 0
    });
    const [activeRide, setActiveRide] = useState<Ride | null>(null);
    const [pendingRides, setPendingRides] = useState<Ride[]>([]);
    const [recentRides, setRecentRides] = useState<RecentRide[]>([]);
    const [driverStatus, setDriverStatus] = useState<string>('offline');
    const [verificationStatus, setVerificationStatus] = useState<string>('pending');
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [showQrScanner, setShowQrScanner] = useState(false);

    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingRidesCountRef = useRef<number>(0);
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

    // Fetch driver dashboard data
    const fetchDashboardData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                api.driver.profile(),
                api.driver.stats(),
                api.driver.rides(5),
                api.driver.pendingRides(),
                api.driver.wallet(),
                api.notifications.list()
            ]);

            const [profileResult, statsResult, ridesResult, pendingResult, walletResult, notifResult] = results;

            if (profileResult.status === 'fulfilled') {
                const profileData = profileResult.value;
                if (profileData.success || profileData.data) {
                    const d = profileData.data?.user || profileData.user || profileData.data;
                    setDriverData(d);
                    setDriverStatus(d.driver_status || 'offline');
                    setVerificationStatus(d.verification_status || 'pending');
                }
            }

            if (statsResult.status === 'fulfilled') {
                const statsData = statsResult.value;
                if (statsData.success || statsData.data) {
                    const s = statsData.data || statsData;
                    setEarnings(prev => ({
                        ...prev,
                        total_earnings: s.total_earnings || 0,
                        today_earnings: s.today_earnings || 0,
                    }));
                    setStats({
                        total_rides: s.total_rides || 0,
                        completed_rides: s.completed_rides || 0,
                        cancelled_rides: s.cancelled_rides || 0,
                        acceptance_rate: s.acceptance_rate || 100,
                        total_fare_amount: s.total_fare_amount || 0,
                        total_commission: s.total_commission || 0,
                        today_rides: s.today_rides || 0,
                        avg_fare: s.avg_fare || 0,
                    });
                    setDriverData(prev => prev ? {
                        ...prev,
                        avg_rating: s.average_rating || prev.avg_rating || 0,
                        total_reviews: s.total_reviews || prev.total_reviews || 0,
                    } : prev);
                }
            }

            if (walletResult.status === 'fulfilled') {
                const walletData = walletResult.value;
                if (walletData.success || walletData.data) {
                    const w = walletData.data || walletData;
                    const stats = w.stats || w;
                    setEarnings(prev => ({
                        ...prev,
                        available_balance: stats.wallet_balance || 0,
                        total_earnings: stats.total_earnings || prev.total_earnings,
                        today_earnings: stats.today_earnings || prev.today_earnings,
                    }));
                }
            }

            if (notifResult.status === 'fulfilled') {
                const notifData = notifResult.value;
                if (notifData.success || notifData.data) {
                    const notifs = notifData.data?.data || notifData.notifications || notifData.data?.notifications || [];
                    const unread = notifs.filter((n: any) => n.is_read === false || n.is_read === 0).length;
                    setNotificationCount(unread);
                }
            }

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
                const pendingData = pendingResult.value;
                if (pendingData.success && pendingData.data) {
                    const pendingArray = Array.isArray(pendingData.data) ? pendingData.data : [];
                    setPendingRides(pendingArray);
                    pendingRidesCountRef.current = pendingArray.length;
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
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
                    setPendingRides(prev => prev.filter(r => r.id !== rideId));
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
                <p class="mt-2 font-bold text-green-600">You will earn: <span style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${payout.toLocaleString()}</span></p>
                <div class="mt-4">
                    <label class="block text-sm text-gray-600 mb-2">Rate the client (optional)</label>
                    <div class="flex justify-center gap-2 text-2xl rating-stars">
                        <i class="far fa-star rating-star" data-rating="1"></i>
                        <i class="far fa-star rating-star" data-rating="2"></i>
                        <i class="far fa-star rating-star" data-rating="3"></i>
                        <i class="far fa-star rating-star" data-rating="4"></i>
                        <i class="far fa-star rating-star" data-rating="5"></i>
                    </div>
                </div>
                <textarea id="review-comment" class="swal2-textarea mt-4" placeholder="Leave a comment (optional)"></textarea>
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

                if (selectedRating > 0) {
                    await api.rides.rateClient(rideId, { rating: selectedRating, comment: reviewComment });
                }

                if (data.success) {
                    Swal.fire({
                        title: 'Ride Marked Complete!',
                        html: `
                            <p>Ride has been marked as completed.</p>
                            <p class="mt-2 font-bold text-amber-600">Status: Awaiting client to release payment</p>
                            <p class="mt-1 text-sm text-gray-500">Your earnings of ₦${payout.toLocaleString()} will be credited once the client releases the funds.</p>
                        `,
                        icon: 'success',
                        timer: 3000,
                        showConfirmButton: true,
                        confirmButtonColor: '#ff5e00',
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
            } catch (error: any) {
                console.error('Complete ride error:', error);
                Swal.fire({
                    title: 'Error',
                    text: error?.message || 'Failed to complete ride',
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

    // QR release handler
    const handleQrRelease = async (rideId: string, token: string) => {
        setShowQrScanner(false);
        Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const data = await api.rides.qrRelease(rideId, token);
            Swal.close();
            if (data.success) {
                Swal.fire({ icon: 'success', title: 'Funds Released!', text: data.message || 'Payment has been processed via QR scan.', confirmButtonColor: '#ff5e00' });
                fetchDashboardData();
            } else {
                Swal.fire({ icon: 'error', title: 'Failed', text: data.message || 'Invalid QR code', confirmButtonColor: '#ff5e00' });
            }
        } catch (e: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'Failed to process QR release', confirmButtonColor: '#ff5e00' });
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
                <p class="mb-4">Available balance: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${availableBalance.toLocaleString()}</strong></p>
                <input type="number" id="withdraw-amount" class="swal2-input" placeholder="Enter amount" min="100" max="${availableBalance}" step="100">
                <div style="margin-top: 12px;">
                    <input type="password" id="withdraw-password" class="swal2-input" placeholder="Enter your password" style="margin-top: 8px;">
                </div>
                <select id="bank-name" class="swal2-input" style="margin-top: 8px;">
                    <option value="">Select Bank</option>
                    <option value="Access Bank" data-code="044">Access Bank</option>
                    <option value="GTBank" data-code="058">GTBank</option>
                    <option value="First Bank of Nigeria" data-code="011">First Bank</option>
                    <option value="UBA" data-code="033">UBA</option>
                    <option value="Zenith Bank" data-code="057">Zenith Bank</option>
                    <option value="Fidelity Bank" data-code="070">Fidelity Bank</option>
                    <option value="Union Bank" data-code="032">Union Bank</option>
                    <option value="Sterling Bank" data-code="232">Sterling Bank</option>
                    <option value="Polaris Bank" data-code="076">Polaris Bank</option>
                    <option value="Stanbic IBTC" data-code="221">Stanbic IBTC</option>
                    <option value="Opay" data-code="999992">Opay</option>
                    <option value="PalmPay" data-code="999991">PalmPay</option>
                </select>
                <input type="text" id="account-number" class="swal2-input" placeholder="Account Number (10 digits)" maxlength="10" style="margin-top: 8px;">
                <input type="text" id="account-name" class="swal2-input" placeholder="Account Name" style="margin-top: 8px;">
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
                return { amount, password, bank, bankCode, account, name };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                try {
                    const data = await api.driver.requestWithdrawal({ 
                        amount: result.value.amount, 
                        password: result.value.password,
                        bank_name: result.value.bank,
                        bank_code: result.value.bankCode,
                        account_number: result.value.account,
                        account_name: result.value.name,
                    });
                    Swal.close();
                    if (data.success) {
                        Swal.fire({
                            title: 'Withdrawal Successful',
                            html: `
                                <p>Amount: <strong style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${result.value.amount.toLocaleString()}</strong></p>
                                <p class="mt-4 text-sm text-gray-500">Funds sent to your bank account.</p>
                            `,
                            icon: 'success',
                            confirmButtonColor: '#ff5e00'
                        });
                        fetchDashboardData();
                    } else {
                        Swal.fire({ icon: 'error', title: 'Withdrawal Failed', text: data.message || 'Please add bank details in Settings first', confirmButtonColor: '#ff5e00' });
                    }
                } catch (error) {
                    Swal.close();
                    Swal.fire({ icon: 'error', title: 'Error', text: (error instanceof Error ? error.message : '') || 'Failed to process withdrawal', confirmButtonColor: '#ff5e00' });
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
                <div class="stats-grid">
                    <div class="stat-item"><div class="stat-label">Total Rides</div><div class="stat-value" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.total_rides}</div></div>
                    <div class="stat-item"><div class="stat-label">Completed</div><div class="stat-value text-green-600" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.completed_rides}</div></div>
                    <div class="stat-item"><div class="stat-label">Cancelled</div><div class="stat-value text-red-600" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.cancelled_rides}</div></div>
                    <div class="stat-item"><div class="stat-label">Acceptance Rate</div><div class="stat-value" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${stats.acceptance_rate}%</div></div>
                    <div class="stat-item"><div class="stat-label">Total Fare</div><div class="stat-value" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${stats.total_fare_amount.toLocaleString()}</div></div>
                    <div class="stat-item"><div class="stat-label">Platform Commission</div><div class="stat-value text-red-600" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">-₦${stats.total_commission.toLocaleString()}</div></div>
                    <div class="stat-item col-span-2"><div class="stat-label">Net Earnings</div><div class="stat-value text-green-600" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">₦${(stats.total_fare_amount - stats.total_commission).toLocaleString()}</div></div>
                    <div class="stat-item col-span-2"><div class="stat-label">Average Rating</div><div class="stat-value flex items-center justify-center gap-2" style="font-family: 'Roboto', sans-serif; font-variant-numeric: tabular-nums;">${driverData?.avg_rating || 0} ${'★'.repeat(Math.floor(driverData?.avg_rating || 0))}${'☆'.repeat(5 - Math.floor(driverData?.avg_rating || 0))}</div></div>
                </div>
            `,
            confirmButtonColor: '#ff5e00',
            width: '600px'
        });
    };

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifications = data.data?.data || data.notifications || data.data?.notifications || [];

            if (notifications.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifications.forEach((notif: any) => {
                    html += `
                        <div style="padding: 12px; border-bottom: 1px solid #eee;">
                            <p><strong>${notif.title || 'Notification'}</strong></p>
                            <p style="font-size: 13px; color: #666;">${notif.message || ''}</p>
                            <p style="font-size: 11px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                    `;
                });
                html += '</div>';

                Swal.fire({
                    title: `Notifications (${notifications.length})`,
                    html: html,
                    icon: 'info',
                    confirmButtonColor: '#ff5e00',
                    confirmButtonText: 'Close'
                });
            } else {
                Swal.fire({
                    title: 'Notifications',
                    html: '<p>🔔 No new notifications</p>',
                    icon: 'info',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                title: 'Notifications',
                html: '<p>🔔 No new notifications</p>',
                icon: 'info',
                confirmButtonColor: '#ff5e00'
            });
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

    // Format date
    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Initial data fetch
    useEffect(() => {
        fetchDashboardData();

        // Periodic refresh every 10 seconds
        const interval = setInterval(() => {
            Promise.allSettled([
                api.driver.rides(5),
                api.driver.pendingRides(),
            ]).then(([ridesResult, pendingResult]) => {
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
                    const pendingData = pendingResult.value;
                    if (pendingData.success && pendingData.data) {
                        const pendingArray = Array.isArray(pendingData.data) ? pendingData.data : [];
                        const hadRideBefore = pendingRidesCountRef.current > 0;
                        setPendingRides(pendingArray);
                        pendingRidesCountRef.current = pendingArray.length;
                        if (driverStatus === 'online' && pendingArray.length > 0 && !hadRideBefore) {
                            Swal.fire({
                                title: 'New Ride Request!',
                                text: `${pendingArray.length} ride(s) available`,
                                icon: 'info',
                                timer: 4000,
                                showConfirmButton: false
                            });
                        }
                    }
                }
            }).catch(err => console.error('Polling error:', err));
        }, 10000);

        return () => clearInterval(interval);
    }, [fetchDashboardData, driverStatus]);


    const firstName = (driverData?.fullname || driverData?.full_name)?.split(' ')[0] || 'Driver';
    const driverInitial = (driverData?.fullname || driverData?.full_name)?.charAt(0)?.toUpperCase() || 'D';

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view
    if (isMobile) {
        return <DriverDashboardMobile />;
    }

    return (
        <div className="driver-desktop-container">
            <DriverSidebarDesktop 
                userName={driverData?.fullname || driverData?.full_name || 'Driver'} 
                userRole="driver"
                profilePictureUrl={driverData?.profile_picture_url}
                driverStatus={driverStatus}
                verificationStatus={verificationStatus}
            />

            <div className="driver-desktop-main">
                {/* Header */}
                <div className="driver-desktop-header">
                    <div className="driver-desktop-title">
                        <h1>Ready to drive, {firstName}!</h1>
                        <div className="driver-status-line">
                            {driverStatus === 'online' ? (
                                <>
                                    <span className="status-dot online"></span>
                                    <span className="status-text online">Online</span>
                                </>
                            ) : (
                                <>
                                    <span className="status-dot offline"></span>
                                    <span className="status-text offline">Offline</span>
                                </>
                            )}
                            • <span className="font-roboto-number">{stats.today_rides}</span> rides today
                        </div>
                    </div>
                    <div className="driver-desktop-actions">
                        <button className="driver-notification-btn" onClick={checkNotifications}>
                            <i className="fas fa-bell"></i>
                            {notificationCount > 0 && <span className="notification-badge font-roboto-number">{notificationCount}</span>}
                        </button>
                        <div className="online-badge">
                            <span className="pulse"></span>
                            <span><span className="font-roboto-number">{stats.today_rides}</span> rides today</span>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="driver-stats-grid">
                    {/* Earnings Card */}
                    <div className="driver-card earnings-card">
                        <div className="earnings-header">
                            <div>
                                <h2>Available Balance</h2>
                                <div className="balance-amount font-roboto-number">{formatCurrency(earnings.available_balance)}</div>
                                <p className="total-earnings">Total Earnings: <span className="font-roboto-number">{formatCurrency(earnings.total_earnings)}</span></p>
                            </div>
                            <i className="fas fa-wallet"></i>
                        </div>
                        <div className="today-earnings">
                            <i className="fas fa-arrow-up"></i>
                            <span>+<span className="font-roboto-number">{formatCurrency(earnings.today_earnings)}</span> (today)</span>
                        </div>
                        <button className="withdraw-btn-desktop" onClick={withdrawFunds}>
                            <i className="fas fa-hand-holding-usd"></i> Withdraw funds
                        </button>
                    </div>

                    {/* Status Card */}
                    <div className="driver-card status-card">
                        <h2>Driver Status</h2>
                        <div className="status-display">
                            <div className="status-icon">
                                {driverStatus === 'online' ? (
                                    <i className="fas fa-toggle-on text-green-500"></i>
                                ) : (
                                    <i className="fas fa-toggle-off text-gray-400"></i>
                                )}
                            </div>
                            <div className="status-name">{driverStatus === 'online' ? 'Online' : 'Offline'}</div>
                            <span className={`status-badge ${driverStatus}`}>
                                {driverStatus === 'online' ? '● ONLINE' : '○ OFFLINE'}
                            </span>
                        </div>
                        <button className={`status-toggle-btn ${driverStatus}`} onClick={toggleDriverStatus} disabled={verificationStatus !== 'approved'}>
                            <i className="fas fa-power-off"></i>
                            <span>Go {driverStatus === 'online' ? 'Offline' : 'Online'}</span>
                        </button>
                        {verificationStatus !== 'approved' && (
                            <p className="verification-warning">Complete KYC to go online</p>
                        )}
                    </div>

                    {/* Completed Rides Card */}
                    <div className="driver-card completed-card">
                        <div className="completed-header">
                            <h2>Completed rides</h2>
                            <span className="today-badge">+<span className="font-roboto-number">{stats.today_rides}</span> today</span>
                        </div>
                        <div className="completed-count font-roboto-number">{stats.completed_rides}</div>
                        <div className="rating-display">
                            <div className="stars">
                                {[...Array(5)].map((_, i) => (
                                    <i key={i} className={`fas fa-star ${i < Math.floor(driverData?.avg_rating || 0) ? 'text-yellow-400' : i < Math.ceil(driverData?.avg_rating || 0) && (driverData?.avg_rating || 0) % 1 >= 0.5 ? 'fas fa-star-half-alt text-yellow-400' : 'far fa-star text-yellow-400'}`}></i>
                                ))}
                            </div>
                            <span className="rating-value font-roboto-number">{driverData?.avg_rating || 0}</span>
                            <span className="rating-count">(<span className="font-roboto-number">{driverData?.total_reviews || 0}</span> reviews)</span>
                        </div>
                        <button className="stats-btn" onClick={showDetailedStats}>
                            <i className="fas fa-chart-pie"></i> View detailed stats
                        </button>
                    </div>

                    {/* Active/Pending Ride */}
                    {activeRide && (
                        <div className="driver-card active-ride-card">
                            <div className="ride-header active">
                                <span><i className="fas fa-check-circle"></i> ACTIVE RIDE IN PROGRESS</span>
                                <span className="live-badge">● Live</span>
                            </div>
                            <div className="ride-content">
                                <div className="ride-icon">
                                    <i className="fas fa-map-marker-alt"></i>
                                </div>
                                <div className="ride-details">
                                    <h3>{activeRide.pickup_address}</h3>
                                    <div className="ride-info-grid">
                                        <div>
                                            <p className="label">Client</p>
                                            <p className="value"><i className="fas fa-user"></i> {activeRide.client_name}</p>
                                        </div>
                                        <div>
                                            <p className="label">Contact</p>
                                            <p className="value"><i className="fas fa-phone"></i> {activeRide.client_phone}</p>
                                        </div>
                                    </div>
                                    <p className="destination"><i className="fas fa-flag-checkered"></i> To: {activeRide.destination_address}</p>
                                    <div className="ride-meta">
                                        <span><i className="fas fa-money-bill-wave"></i> Fare: <span className="font-roboto-number">{formatCurrency(activeRide.total_fare)}</span></span>
                                        <span><i className="fas fa-clock"></i> Started: {formatTime(activeRide.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: '33%' }}></div>
                            </div>
                            <div className="ride-actions">
                                <button className="action-complete" onClick={() => completeRide(activeRide.id, activeRide.driver_payout)}>
                                    <i className="fas fa-check-circle"></i> Complete Ride
                                </button>
                                <button className="action-cancel" onClick={() => cancelActiveRide(activeRide.id)}>
                                    <i className="fas fa-times-circle"></i> Cancel Ride
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

                    {pendingRides.length > 0 && !activeRide && (
                        <div className="pending-rides-section">
                            <div className="section-header">
                                <h3>Available Rides ({pendingRides.length})</h3>
                            </div>
                            {pendingRides.map((ride) => (
                                <div key={ride.id} className={`driver-card pending-ride-card ${(ride.request_type || 'public') === 'private' ? 'private' : 'public'}`}>
                                    <div className={`ride-header ${(ride.request_type || 'public') === 'private' ? 'private' : 'public'}`}>
                                        <span><i className={`fas fa-${(ride.request_type || 'public') === 'private' ? 'user-tag' : 'clock'}`}></i> {(ride.request_type || 'public') === 'private' ? 'PRIVATE RIDE REQUEST' : 'NEW RIDE REQUEST'}</span>
                                        <span className="action-badge">Action required</span>
                                    </div>
                                    <div className="ride-content">
                                        <div className="ride-icon">
                                            <i className="fas fa-map-marker-alt"></i>
                                        </div>
                                        <div className="ride-details">
                                            <h3>
                                                {ride.pickup_address}
                                                <span className={`ride-type-badge ${ride.request_type || 'public'}`}>
                                                    {(ride.request_type || 'public').toUpperCase()}
                                                </span>
                                            </h3>
                                            <div className="ride-info-grid">
                                                <div>
                                                    <p className="label">Client</p>
                                                    <p className="value"><i className="fas fa-user"></i> {ride.client_name}</p>
                                                </div>
                                                <div>
                                                    <p className="label">Fare</p>
                                                    <p className="value"><i className="fas fa-tag"></i> <span className="font-roboto-number">{formatCurrency(ride.total_fare)}</span></p>
                                                </div>
                                                <div>
                                                    <p className="label">Distance</p>
                                                    <p className="value"><i className="fas fa-road"></i> <span className="font-roboto-number">{ride.distance_km}</span> km</p>
                                                </div>
                                                <div>
                                                    <p className="label">Est. Time</p>
                                                    <p className="value"><i className="fas fa-clock"></i> <span className="font-roboto-number">{Math.round((ride.distance_km || 0) / 30 * 60)}</span> min</p>
                                                </div>
                                            </div>
                                            <p className="destination"><i className="fas fa-flag-checkered"></i> To: {ride.destination_address}</p>
                                        </div>
                                    </div>
                                    <div className="ride-actions">
                                        <button className="action-accept" onClick={() => acceptRide(ride.id)}>
                                            <i className="fas fa-check"></i> Accept Ride
                                        </button>
                                        <button className="action-decline" onClick={() => declineRide(ride.id)}>
                                            <i className="fas fa-times"></i> Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!activeRide && pendingRides.length === 0 && (
                        <div className="driver-card no-ride-card">
                            <div className="no-ride-content">
                                <i className="fas fa-clock"></i>
                                <h3>No Active Rides</h3>
                                <p>Go online to start receiving ride requests</p>
                                {driverStatus !== 'online' && verificationStatus === 'approved' && (
                                    <button className="go-online-btn" onClick={toggleDriverStatus}>
                                        <i className="fas fa-power-off"></i> Go Online Now
                                    </button>
                                )}
                                {verificationStatus !== 'approved' && (
                                    <button className="kyc-btn" disabled>Complete KYC First</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="driver-card quick-actions-card">
                        <h2>Driver Quick Actions</h2>
                        <div className="quick-actions-grid">
                            <button className="quick-action-btn" onClick={toggleDriverStatus} disabled={verificationStatus !== 'approved'}>
                                <i className="fas fa-power-off"></i>
                                <span>Go {driverStatus === 'online' ? 'Offline' : 'Online'}</span>
                            </button>
                            <button className="quick-action-btn" onClick={withdrawFunds}>
                                <i className="fas fa-hand-holding-usd"></i>
                                <span>Withdraw</span>
                            </button>
                            <button className="quick-action-btn" onClick={() => router.visit('/support')}>
                                <i className="fas fa-headset"></i>
                                <span>Support</span>
                            </button>
                            <button className="quick-action-btn" onClick={() => setShowQrScanner(true)}>
                                <i className="fas fa-qrcode"></i>
                                <span>Scan QR</span>
                            </button>
                            <button className="quick-action-btn" onClick={showDetailedStats}>
                                <i className="fas fa-chart-bar"></i>
                                <span>My stats</span>
                            </button>
                            <button className="quick-action-btn" onClick={() => router.visit('/driver-settings')}>
                                <i className="fas fa-cog"></i>
                                <span>Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Trips */}
                    <div className="driver-card recent-trips-card">
                        <div className="recent-header">
                            <h2>📋 Recent Trips</h2>
                            <button className="see-all-btn" onClick={() => router.visit('/ride-history')}>See all →</button>
                        </div>
                        <div className="recent-trips-list">
                            {recentRides.length > 0 ? (
                                recentRides.map((ride) => (
                                    <div key={ride.id} className="recent-trip-item" onClick={() => router.visit(`/generatereceipt?rideId=${ride.id}`)}>
                                        <div className="trip-icon">
                                            <i className="fas fa-check"></i>
                                        </div>
                                        <div className="trip-details">
                                            <h4>{ride.pickup_address?.substring(0, 30)} → {ride.destination_address?.substring(0, 25)}</h4>
                                            <p>{ride.formatted_time} • {ride.client_name}</p>
                                            <p className="commission">Commission: <span className="font-roboto-number">{formatCurrency(ride.platform_commission)}</span></p>
                                        </div>
                                        <div className="trip-amount positive font-roboto-number">+{formatCurrency(ride.driver_payout)}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-recent">
                                    <i className="fas fa-history"></i>
                                    <p>No recent trips</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Banner */}
                <div className="driver-bottom-banner">
                    <div className="banner-info">
                        <h2>Drive more, earn more 🚀</h2>
                        <p>Complete 10 rides this weekend → ₦8,000 bonus. {stats.today_rides} rides done.</p>
                        <div className="banner-stats">
                            <div><span className="stat-value font-roboto-number">₦{stats.today_rides > 0 ? Math.round(earnings.today_earnings / stats.today_rides) : 0}</span><span className="stat-label">avg/ride</span></div>
                            <div><span className="stat-value font-roboto-number">{stats.acceptance_rate}%</span><span className="stat-label">acceptance</span></div>
                        </div>
                    </div>
                    <button className="banner-action-btn" onClick={toggleDriverStatus} disabled={verificationStatus !== 'approved'}>
                        <i className="fas fa-car"></i> {driverStatus === 'online' ? 'Go Offline' : 'Find rides'}
                    </button>
                </div>
            </div>

            {showQrScanner && (
                <DriverQRScanner
                    onClose={() => setShowQrScanner(false)}
                    onRelease={handleQrRelease}
                />
            )}
        </div>
    );
};

const WrappedDriverDashboard: React.FC = () => (
    <ErrorBoundary>
        <DriverDashboard />
    </ErrorBoundary>
);

export default WrappedDriverDashboard;