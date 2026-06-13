<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\PaymentGatewayTransaction;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Notification;
use App\Models\SystemSetting;
use App\Models\DriverProfile;
use App\Models\DriverWithdrawal;
use App\Models\DriverBankDetail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;

class PaymentController extends Controller
{
    private function getKorapayConfig(string $key, string $default = ''): string
    {
        $setting = SystemSetting::where('setting_key', $key)->first();
        return $setting->setting_value ?? env(strtoupper($key), $default);
    }

    private function getKorapaySecretKey(): string
    {
        return env('KORAPAY_SECRET_KEY', '');
    }

    private function getKorapayPublicKey(): string
    {
        return env('KORAPAY_PUBLIC_KEY', '');
    }

    private function getKorapayEnvironment(): string
    {
        return env('KORAPAY_ENVIRONMENT', 'sandbox');
    }

    private function getWalletBalance(string $userId): float
    {
        $creditTypes = ['deposit', 'bonus', 'referral', 'ride_refund', 'credit'];
        $debitTypes = ['withdrawal', 'ride_payment', 'debit'];

        $credit = WalletTransaction::where('user_id', $userId)
            ->whereIn('transaction_type', $creditTypes)
            ->where('status', 'completed')
            ->sum('amount');

        $debit = WalletTransaction::where('user_id', $userId)
            ->whereIn('transaction_type', $debitTypes)
            ->where('status', 'completed')
            ->sum('amount');

        return $credit - $debit;
    }

    /**
     * Map bank name to KoraPay bank code
     */
    private function getBankCodeFromName(string $bankName): string
    {
        $bankCodes = [
            'Access Bank' => '044',
            'GTBank' => '058',
            'First Bank of Nigeria' => '011',
            'United Bank for Africa (UBA)' => '033',
            'Zenith Bank' => '057',
            'Fidelity Bank' => '070',
            'Union Bank of Nigeria' => '032',
            'Sterling Bank' => '232',
            'EcoBank' => '050',
            'Polaris Bank' => '076',
            'Stanbic IBTC' => '221',
            'Opay' => '305',
            'PalmPay' => '999991',
            'Moniepoint' => '50515',
            'Providus Bank' => '101',
            'Wema Bank' => '035',
            'Heritage Bank' => '030',
            'Jaiz Bank' => '301',
            'Suntrust Bank' => '100',
            'Globus Bank' => '00103',
            'Titan Trust Bank' => '102',
            'Kuda Bank' => '50211',
        ];

        return $bankCodes[$bankName] ?? $bankName;
    }

    /**
     * Get local bank list (fallback for sandbox)
     */
    private function getLocalBankList(): array
    {
        return [
            ['bank_name' => 'Access Bank', 'bank_code' => '044'],
            ['bank_name' => 'GTBank', 'bank_code' => '058'],
            ['bank_name' => 'First Bank of Nigeria', 'bank_code' => '011'],
            ['bank_name' => 'United Bank for Africa (UBA)', 'bank_code' => '033'],
            ['bank_name' => 'Zenith Bank', 'bank_code' => '057'],
            ['bank_name' => 'Fidelity Bank', 'bank_code' => '070'],
            ['bank_name' => 'Union Bank', 'bank_code' => '032'],
            ['bank_name' => 'Sterling Bank', 'bank_code' => '232'],
            ['bank_name' => 'EcoBank', 'bank_code' => '050'],
            ['bank_name' => 'Polaris Bank', 'bank_code' => '076'],
            ['bank_name' => 'Stanbic IBTC', 'bank_code' => '221'],
            ['bank_name' => 'Opay', 'bank_code' => '305'],
            ['bank_name' => 'PalmPay', 'bank_code' => '999991'],
            ['bank_name' => 'Moniepoint', 'bank_code' => '50515'],
            ['bank_name' => 'Providus Bank', 'bank_code' => '101'],
            ['bank_name' => 'Wema Bank', 'bank_code' => '035'],
            ['bank_name' => 'Kuda Bank', 'bank_code' => '50211'],
        ];
    }

