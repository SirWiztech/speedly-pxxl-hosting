<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\DriverProfile;
use App\Models\DriverWithdrawal;
use App\Models\DriverBankDetail;
use App\Models\Notification;
use App\Models\Ride;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;

class WalletController extends Controller
{
    public function getClientWallet(Request $request)
    {
        $user = $request->user();

        $creditTypes = ['deposit', 'bonus', 'referral', 'ride_refund', 'credit'];
        $debitTypes = ['withdrawal', 'ride_payment', 'debit'];

        $credits = WalletTransaction::where('user_id', $user->id)
            ->whereIn('transaction_type', $creditTypes)
            ->where('status', 'completed')->sum('amount');
        $debits = WalletTransaction::where('user_id', $user->id)
            ->whereIn('transaction_type', $debitTypes)
            ->where('status', 'completed')->sum('amount');
        $balance = $credits - $debits;

        $recentTransactions = WalletTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')->limit(10)->get()
            ->map(function ($t) {
                return $this->formatTransaction($t);
            });

        $rideCount = Ride::where('client_id', function ($q) use ($user) {
            $q->select('id')->from('client_profiles')->where('user_id', $user->id);
        })->count();

        $notifCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)->count();

        return response()->json([
            'success' => true,
            'message' => 'Wallet info retrieved',
            'data' => [
                'balance' => (float) $balance,
                'currency' => 'NGN',
                'ride_count' => $rideCount,
                'recent_transactions' => $recentTransactions,
                'user' => [
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'profile_picture_url' => $user->profile_picture_url,
                ],
                'notification_count' => $notifCount,
                'payment_methods' => [],
            ]
        ]);
    }

    private function formatTransaction($t)
    {
        $creditTypes = ['deposit', 'bonus', 'referral', 'ride_refund', 'credit'];
        return [
            'id' => $t->id,
            'transaction_type' => $t->transaction_type,
            'amount' => (float) $t->amount,
            'formatted_amount' => number_format((float) $t->amount, 2),
            'status' => $t->status ?? 'completed',
            'created_at' => $t->created_at,
            'date' => $t->created_at ? Carbon::parse($t->created_at)->format('M d, Y h:i A') : '',
            'reference' => $t->reference,
            'description' => $t->description,
            'balance_before' => (float) ($t->balance_before ?? 0),
            'balance_after' => (float) ($t->balance_after ?? 0),
            'ride_number' => null,
            'display_id' => substr($t->id, 0, 8) . '...',
            'is_credit' => in_array($t->transaction_type, $creditTypes),
            'type_display' => $t->category ? ucfirst(str_replace('_', ' ', $t->category)) : (in_array($t->transaction_type, $creditTypes) ? 'Deposit' : 'Withdrawal'),
        ];
    }

    public function getDriverWallet(Request $request)
    {
        $user = $request->user();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        $creditTypes = ['deposit', 'bonus', 'referral', 'ride_refund', 'credit'];
        $debitTypes = ['withdrawal', 'ride_payment', 'debit'];

        $credits = WalletTransaction::where('user_id', $user->id)
            ->whereIn('transaction_type', $creditTypes)
            ->where('status', 'completed')->sum('amount');
        $debits = WalletTransaction::where('user_id', $user->id)
            ->whereIn('transaction_type', $debitTypes)
            ->where('status', 'completed')->sum('amount');
        $balance = $credits - $debits;

        $totalEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->sum('amount');

        $todayEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->where('created_at', '>=', $today)
            ->sum('amount');

        $weekEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->where('created_at', '>=', $startOfWeek)
            ->sum('amount');

        $monthEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('amount');

        $totalWithdrawn = 0;
        $pendingWithdrawals = 0;
        if ($driverProfile) {
            $totalWithdrawn = DriverWithdrawal::where('driver_id', $driverProfile->id)
                ->whereIn('status', ['approved', 'paid'])->sum('amount');
            $pendingWithdrawals = DriverWithdrawal::where('driver_id', $driverProfile->id)
                ->where('status', 'pending')->sum('amount');
        }

        $notificationCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        $userData = [
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            'profile_picture_url' => $user->profile_picture_url,
        ];

        return response()->json([
            'success' => true,
            'message' => 'Driver wallet info retrieved',
            'data' => [
                'stats' => [
                    'wallet_balance' => (float) $balance,
                    'total_earnings' => (float) $totalEarnings,
                    'total_withdrawn' => (float) $totalWithdrawn,
                    'today_earnings' => (float) $todayEarnings,
                    'week_earnings' => (float) $weekEarnings,
                    'month_earnings' => (float) $monthEarnings,
                    'pending_withdrawals' => (float) $pendingWithdrawals,
                ],
                'user' => $userData,
                'notification_count' => $notificationCount,
            ]
        ]);
    }

    public function getClientTransactions(Request $request)
    {
        $user = $request->user();

        $query = WalletTransaction::where('user_id', $user->id);

        if ($request->has('type') && in_array($request->type, ['credit', 'debit'])) {
            $query->where('transaction_type', $request->type);
        }

        $paginated = $query->orderBy('created_at', 'desc')
            ->paginate(15);

        $transactions = collect($paginated->items())->map(function ($t) {
            return $this->formatTransaction($t);
        });

        return response()->json([
            'success' => true,
            'message' => 'Transactions retrieved',
            'data' => [
                'transactions' => $transactions,
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'total' => $paginated->total(),
            ]
        ]);
    }

    public function getDriverTransactions(Request $request)
    {
        $user = $request->user();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        $recentRides = [];
        $withdrawals = [];

        if ($driverProfile) {
            $rides = Ride::where('driver_id', $driverProfile->id)
                ->where('status', 'completed')
                ->with('client.user')
                ->orderBy('created_at', 'DESC')
                ->limit(15)
                ->get();

            $recentRides = $rides->map(function ($ride) {
                return [
                    'id' => $ride->id,
                    'ride_number' => $ride->ride_number,
                    'total_fare' => (float) $ride->total_fare,
                    'driver_payout' => (float) $ride->driver_payout,
                    'created_at' => $ride->created_at,
                    'formatted_date' => $ride->created_at ? $ride->created_at->format('M d, Y') : '',
                    'formatted_time' => $ride->created_at ? $ride->created_at->format('h:i A') : '',
                    'pickup_address' => $ride->pickup_address,
                    'destination_address' => $ride->destination_address,
                    'client_name' => $ride->client?->user?->full_name ?? 'Unknown',
                ];
            });

            $withdrawals = DriverWithdrawal::where('driver_id', $driverProfile->id)
                ->orderBy('created_at', 'DESC')
                ->limit(20)
                ->get()
                ->map(function ($w) {
                    return [
                        'id' => $w->id,
                        'amount' => (float) $w->amount,
                        'bank_name' => $w->bank_name,
                        'account_number' => $w->account_number,
                        'account_name' => $w->account_name,
                        'status' => $w->status,
                        'created_at' => $w->created_at,
                        'formatted_date' => $w->created_at ? $w->created_at->format('M d, Y') : '',
                    ];
                });
        }

        return response()->json([
            'success' => true,
            'message' => 'Transactions retrieved',
            'data' => [
                'recent_rides' => $recentRides,
                'withdrawals' => $withdrawals,
            ]
        ]);
    }

    private const BANK_CODES = [
        'Access Bank' => '044',
        'Access Bank (Diamond)' => '063',
        'Access Mobile' => '323',
        'Carbon' => '565',
        'Chipper Cash' => '552',
        'Citibank Nigeria' => '023',
        'Coronation Merchant Bank' => '559',
        'Ecobank Nigeria' => '050',
        'Ekondo Microfinance Bank' => '562',
        'Enterprise Bank' => '084',
        'Fidelity Bank' => '070',
        'Firmus MFB' => '573',
        'First Bank of Nigeria' => '011',
        'First City Monument Bank (FCMB)' => '214',
        'Globus Bank' => '001',
        'GoMoney' => '602',
        'Guaranty Trust Bank (GTBank)' => '058',
        'GTBank' => '058',
        'Heritage Bank' => '030',
        'Jaiz Bank' => '301',
        'Keystone Bank' => '082',
        'Kuda Bank' => '50211',
        'Kuda Microfinance Bank' => '50211',
        'Mint Finex MFB' => '563',
        'Moniepoint' => '50515',
        'Moniepoint Microfinance Bank' => '50515',
        'OPay' => '999992',
        'Opay' => '999992',
        'Paga' => '327',
        'PalmPay' => '999991',
        'Parallex Bank' => '526',
        'Polaris Bank' => '076',
        'Providus Bank' => '101',
        'Rubies MFB' => '125',
        'Sparkle Microfinance Bank' => '513',
        'Stanbic IBTC Bank' => '221',
        'Standard Chartered Bank' => '068',
        'Sterling Bank' => '232',
        'Suntrust Bank' => '100',
        'TAJ Bank' => '302',
        'Tanadi MFB' => '090592',
        'Titan Bank' => '102',
        'UBA' => '033',
        'Union Bank of Nigeria' => '032',
        'United Bank for Africa (UBA)' => '033',
        'Unity Bank' => '215',
        'VFD Microfinance Bank' => '566',
        'Wema Bank' => '035',
        'Zenith Bank' => '057',
    ];

    private function getBankCode(string $bankName): string
    {
        return self::BANK_CODES[$bankName] ?? self::BANK_CODES['GTBank'];
    }

    public function requestWithdrawal(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:100',
            'password' => 'required|string',
            'bank_name' => 'sometimes|string|max:100',
            'bank_code' => 'sometimes|string|max:20',
            'account_number' => 'sometimes|string|max:20',
            'account_name' => 'sometimes|string|max:255',
        ]);

        $user = $request->user();
        $amount = $validated['amount'];

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password',
                'data' => null,
            ], 401);
        }

        $driverProfile = DriverProfile::where('user_id', $user->id)->first();
        if (!$driverProfile) {
            return response()->json(['success' => false, 'message' => 'Driver profile not found', 'data' => null]);
        }

        $creditTypes = ['deposit', 'bonus', 'referral', 'ride_refund', 'credit'];
        $debitTypes = ['withdrawal', 'ride_payment', 'debit'];
        $credits = WalletTransaction::where('user_id', $user->id)
            ->whereIn('transaction_type', $creditTypes)
            ->where('status', 'completed')->sum('amount');
        $debits = WalletTransaction::where('user_id', $user->id)
            ->whereIn('transaction_type', $debitTypes)
            ->where('status', 'completed')->sum('amount');
        $availableBalance = $credits - $debits;

        if ($amount > $availableBalance) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient balance. Available: ₦' . number_format($availableBalance, 2),
                'data' => null,
            ], 400);
        }

        $bankDetail = DriverBankDetail::where('driver_id', $driverProfile->id)->first();

        $bankName = $validated['bank_name'] ?? $bankDetail->bank_name ?? '';
        $accountNumber = $validated['account_number'] ?? $bankDetail->account_number ?? '';
        $accountName = $validated['account_name'] ?? $bankDetail->account_name ?? '';
        $bankCode = $validated['bank_code'] ?? $this->getBankCode($bankName);

        if (empty($accountNumber) || empty($accountName)) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide bank account details',
                'data' => null,
            ], 400);
        }

        $secretKey = env('KORAPAY_SECRET_KEY', '');
        if (empty($secretKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not configured',
                'data' => null,
            ], 502);
        }

        $reference = 'WTH-' . strtoupper(Str::random(8)) . '-' . now()->format('YmdHis');

        try {
            $korapayResponse = Http::timeout(30)->withOptions(['verify' => false])->withToken($secretKey)
                ->post('https://api.korapay.com/merchant/api/v1/transactions/disburse', [
                    'reference' => $reference,
                    'destination' => [
                        'type' => 'bank_account',
                        'amount' => (string) $amount,
                        'currency' => 'NGN',
                        'narration' => 'Driver withdrawal - ' . $user->full_name,
                        'bank_account' => [
                            'bank' => $bankCode,
                            'account' => $accountNumber,
                            'account_name' => $accountName,
                        ],
                    ],
                    'customer' => [
                        'name' => $accountName,
                        'email' => $user->email,
                    ],
                ]);

            $korapayData = $korapayResponse->json();

            if (!$korapayResponse->successful() || ($korapayData['status'] ?? false) !== true) {
                $errorMsg = $korapayData['message'] ?? 'Payout failed';
                $httpStatus = $korapayResponse->status();
                \Illuminate\Support\Facades\Log::error('KoraPay payout failed for driver: ' . $user->email . ' - ' . $errorMsg);

                // For 403/401 (auth/permission issues) or 400 validation, save as pending so admin can handle
                if (in_array($httpStatus, [400, 401, 403])) {
                    DB::beginTransaction();
                    try {
                        $balanceBefore = $availableBalance;
                        $balanceAfter = $balanceBefore - $amount;

                        DriverWithdrawal::create([
                            'driver_id' => $driverProfile->id,
                            'amount' => $amount,
                            'status' => 'pending',
                            'bank_name' => $bankName,
                            'account_number' => $accountNumber,
                            'account_name' => $accountName,
                        ]);

                        WalletTransaction::create([
                            'id' => Str::random(32),
                            'user_id' => $user->id,
                            'transaction_type' => 'withdrawal',
                            'amount' => $amount,
                            'balance_before' => $balanceBefore,
                            'balance_after' => $balanceAfter,
                            'reference' => $reference,
                            'status' => 'pending',
                            'category' => 'withdrawal',
                            'description' => 'Pending withdrawal to ' . $accountName . ' - ' . $accountNumber,
                        ]);

                        Notification::create([
                            'id' => Str::random(32),
                            'user_id' => $user->id,
                            'type' => 'withdrawal',
                            'title' => 'Withdrawal Pending',
                            'message' => 'Your withdrawal of ₦' . number_format($amount, 2) . ' has been submitted and is pending processing.',
                            'is_read' => false,
                        ]);

                        DB::commit();

                        return response()->json([
                            'success' => true,
                            'message' => 'Withdrawal submitted for processing. It will be reviewed shortly.',
                            'data' => ['reference' => $reference, 'amount' => $amount],
                        ]);
                    } catch (\Exception $e) {
                        DB::rollBack();
                        \Illuminate\Support\Facades\Log::error('Pending withdrawal save failed: ' . $e->getMessage());
                    }
                }

                return response()->json([
                    'success' => false,
                    'message' => $errorMsg,
                    'data' => $korapayData,
                ], 400);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('KoraPay payout exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to process payout. Please try again.',
                'data' => null,
            ], 502);
        }

        DB::beginTransaction();
        try {
            $balanceBefore = $availableBalance;
            $balanceAfter = $balanceBefore - $amount;

            $withdrawal = DriverWithdrawal::create([
                'driver_id' => $driverProfile->id,
                'amount' => $amount,
                'status' => 'completed',
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'account_name' => $accountName,
                'processed_at' => now(),
            ]);

            WalletTransaction::create([
                'id' => Str::random(32),
                'user_id' => $user->id,
                'transaction_type' => 'withdrawal',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference' => $reference,
                'status' => 'completed',
                'category' => 'withdrawal',
                'description' => 'Withdrawal to ' . $accountName . ' - ' . $accountNumber,
            ]);

            try {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $user->id,
                    'type' => 'withdrawal',
                    'title' => 'Withdrawal Successful',
                    'message' => 'Your withdrawal of ₦' . number_format($amount, 2) . ' has been processed. New balance: ₦' . number_format($balanceAfter, 2),
                    'is_read' => false,
                ]);
            } catch (\Exception $e) {
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Withdrawal processed successfully',
                'data' => [
                    'withdrawal_id' => $withdrawal->id,
                    'reference' => $reference,
                    'amount' => $amount,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            \Illuminate\Support\Facades\Log::error('Withdrawal DB error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Failed to process withdrawal', 'data' => null]);
        }
    }
}
