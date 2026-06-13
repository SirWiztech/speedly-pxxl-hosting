import React from 'react';
import { useActiveRide } from '../contexts/ActiveRideContext';
import ChatBubble from './ChatBubble';

const GlobalChatBubble: React.FC = () => {
    const { activeRide } = useActiveRide();

    if (!activeRide?.id || activeRide?.status === 'completed') return null;

    const otherPartyName =
        activeRide.user_role === 'client'
            ? activeRide.driver_name || 'Driver'
            : activeRide.client_name || 'Client';

    return (
        <ChatBubble
            rideId={activeRide.id}
            otherPartyName={otherPartyName}
            currentRole={activeRide.user_role}
        />
    );
};

export default GlobalChatBubble;
