import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import ClientNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import '../../../css/ClientAIAssistantMobile.css';

// Types
interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

interface TopicCategory {
    title: string;
    icon: string;
    color: string;
    bgColor: string;
    items: TopicItem[];
}

interface TopicItem {
    icon: string;
    title: string;
    description: string;
    answer: string;
}

const ClientAIAssistantMobile: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('client');
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Hello! I'm your Speedly AI Assistant. How can I help you today?`,
            isUser: false,
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [showTopics, setShowTopics] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const chatBodyRef = useRef<HTMLDivElement>(null);

    // Topics data
    const topicsData: Record<string, TopicCategory> = {
        'getting-started': {
            title: 'Getting Started',
            icon: 'fa-rocket',
            color: '#ff5e00',
            bgColor: '#fff5f0',
            items: [
                {
                    icon: 'fa-user-plus',
                    title: 'Creating an Account',
                    description: 'Learn how to sign up and verify your account',
                    answer: 'To create a Speedly account:\n\n1. Go to the registration page\n2. Enter your full name, username, email, and phone number\n3. Create a strong password\n4. Select your role\n5. Agree to the Terms of Service\n6. Click "Create Account"\n7. Verify your email using the OTP sent'
                },
                {
                    icon: 'fa-car-side',
                    title: 'Your First Ride',
                    description: 'Step-by-step guide to booking your first trip',
                    answer: 'Booking your first ride is easy:\n\n1. Log in to your Speedly account\n2. Tap "Book Ride" from the dashboard\n3. Enter your pickup location\n4. Enter your destination\n5. Choose your vehicle type\n6. Review the estimated fare\n7. Confirm your booking'
                },
                {
                    icon: 'fa-map-marker-alt',
                    title: 'Setting Locations',
                    description: 'How to accurately set pickup and drop-off',
                    answer: 'Setting accurate locations helps your driver find you:\n\n• Use the map to pinpoint your exact pickup spot\n• Enable location services for better accuracy\n• Add a description if needed\n• For pickup, wait in a safe, visible location'
                }
            ]
        },
        'booking': {
            title: 'Booking Rides',
            icon: 'fa-car',
            color: '#2e7d32',
            bgColor: '#e8f5e9',
            items: [
                {
                    icon: 'fa-question-circle',
                    title: 'Ride Types',
                    description: 'Understanding Economy vs Comfort options',
                    answer: 'Speedly offers two ride types:\n\n🚗 ECONOMY\n• Affordable rides for everyday travel\n• Standard vehicles\n\n🚙 COMFORT\n• Premium vehicles for a better experience\n• Higher level of service'
                },
                {
                    icon: 'fa-money-bill-wave',
                    title: 'Understanding Fares',
                    description: 'How fares are calculated',
                    answer: 'Your fare is calculated based on:\n\n• Base Fare: Fixed starting amount\n• Distance: Rate per kilometer traveled\n• Time: Additional charges for longer trips\n• Surge Pricing: May apply during high demand'
                },
                {
                    icon: 'fa-times-circle',
                    title: 'Cancelling Rides',
                    description: 'How to cancel and cancellation policy',
                    answer: 'To cancel a ride:\n\n1. Go to your active ride\n2. Tap "Cancel Ride"\n3. Select a reason\n\n⚠️ Free cancellation within 2 minutes of booking'
                }
            ]
        },
        'payments': {
            title: 'Payments & Wallet',
            icon: 'fa-wallet',
            color: '#1565c0',
            bgColor: '#e3f2fd',
            items: [
                {
                    icon: 'fa-plus-circle',
                    title: 'Adding Funds',
                    description: 'How to add money to your wallet',
                    answer: 'To add funds to your wallet:\n\n1. Go to your Wallet page\n2. Tap "Add to Wallet"\n3. Enter the amount\n4. Select your payment method\n5. Complete the payment via KoraPay\n6. Funds are credited instantly!\n\nMinimum deposit: ₦100'
                },
                {
                    icon: 'fa-credit-card',
                    title: 'Payment Methods',
                    description: 'Setting up and managing payment options',
                    answer: 'Speedly supports:\n\n💳 Cards: Visa, Mastercard, Verve\n🏦 Bank Transfer via KoraPay\n\nAll payments are processed securely.'
                },
                {
                    icon: 'fa-receipt',
                    title: 'Transaction History',
                    description: 'How to check your past transactions',
                    answer: 'To view your transaction history:\n\n1. Go to Wallet\n2. Tap "Transaction History"\n\nYou\'ll see all deposits and payments with dates and status.'
                }
            ]
        },
        'safety': {
            title: 'Safety Tips',
            icon: 'fa-shield-alt',
            color: '#c62828',
            bgColor: '#fce4ec',
            items: [
                {
                    icon: 'fa-user-check',
                    title: 'Verify Your Driver',
                    description: 'How to confirm your driver is legitimate',
                    answer: 'Safety first! Always verify:\n\n• Driver photo matches the person\n• License plate matches your ride\n• Driver name matches booking\n\nIf something feels wrong, cancel and report.'
                },
                {
                    icon: 'fa-map-pin',
                    title: 'Share Your Trip',
                    description: 'How to share your location with others',
                    answer: 'During the ride, tap "Share Trip" to share:\n• Real-time location\n• Driver details\n• Estimated arrival time'
                },
                {
                    icon: 'fa-exclamation-triangle',
                    title: 'Reporting Issues',
                    description: 'How to report safety concerns',
                    answer: 'For emergencies, call 911 first.\n\nTo report to Speedly:\n• Use the Support section\n• Select "Safety Concern" category\n• Provide details'
                }
            ]
        },
        'troubleshooting': {
            title: 'Troubleshooting',
            icon: 'fa-tools',
            color: '#7b1fa2',
            bgColor: '#f3e5f5',
            items: [
                {
                    icon: 'fa-wifi',
                    title: 'Connection Issues',
                    description: 'Fix app connectivity problems',
                    answer: 'Try these steps:\n\n1. Check your internet connection\n2. Toggle Airplane mode on/off\n3. Restart the Speedly app\n4. Update to the latest version'
                },
                {
                    icon: 'fa-hourglass-half',
                    title: 'Payment Delays',
                    description: 'What to do if payment fails',
                    answer: 'If money was deducted but not credited:\n• Contact support immediately\n• Provide payment reference number'
                },
                {
                    icon: 'fa-car-crash',
                    title: 'Ride Issues',
                    description: 'What to do when something goes wrong',
                    answer: 'Common issues:\n\n🚗 Driver not showing: Try calling the driver\n📍 Wrong location: Verify in app\n💸 Wrong fare: Check ride history'
                }
            ]
        }
    };

    // Fetch user data
    const fetchUserData = async () => {
        try {
            const data = await api.client.stats();
            
            if (data.success) {
                setUserData(data.user);
                setUserRole(data.user?.role || 'client');
                setNotificationCount(data.notification_count || 0);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get AI response
    const getAIResponse = (question: string): string => {
        const q = question.toLowerCase();
        
        if (q.includes('book') || q.includes('ride')) {
            return 'To book a ride:\n\n1. Go to your dashboard\n2. Tap "Book Ride"\n3. Set pickup & destination\n4. Choose vehicle type\n5. Confirm & pay';
        }
        if (q.includes('wallet') || q.includes('add money') || q.includes('deposit')) {
            return 'To add funds:\n\n1. Go to Wallet\n2. Tap "Add to Wallet"\n3. Enter amount\n4. Pay via KoraPay\n\nMinimum: ₦100';
        }
        if (q.includes('cancel')) {
            return 'To cancel a ride:\n\n1. Open active ride\n2. Tap "Cancel Ride"\n3. Select reason\n\n⚠️ Free within 2 minutes';
        }
        if (q.includes('support') || q.includes('help')) {
            return 'Need support?\n\n📧 Email: speedlyentreprise01@gmail.com\n📞 Phone: +234 800 000 0000';
        }
        return 'I\'m here to help! Try asking about:\n\n• Booking rides\n• Wallet & payments\n• Safety guidelines\n• Troubleshooting';
    };

    // Send message
    const sendMessage = () => {
        if (!inputValue.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputValue,
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setShowTopics(false);
        setIsTyping(true);

        setTimeout(() => {
            const response = getAIResponse(inputValue);
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response,
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            setIsTyping(false);
        }, 1500);
    };

    // Show topic answer
    const showTopicAnswer = (answer: string) => {
        const aiMessage: Message = {
            id: Date.now().toString(),
            text: answer,
            isUser: false,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setShowTopics(false);
        setSelectedCategory(null);
        
        setTimeout(() => {
            if (chatBodyRef.current) {
                chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
            }
        }, 100);
    };

    // Select category
    const selectCategory = (categoryId: string) => {
        setSelectedCategory(categoryId);
    };

    // Go back to topics
    const goBackToTopics = () => {
        setSelectedCategory(null);
        setShowTopics(true);
    };

    // Quick question
    const askQuickQuestion = (question: string) => {
        setInputValue(question);
        setTimeout(() => sendMessage(), 100);
    };

    // Auto-scroll
    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Initial data fetch
    useEffect(() => {
        fetchUserData();
    }, []);

    const formatMessageText = (text: string) => {
        return text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
                {line}
                {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    };

    const firstName = userData?.fullname?.split(' ')[0] || userData?.full_name?.split(' ')[0] || 'Guest';

    return (
        <div className="mobile-ai-container">
            <div className="mobile-ai-view">
                {/* Header */}
                <div className="mobile-ai-header">
                    <div>
                        <h1><i className="fas fa-robot"></i> AI Assistant</h1>
                    </div>
                    <button className="mobile-ai-notification-btn" onClick={() => router.visit('/notifications')}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge font-roboto-number">{notificationCount}</span>}
                    </button>
                </div>

                {/* Hero Section */}
                <div className="mobile-ai-hero">
                    <div className="mobile-ai-avatar">
                        <i className="fas fa-robot"></i>
                    </div>
                    <h2>Hello, {firstName}!</h2>
                    <p>I'm your Speedly AI Assistant. How can I help you today?</p>
                </div>

                {/* Topics Section */}
                {showTopics && !selectedCategory && (
                    <div className="mobile-ai-topics">
                        <h3>Browse Topics</h3>
                        <div className="mobile-topics-grid">
                            <div className="mobile-topic-card" onClick={() => selectCategory('getting-started')}>
                                <div className="mobile-topic-icon" style={{ background: '#fff5f0', color: '#ff5e00' }}>
                                    <i className="fas fa-rocket"></i>
                                </div>
                                <h4>Getting Started</h4>
                                <p>Learn the basics</p>
                            </div>

                            <div className="mobile-topic-card" onClick={() => selectCategory('booking')}>
                                <div className="mobile-topic-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                                    <i className="fas fa-car"></i>
                                </div>
                                <h4>Booking Rides</h4>
                                <p>Step-by-step guide</p>
                            </div>

                            <div className="mobile-topic-card" onClick={() => selectCategory('payments')}>
                                <div className="mobile-topic-icon" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                                    <i className="fas fa-wallet"></i>
                                </div>
                                <h4>Payments</h4>
                                <p>Wallet & billing</p>
                            </div>

                            <div className="mobile-topic-card" onClick={() => selectCategory('safety')}>
                                <div className="mobile-topic-icon" style={{ background: '#fce4ec', color: '#c62828' }}>
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <h4>Safety</h4>
                                <p>Stay protected</p>
                            </div>

                            <div className="mobile-topic-card" onClick={() => selectCategory('troubleshooting')}>
                                <div className="mobile-topic-icon" style={{ background: '#f3e5f5', color: '#7b1fa2' }}>
                                    <i className="fas fa-tools"></i>
                                </div>
                                <h4>Help</h4>
                                <p>Troubleshooting</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Topics Detail */}
                {selectedCategory && (
                    <div className="mobile-ai-topics-detail">
                        <div className="mobile-back-link" onClick={goBackToTopics}>
                            <i className="fas fa-arrow-left"></i> Back to Topics
                        </div>
                        <h3>{topicsData[selectedCategory]?.title}</h3>
                        <div className="mobile-topics-list">
                            {topicsData[selectedCategory]?.items.map((item, index) => (
                                <div key={index} className="mobile-topic-item" onClick={() => showTopicAnswer(item.answer)}>
                                    <div className="mobile-topic-item-icon" style={{ background: topicsData[selectedCategory].bgColor, color: topicsData[selectedCategory].color }}>
                                        <i className={`fas ${item.icon}`}></i>
                                    </div>
                                    <div className="mobile-topic-item-content">
                                        <h4>{item.title}</h4>
                                        <p>{item.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Chat Container */}
                <div className="mobile-ai-chat-container">
                    <div className="mobile-ai-chat-header">
                        <div className="mobile-ai-chat-avatar">
                            <i className="fas fa-robot"></i>
                        </div>
                        <div className="mobile-ai-chat-title">
                            <h3>Speedly AI</h3>
                            <p>Online • Ready to help</p>
                        </div>
                    </div>

                    <div className="mobile-ai-chat-body" ref={chatBodyRef}>
                        {messages.map((message) => (
                            <div key={message.id} className={`mobile-ai-message ${message.isUser ? 'user' : 'ai'}`}>
                                {formatMessageText(message.text)}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="mobile-ai-message ai typing">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mobile-ai-quick-actions">
                        <button className="mobile-ai-quick-btn" onClick={() => askQuickQuestion('How do I book a ride?')}>
                            <i className="fas fa-car"></i> Book Ride
                        </button>
                        <button className="mobile-ai-quick-btn" onClick={() => askQuickQuestion('How do I add money?')}>
                            <i className="fas fa-plus"></i> Add Funds
                        </button>
                        <button className="mobile-ai-quick-btn" onClick={() => askQuickQuestion('How do I cancel?')}>
                            <i className="fas fa-times"></i> Cancel
                        </button>
                    </div>

                    <div className="mobile-ai-chat-input-row">
                        <input
                            type="text"
                            className="mobile-ai-chat-input"
                            placeholder="Ask me anything..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        />
                        <button className="mobile-ai-send-btn" onClick={sendMessage}>
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>

                {/* Bottom Navigation */}
                <ClientNavMobile />
            </div>
        </div>
    );
};

export default ClientAIAssistantMobile;