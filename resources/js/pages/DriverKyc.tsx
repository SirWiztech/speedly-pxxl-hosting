import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import DriverSidebarDesktop from '../components/navbars/DriverSidebarDesktop';
import Swal from 'sweetalert2';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import DriverKycMobile from '../components/mobileViewComponent/DriverKycMobile';
import api from '../services/api';
import '../../css/DriverKyc.css';

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
    completed_rides: number;
}

interface Document {
    id: string;
    document_type: string;
    document_url: string;
    verification_status: string;
    uploaded_at: string;
}

interface PendingApproval {
    id: string;
    status: string;
}

const DriverKyc: React.FC = () => {
    // State
    const [driverData, setDriverData] = useState<DriverData | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(null);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [dateOfBirth, setDateOfBirth] = useState<string>('');
    const [licenseNumber, setLicenseNumber] = useState<string>('');
    const [licenseExpiry, setLicenseExpiry] = useState<string>('');
    
    // File references
    const licenseFrontRef = useRef<HTMLInputElement>(null);
    const licenseBackRef = useRef<HTMLInputElement>(null);
    const selfieRef = useRef<HTMLInputElement>(null);
    const insuranceRef = useRef<HTMLInputElement>(null);
    const vehicleRegistrationRef = useRef<HTMLInputElement>(null);
    
    // File states
    const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
    const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
    const [vehicleRegistrationFile, setVehicleRegistrationFile] = useState<File | null>(null);
    
    // UI states
    const [licenseFrontName, setLicenseFrontName] = useState<string>('');
    const [licenseBackName, setLicenseBackName] = useState<string>('');
    const [selfieName, setSelfieName] = useState<string>('');
    const [insuranceName, setInsuranceName] = useState<string>('');
    const [vehicleRegistrationName, setVehicleRegistrationName] = useState<string>('');

    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

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
            } else {
                console.error('Failed to fetch KYC data:', kycResponse?.message || 'KYC fetch failed');
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

    // Check if document exists
    const hasDocument = (type: string): boolean => {
        return !!getDocumentByType(type);
    };

    // Get document status
    const getDocumentStatus = (type: string): string => {
        const doc = getDocumentByType(type);
        return doc?.verification_status || 'not_submitted';
    };

    // Handle file selection
    const handleFileSelect = (
        file: File | null,
        setter: React.Dispatch<React.SetStateAction<File | null>>,
        nameSetter: React.Dispatch<React.SetStateAction<string>>,
        type: string
    ) => {
        if (file) {
            setter(file);
            nameSetter(file.name);
            
            // Remove error styling if exists
            const uploadBox = document.querySelector(`.upload-box.${type}`);
            if (uploadBox) {
                uploadBox.classList.remove('error');
                const errorDiv = uploadBox.querySelector('.validation-error');
                if (errorDiv) errorDiv.classList.remove('show');
            }
        } else {
            setter(null);
            nameSetter('');
        }
    };

    // View document
    const viewDocument = (url: string, title: string) => {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        const isPdf = /\.pdf$/i.test(url);
        
        if (isImage) {
            Swal.fire({
                title: title,
                imageUrl: url,
                imageWidth: 400,
                imageAlt: title,
                confirmButtonColor: '#ff5e00',
                confirmButtonText: 'Close'
            });
        } else if (isPdf) {
            Swal.fire({
                title: title,
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-file-pdf" style="font-size: 64px; color: #ef4444; margin-bottom: 16px;"></i>
                        <p>PDF Document</p>
                        <a href="${url}" target="_blank" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #ff5e00; color: white; border-radius: 8px; text-decoration: none;">
                            <i class="fas fa-external-link-alt"></i> Open PDF
                        </a>
                    </div>
                `,
                confirmButtonColor: '#ff5e00',
                confirmButtonText: 'Close',
                width: '500px'
            });
        } else {
            Swal.fire({
                title: title,
                html: `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fas fa-file" style="font-size: 64px; color: #6b7280; margin-bottom: 16px;"></i>
                        <p>Document</p>
                        <a href="${url}" target="_blank" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #ff5e00; color: white; border-radius: 8px; text-decoration: none;">
                            <i class="fas fa-download"></i> Download
                        </a>
                    </div>
                `,
                confirmButtonColor: '#ff5e00',
                confirmButtonText: 'Close',
                width: '500px'
            });
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        if (!dateOfBirth) {
            Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter your date of birth', confirmButtonColor: '#ff5e00' });
            return false;
        }
        
        if (!licenseNumber) {
            Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter your license number', confirmButtonColor: '#ff5e00' });
            return false;
        }
        
        if (!licenseExpiry) {
            Swal.fire({ icon: 'warning', title: 'Missing Field', text: 'Please enter your license expiry date', confirmButtonColor: '#ff5e00' });
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
            text: 'Please wait while we upload your documents',
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
                    fetchKycData();
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to submit KYC. Please try again.',
                    confirmButtonColor: '#ff5e00'
                });
            }
        } catch (error) {
            console.error('Error:', error);
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

    // Check notifications
    const checkNotifications = async () => {
        try {
            const data = await api.notifications.list();
            const notifications = data.notifications || data.data?.notifications || [];
            
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
                Swal.fire({ title: 'Notifications', text: 'No new notifications', icon: 'info', confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.fire({ title: 'Notifications', text: 'No new notifications', icon: 'info', confirmButtonColor: '#ff5e00' });
        }
    };

    const getVerificationStatusText = () => {
        if (pendingApproval) return 'PENDING REVIEW';
        if (driverData?.verification_status === 'approved') return 'VERIFIED';
        if (driverData?.verification_status === 'rejected') return 'REJECTED';
        return 'NOT SUBMITTED';
    };

    const getVerificationStatusColor = () => {
        if (pendingApproval) return '#f59e0b';
        if (driverData?.verification_status === 'approved') return '#10b981';
        if (driverData?.verification_status === 'rejected') return '#ef4444';
        return '#6b7280';
    };

    const isVerified = driverData?.verification_status === 'approved';
    const isPending = !!pendingApproval;
    const isRejected = driverData?.verification_status === 'rejected';
    const canSubmit = !isVerified && !isPending;

    useEffect(() => {
        fetchKycData();
    }, [fetchKycData]);

    const firstName = driverData?.full_name?.split(' ')[0] || 'Driver';
    const userInitial = driverData?.full_name?.charAt(0)?.toUpperCase() || 'D';

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view
    if (isMobile) {
        return <DriverKycMobile />;
    }

    // Get step status
    const step1Completed = hasDocument('drivers_license_front');
    const step2Completed = hasDocument('selfie_with_id');
    const step3Completed = hasDocument('insurance') || hasDocument('vehicle_registration');

    return (
        <div className="driver-kyc-desktop-container">
            <DriverSidebarDesktop 
                userName={driverData?.full_name || 'Driver'} 
                userRole="driver"
                profilePictureUrl={driverData?.profile_picture_url || null}
                driverStatus={driverData?.driver_status || 'offline'}
                verificationStatus={driverData?.verification_status || 'pending'}
            />

            <div className="driver-kyc-desktop-main">
                {/* Header */}
                <div className="driver-kyc-header">
                    <div className="driver-kyc-title">
                        <h1>Driver Verification</h1>
                        <p>Complete your KYC to start earning with full benefits.</p>
                    </div>
                    <button className="driver-kyc-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Status Card */}
                <div className="kyc-status-card">
                    <div>
                        <span className="status-badge" style={{ background: `${getVerificationStatusColor()}30`, color: getVerificationStatusColor() }}>
                            {getVerificationStatusText()}
                        </span>
                        <h2>{isVerified ? 'You are verified!' : 'Verify your identity'}</h2>
                        <p>
                            {isVerified 
                                ? 'You can now accept rides and withdraw earnings.'
                                : isRejected 
                                    ? 'Please re-upload your documents for verification.'
                                    : 'Complete KYC to unlock unlimited ride requests & withdrawals.'}
                        </p>
                    </div>
                    <div className="status-icon">
                        <i className="fas fa-id-card"></i>
                    </div>
                </div>

                {/* Warning Messages */}
                {isRejected && (
                    <div className="warning-message error">
                        <i className="fas fa-exclamation-triangle"></i>
                        <div>
                            <strong>Verification Failed</strong>
                            <p>Your KYC was rejected. Please upload correct documents and try again.</p>
                        </div>
                    </div>
                )}

                {isPending && (
                    <div className="warning-message warning">
                        <i className="fas fa-clock"></i>
                        <div>
                            <strong>KYC Pending Review</strong>
                            <p>Your documents are being reviewed by our team. You'll be notified once approved.</p>
                        </div>
                    </div>
                )}

                {/* Step Progress */}
                <div className="kyc-step-indicator">
                    <div className={`step ${step1Completed ? 'completed' : 'active'}`}>
                        <div className="step-circle">1</div>
                        <span className="step-label">Document</span>
                    </div>
                    <div className={`step ${step2Completed ? 'completed' : ''}`}>
                        <div className="step-circle">2</div>
                        <span className="step-label">Selfie</span>
                    </div>
                    <div className={`step ${step3Completed ? 'completed' : ''}`}>
                        <div className="step-circle">3</div>
                        <span className="step-label">Vehicle</span>
                    </div>
                    <div className="step">
                        <div className="step-circle">4</div>
                        <span className="step-label">Review</span>
                    </div>
                </div>

                {/* KYC Form */}
                <form onSubmit={submitKyc} className="kyc-form-desktop">
                    <div className="kyc-form-grid">
                        {/* Personal Details Column */}
                        <div className="kyc-form-column">
                            <div className="form-section-header">
                                <i className="fas fa-user-circle"></i>
                                <h2>Identity Details</h2>
                            </div>
                            
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" value={driverData?.full_name || ''} disabled className="form-input" />
                            </div>
                            
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={driverData?.email || ''} disabled className="form-input" />
                            </div>
                            
                            <div className="form-group">
                                <label>Phone Number</label>
                                <input type="tel" value={driverData?.phone_number || ''} disabled className="form-input" />
                            </div>
                            
                            <div className="form-group">
                                <label>Date of Birth *</label>
                                <input 
                                    type="date" 
                                    value={dateOfBirth} 
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    required
                                    className="form-input"
                                    disabled={isVerified}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Driver License Number *</label>
                                <input 
                                    type="text" 
                                    value={licenseNumber} 
                                    onChange={(e) => setLicenseNumber(e.target.value)}
                                    placeholder="Enter license number"
                                    required
                                    className="form-input"
                                    disabled={isVerified}
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>License Expiry Date *</label>
                                <input 
                                    type="date" 
                                    value={licenseExpiry} 
                                    onChange={(e) => setLicenseExpiry(e.target.value)}
                                    required
                                    className="form-input"
                                    disabled={isVerified}
                                />
                            </div>
                        </div>

                        {/* Document Upload Column */}
                        <div className="kyc-form-column">
                            <div className="form-section-header">
                                <i className="fas fa-id-card"></i>
                                <h2>Documents</h2>
                            </div>

                            {/* License Front */}
                            <div className={`upload-box ${!hasDocument('drivers_license_front') && !isVerified ? 'required' : ''}`}>
                                <i className="fas fa-cloud-upload-alt upload-icon"></i>
                                <span className="upload-text">Driver's License (Front)</span>
                                <span className="upload-hint">JPG, PNG, or PDF • Max 10MB</span>
                                {licenseFrontName && <span className="selected-file"><i className="fas fa-check-circle"></i> {licenseFrontName}</span>}
                                <input 
                                    type="file" 
                                    ref={licenseFrontRef}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setLicenseFrontFile, setLicenseFrontName, 'license-front')}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden-file-input"
                                    disabled={isVerified}
                                />
                                <div className="validation-error">Please upload your license (front)</div>
                            </div>

                            {hasDocument('drivers_license_front') && (
                                <div className="document-preview" onClick={() => viewDocument(getDocumentByType('drivers_license_front')!.document_url, 'License Front')}>
                                    <div className="doc-icon"><i className="fas fa-id-card"></i></div>
                                    <div className="doc-details">
                                        <div className="doc-name">License Front</div>
                                    </div>
                                    <div className="doc-status">
                                        <span className={`status-badge ${getDocumentStatus('drivers_license_front')}`}>
                                            {getDocumentStatus('drivers_license_front')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* License Back */}
                            <div className="upload-box">
                                <i className="fas fa-cloud-upload-alt upload-icon"></i>
                                <span className="upload-text">Driver's License (Back) - Optional</span>
                                <span className="upload-hint">JPG, PNG, or PDF • Max 10MB</span>
                                {licenseBackName && <span className="selected-file"><i className="fas fa-check-circle"></i> {licenseBackName}</span>}
                                <input 
                                    type="file" 
                                    ref={licenseBackRef}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setLicenseBackFile, setLicenseBackName, 'license-back')}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden-file-input"
                                    disabled={isVerified}
                                />
                            </div>

                            {hasDocument('drivers_license_back') && (
                                <div className="document-preview" onClick={() => viewDocument(getDocumentByType('drivers_license_back')!.document_url, 'License Back')}>
                                    <div className="doc-icon"><i className="fas fa-id-card"></i></div>
                                    <div className="doc-details">
                                        <div className="doc-name">License Back</div>
                                    </div>
                                    <div className="doc-status">
                                        <span className={`status-badge ${getDocumentStatus('drivers_license_back')}`}>
                                            {getDocumentStatus('drivers_license_back')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Selfie with ID */}
                            <div className={`upload-box ${!hasDocument('selfie_with_id') && !isVerified ? 'required' : ''}`}>
                                <i className="fas fa-camera upload-icon"></i>
                                <span className="upload-text">Selfie with ID *</span>
                                <span className="upload-hint">Hold your ID next to your face</span>
                                {selfieName && <span className="selected-file"><i className="fas fa-check-circle"></i> {selfieName}</span>}
                                <input 
                                    type="file" 
                                    ref={selfieRef}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setSelfieFile, setSelfieName, 'selfie')}
                                    accept=".jpg,.jpeg,.png"
                                    className="hidden-file-input"
                                    disabled={isVerified}
                                />
                                <div className="validation-error">Please upload a selfie with your ID</div>
                            </div>

                            {hasDocument('selfie_with_id') && (
                                <div className="document-preview" onClick={() => viewDocument(getDocumentByType('selfie_with_id')!.document_url, 'Selfie with ID')}>
                                    <div className="doc-icon"><i className="fas fa-camera"></i></div>
                                    <div className="doc-details">
                                        <div className="doc-name">Selfie with ID</div>
                                    </div>
                                    <div className="doc-status">
                                        <span className={`status-badge ${getDocumentStatus('selfie_with_id')}`}>
                                            {getDocumentStatus('selfie_with_id')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Insurance */}
                            <div className="upload-box">
                                <i className="fas fa-shield-alt upload-icon"></i>
                                <span className="upload-text">Insurance Document - Optional</span>
                                <span className="upload-hint">JPG, PNG, or PDF • Max 10MB</span>
                                {insuranceName && <span className="selected-file"><i className="fas fa-check-circle"></i> {insuranceName}</span>}
                                <input 
                                    type="file" 
                                    ref={insuranceRef}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setInsuranceFile, setInsuranceName, 'insurance')}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden-file-input"
                                    disabled={isVerified}
                                />
                            </div>

                            {hasDocument('insurance') && (
                                <div className="document-preview" onClick={() => viewDocument(getDocumentByType('insurance')!.document_url, 'Insurance')}>
                                    <div className="doc-icon"><i className="fas fa-shield-alt"></i></div>
                                    <div className="doc-details">
                                        <div className="doc-name">Insurance</div>
                                    </div>
                                    <div className="doc-status">
                                        <span className={`status-badge ${getDocumentStatus('insurance')}`}>
                                            {getDocumentStatus('insurance')}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Vehicle Registration */}
                            <div className="upload-box">
                                <i className="fas fa-car upload-icon"></i>
                                <span className="upload-text">Vehicle Registration - Optional</span>
                                <span className="upload-hint">JPG, PNG, or PDF • Max 10MB</span>
                                {vehicleRegistrationName && <span className="selected-file"><i className="fas fa-check-circle"></i> {vehicleRegistrationName}</span>}
                                <input 
                                    type="file" 
                                    ref={vehicleRegistrationRef}
                                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setVehicleRegistrationFile, setVehicleRegistrationName, 'vehicle-reg')}
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    className="hidden-file-input"
                                    disabled={isVerified}
                                />
                            </div>

                            {hasDocument('vehicle_registration') && (
                                <div className="document-preview" onClick={() => viewDocument(getDocumentByType('vehicle_registration')!.document_url, 'Vehicle Registration')}>
                                    <div className="doc-icon"><i className="fas fa-car"></i></div>
                                    <div className="doc-details">
                                        <div className="doc-name">Vehicle Registration</div>
                                    </div>
                                    <div className="doc-status">
                                        <span className={`status-badge ${getDocumentStatus('vehicle_registration')}`}>
                                            {getDocumentStatus('vehicle_registration')}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Button */}
                    {canSubmit && (
                        <button type="submit" className="kyc-submit-btn" disabled={submitting}>
                            <i className="fas fa-paper-plane"></i> 
                            {isRejected ? 'Resubmit KYC for Review' : 'Submit KYC for Review'}
                        </button>
                    )}

                    {isVerified && (
                        <div className="kyc-verified-message">
                            <i className="fas fa-check-circle"></i>
                            <span>You are already verified. Your KYC status is approved.</span>
                        </div>
                    )}

                    {isPending && (
                        <div className="kyc-pending-message">
                            <i className="fas fa-hourglass-half"></i>
                            <span>Your KYC is pending review. You will be notified once approved.</span>
                        </div>
                    )}

                    <div className="kyc-info-note">
                        <i className="fas fa-shield-alt"></i>
                        <span>Your data is encrypted and secure. Verification usually takes 5–10 minutes.</span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DriverKyc;