    /**
     * Get list of supported banks
     */
    public function getBanks(Request $request)
    {
        $currency = $request->query('currency', 'NGN');
        $environment = $this->getKorapayEnvironment();
        
        if ($environment === 'sandbox') {
            return response()->json([
                'success' => true,
                'message' => 'Sandbox mode - Bank list',
                'data' => $this->getLocalBankList()
            ]);
        }
        
        try {
            $publicKey = $this->getKorapayPublicKey();
            
            if (!empty($publicKey)) {
                $response = Http::withOptions(['verify' => false])
                    ->withToken($publicKey)
                    ->timeout(15)
                    ->get("https://api.korapay.com/merchant/api/v1/misc/banks?currency={$currency}");
                
                $data = $response->json();
                
                if ($response->successful() && isset($data['status']) && $data['status'] === true) {
                    $banks = $data['data'] ?? [];
                    
                    $formattedBanks = array_map(function($bank) {
                        return [
                            'bank_name' => $bank['bank_name'] ?? $bank['name'] ?? '',
                            'bank_code' => $bank['bank_code'] ?? $bank['code'] ?? ''
                        ];
                    }, $banks);
                    
                    return response()->json([
                        'success' => true,
                        'message' => 'Banks retrieved successfully',
                        'data' => $formattedBanks
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to fetch banks: ' . $e->getMessage());
        }
        
        return response()->json([
            'success' => true,
            'message' => 'Using local bank list',
            'data' => $this->getLocalBankList()
        ]);
    }

    /**
     * Verify bank account endpoint
     */
    public function verifyAccount(Request $request)
    {
        $validated = $request->validate([
            'bank_code' => 'required|string',
            'account_number' => 'required|string|size:10',
        ]);

        $environment = $this->getKorapayEnvironment();
        
        \Illuminate\Support\Facades\Log::info('Account verification request', [
            'bank_code' => $validated['bank_code'],
            'account_number' => $validated['account_number'],
            'environment' => $environment
        ]);
        
        if ($environment === 'sandbox') {
            $mockAccountNames = [
                '0000000000' => 'John Doe',
                '1234567890' => 'Jane Smith',
                '8108787625' => 'UGOCHUKWU JOSIAH OGARAKU',
            ];
            
            $accountName = $mockAccountNames[$validated['account_number']] ?? 'Test Account User';
            
            return response()->json([
                'success' => true,
                'message' => 'Sandbox: Account verified successfully',
                'account_name' => $accountName
            ]);
        }
        
        try {
            $secretKey = $this->getKorapaySecretKey();
            
            if (empty($secretKey)) {
                \Illuminate\Support\Facades\Log::error('KoraPay secret key is missing');
                return response()->json([
                    'success' => false,
                    'message' => 'Payment gateway not configured'
                ], 502);
            }
            
            $response = Http::withOptions(['verify' => false])
                ->withToken($secretKey)
                ->timeout(30)
                ->post('https://api.korapay.com/merchant/api/v1/misc/banks/resolve', [
                    'bank' => $validated['bank_code'],
                    'account' => $validated['account_number'],
                    'currency' => 'NGN'
                ]);
            
            $data = $response->json();
            
            \Illuminate\Support\Facades\Log::info('KoraPay verification response', [
                'status_code' => $response->status(),
                'response' => $data
            ]);
            
            if ($response->successful() && isset($data['status']) && $data['status'] === true) {
                $accountData = $data['data'] ?? [];
                return response()->json([
                    'success' => true,
                    'message' => 'Account verified successfully',
                    'account_name' => $accountData['account_name'] ?? null
                ]);
            }
            
            $errorMessage = $data['message'] ?? 'Account verification failed';
            
            return response()->json([
                'success' => false,
                'message' => $errorMessage
            ], 400);
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Bank account verification exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Verification service error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Initiate payment/deposit
     */
    public function initiate(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:100',
            'email' => 'required|email',
            'name' => 'required|string|max:255',
            'reference' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        $reference = $validated['reference'] ?? 'SPD-' . strtoupper(Str::random(8)) . '-' . now()->format('YmdHis');
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
                'data' => null,
            ], 401);
        }

        if ($validated['amount'] < 100) {
            return response()->json([
                'success' => false,
                'message' => 'Minimum deposit amount is ₦100',
                'data' => null,
            ], 400);
        }

        $secretKey = $this->getKorapaySecretKey();
        if (empty($secretKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not configured. Please set KORAPAY_SECRET_KEY.',
                'data' => null,
            ], 502);
        }

        try {
            $korapayResponse = Http::withOptions(['verify' => false])->withToken($secretKey)
                ->post('https://api.korapay.com/merchant/api/v1/charges/initialize', [
                    'amount' => $validated['amount'],
                    'currency' => 'NGN',
                    'reference' => $reference,
                    'redirect_url' => $this->getKorapayConfig('korapay_redirect_url', config('app.url') . '/payment/callback'),
                    'notification_url' => $this->getKorapayConfig('korapay_webhook_url'),
                    'customer' => [
                        'email' => $validated['email'],
                        'name' => $validated['name'],
                    ],
                    'merchant_bears_cost' => true,
                    'metadata' => !empty($validated['metadata']) ? $validated['metadata'] : ['source' => 'Speedly Wallet'],
                ]);

            $korapayData = $korapayResponse->json();

            if (!$korapayResponse->successful() || ($korapayData['status'] ?? false) !== true) {
                $errorMsg = $korapayData['message'] ?? ($korapayData['status'] === false ? $korapayData['message'] : 'Failed to initiate payment');
                return response()->json([
                    'success' => false,
                    'message' => $errorMsg,
                    'data' => $korapayData,
                ], 400);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('KoraPay initiate failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Unable to connect to payment gateway. Please try again.',
                'data' => null,
            ], 502);
        }

        PaymentGatewayTransaction::create([
            'id' => Str::uuid(),
            'user_id' => $user->id,
            'transaction_reference' => $reference,
            'amount' => $validated['amount'],
            'currency' => 'NGN',
            'status' => 'pending',
            'gateway_reference' => $korapayData['data']['reference'] ?? null,
            'gateway_response' => json_encode($korapayData),
            'expires_at' => Carbon::now()->addMinutes(30),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment initiated successfully',
            'data' => [
                'checkout_url' => $korapayData['data']['checkout_url'] ?? null,
                'reference' => $reference,
            ],
        ]);
    }

    /**
     * Handle payment callback
     */
    public function callback(Request $request)
    {
        $reference = $request->query('reference');

        if (!$reference) {
            $redirectUrl = config('app.url') . '/clientwallet?payment_status=failed&message=' . urlencode('No reference provided');
            return redirect($redirectUrl);
        }

        $transaction = PaymentGatewayTransaction::where('transaction_reference', $reference)->first();

        if (!$transaction) {
            $redirectUrl = config('app.url') . '/clientwallet?payment_status=failed&message=' . urlencode('Transaction not found');
            return redirect($redirectUrl);
        }

        if ($transaction->status === 'success') {
            $redirectUrl = config('app.url') . '/clientwallet?payment_status=completed&reference=' . $reference;
            return redirect($redirectUrl);
        }

        $secretKey = $this->getKorapaySecretKey();
        if (empty($secretKey)) {
            $redirectUrl = config('app.url') . '/clientwallet?payment_status=failed&message=' . urlencode('Payment gateway not configured');
            return redirect($redirectUrl);
        }

        try {
            $verifyResponse = Http::withOptions(['verify' => false])->withToken($secretKey)
                ->get("https://api.korapay.com/merchant/api/v1/charges/{$reference}");

            $verifyData = $verifyResponse->json();

            if ($verifyResponse->successful() && ($verifyData['status'] ?? false) === true) {
                $txnData = $verifyData['data'] ?? [];
                $txnStatus = $txnData['status'] ?? '';

                if ($txnStatus === 'success') {
                    $this->processSuccessfulPayment($transaction, $txnData, $verifyData);
                } elseif ($txnStatus === 'failed') {
                    $transaction->update([
                        'status' => 'failed',
                        'gateway_response' => json_encode($verifyData),
                    ]);
                }
            }

            $status = $transaction->fresh()->status;
            $frontendStatus = $status === 'success' ? 'completed' : $status;
            $redirectUrl = config('app.url') . '/clientwallet?payment_status=' . $frontendStatus . '&reference=' . $reference;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Payment callback verification failed: ' . $e->getMessage(), [
                'reference' => $reference,
                'trace' => $e->getTraceAsString(),
            ]);
            $redirectUrl = config('app.url') . '/clientwallet?payment_status=pending&reference=' . $reference;
        }

        return redirect($redirectUrl);
    }

