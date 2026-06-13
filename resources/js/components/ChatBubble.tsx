import React, { useState, useEffect } from 'react';
import ChatWindow from './ChatWindow';

interface ChatBubbleProps {
    rideId: string;
    otherPartyName: string;
    currentRole: string;
}

const API = '/api';

async function chatJson(url: string) {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API}${url}`, {
        headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    });
    return res.json();
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ rideId, otherPartyName, currentRole }) => {
    const [open, setOpen] = useState(false);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        let lastCount = 0;
        const check = async () => {
            try {
                const json = await chatJson(`/rides/${rideId}/chat`);
                const data = json?.data || json || [];
                const list = Array.isArray(data) ? data : [];
                if (list.length > lastCount) {
                    const incoming = list.slice(lastCount);
                    const fromOther = incoming.filter((m: any) => m.sender_role !== currentRole).length;
                    if (!open && fromOther > 0) setUnread(prev => prev + fromOther);
                    lastCount = list.length;
                }
            } catch {}
        };
        check();
        const timer = setInterval(check, 3000);
        return () => clearInterval(timer);
    }, [rideId, open, currentRole]);

    return (
        <>
            <button onClick={() => { setOpen(true); setUnread(0); }} style={{
                position: 'fixed', bottom: 20, right: 20, zIndex: 9998,
                width: 56, height: 56, borderRadius: 28,
                background: 'linear-gradient(135deg, #ff5e00, #ff8c3a)',
                color: '#fff', border: 'none', cursor: 'pointer',
                fontSize: 22, boxShadow: '0 4px 16px rgba(255,94,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'ccPulse 2s infinite',
            }}>
                💬
                {unread > 0 && <span style={{
                    position: 'absolute', top: -4, right: -4,
                    background: '#ff3b30', color: '#fff', borderRadius: 10,
                    width: 22, height: 22, fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{unread}</span>}
            </button>
            {open && (
                <ChatWindow
                    rideId={rideId}
                    otherPartyName={otherPartyName}
                    currentRole={currentRole}
                    onClose={() => setOpen(false)}
                />
            )}
            <style>{`
                @keyframes ccPulse {
                    0%, 100% { box-shadow: 0 4px 16px rgba(255,94,0,0.4); }
                    50% { box-shadow: 0 4px 24px rgba(255,94,0,0.7); }
                }
            `}</style>
        </>
    );
};

export default ChatBubble;
