import { useState } from 'react';
import { Head } from '@inertiajs/react';
import ClientNavmobile from '@/components/navbars/ClientNavMobile';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import '../../../css/ClientKyc.css';

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

export default function ClientKycMobile() {
    const loading = usePreloader(1500);

    const { data: kycStatus, isLoading } = useQuery<KycStatus>({
        queryKey: ['client-kyc-mobile'],
        queryFn: () => api.client.kyc().then(res => res.data),
    });

    return (
        <>
            <Head title="KYC Verification - Mobile" />
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
        </>
    );
}
