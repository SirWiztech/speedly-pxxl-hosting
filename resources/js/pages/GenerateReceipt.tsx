import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { api } from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ErrorBoundary from '../components/ErrorBoundary';
import '../../css/GenerateReceipt.css';

interface RideData {
    id: string;
    ride_number: string;
    pickup_address: string;
    destination_address: string;
    total_fare: number;
    distance_km: number;
    ride_type: string;
    created_at: string;
    driver_name: string;
    driver_phone: string;
    vehicle_model: string;
    vehicle_color: string;
    plate_number: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    release_token?: string;
    status?: string;
}

interface PaymentData {
    reference: string;
    amount: number;
    status: string;
}

interface FareBreakdown {
    base_fare: number;
    distance_fare: number;
    service_fee: number;
    platform_commission: number;
    driver_payout: number;
    total: number;
}

const GenerateReceipt: React.FC<{ rideId?: string }> = ({ rideId: propRideId }) => {
    const { props } = usePage();
    const rideId = propRideId || (props.rideId as string) || new URLSearchParams(window.location.search).get('rideId') || '';
    const [ride, setRide] = useState<RideData | null>(null);
    const [payment, setPayment] = useState<PaymentData | null>(null);
    const [fareBreakdown, setFareBreakdown] = useState<FareBreakdown | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [copied, setCopied] = useState(false);

    const preloaderLoading = usePreloader(800);
    const isMobile = useMobile();

    useEffect(() => {
        const fetchRideData = async () => {
            if (!rideId) { setError('No ride ID provided'); setLoading(false); return; }
            try {
                const response = await api.rides.receipt(rideId);
                const payload = response.data || response;
                if (response.success && payload.ride) {
                    setRide(payload.ride);
                    setPayment(payload.payment || null);
                    setFareBreakdown(payload.fare_breakdown || null);
                } else {
                    setError(response.message || 'Failed to load ride details');
                }
            } catch {
                setError('Failed to load ride details');
            } finally {
                setLoading(false);
            }
        };
        fetchRideData();
    }, [rideId]);

    const downloadImage = async () => {
        const element = document.getElementById('receipt-content');
        if (!element) return;
        Swal.fire({ title: 'Generating image...', text: 'Please wait', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                skipAutoScale: true,
            });
            const link = document.createElement('a');
            link.download = `speedly_receipt_${ride?.ride_number || rideId}.png`;
            link.href = dataUrl;
            link.click();
            Swal.close();
            Swal.fire({ icon: 'success', title: 'Downloaded!', text: 'Receipt saved as PNG.', timer: 2000, showConfirmButton: false });
        } catch (e) {
            Swal.close();
            console.error('Download error:', e);
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(element, {
                backgroundColor: '#ffffff',
                pixelRatio: 1,
                cacheBust: true,
            });
            const link = document.createElement('a');
            link.download = `speedly_receipt_${ride?.ride_number || rideId}.png`;
            link.href = dataUrl;
            link.click();
            Swal.close();
            Swal.fire({ icon: 'success', title: 'Downloaded!', text: 'Receipt saved as PNG.', timer: 2000, showConfirmButton: false });
        }
    };

    const copyToken = () => {
        if (!ride?.release_token) return;
        const text = `SPEEDLY_RELEASE:${ride.id}:${ride.release_token}`;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const shareWhatsApp = () => {
        if (!ride) return;
        const text = [
            'SPEEDLY RIDE RECEIPT',
            `Receipt: #${ride.ride_number}`,
            `Date: ${new Date(ride.created_at).toLocaleString()}`,
            `From: ${ride.pickup_address}`,
            `To: ${ride.destination_address}`,
            `Amount: \u20A6${Number(ride.total_fare).toLocaleString()}`,
            `Driver: ${ride.driver_name || 'N/A'}`,
            'Thank you for riding with Speedly!'
        ].join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const formatCurrency = (amount: number) =>
        `\u20A6${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

    const qrData = ride?.release_token
        ? `SPEEDLY_RELEASE:${ride.id}:${ride.release_token}`
        : `SPEEDLY RECEIPT\n#${ride?.ride_number || ''}\n${ride ? formatCurrency(ride.total_fare) : ''}`;

    if (preloaderLoading) return <DesktopPreloader />;

    if (loading) return (
        <div className="receipt-loading">
            <div className="spinner"></div>
            <p>Loading receipt...</p>
        </div>
    );

    if (error || !ride) return (
        <div className="receipt-error">
            <i className="fas fa-exclamation-circle"></i>
            <p>{error || 'Ride not found'}</p>
            <button onClick={() => router.visit('/ride-history')} className="btn-back">Back to Ride History</button>
        </div>
    );

    const baseFare = fareBreakdown?.base_fare ?? 500;
    const distanceFare = fareBreakdown?.distance_fare ?? (ride.distance_km || 0) * 1000;
    const serviceFee = fareBreakdown?.service_fee ?? ride.total_fare * 0.05;
    const platformCommission = fareBreakdown?.platform_commission ?? ride.total_fare * 0.2;
    const driverPayout = fareBreakdown?.driver_payout ?? ride.total_fare - platformCommission;

    return (
        <div className="receipt-page">
            <div className="receipt-container" id="receipt-content">
                <div className="receipt-top-border"></div>

                <div className="receipt-header" style={{ textAlign: 'center', position: 'relative', padding: '24px 0' }}>
                    <img
                        src="/main-assets/logo-no-background.png"
                        alt="Speedly"
                        style={{ height: 45, marginBottom: 16, objectFit: 'contain' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div style={{
                        position: 'absolute', top: 16, right: 16,
                        background: '#fff3ed', padding: '4px 10px', borderRadius: 8,
                        fontSize: 11, fontWeight: 700, color: '#ff5e00'
                    }}>
                        ⚡ SPEEDLY
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>
                        🚖 RIDE RECEIPT
                    </div>
                    <p style={{ color: '#888', fontSize: 13, margin: 0 }}>Official Payment Confirmation</p>
                </div>

                <div style={{
                    background: 'linear-gradient(135deg, #fff3ed, #ffe8d6)',
                    padding: 12, margin: '0 20px 16px', borderRadius: 12,
                    textAlign: 'center', fontWeight: 700, fontSize: 14,
                    color: '#1a1a1a', border: '2px dashed #ffd4b8'
                }}>
                    RECEIPT #{ride.ride_number}
                </div>

                <div style={{ padding: '0 20px' }}>
                    {/* Ride Info */}
                    <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>
                            📋 Ride Information
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                                ['Date & Time', formatDate(ride.created_at)],
                                ['Ride Type', (ride.ride_type || 'Economy').charAt(0).toUpperCase() + (ride.ride_type || 'Economy').slice(1)],
                                ['Distance', `${Number(ride.distance_km || 0).toFixed(1)} km`],
                                ['Payment', 'PAID'],
                            ].map(([label, value], i) => (
                                <div key={i} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px' }}>
                                    <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>{label}</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Locations */}
                    <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 6, background: '#4CAF50', flexShrink: 0 }}></div>
                            <div>
                                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Pickup</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{ride.pickup_address}</div>
                            </div>
                        </div>
                        <div style={{ width: 1, height: 16, background: '#ddd', marginLeft: 5 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 6, background: '#F44336', flexShrink: 0 }}></div>
                            <div>
                                <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase' }}>Drop-off</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{ride.destination_address}</div>
                            </div>
                        </div>
                    </div>

                    {/* Parties */}
                    <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 18, background: '#ff5e00',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 14, margin: '0 auto 6px'
                                }}>
                                    {ride.client_name?.charAt(0)?.toUpperCase() || 'C'}
                                </div>
                                <div style={{ fontSize: 10, color: '#999' }}>Client</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{ride.client_name || 'Customer'}</div>
                            </div>
                            <div style={{ flex: 1, background: '#fff', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 18, background: '#cc3700',
                                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700, fontSize: 14, margin: '0 auto 6px'
                                }}>
                                    {ride.driver_name?.charAt(0)?.toUpperCase() || 'D'}
                                </div>
                                <div style={{ fontSize: 10, color: '#999' }}>Driver</div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>{ride.driver_name || 'TBA'}</div>
                            </div>
                        </div>
                    </div>

                    {ride.vehicle_model && (
                        <div style={{
                            background: '#fafafa', borderRadius: 12, padding: 12, marginBottom: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            fontSize: 13, color: '#555'
                        }}>
                            🚗 <strong>{ride.vehicle_model}</strong>
                            {ride.vehicle_color && <span>• {ride.vehicle_color}</span>}
                            {ride.plate_number && <span style={{ background: '#e8e8e8', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>{ride.plate_number}</span>}
                        </div>
                    )}

                    {/* Fare Breakdown */}
                    <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>
                            💰 Fare Breakdown
                        </h3>
                        {[
                            ['Base Fare', baseFare],
                            ['Distance Fare', distanceFare],
                            ['Service Fee', serviceFee],
                            ['Platform Commission', platformCommission],
                        ].map(([label, amount], i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#666' }}>
                                <span>{label}</span>
                                <span style={{ fontWeight: 500 }}>{formatCurrency(Number(amount))}</span>
                            </div>
                        ))}
                        <div style={{ borderTop: '2px solid #eee', marginTop: 6, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800, color: '#1a1a1a' }}>
                            <span>Total Paid</span>
                            <span style={{ color: '#ff5e00' }}>{formatCurrency(ride.total_fare)}</span>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div style={{ background: '#fafafa', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                            <span style={{ color: '#888' }}>💳 Speedly Wallet</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(ride.total_fare)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                            <span style={{ color: '#888' }}>👤 Driver Payout</span>
                            <span style={{ fontWeight: 600, color: '#4CAF50' }}>{formatCurrency(driverPayout)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa' }}>
                            <span>Reference</span>
                            <span>{payment?.reference || `WAL-${ride.ride_number?.substring(0, 8)}`}</span>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div style={{
                        background: 'linear-gradient(135deg, #fff, #fff3ed)',
                        borderRadius: 16, padding: '20px 16px', textAlign: 'center',
                        border: '2px dashed #ffd4b8', marginBottom: 16
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#ff5e00', marginBottom: 12 }}>
                            📱 SCAN TO RELEASE FUNDS
                        </div>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=fff&color=ff5e00`}
                            alt="Release QR"
                            style={{ width: 150, height: 150, borderRadius: 8 }}
                        />
                        <p style={{ fontSize: 11, color: '#999', margin: '8px 0 12px' }}>
                            {ride.release_token
                                ? 'Driver can scan this QR code to release funds instantly'
                                : 'Scan to verify receipt'}
                        </p>
                        <div style={{
                            padding: '10px 14px', background: '#fff',
                            borderRadius: 10, border: '1px solid #ffd4b8',
                            display: 'flex', alignItems: 'center', gap: 10
                        }}>
                            <input
                                readOnly
                                value={`SPEEDLY_RELEASE:${ride.id}:${ride.release_token}`}
                                style={{
                                    flex: 1, border: 'none', outline: 'none',
                                    fontFamily: 'monospace', fontSize: 10, color: '#555',
                                    background: 'transparent', wordBreak: 'break-all',
                                    cursor: 'text',
                                }}
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                            />
                            <button onClick={copyToken} style={{
                                background: copied ? '#4CAF50' : '#ff5e00',
                                color: '#fff', border: 'none', borderRadius: 8,
                                padding: '6px 14px', cursor: 'pointer',
                                fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                                transition: 'background 0.2s'
                            }}>
                                {copied ? '✓ Copied' : '📋 Copy'}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{
                    background: '#1a1a1a', color: '#fff', padding: 20, textAlign: 'center',
                    borderBottomLeftRadius: 16, borderBottomRightRadius: 16
                }}>
                    <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>⚡ SPEEDLY</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                        support@speedly.com | +234 800 000 0000
                    </div>
                    <div style={{ fontSize: 10, color: '#777', marginTop: 6 }}>
                        &copy; {new Date().getFullYear()} Speedly. Computer-generated receipt • No signature required
                    </div>
                </div>
            </div>

            <div className="receipt-actions" style={{
                display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20,
                flexWrap: 'wrap', padding: '0 12px'
            }}>
                <button className="action-btn download" onClick={downloadImage}>📥 Download</button>
                <button className="action-btn print" onClick={() => window.print()}>🖨 Print</button>
                <button className="action-btn share" onClick={shareWhatsApp}>💬 Share</button>
                <button className="action-btn history" onClick={() => router.visit('/clientridehistory')}>📋 History</button>
                <button className="action-btn book" onClick={() => router.visit('/clientbookride')}>🚗 New Ride</button>
            </div>
        </div>
    );
};

const WrappedGenerateReceipt: React.FC<{ rideId?: string }> = (props) => (
    <ErrorBoundary>
        <GenerateReceipt {...props} />
    </ErrorBoundary>
);

export default WrappedGenerateReceipt;
