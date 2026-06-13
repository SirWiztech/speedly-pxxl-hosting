<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\DriverProfile;
use App\Models\DriverKycDocument;
use App\Models\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class KYCController extends Controller
{
    public function getClientKyc(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'Client KYC retrieved successfully',
            'data' => [
                'verification_status' => $user->is_verified ? 'approved' : 'pending',
                'documents' => [],
            ]
        ]);
    }

    public function uploadClientKyc(Request $request)
    {
        return response()->json([
            'success' => true,
            'message' => 'Client KYC document uploaded successfully',
            'data' => null
        ]);
    }

    public function getDriverKyc(Request $request)
    {
        $user = $request->user();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ]);
        }

        $documents = DriverKycDocument::where('driver_id', $driverProfile->id)->get();

        $hasPendingDocs = $documents->where('verification_status', 'pending')->count() > 0;
        $hasAnyDocs = $documents->count() > 0;
        $isPending = $hasAnyDocs && $hasPendingDocs && $driverProfile->verification_status !== 'approved' && $driverProfile->verification_status !== 'rejected';

        $notificationCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Driver KYC retrieved successfully',
            'data' => [
                'verification_status' => $driverProfile->verification_status,
                'documents' => $documents,
                'pending_approval' => $isPending ? ['id' => $driverProfile->id, 'status' => 'pending'] : null,
                'notification_count' => $notificationCount,
                'date_of_birth' => $driverProfile->date_of_birth,
                'license_number' => $driverProfile->license_number,
                'license_expiry' => $driverProfile->license_expiry?->format('Y-m-d'),
            ]
        ]);
    }

    public function uploadDriverKyc(Request $request)
    {
        $user = $request->user();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found',
                'data' => null
            ], 404);
        }

        $validated = $request->validate([
            'date_of_birth' => 'nullable|date',
            'license_number' => 'nullable|string|max:100',
            'license_expiry' => 'nullable|date',
            'license_front' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'license_back' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'selfie' => 'nullable|file|mimes:jpg,jpeg,png|max:10240',
            'insurance' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
            'vehicle_registration' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);

        $driverProfile->update([
            'date_of_birth' => $request->date_of_birth ?? $driverProfile->date_of_birth,
            'license_number' => $request->license_number ?? $driverProfile->license_number,
            'license_expiry' => $request->license_expiry ?? $driverProfile->license_expiry,
        ]);

        $fileFields = [
            'license_front' => 'drivers_license_front',
            'license_back' => 'drivers_license_back',
            'selfie' => 'selfie_with_id',
            'insurance' => 'insurance',
            'vehicle_registration' => 'vehicle_registration',
        ];

        $uploadedDocs = [];

        foreach ($fileFields as $field => $docType) {
            if ($request->hasFile($field)) {
                $existing = DriverKycDocument::where('driver_id', $driverProfile->id)
                    ->where('document_type', $docType)
                    ->first();

                if ($existing) {
                    Storage::delete($existing->document_url);
                    $existing->delete();
                }

                $path = $request->file($field)->store('kyc-documents', 'public');

                $doc = DriverKycDocument::create([
                    'id' => Str::random(32),
                    'driver_id' => $driverProfile->id,
                    'document_type' => $docType,
                    'document_url' => $path,
                    'verification_status' => 'pending',
                ]);

                $uploadedDocs[] = $doc;
            }
        }

        if ($driverProfile->verification_status === 'pending' || $driverProfile->verification_status === 'rejected') {
            $driverProfile->update(['verification_status' => 'pending']);
        }

        return response()->json([
            'success' => true,
            'message' => 'KYC documents uploaded successfully',
            'data' => [
                'documents' => $uploadedDocs,
                'verification_status' => $driverProfile->verification_status,
            ]
        ]);
    }

    public function getPendingKyc(Request $request)
    {
        $perPage = $request->get('per_page', 15);

        $documents = DriverKycDocument::where('verification_status', 'pending')
            ->with('driver.user')
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        $documents->getCollection()->transform(function ($doc) {
            return [
                'id' => $doc->id,
                'full_name' => $doc->driver->user->full_name ?? 'Unknown',
                'email' => $doc->driver->user->email ?? '',
                'document_type' => $doc->document_type,
                'document_url' => $doc->document_url ? Storage::url($doc->document_url) : null,
                'verification_status' => $doc->verification_status,
                'created_at' => $doc->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Pending KYC documents retrieved successfully',
            'data' => $documents
        ]);
    }

    public function approveKyc(Request $request, string $id)
    {
        $document = DriverKycDocument::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'KYC document not found',
                'data' => null
            ], 404);
        }

        $document->update([
            'verification_status' => 'approved',
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        $driverProfile = $document->driver;
        $allDocs = DriverKycDocument::where('driver_id', $driverProfile->id)->get();
        $allApproved = $allDocs->every(fn($d) => $d->verification_status === 'approved');

        if ($allApproved) {
            $driverProfile->update(['verification_status' => 'approved']);

            Notification::create([
                'id' => Str::random(32),
                'user_id' => $driverProfile->user_id,
                'title' => 'KYC Approved',
                'message' => 'All your KYC documents have been approved. You are now verified.',
                'type' => 'kyc_approved',
                'is_read' => false,
            ]);
        } else {
            $pendingCount = $allDocs->where('verification_status', 'pending')->count();

            Notification::create([
                'id' => Str::random(32),
                'user_id' => $driverProfile->user_id,
                'title' => 'Document Approved',
                'message' => "Your {$document->document_type} has been approved. {$pendingCount} document(s) still pending review.",
                'type' => 'document_approved',
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'KYC document approved successfully',
            'data' => $document
        ]);
    }

    public function rejectKyc(Request $request, string $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $document = DriverKycDocument::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'KYC document not found',
                'data' => null
            ], 404);
        }

        $document->update([
            'verification_status' => 'rejected',
            'rejection_reason' => $validated['reason'],
            'verified_by' => $request->user()->id,
            'verified_at' => now(),
        ]);

        $driverProfile = $document->driver;
        $driverProfile->update(['verification_status' => 'rejected']);

        Notification::create([
            'id' => Str::random(32),
            'user_id' => $driverProfile->user_id,
            'title' => 'KYC Document Rejected',
            'message' => "Your {$document->document_type} has been rejected. Reason: {$validated['reason']}. Please re-upload.",
            'type' => 'kyc_rejected',
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'KYC document rejected successfully',
            'data' => $document
        ]);
    }
}
