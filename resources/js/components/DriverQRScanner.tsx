import React, { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Props {
    onClose: () => void;
    onRelease: (rideId: string, token: string) => void;
}

const DriverQRScanner: React.FC<Props> = ({ onClose, onRelease }) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [manualToken, setManualToken] = useState('');

    const startScan = async () => {
        setError('');
        setScanning(true);
        try {
            const scanner = new Html5Qrcode('qr-reader');
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText: string) => {
                    scanner.stop().then(() => {
                        const match = decodedText.match(/SPEEDLY_RELEASE:(.+):(.+)/);
                        if (match) {
                            onRelease(match[1], match[2]);
                        } else {
                            setError('Invalid QR code — this is not a Speedly release code');
                            setScanning(false);
                        }
                    });
                },
                () => {}
            );
        } catch (e) {
            setError('Camera access denied. Use the manual entry field below or enable camera permissions.');
            setScanning(false);
        }
    };

    const handleManualSubmit = () => {
        const text = manualToken.trim();
        if (!text) return;
        const match = text.match(/SPEEDLY_RELEASE:(.+):(.+)/);
        if (match) {
            onRelease(match[1], match[2]);
        } else {
            setError('Invalid format. Enter the full token string from the receipt.');
        }
    };

    const handleRawToken = (raw: string) => {
        setManualToken(raw);
        const colonCount = (raw.match(/:/g) || []).length;
        if (colonCount >= 2) {
            const match = raw.match(/SPEEDLY_RELEASE:(.+):(.+)/);
            if (match) setError('');
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{
                background: '#fff', borderRadius: 20, padding: 24, width: 400,
                maxHeight: '90vh', overflow: 'auto', textAlign: 'center'
            }}>
                <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 700 }}>📷 Scan QR Code</h3>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
                    Point your camera at the receipt QR code to release funds
                </p>
                <div id="qr-reader" style={{ width: '100%', minHeight: 250 }}></div>
                {!scanning && !error && (
                    <button onClick={startScan} style={{
                        width: '100%', padding: 12, background: 'linear-gradient(135deg, #ff5e00, #ff8c3a)',
                        color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
                        fontWeight: 600, fontSize: 15, marginTop: 16
                    }}>Start Scanning</button>
                )}
                {error && (
                    <div style={{
                        color: '#dc3545', fontSize: 13, marginTop: 12, padding: 10,
                        background: '#fff5f5', borderRadius: 8, textAlign: 'left'
                    }}>{error}</div>
                )}

                <div style={{
                    marginTop: 20, paddingTop: 16, borderTop: '1px solid #eee',
                    textAlign: 'left'
                }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>
                        Or paste the release token manually:
                    </p>
                    <textarea
                        value={manualToken}
                        onChange={e => handleRawToken(e.target.value)}
                        placeholder="SPEEDLY_RELEASE:rideId:token..."
                        rows={3}
                        style={{
                            width: '100%', padding: '10px 12px', borderRadius: 10,
                            border: '1px solid #ddd', fontSize: 12, fontFamily: 'monospace',
                            resize: 'vertical', outline: 'none'
                        }}
                    />
                    <button onClick={handleManualSubmit} style={{
                        width: '100%', padding: 10, background: '#4CAF50', color: '#fff',
                        border: 'none', borderRadius: 12, cursor: 'pointer',
                        fontWeight: 600, fontSize: 14, marginTop: 10
                    }}>Submit Token</button>
                </div>

                <button onClick={onClose} style={{
                    width: '100%', padding: 10, background: '#f5f5f5', color: '#666',
                    border: 'none', borderRadius: 12, cursor: 'pointer', marginTop: 12, fontSize: 14
                }}>Close</button>
            </div>
        </div>
    );
};

export default DriverQRScanner;
