import { useState } from 'react';
import { Head } from '@inertiajs/react';
import ClientNavmobile from '@/components/navbars/ClientNavMobile';
import { useForm } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import '../../../css/ClientProfile.css';

interface ProfileData {
    full_name: string;
    email: string;
    phone_number: string;
    profile_picture: string;
}

export default function ClientProfileMobile() {
    const loading = usePreloader(1500);

    const { data: profile } = useQuery<ProfileData>({
        queryKey: ['client-profile-mobile'],
        queryFn: () => api.client.profile().then(res => res.data),
    });

    const { data, setData, post, processing } = useForm({
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone_number: profile?.phone_number || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/client/profile/update');
    };

    return (
        <>
            <Head title="Profile - Mobile" />
            <div className="mobile-container">
                <div className="mobile-header">
                    <h1>My Profile</h1>
                </div>

                <div className="profile-section">
                    <div className="profile-avatar">
                        <img 
                            src={profile?.profile_picture || '/main-assets/default-avatar.png'} 
                            alt="Profile" 
                        />
                        <button className="btn-change-photo">Change Photo</button>
                    </div>

                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input 
                                type="text" 
                                value={data.full_name}
                                onChange={(e) => setData('full_name', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input 
                                type="email" 
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input 
                                type="tel" 
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="btn-premium"
                            disabled={processing}
                        >
                            {processing ? 'Saving...' : 'Save Changes'}
                        </button>
                    </form>
                </div>

                <div className="mobile-nav-container">
                    <ClientNavmobile />
                </div>
            </div>
        </>
    );
}
