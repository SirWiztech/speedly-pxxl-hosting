<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\SocialiteController;
use App\Http\Controllers\Api\DriverBankController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\KYCController;
use App\Http\Controllers\Api\LocationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\RideController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Auth Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/admin/login', [AuthController::class, 'adminLogin']);

Route::post('/resend-otp', [AuthController::class, 'resendOtp']);
Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/reset-password', [AuthController::class, 'resetPassword']);

Route::get('/auth/google', [SocialiteController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialiteController::class, 'handleGoogleCallback']);

/*
|--------------------------------------------------------------------------
| Authenticated Routes (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/admin/logout', [AuthController::class, 'adminLogout']);

    // Me / Profile / Password
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);
    Route::post('/delete-account', [AuthController::class, 'deleteAccount']);

    /*
    |--------------------------------------------------------------------------
    | Ride Booking & Management
    |--------------------------------------------------------------------------
    */
    Route::get('/ride-types', [RideController::class, 'getRideTypes']);
    Route::get('/active-ride', [RideController::class, 'activeRide']);
    Route::get('/rides/calculate-fare', [RideController::class, 'calculateFare']);

    Route::post('/rides/book', [RideController::class, 'book']);
    Route::get('/rides/{id}', [RideController::class, 'show']);
    Route::get('/rides/{id}/receipt', [RideController::class, 'receipt']);

    // Driver ride actions
    Route::post('/rides/{id}/accept', [RideController::class, 'accept']);
    Route::post('/rides/{id}/decline', [RideController::class, 'decline']);
    Route::post('/rides/{id}/complete', [RideController::class, 'complete']);
    Route::post('/rides/{id}/cancel', [RideController::class, 'cancel']);
    Route::post('/rides/{id}/rate-driver', [RideController::class, 'rateDriver']);
    Route::post('/rides/{id}/rate-client', [RideController::class, 'rateClient']);
    Route::post('/rides/{id}/release-funds', [RideController::class, 'releaseFunds']);
    Route::post('/rides/{id}/qr-release', [RideController::class, 'qrRelease']);

    Route::get('/rides/{id}/chat', [ChatController::class, 'history']);
    Route::post('/rides/{id}/chat', [ChatController::class, 'send']);

    /*
    |--------------------------------------------------------------------------
    | Client Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('client')->prefix('client')->name('client.')->group(function () {
        Route::get('/stats', [\App\Http\Controllers\Api\ClientController::class, 'stats']);
        Route::get('/rides', [\App\Http\Controllers\Api\ClientController::class, 'rides']);
        Route::get('/rides/history', [\App\Http\Controllers\Api\ClientController::class, 'rideHistory']);
        Route::get('/wallet', [WalletController::class, 'getClientWallet']);
        Route::get('/wallet/transactions', [WalletController::class, 'getClientTransactions']);
        Route::get('/profile', [\App\Http\Controllers\Api\ClientController::class, 'profile']);
        Route::post('/profile/update', [\App\Http\Controllers\Api\ClientController::class, 'updateProfile']);
        Route::get('/locations', [LocationController::class, 'getClientLocations']);
        Route::post('/support', [\App\Http\Controllers\Api\ClientController::class, 'support']);
        Route::get('/support/tickets', [\App\Http\Controllers\Api\ClientController::class, 'supportTickets']);

        // Client KYC
        Route::get('/kyc', [KYCController::class, 'getClientKyc']);
        Route::post('/kyc/upload', [KYCController::class, 'uploadClientKyc']);
    });

    /*
    |--------------------------------------------------------------------------
    | Driver Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('driver')->prefix('driver')->name('driver.')->group(function () {
        Route::get('/stats', [DriverController::class, 'stats']);
        Route::get('/rides', [DriverController::class, 'rides']);
        Route::get('/rides/history', [DriverController::class, 'rideHistory']);
        Route::get('/rides/pending', [DriverController::class, 'pendingRides']);
        Route::get('/wallet', [WalletController::class, 'getDriverWallet']);
        Route::get('/wallet/transactions', [WalletController::class, 'getDriverTransactions']);
        Route::post('/wallet/withdraw', [WalletController::class, 'requestWithdrawal']);
        Route::post('/wallet/payout', [PaymentController::class, 'payoutWithdraw']);
        Route::get('/profile', [DriverController::class, 'profile']);
        Route::post('/profile/update', [DriverController::class, 'updateProfile']);
        Route::get('/locations', [LocationController::class, 'getDriverLocations']);
        Route::post('/toggle-status', [DriverController::class, 'toggleStatus']);
        Route::post('/update-location', [DriverController::class, 'updateLocation']);
        Route::post('/support', [DriverController::class, 'support']);
        Route::get('/support/tickets', [DriverController::class, 'supportTickets']);

        // Driver KYC
        Route::get('/kyc', [KYCController::class, 'getDriverKyc']);
        Route::post('/kyc/upload', [KYCController::class, 'uploadDriverKyc']);

        // Vehicle
        Route::post('/vehicle/update', [DriverController::class, 'updateVehicle']);

        // Bank details
        Route::get('/bank', [DriverBankController::class, 'getBankDetails']);
        Route::post('/bank/save', [DriverBankController::class, 'saveBankDetails']);
        Route::post('/bank/{id}/set-default', [DriverBankController::class, 'setDefaultBank']);
        Route::delete('/bank/{id}', [DriverBankController::class, 'removeBankAccount']);
    });

    // Nearby drivers - accessible by all authenticated users (clients find drivers)
    Route::get('/driver/nearby', [DriverController::class, 'getNearbyDrivers']);

    /*
    |--------------------------------------------------------------------------
    | Admin Routes
    |--------------------------------------------------------------------------
    */
    Route::middleware('admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/stats', [AdminController::class, 'stats']);
        Route::get('/payments', [AdminController::class, 'payments']);
        Route::get('/wallets', [AdminController::class, 'wallets']);
        Route::get('/reports', [AdminController::class, 'reports']);
        Route::get('/activity-logs', [AdminController::class, 'activityLogs']);
        Route::get('/withdrawals', [AdminController::class, 'withdrawals']);
        Route::post('/withdrawals/{id}/approve', [AdminController::class, 'approveWithdrawal']);
        Route::post('/withdrawals/{id}/reject', [AdminController::class, 'rejectWithdrawal']);
        Route::post('/settings', [AdminController::class, 'saveSettings']);
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::get('/users/{id}', [AdminController::class, 'getUser']);
        Route::post('/users/{id}/toggle-active', [AdminController::class, 'toggleUserActive']);
        Route::get('/drivers', [AdminController::class, 'drivers']);
        Route::get('/rides', [AdminController::class, 'rides']);
        Route::post('/drivers/{id}/approve', [AdminController::class, 'approveDriver']);
        Route::post('/drivers/{id}/reject', [AdminController::class, 'rejectDriver']);

        // Admin KYC management
        Route::get('/kyc/pending', [KYCController::class, 'getPendingKyc']);
        Route::post('/kyc/{id}/approve', [KYCController::class, 'approveKyc']);
        Route::post('/kyc/{id}/reject', [KYCController::class, 'rejectKyc']);

        // Admin Support Ticket management
        Route::get('/support-tickets', [AdminController::class, 'supportTickets']);
        Route::post('/support-tickets/{id}/reply', [AdminController::class, 'replySupportTicket']);
        Route::post('/support-tickets/{id}/close', [AdminController::class, 'closeSupportTicket']);

        // Places management
        Route::get('/places', [AdminController::class, 'listPlaces']);
        Route::post('/places/add', [AdminController::class, 'addPlace']);
    });

    /*
    |--------------------------------------------------------------------------
    | Notifications (all authenticated users)
    |--------------------------------------------------------------------------
    */
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/clear', [NotificationController::class, 'clear']);
    Route::post('/notifications/clear-all', [NotificationController::class, 'clearAll']);

    /*
    |--------------------------------------------------------------------------
    | Payment Routes (authenticated)
    |--------------------------------------------------------------------------
    */
    Route::post('/payment/initiate', [PaymentController::class, 'initiate']);

    /*
    |--------------------------------------------------------------------------
    | Location Services
    |--------------------------------------------------------------------------
    */
    Route::get('/location/suggestions', [LocationController::class, 'getSuggestions']);
    Route::post('/location/details', [LocationController::class, 'getPlaceDetails']);
});

/*
|--------------------------------------------------------------------------
| Payment Public Routes (no auth required)
|--------------------------------------------------------------------------
*/
Route::get('/payment/verify', [PaymentController::class, 'verify']);
Route::post('/payment/webhook/korapay', [PaymentController::class, 'webhook']);

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/payment/banks', [PaymentController::class, 'getBanks']);
    Route::post('/payment/verify-account', [PaymentController::class, 'verifyAccount']);
});
