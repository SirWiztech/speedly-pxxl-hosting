import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import DriverNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/DriverKycMobile.css';

// Types
interface DriverData {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    driver_profile_id: string;
    license_number: string;
    license_expiry: string;
    verification_status: string;
    driver_status: string;
}

interface Document {
    id: string;
    document_type: string;
    document_url: string;
    verification_status: string;
    uploaded_at: string;
}

const DriverKycMobile: React.FC = () => {
    // State
    const [driverData, setDriverData] = useState<DriverData | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [pendingApproval, setPendingApproval] = useState<any>(null);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [dateOfBirth, setDateOfBirth] = useState<string>('');
    const [licenseNumber, setLicenseNumber] = useState<string>('');
    const [licenseExpiry, setLicenseExpiry] = useState<string>('');
    
    // File states
    const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
    const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
    const [vehicleRegistrationFile, setVehicleRegistrationFile] = useState<File | null>(null);
    
    const [licenseFrontName, setLicenseFrontName] = useState<string>('');
    const [licenseBackName, setLicenseBackName] = useState<string>('');
    const [selfieName, setSelfieName] = useState<string>('');
    const [insuranceName, setInsuranceName] = useState<string>('');
    const [vehicleRegistrationName, setVehicleRegistrationName] = useState<string>('');

    // Fetch KYC data
    const fetchKycData = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                api.driver.kyc(),
                api.driver.profile()
            ]);

            const [kycResult, profileResult] = results;

            const profileResponse = profileResult.status === 'fulfilled' ? profileResult.value : null;
            if (profileResponse && (profileResponse.success || profileResponse.data)) {
                const p = profileResponse.data?.user || profileResponse.user || profileResponse.data;
                setDriverData(p);
            }

            const kycResponse = kycResult.status === 'fulfilled' ? kycResult.value : null;
            if (kycResponse && (kycResponse.success || kycResponse.data)) {
                const d = kycResponse.data || kycResponse;
                setDocuments(d.documents || []);
                setPendingApproval(d.pending_approval || null);
                setNotificationCount(d.notification_count || 0);
                setDateOfBirth(d.date_of_birth || '');
                setLicenseNumber(d.license_number || '');
                setLicenseExpiry(d.license_expiry || '');
            }
        } catch (error) {
            console.error('Error fetching KYC data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Get document by type
    const getDocumentByType = (type: string): Document | undefined => {
        return documents.find(doc => doc.document_type === type);
    };

    const hasDocument = (type: string): boolean => {
        return !!getDocumentByType(type);
    };

    // View document
    const viewDocument = (url: string, title: string) => {
        if (/\.(jpg|jpeg|png|gif)$/i.test(url)) {
            Swal.fire({
                title: title,
                imageUrl: url,
                imageWidth: 300,
                confirmButtonColor: '#ff5e00'
            });
        } else {
            window.open(url, '_blank');
        }
    };

    // Handle file selection
    const handleFileSelect = (
        file: File | null,
        setter: React.Dispatch<React.SetStateAction<File | null>>,
        nameSetter: React.Dispatch<React.SetStateAction<string>>
    ) => {
        if (file) {
            setter(file);
            nameSetter(file.name);
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        if (!licenseNumber) {
            Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter your license number', confirmButtonColor: '#ff5e00' });
            return false;
        }
        if (!licenseFrontFile && !hasDocument('drivers_license_front')) {
            Swal.fire({ icon: 'warning', title: 'Missing Document', text: 'Please upload your driver\'s license (front)', confirmButtonColor: '#ff5e00' });
            return false;
        }
        if (!selfieFile && !hasDocument('selfie_with_id')) {
            Swal.fire({ icon: 'warning', title: 'Missing Document', text: 'Please upload a selfie with your ID', confirmButtonColor: '#ff5e00' });
            return false;
        }
        return true;
    };

    // Submit KYC
    const submitKyc = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (!validateForm()) return;
        
        setSubmitting(true);
        
        Swal.fire({
            title: 'Submitting...',
            text: 'Please wait',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });
        
        const formData = new FormData();
        formData.append('driver_id', driverData?.driver_profile_id || '');
        formData.append('date_of_birth', dateOfBirth);
        formData.append('license_number', licenseNumber);
        formData.append('license_expiry', licenseExpiry);
        
        if (licenseFrontFile) formData.append('license_front', licenseFrontFile);
        if (licenseBackFile) formData.append('license_back', licenseBackFile);
        if (selfieFile) formData.append('selfie', selfieFile);
        if (insuranceFile) formData.append('insurance', insuranceFile);
        if (vehicleRegistrationFile) formData.append('vehicle_registration', vehicleRegistrationFile);
        
        try {
            const data = await api.driver.uploadKyc(formData);
            
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success!',
                    text: 'Your KYC has been submitted for review.',
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to submit KYC',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred. Please try again.',
                confirmButtonColor: '#ff5e00'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const isVerified = driverData?.verification_status === 'approved';
    const isPending = !!pendingApproval;
    const canSubmit = !isVerified && !isPending;
    const userInitial = driverData?.full_name?.charAt(0)?.toUpperCase() || 'D';

    useEffect(() => {
        fetchKycData();
    }, [fetchKycData]);


    return (
        <div className="mobile-driver-kyc-container">
            <div className="mobile-driver-kyc-view">
                {/* Header */}
                <div className="mobile-driver-kyc-header">
                    <div className="mobile-driver-kyc-user-info">
                        <h1>KYC Verification</h1>
                        <p>{driverData?.full_name?.split(' ')[0] || 'Driver'}</p>
                    </div>
                    <button className="mobile-driver-kyc-notification-btn" onClick={() => router.visit('/notifications')}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Status Card */}
                <div className="mobile-kyc-status-card">
                    <div className="status-badge-wrapper">
                        <span className="status-badge">
                            {isPending ? 'PENDING REVIEW' : isVerified ? 'VERIFIED' : 'NOT SUBMITTED'}
                        </span>
                    </div>
                    <h2>{isVerified ? 'You are verified!' : 'Verify your identity'}</h2>
                    <p>
                        {isVerified 
                            ? 'You can now accept rides and withdraw earnings.'
                            : isPending
                                ? 'Your documents are being reviewed.'
                                : 'Complete KYC to unlock all features'}
                    </p>
                </div>

                {/* Warning Messages */}
                {driverData?.verification_status === 'rejected' && (
                    <div className="mobile-warning-message error">
                        <i className="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Verification Failed</strong>
                            <p>Please re-upload your documents.</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={submitKyc} className="mobile-kyc-form">
                    {/* Personal Details */}
                    <div className="mobile-form-section">
                        <div className="section-title">
                            <i className="fas fa-user-circle"></i>
                            <h3>Personal Information</h3>
                        </div>
                        
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" value={driverData?.full_name || ''} disabled />
                        </div>
                        
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={driverData?.email || ''} disabled />
                        </div>
                        
                        <div className="form-group">
                            <label>Phone</label>
                            <input type="tel" value={driverData?.phone_number || ''} disabled />
                        </div>
                        
                        <div className="form-group">
                            <label>Driver License Number *</label>
                            <input 
                                type="text" 
                                value={licenseNumber} 
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                placeholder="Enter license number"
                                disabled={isVerified}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>License Expiry *</label>
                            <input 
                                type="date" 
                                value={licenseExpiry} 
                                onChange={(e) => setLicenseExpiry(e.target.value)}
                                disabled={isVerified}
                            />
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="mobile-form-section">
                        <div className="section-title">
                            <i className="fas fa-id-card"></i>
                            <h3>Upload Documents</h3>
                        </div>

                        {/* License Front */}
                        <div className="upload-box required">
                            <i className="fas fa-cloud-upload-alt"></i>
                            <span className="upload-text">Driver's License (Front) *</span>
                            <span className="upload-hint">JPG, PNG, or PDF</span>
                            {licenseFrontName && <span className="selected-file"><i className="fas fa-check-circle"></i> {licenseFrontName}</span>}
                            <input 
                                type="file" 
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setLicenseFrontFile, setLicenseFrontName)}
                                accept=".jpg,.jpeg,.png,.pdf"
                                disabled={isVerified}
                            />
                        </div>

                        {hasDocument('drivers_license_front') && (
                            <div className="document-preview" onClick={() => viewDocument(getDocumentByType('drivers_license_front')!.document_url, 'License Front')}>
                                <i className="fas fa-id-card"></i>
                                <span>License Front</span>
                                <span className={`status ${getDocumentByType('drivers_license_front')?.verification_status}`}>
                                    {getDocumentByType('drivers_license_front')?.verification_status}
                                </span>
                            </div>
                        )}

                        {/* Selfie */}
                        <div className="upload-box required">
                            <i className="fas fa-camera"></i>
                            <span className="upload-text">Selfie with ID *</span>
                            <span className="upload-hint">Hold ID next to your face</span>
                            {selfieName && <span className="selected-file"><i className="fas fa-check-circle"></i> {selfieName}</span>}
                            <input 
                                type="file" 
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setSelfieFile, setSelfieName)}
                                accept=".jpg,.jpeg,.png"
                                disabled={isVerified}
                            />
                        </div>

                        {hasDocument('selfie_with_id') && (
                            <div className="document-preview" onClick={() => viewDocument(getDocumentByType('selfie_with_id')!.document_url, 'Selfie with ID')}>
                                <i className="fas fa-camera"></i>
                                <span>Selfie with ID</span>
                                <span className={`status ${getDocumentByType('selfie_with_id')?.verification_status}`}>
                                    {getDocumentByType('selfie_with_id')?.verification_status}
                                </span>
                            </div>
                        )}

                        {/* Optional Documents */}
                        <div className="upload-box">
                            <i className="fas fa-shield-alt"></i>
                            <span className="upload-text">Insurance (Optional)</span>
                            {insuranceName && <span className="selected-file"><i className="fas fa-check-circle"></i> {insuranceName}</span>}
                            <input 
                                type="file" 
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setInsuranceFile, setInsuranceName)}
                                accept=".jpg,.jpeg,.png,.pdf"
                                disabled={isVerified}
                            />
                        </div>

                        <div className="upload-box">
                            <i className="fas fa-car"></i>
                            <span className="upload-text">Vehicle Registration (Optional)</span>
                            {vehicleRegistrationName && <span className="selected-file"><i className="fas fa-check-circle"></i> {vehicleRegistrationName}</span>}
                            <input 
                                type="file" 
                                onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setVehicleRegistrationFile, setVehicleRegistrationName)}
                                accept=".jpg,.jpeg,.png,.pdf"
                                disabled={isVerified}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    {canSubmit && (
                        <button type="submit" className="mobile-kyc-submit-btn" disabled={submitting}>
                            <i className="fas fa-paper-plane"></i> 
                            {driverData?.verification_status === 'rejected' ? 'Resubmit KYC' : 'Submit KYC'}
                        </button>
                    )}

                    {isVerified && (
                        <div className="verified-message">
                            <i className="fas fa-check-circle"></i>
                            <span>You are already verified.</span>
                        </div>
                    )}

                    {isPending && (
                        <div className="pending-message">
                            <i className="fas fa-hourglass-half"></i>
                            <span>KYC pending review.</span>
                        </div>
                    )}

                    <div className="kyc-info-note">
                        <i className="fas fa-shield-alt"></i>
                        <span>Your data is encrypted and secure.</span>
                    </div>
                </form>

                {/* Bottom Navigation */}
                <DriverNavMobile />
            </div>
        </div>
    );
};

export default DriverKycMobile;