    /**
     * Verify payment status
     */
    public function verify(Request $request)
    {
        $reference = $request->query('reference');

        if (!$reference) {
            return response()->json([
                'success' => false,
                'message' => 'Reference is required',
                'data' => null,
            ], 400);
        }

        $transaction = PaymentGatewayTransaction::where('transaction_reference', $reference)->first();

        if (!$transaction) {
            return response()->json([
                'success' => false,
                'message' => 'Transaction not found',
                'data' => null,
            ], 404);
        }

        if ($transaction->status !== 'pending') {
            $balance = $this->getWalletBalance($transaction->user_id);
            return response()->json([
                'success' => true,
                'message' => 'Payment status retrieved',
                'amount' => (float) $transaction->amount,
                'new_balance' => $balance,
                'data' => [
                    'status' => $transaction->status,
                    'transaction' => $transaction,
                ],
            ]);
        }

        $secretKey = $this->getKorapaySecretKey();
        if (empty($secretKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not configured',
                'data' => null,
            ], 502);
        }

        try {
            $verifyResponse = Http::withOptions(['verify' => false])->withToken($secretKey)
                ->get("https://api.korapay.com/merchant/api/v1/charges/{$reference}");

            $verifyData = $verifyResponse->json();

            if ($verifyResponse->successful() && ($verifyData['status'] ?? false) === true) {
                $txnData = $verifyData['data'] ?? [];
                $txnStatus = $txnData['status'] ?? '';

                if ($txnStatus === 'success') {
                    $this->processSuccessfulPayment($transaction, $txnData, $verifyData);
                } elseif ($txnStatus === 'failed') {
                    $transaction->update([
                        'status' => 'failed',
                        'gateway_response' => json_encode($verifyData),
                    ]);
                }
            }

            $transaction = $transaction->fresh();
            $balance = $this->getWalletBalance($transaction->user_id);
            return response()->json([
                'success' => true,
                'message' => 'Payment status retrieved',
                'amount' => (float) $transaction->amount,
                'new_balance' => $balance,
                'data' => [
                    'status' => $transaction->status,
                    'transaction' => $transaction,
                ],
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Payment verify API call failed: ' . $e->getMessage(), [
                'reference' => $reference,
            ]);
            $balance = $this->getWalletBalance($transaction->user_id);
            return response()->json([
                'success' => true,
                'message' => 'Could not reach payment gateway, please check back later.',
                'amount' => (float) $transaction->amount,
                'new_balance' => $balance,
                'data' => [
                    'status' => 'pending',
                    'transaction' => $transaction,
                ],
            ]);
        }
    }

    /**
     * Handle KoraPay webhook
     */
    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $data = json_decode($payload, true);
        $event = $data['event'] ?? '';
        $txnData = $data['data'] ?? [];
        $reference = $txnData['reference'] ?? null;

        if ($event === 'test.webhook') {
            \Illuminate\Support\Facades\Log::info('Test webhook received');
            return response('OK', 200);
        }

        $secretKey = $this->getKorapaySecretKey();
        $signature = $request->header('x-korapay-signature');

        if ($signature && !empty($secretKey)) {
            $expectedSignature = hash_hmac('sha256', $payload, $secretKey);
            if (!hash_equals($expectedSignature, $signature)) {
                \Illuminate\Support\Facades\Log::warning('Invalid webhook signature received');
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid webhook signature',
                ], 401);
            }
        }

        if (!$reference) {
            return response('OK', 200);
        }

        if (in_array($event, ['transfer.success', 'transfer.failed'])) {
            $this->processPayoutWebhook($txnData, $event);
            return response('OK', 200);
        }

        if (in_array($event, ['charge.success', 'charge.failed'])) {
            $transaction = PaymentGatewayTransaction::where('transaction_reference', $reference)->first();

            if (!$transaction || $transaction->status === 'success') {
                return response('OK', 200);
            }

            if ($event === 'charge.success') {
                $this->processSuccessfulPayment($transaction, $txnData, $data);
            } elseif ($event === 'charge.failed') {
                $transaction->update([
                    'status' => 'failed',
                    'webhook_received' => true,
                    'webhook_data' => $payload,
                    'gateway_response' => $payload,
                ]);
            }
        }

        return response('OK', 200);
    }

    /**
     * Process payout webhook events
     */
    private function processPayoutWebhook(array $txnData, string $event): void
    {
        $reference = $txnData['reference'] ?? null;
        $amount = $txnData['amount'] ?? 0;
        
        if (!$reference) {
            return;
        }

        $withdrawal = DriverWithdrawal::where('reference', $reference)->first();
        
        if (!$withdrawal) {
            \Illuminate\Support\Facades\Log::warning('Payout webhook: Withdrawal not found', ['reference' => $reference]);
            return;
        }

        if (in_array($withdrawal->status, ['paid', 'completed', 'failed'])) {
            return;
        }

        $newStatus = $event === 'transfer.success' ? 'paid' : 'failed';
        
        DB::transaction(function () use ($withdrawal, $newStatus, $txnData, $amount, $event, $reference) {
            $withdrawal->update([
                'status' => $newStatus,
                'processed_at' => now(),
                'gateway_response' => json_encode($txnData),
            ]);

            if ($event === 'transfer.failed') {
                $driverProfile = DriverProfile::find($withdrawal->driver_id);
                if ($driverProfile) {
                    $user = User::find($driverProfile->user_id);
                    if ($user) {
                        $balanceBefore = $this->getWalletBalance($user->id);
                        $balanceAfter = $balanceBefore + $amount;
                        
                        WalletTransaction::create([
                            'id' => Str::random(32),
                            'user_id' => $user->id,
                            'transaction_type' => 'deposit',
                            'amount' => $amount,
                            'balance_before' => $balanceBefore,
                            'balance_after' => $balanceAfter,
                            'reference' => 'REFUND-' . $reference,
                            'status' => 'completed',
                            'category' => 'refund',
                            'description' => 'Refund for failed withdrawal: ' . $reference,
                        ]);
                        
                        try {
                            Notification::create([
                                'id' => Str::random(32),
                                'user_id' => $user->id,
                                'type' => 'withdrawal',
                                'title' => 'Withdrawal Failed',
                                'message' => 'Your withdrawal of ₦' . number_format($amount, 2) . ' failed. The amount has been refunded to your wallet.',
                                'is_read' => false,
                            ]);
                        } catch (\Exception $e) {
                            \Illuminate\Support\Facades\Log::warning('Failed to create notification: ' . $e->getMessage());
                        }
                    }
                }
            }
        });
    }

    /**
     * Process sandbox withdrawal (simulated - no API call)
     */
    private function processSandboxWithdrawal($user, $driverProfile, $amount, $reference, $validated, $bankCode)
    {
        $balanceBefore = $this->getWalletBalance($user->id);
        $balanceAfter = $balanceBefore - $amount;
        
        DB::transaction(function () use ($user, $driverProfile, $amount, $reference, $validated, $bankCode, $balanceBefore, $balanceAfter) {
            DriverWithdrawal::create([
                'id' => Str::random(32),
                'driver_id' => $driverProfile->id,
                'amount' => $amount,
                'status' => 'paid',
                'bank_name' => $validated['bank_name'] ?? $bankCode,
                'account_number' => $validated['account_number'],
                'account_name' => $validated['account_name'],
                'reference' => $reference,
                'gateway_response' => json_encode(['mode' => 'sandbox', 'reference' => $reference]),
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
                'description' => 'Withdrawal to ' . $validated['account_name'] . ' - ' . $validated['account_number'],
            ]);
            
            try {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $user->id,
                    'type' => 'withdrawal',
                    'title' => 'Withdrawal Successful (Sandbox)',
                    'message' => 'Your withdrawal of ₦' . number_format($amount, 2) . ' has been processed. New balance: ₦' . number_format($balanceAfter, 2),
                    'is_read' => false,
                ]);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to create notification: ' . $e->getMessage());
            }
        });
        
        return response()->json([
            'success' => true,
            'message' => 'Withdrawal processed successfully (Sandbox Mode)',
            'data' => [
                'reference' => $reference,
                'amount' => $amount,
                'status' => 'success',
            ],
        ]);
    }

    /**
     * Process driver withdrawal/payout - LIVE MODE
     */
    public function payoutWithdraw(Request $request)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:100',
            'password' => 'required|string',
            'bank_code' => 'required|string|max:10',
            'account_number' => 'required|string|max|20',
            'account_name' => 'required|string|max:255',
            'bank_name' => 'nullable|string|max:100',
        ]);

        $user = $request->user();

        // Verify password
        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Incorrect password',
            ], 401);
        }

        // Get driver profile
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();
        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
            ], 404);
        }

        $amount = $validated['amount'];
        $balance = $this->getWalletBalance($user->id);

        if ($amount > $balance) {
            return response()->json([
                'success' => false,
                'message' => 'Insufficient balance. Available: ₦' . number_format($balance, 2),
            ], 400);
        }

        // Get bank code
        $bankCode = $validated['bank_code'];
        if (empty($bankCode) && !empty($validated['bank_name'])) {
            $bankCode = $this->getBankCodeFromName($validated['bank_name']);
        }

        if (empty($bankCode)) {
            return response()->json([
                'success' => false,
                'message' => 'Bank code is required',
            ], 400);
        }

        $environment = $this->getKorapayEnvironment();
        $reference = 'WTH-' . strtoupper(Str::random(8)) . '-' . now()->format('YmdHis');
        
        // For sandbox, use simulated withdrawal
        if ($environment === 'sandbox') {
            return $this->processSandboxWithdrawal($user, $driverProfile, $amount, $reference, $validated, $bankCode);
        }
        
        // LIVE MODE - Actual KoraPay API call
        $secretKey = $this->getKorapaySecretKey();
        if (empty($secretKey)) {
            return response()->json([
                'success' => false,
                'message' => 'Payment gateway not configured',
            ], 502);
        }

        \Illuminate\Support\Facades\Log::info('LIVE PAYOUT REQUEST', [
            'reference' => $reference,
            'amount' => $amount,
            'bank_code' => $bankCode,
            'account_number' => $validated['account_number'],
            'account_name' => $validated['account_name']
        ]);

        try {
            $korapayResponse = Http::withOptions(['verify' => false])
                ->withToken($secretKey)
                ->timeout(30)
                ->post('https://api.korapay.com/merchant/api/v1/transactions/disburse', [
                    'reference' => $reference,
                    'destination' => [
                        'type' => 'bank_account',
                        'amount' => (float)$amount,
                        'currency' => 'NGN',
                        'narration' => 'Driver withdrawal - ' . ($user->full_name ?? $user->name ?? 'Driver'),
                        'bank_account' => [
                            'bank' => $bankCode,
                            'account' => $validated['account_number'],
                            'account_name' => $validated['account_name'],
                        ],
                    ],
                    'customer' => [
                        'name' => $validated['account_name'],
                        'email' => $user->email,
                    ],
                ]);

            $korapayData = $korapayResponse->json();
            
            \Illuminate\Support\Facades\Log::info('KoraPay payout response', [
                'status_code' => $korapayResponse->status(),
                'response' => $korapayData
            ]);

            // Check if API call was successful
            if (!$korapayResponse->successful() || ($korapayData['status'] ?? false) !== true) {
                $errorMsg = $korapayData['message'] ?? 'Payout failed';
                \Illuminate\Support\Facades\Log::error('KoraPay payout failed', [
                    'error' => $errorMsg,
                    'full_response' => $korapayData
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => $errorMsg,
                    'data' => $korapayData
                ], 400);
            }
            
            $payoutStatus = $korapayData['data']['status'] ?? 'processing';
            $gatewayReference = $korapayData['data']['reference'] ?? $reference;
            
            \Illuminate\Support\Facades\Log::info('KoraPay payout successful', [
                'status' => $payoutStatus,
                'gateway_reference' => $gatewayReference
            ]);
            
            // ONLY CREATE DATABASE RECORDS IF API CALL SUCCEEDED
            DB::transaction(function () use ($user, $driverProfile, $amount, $reference, $validated, $korapayData, $payoutStatus, $bankCode, $gatewayReference) {
                $balanceBefore = $this->getWalletBalance($user->id);
                $balanceAfter = $balanceBefore - $amount;

                DriverWithdrawal::create([
                    'id' => Str::random(32),
                    'driver_id' => $driverProfile->id,
                    'amount' => $amount,
                    'status' => $payoutStatus === 'success' ? 'paid' : 'processing',
                    'bank_name' => $validated['bank_name'] ?? $bankCode,
                    'account_number' => $validated['account_number'],
                    'account_name' => $validated['account_name'],
                    'reference' => $reference,
                    'gateway_reference' => $gatewayReference,
                    'gateway_response' => json_encode($korapayData),
                    'processed_at' => $payoutStatus === 'success' ? now() : null,
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
                    'description' => 'Withdrawal to ' . $validated['account_name'] . ' - ' . $validated['account_number'],
                ]);

                try {
                    Notification::create([
                        'id' => Str::random(32),
                        'user_id' => $user->id,
                        'type' => 'withdrawal',
                        'title' => $payoutStatus === 'success' ? 'Withdrawal Successful' : 'Withdrawal Initiated',
                        'message' => 'Your withdrawal of ₦' . number_format($amount, 2) . ' has been ' . 
                                    ($payoutStatus === 'success' ? 'processed successfully' : 'initiated and is being processed') . 
                                    '. New balance: ₦' . number_format($balanceAfter, 2),
                        'is_read' => false,
                    ]);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Failed to create notification: ' . $e->getMessage());
                }
            });

            return response()->json([
                'success' => true,
                'message' => $payoutStatus === 'success' ? 'Withdrawal processed successfully' : 'Withdrawal initiated successfully',
                'data' => [
                    'reference' => $reference,
                    'amount' => $amount,
                    'status' => $payoutStatus,
                ],
            ]);
            
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('KoraPay payout exception: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Unable to process payout. Error: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process successful payment/deposit
     */
    private function processSuccessfulPayment($transaction, array $txnData, array $rawData): void
    {
        $amount = $txnData['amount'] ?? $transaction->amount;
        $userId = $transaction->user_id;

        DB::transaction(function () use ($transaction, $txnData, $rawData, $amount, $userId) {
            $transaction->update([
                'status' => 'success',
                'gateway_reference' => $transaction->gateway_reference ?? ($txnData['reference'] ?? null),
                'payment_method' => $txnData['payment_method'] ?? null,
                'gateway_response' => json_encode($rawData),
                'webhook_received' => true,
                'webhook_data' => json_encode($rawData),
            ]);

            $balanceBefore = $this->getWalletBalance($userId);
            $balanceAfter = $balanceBefore + $amount;

            WalletTransaction::create([
                'id' => Str::random(32),
                'user_id' => $userId,
                'transaction_type' => 'deposit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference' => $transaction->transaction_reference,
                'status' => 'completed',
                'category' => 'wallet_funding',
                'description' => 'Wallet deposit via KoraPay - Ref: ' . $transaction->transaction_reference,
            ]);

            try {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $userId,
                    'type' => 'payment',
                    'title' => 'Deposit Successful',
                    'message' => 'Your deposit of ₦' . number_format($amount, 2) . ' has been successful. New balance: ₦' . number_format($balanceAfter, 2),
                    'is_read' => false,
                ]);
            } catch (\Exception $e) {
                // Notification is non-critical
            }
        });
    }
}