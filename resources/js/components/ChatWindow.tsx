import React, { useState, useEffect, useRef } from 'react';

interface Props {
    rideId: string;
    otherPartyName: string;
    currentRole: string;
    onClose: () => void;
}

const API = '/api';

async function chatFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API}${url}`, {
        ...options,
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            ...(options.headers as Record<string, string> || {}),
        },
    });
    return res.json();
}

const ChatWindow: React.FC<Props> = ({ rideId, otherPartyName, currentRole, onClose }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [minimized, setMinimized] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const echoRef = useRef<any>(null);

    const scrollDown = () => {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    // Load messages from REST API
    const loadMessages = async () => {
        try {
            const json = await chatFetch(`/rides/${rideId}/chat`);
            const data = json?.data || json;
            const arr = Array.isArray(data) ? data : [];
            setMessages(prev => {
                const serverIds = new Set(arr.map((m: any) => m.id));
                const optimistic = prev.filter(m => (m.id as string).startsWith('opt_'));
                const merged = [...arr, ...optimistic.filter(m => !serverIds.has(m.id))];
                return merged;
            });
        } catch {}
    };

    // Subscribe to Reverb WebSocket for real-time messages
    useEffect(() => {
        let cleanup = () => {};
        const setupReverb = async () => {
            try {
                const Pusher = (await import('pusher-js')).default;
                const Echo = (await import('laravel-echo')).default;

                const echo = new Echo({
                    broadcaster: 'pusher',
                    key: 'speedlykey',
                    wsHost: '127.0.0.1',
                    wsPort: 8080,
                    wssPort: 8080,
                    forceTLS: false,
                    encrypted: false,
                    disableStats: true,
                    enabledTransports: ['ws'],
                });

                echo.connector.socket.on('connect', () => {
                    console.log('[Chat] WebSocket connected');
                    setWsConnected(true);
                });
                echo.connector.socket.on('disconnect', () => {
                    console.log('[Chat] WebSocket disconnected');
                    setWsConnected(false);
                });

                const channel = echo.channel('chat.' + rideId);
                channel.subscribed(() => {
                    console.log('[Chat] Subscribed to chat.' + rideId);
                });
                channel.listen('.message.sent', (msg: any) => {
                    console.log('[Chat] Received via WebSocket:', msg);
                    setMessages(prev => {
                        if (prev.some(m => m.id === msg.id)) return prev;
                        return [...prev, msg];
                    });
                    scrollDown();
                });

                echoRef.current = echo;
                cleanup = () => { try { echo.disconnect(); } catch {} };
            } catch {}
        };
        setupReverb();
        return () => cleanup();
    }, [rideId]);

    // Initial load + polling fallback (slower when Reverb isn't connected)
    useEffect(() => {
        loadMessages().then(() => setLoading(false));
    }, [rideId]);

    useEffect(() => {
        const interval = wsConnected ? 10000 : 2000;
        const timer = setInterval(loadMessages, interval);
        return () => clearInterval(timer);
    }, [rideId, wsConnected]);

    useEffect(() => { scrollDown(); }, [messages.length]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        setMessages(prev => [...prev, {
            id: 'opt_' + Math.random().toString(36).slice(2),
            ride_id: rideId,
            sender_role: currentRole,
            message: text,
            created_at: new Date().toISOString(),
        }]);
        scrollDown();
        try {
            const json = await chatFetch(`/rides/${rideId}/chat`, {
                method: 'POST',
                body: JSON.stringify({ message: text }),
            });
            const msg = json?.data || json;
            if (msg?.id) {
                setMessages(prev => prev.map(m => {
                    if (m.id.startsWith('opt_') && m.message === text) {
                        return { ...msg, sender_role: currentRole };
                    }
                    return m;
                }));
            }
        } catch {}
    };

    if (minimized) return (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
            <button onClick={() => setMinimized(false)} style={{
                width: 56, height: 56, borderRadius: 28, background: '#ff5e00', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 22,
                boxShadow: '0 4px 16px rgba(255,94,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>💬</button>
        </div>
    );

    return (
        <div style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
            width: 340, height: 480, background: '#fff', borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', border: '1px solid #e5e5e5',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #ff5e00, #ff8c3a)', color: '#fff',
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', fontWeight: 600, fontSize: 14,
            }}>
                <span>💬 {otherPartyName}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setMinimized(true)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>─</button>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12, background: '#f8f9fa' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Loading...</div>
                ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Start chatting!</div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} style={{
                            display: 'flex',
                            justifyContent: msg.sender_role === currentRole ? 'flex-end' : 'flex-start',
                            marginBottom: 8,
                        }}>
                            <div style={{
                                maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                                background: msg.sender_role === currentRole ? '#ff5e00' : '#e9ecef',
                                color: msg.sender_role === currentRole ? '#fff' : '#333',
                                fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
                            }}>
                                <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 2, opacity: 0.8 }}>
                                    {msg.sender_role === currentRole ? 'You' : (otherPartyName || 'Other').split(' ')[0]}
                                </div>
                                {msg.message}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
            <div style={{ padding: 10, borderTop: '1px solid #e5e5e5', display: 'flex', gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..." style={{
                        flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid #ddd',
                        outline: 'none', fontSize: 13,
                    }} />
                <button onClick={sendMessage} style={{
                    background: '#ff5e00', color: '#fff', border: 'none', borderRadius: 20,
                    padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                }}>Send</button>
            </div>
        </div>
    );
};

export default ChatWindow;
