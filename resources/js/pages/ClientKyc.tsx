import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import ClientSidebarDesktop from '@/components/navbars/ClientSidebarDesktop';
import ClientNavmobile from '@/components/navbars/ClientNavMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import { api } from '../services/api';
import '../../css/ClientKyc.css';

interface KycDocument {
  id: string;
  type: 'license' | 'id_card' | 'proof_of_address';
  status: 'pending' | 'approved' | 'rejected';
  file_url: string;
}

interface KycStatus {
  verification_status: 'pending' | 'approved' | 'rejected';
  documents: KycDocument[];
}

export default function ClientKyc() {
  const loading = usePreloader(1000);
  const isMobile = useMobile();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('id_card');

  const { data: kycStatus, isLoading } = useQuery<KycStatus>({
    queryKey: ['client-kyc'],
    queryFn: () => api.client.kyc().then(res => res.data),
  });

  const { data: profileData } = useQuery({
    queryKey: ['client-profile-kyc'],
    queryFn: () => api.client.profile().then(res => res.data?.user || res.user || res.data),
  });

  const userData = profileData || {};

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.client.uploadKyc(formData),
  });

  const handleFileUpload = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('type', documentType);
    uploadMutation.mutate(formData);
  };

  if (loading) {
    return <DesktopPreloader />;
  }

  return (
    <>
      <Head title="KYC Verification" />
      {isMobile ? (
        <div className="mobile-container">
          <div className="mobile-header">
            <h1>KYC Verification</h1>
          </div>
          <div className="kyc-status-card">
            <div className={`status-badge status-${kycStatus?.verification_status || 'pending'}`}>
              {kycStatus?.verification_status || 'Pending'}
            </div>
            <p className="kyc-description">
              Complete your KYC verification to unlock all features.
            </p>
          </div>
          <div className="upload-section">
            <h2>Upload Documents</h2>
            <div className="upload-form">
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="kyc-select"
              >
                <option value="id_card">ID Card</option>
                <option value="proof_of_address">Proof of Address</option>
              </select>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="kyc-file-input"
              />
              <button
                onClick={handleFileUpload}
                disabled={!selectedFile || uploadMutation.isPending}
                className="btn-premium"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
          <div className="documents-list">
            <h2>Uploaded Documents</h2>
            {kycStatus?.documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="doc-info">
                  <span className="doc-type">{doc.type}</span>
                  <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  View
                </a>
              </div>
            ))}
          </div>
          <div className="mobile-nav-container">
            <ClientNavmobile />
          </div>
        </div>
      ) : (
        <div className="dashboard-container">
          <ClientSidebarDesktop userName={userData?.fullname || userData?.full_name || 'User'} profilePictureUrl={userData?.profile_picture_url} />
          <div className="desktop-main">
            <div className="desktop-header">
              <h1>KYC Verification</h1>
              <p>Complete your identity verification</p>
            </div>
            <div className="cd-card">
              <div className={`status-badge status-${kycStatus?.verification_status || 'pending'}`}>
                {kycStatus?.verification_status || 'Pending'}
              </div>
              <p className="kyc-description">
                Complete your KYC verification to unlock all features.
              </p>
            </div>
            <div className="cd-card">
              <h2>Upload Documents</h2>
              <div className="upload-form">
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="kyc-select"
                >
                  <option value="id_card">ID Card</option>
                  <option value="proof_of_address">Proof of Address</option>
                </select>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="kyc-file-input"
                />
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="btn-premium"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
            <div className="cd-card">
              <h2>Uploaded Documents</h2>
              {kycStatus?.documents.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="doc-info">
                    <span className="doc-type">{doc.type}</span>
                    <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                    View Document
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
