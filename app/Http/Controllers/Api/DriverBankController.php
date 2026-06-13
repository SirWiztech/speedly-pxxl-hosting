<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\DriverProfile;
use App\Models\DriverBankDetail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class DriverBankController extends Controller
{
    public function getBankDetails(Request $request)
    {
        $driverProfile = DriverProfile::where('user_id', $request->user()->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ]);
        }

        $bankDetails = DriverBankDetail::where('driver_id', $driverProfile->id)->get();

        return response()->json([
            'success' => true,
            'message' => 'Bank details retrieved successfully',
            'data' => $bankDetails->map(function ($bank) {
                return [
                    'id' => $bank->id,
                    'bank_name' => $bank->bank_name,
                    'account_number' => $bank->account_number,
                    'account_name' => $bank->account_name,
                    'is_default' => $bank->is_default,
                ];
            })
        ]);
    }

    public function saveBankDetails(Request $request)
    {
        $request->validate([
            'bank_name' => 'required|string',
            'account_number' => 'required|string',
            'account_name' => 'required|string'
        ]);

        $driverProfile = DriverProfile::where('user_id', $request->user()->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ]);
        }

        $existingCount = DriverBankDetail::where('driver_id', $driverProfile->id)->count();

        $bank = DriverBankDetail::create([
            'id' => Str::uuid()->toString(),
            'driver_id' => $driverProfile->id,
            'bank_name' => $request->bank_name,
            'account_number' => $request->account_number,
            'account_name' => $request->account_name,
            'is_default' => $existingCount === 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bank details saved successfully',
            'data' => $bank
        ]);
    }

    public function setDefaultBank(Request $request, $id)
    {
        $driverProfile = DriverProfile::where('user_id', $request->user()->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ]);
        }

        DB::transaction(function () use ($driverProfile, $id) {
            DriverBankDetail::where('driver_id', $driverProfile->id)->update(['is_default' => false]);
            DriverBankDetail::where('id', $id)->where('driver_id', $driverProfile->id)->update(['is_default' => true]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Default bank account updated',
            'data' => null
        ]);
    }

    public function removeBankAccount(Request $request, $id)
    {
        $driverProfile = DriverProfile::where('user_id', $request->user()->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ]);
        }

        $bank = DriverBankDetail::where('id', $id)->where('driver_id', $driverProfile->id)->first();

        if (!$bank) {
            return response()->json([
                'success' => false,
                'message' => 'Bank account not found',
                'data' => null
            ], 404);
        }

        $bank->delete();

        return response()->json([
            'success' => true,
            'message' => 'Bank account removed successfully',
            'data' => null
        ]);
    }
}
