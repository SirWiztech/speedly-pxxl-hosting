import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ClientAIAssistantMobile from '../components/mobileViewComponent/ClientAIAssistantMobile';
import '../../css/ClientAIAssistant.css';

// Types
interface TopicItem {
    icon: string;
    title: string;
    description: string;
    answer: string;
}

interface TopicCategory {
    title: string;
    icon: string;
    color: string;
    bgColor: string;
    items: TopicItem[];
}

interface Message {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
}

const ClientAIAssistant: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('client');
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: `Hello! I'm your Speedly AI Assistant. I can help you with:\n\n• Understanding how to use the platform\n• Booking rides and managing trips\n• Payment and wallet questions\n• Safety guidelines\n• Troubleshooting common issues\n\nWhat would you like to know?`,
            isUser: false,
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedTopicAnswer, setSelectedTopicAnswer] = useState<string | null>(null);

    const chatBodyRef = useRef<HTMLDivElement>(null);
    const topicsDataRef = useRef<Record<string, TopicCategory>>({});
    
    const preloaderLoading = usePreloader(1000);
    const isMobile = useMobile();

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
                    answer: 'To create a Speedly account:\n\n1. Go to the registration page\n2. Enter your full name, username, email, and phone number\n3. Create a strong password\n4. Select your role (Customer or Driver)\n5. Agree to the Terms of Service\n6. Click "Create Account"\n7. Verify your email using the OTP sent\n\nOnce verified, you can start using Speedly!'
                },
                {
                    icon: 'fa-car-side',
                    title: 'Your First Ride',
                    description: 'Step-by-step guide to booking your first trip',
                    answer: 'Booking your first ride is easy:\n\n1. Log in to your Speedly account\n2. Tap "Book Ride" from the dashboard\n3. Enter your pickup location\n4. Enter your destination\n5. Choose your vehicle type (Economy or Comfort)\n6. Review the estimated fare\n7. Confirm your booking\n\nYour driver will be assigned and you can track their location in real-time!'
                },
                {
                    icon: 'fa-map-marker-alt',
                    title: 'Setting Locations',
                    description: 'How to accurately set pickup and drop-off',
                    answer: 'Setting accurate locations helps your driver find you:\n\n• Use the map to pinpoint your exact pickup spot\n• Enable location services for better accuracy\n• Add a description if needed\n• For pickup, wait in a safe, visible location\n\nTip: Save your frequent locations (home, office) for faster booking!'
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
                    answer: 'Speedly offers two ride types:\n\n🚗 ECONOMY\n• Affordable rides for everyday travel\n• Standard vehicles\n• Base fare + per kilometer pricing\n\n🚙 COMFORT\n• Premium vehicles for a better experience\n• Higher level of service\n• Higher pricing but more comfort\n\nBoth include real-time tracking and secure payment!'
                },
                {
                    icon: 'fa-money-bill-wave',
                    title: 'Understanding Fares',
                    description: 'How fares are calculated',
                    answer: 'Your fare is calculated based on:\n\n• Base Fare: Fixed starting amount\n• Distance: Rate per kilometer traveled\n• Time: Additional charges for longer trips\n• Surge Pricing: May apply during high demand\n\nTotal Fare = Base + (Distance × Rate/km) + Time + Service Fee\n\nThe exact fare is shown before you confirm!'
                },
                {
                    icon: 'fa-times-circle',
                    title: 'Cancelling Rides',
                    description: 'How to cancel and cancellation policy',
                    answer: 'To cancel a ride:\n\n1. Go to your active ride\n2. Tap "Cancel Ride"\n3. Select a reason for cancellation\n\n⚠️ Cancellation Policy:\n• Free cancellation within 2 minutes of booking\n• After 2 minutes, a small fee may apply\n• If driver is already en route, fee may be higher'
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
                    answer: 'To add funds to your wallet:\n\n1. Go to your Wallet page\n2. Tap "Add to Wallet"\n3. Enter the amount you want to add\n4. Select your payment method\n5. Complete the payment via KoraPay\n6. Funds are credited instantly!\n\nMinimum deposit: ₦100\nMaximum deposit: ₦500,000'
                },
                {
                    icon: 'fa-credit-card',
                    title: 'Payment Methods',
                    description: 'Setting up and managing payment options',
                    answer: 'Speedly supports:\n\n💳 Cards\n• Visa, Mastercard, Verve\n\n🏦 Bank Transfer\n• Direct bank transfer via KoraPay\n• Virtual account numbers available\n\nAll payments are processed securely through KoraPay. Your card details are never stored on our servers.'
                },
                {
                    icon: 'fa-receipt',
                    title: 'Transaction History',
                    description: 'How to check your past transactions',
                    answer: 'To view your transaction history:\n\n1. Go to Wallet\n2. Tap "Transaction History"\n\nYou\'ll see:\n• All deposits and payments\n• Transaction dates and times\n• Reference numbers\n• Status (completed, pending, failed)'
                }
            ]
        },
        'driver-guide': {
            title: 'Driver Guide',
            icon: 'fa-id-card',
            color: '#ef6c00',
            bgColor: '#fff3e0',
            items: [
                {
                    icon: 'fa-user-check',
                    title: 'Getting Approved',
                    description: 'Complete your driver onboarding',
                    answer: 'To become a Speedly driver:\n\n1. Register as a Driver\n2. Complete your KYC verification:\n   • Upload driver\'s license\n   • Take a selfie with your ID\n3. Add your vehicle information\n4. Wait for admin approval\n\nOnce approved, you can start accepting rides!'
                },
                {
                    icon: 'fa-money-check',
                    title: 'Earnings & Withdrawals',
                    description: 'How to earn and withdraw your money',
                    answer: 'As a driver, you earn from completed rides.\n\n📈 EARNINGS:\n• You receive 80% of the fare\n• Earnings appear in your wallet\n\n💸 WITHDRAWALS:\n• Minimum withdrawal: ₦1,000\n• Add your bank details in Settings\n• Request from Wallet page\n• Processed within 24-48 hours'
                },
                {
                    icon: 'fa-map-marked',
                    title: 'Accepting Rides',
                    description: 'How to accept and complete rides',
                    answer: 'Accepting rides:\n\n1. Make sure you\'re online\n2. When a request comes in, check details\n3. Accept if it works for you\n4. Navigate to pickup location\n5. Mark "Arrived" when there\n6. Start ride when passenger is in\n7. Complete ride at destination\n\nTip: High acceptance rate = more requests!'
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
                    answer: 'Safety first! Always verify your driver:\n\n✅ Check the app:\n• Driver photo matches the person\n• License plate matches your ride\n• Driver name matches booking\n\n✅ Before starting:\n• Ask "Who are you picking up?"\n• Don\'t share personal info\n• If something feels wrong, cancel and report'
                },
                {
                    icon: 'fa-map-pin',
                    title: 'Share Your Trip',
                    description: 'How to share your location with others',
                    answer: 'For your safety, share your trip:\n\n1. During the ride\n2. Tap the "Share Trip" option\n3. Choose a contact to share with\n\nWhat\'s shared:\n• Real-time location\n• Driver details\n• Estimated arrival time\n\nYour contacts can track you without needing the app!'
                },
                {
                    icon: 'fa-exclamation-triangle',
                    title: 'Reporting Issues',
                    description: 'How to report safety concerns',
                    answer: 'If you experience any issues:\n\n🚨 Emergency:\n• Call 911 or local emergency services first\n\n📞 Report to Speedly:\n• Use the Support section\n• Select "Safety Concern" category\n• Provide details of the incident\n\nAll reports are treated confidentially.'
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
                    answer: 'If the app isn\'t working:\n\n📱 Try these steps:\n1. Check your internet connection\n2. Toggle Airplane mode on/off\n3. Restart the Speedly app\n4. Update to the latest version\n5. Restart your phone\n\nIf problems persist, contact support.'
                },
                {
                    icon: 'fa-hourglass-half',
                    title: 'Payment Delays',
                    description: 'What to do if payment fails',
                    answer: 'Payment issues? Here\'s what to check:\n\n💳 Card Payments:\n• Ensure sufficient funds\n• Verify card hasn\'t expired\n• Check if online transactions enabled\n\n💰 If money was deducted but not credited:\n• Contact support immediately\n• Provide payment reference number'
                },
                {
                    icon: 'fa-car-crash',
                    title: 'Ride Issues',
                    description: 'What to do when something goes wrong',
                    answer: 'Common ride issues:\n\n🚗 Driver not showing:\n• Check if they cancelled\n• Try calling the driver\n• Request another ride\n\n📍 Wrong location:\n• Verify pickup/destination in app\n• Contact driver to clarify\n\n💸 Wrong fare:\n• Check ride history for breakdown\n• Dispute within 24 hours'
                }
            ]
        }
    };

    // Fetch user data
    const fetchUserData = async () => {
        try {
            const data = await api.client.profile();
            
            if (data.success || data.data) {
                const user = data.data?.user || data.user || data.data;
                setUserData(user);
                setUserRole(user?.role || data.data?.role || 'client');
                setNotificationCount(data.notification_count || data.data?.notification_count || 0);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get AI response based on question
    const getAIResponse = (question: string): string => {
        const q = question.toLowerCase();
        
        if (q.includes('book') || q.includes('ride')) {
            return 'To book a ride:\n\n1. Go to your dashboard\n2. Tap "Book Ride"\n3. Set pickup & destination\n4. Choose vehicle type\n5. Confirm & pay\n\nNeed more help? I can show you detailed guides!';
        }
        if (q.includes('wallet') || q.includes('add money') || q.includes('deposit') || q.includes('fund')) {
            return 'To add funds to your wallet:\n\n1. Go to Wallet\n2. Tap "Add to Wallet"\n3. Enter amount\n4. Pay via KoraPay\n5. Funds credited instantly!\n\nMinimum: ₦100 | Maximum: ₦500,000';
        }
        if (q.includes('cancel')) {
            return 'To cancel a ride:\n\n1. Open active ride\n2. Tap "Cancel Ride"\n3. Select reason\n\n⚠️ Free within 2 minutes. After that, a small fee may apply.';
        }
        if (q.includes('support') || q.includes('help') || q.includes('contact')) {
            return 'Need support? Here are your options:\n\n📱 Go to Support page in your dashboard\n💬 Open a support ticket\n📧 Email: speedlyentreprise01@gmail.com\n📞 Phone: +234 800 000 0000\n\nResponse time: within 24 hours';
        }
        if (q.includes('driver') && q.includes('withdraw')) {
            return 'As a driver, to withdraw earnings:\n\n1. Go to Wallet\n2. Tap "Withdraw"\n3. Enter amount (min ₦1,000)\n4. Select/add bank details\n5. Submit request\n\nProcessed within 24-48 hours!';
        }
        if (q.includes('safety') || q.includes('emergency')) {
            return 'Safety tips:\n\n✅ Verify driver details before ride\n✅ Share your trip with contacts\n✅ Rate drivers honestly\n✅ Report issues via Support\n\nFor emergencies, call 911 first!';
        }
        
        return 'I\'m here to help! Try asking about:\n\n• Booking rides\n• Wallet & payments\n• Driver earnings (for drivers)\n• Safety guidelines\n• Troubleshooting\n\nOr browse the topics on the left!';
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
        setSelectedTopicAnswer(answer);
        
        // Scroll to bottom
        setTimeout(() => {
            if (chatBodyRef.current) {
                chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
            }
        }, 100);
    };

    // Quick question
    const askQuickQuestion = (question: string) => {
        setInputValue(question);
        setTimeout(() => sendMessage(), 100);
    };

    // Auto-scroll to bottom when messages change
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

    const firstName = (userData?.fullname || userData?.full_name)?.split(' ')[0] || 'Guest';

    if (loading || preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view
    if (isMobile) {
        return <ClientAIAssistantMobile />;
    }

    return (
        <div className="ai-desktop-container">
            <ClientSidebarDesktop 
                userName={userData?.fullname || userData?.full_name || 'User'} 
                profilePictureUrl={userData?.profile_picture_url}
            />

            <div className="ai-desktop-main">
                {/* Header */}
                <div className="ai-desktop-header">
                    <div className="ai-desktop-title">
                        <h1>AI Assistant</h1>
                        <p>Get help and learn about Speedly features</p>
                    </div>
                    <button className="ai-notification-btn" onClick={() => router.visit('/notifications')}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}
                    </button>
                </div>

                {/* Desktop Grid */}
                <div className="ai-desktop-grid">
                    {/* Categories Card */}
                    <div className="ai-categories-card">
                        <h2><i className="fas fa-th-large" style={{ color: '#ff5e00' }}></i> Browse Topics</h2>
                        <div className="ai-categories-list">
                            <div className="ai-category-item" onClick={() => setSelectedCategory('getting-started')}>
                                <div className="category-icon" style={{ background: '#fff5f0', color: '#ff5e00' }}>
                                    <i className="fas fa-rocket"></i>
                                </div>
                                <div className="category-info">
                                    <h3>Getting Started</h3>
                                    <p>Learn the basics of using Speedly</p>
                                </div>
                            </div>

                            <div className="ai-category-item" onClick={() => setSelectedCategory('booking')}>
                                <div className="category-icon" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                                    <i className="fas fa-car"></i>
                                </div>
                                <div className="category-info">
                                    <h3>Booking Rides</h3>
                                    <p>Step-by-step guide to booking</p>
                                </div>
                            </div>

                            <div className="ai-category-item" onClick={() => setSelectedCategory('payments')}>
                                <div className="category-icon" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                                    <i className="fas fa-wallet"></i>
                                </div>
                                <div className="category-info">
                                    <h3>Payments & Wallet</h3>
                                    <p>Manage funds and transactions</p>
                                </div>
                            </div>

                            {userRole === 'driver' && (
                                <div className="ai-category-item" onClick={() => setSelectedCategory('driver-guide')}>
                                    <div className="category-icon" style={{ background: '#fff3e0', color: '#ef6c00' }}>
                                        <i className="fas fa-id-card"></i>
                                    </div>
                                    <div className="category-info">
                                        <h3>Driver Guide</h3>
                                        <p>Earnings, withdrawals & more</p>
                                    </div>
                                </div>
                            )}

                            <div className="ai-category-item" onClick={() => setSelectedCategory('safety')}>
                                <div className="category-icon" style={{ background: '#fce4ec', color: '#c62828' }}>
                                    <i className="fas fa-shield-alt"></i>
                                </div>
                                <div className="category-info">
                                    <h3>Safety Tips</h3>
                                    <p>Stay protected while using Speedly</p>
                                </div>
                            </div>

                            <div className="ai-category-item" onClick={() => setSelectedCategory('troubleshooting')}>
                                <div className="category-icon" style={{ background: '#f3e5f5', color: '#7b1fa2' }}>
                                    <i className="fas fa-tools"></i>
                                </div>
                                <div className="category-info">
                                    <h3>Troubleshooting</h3>
                                    <p>Solve common issues</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Topics Detail Card */}
                    <div className="ai-topics-card">
                        <h2><i className="fas fa-list" style={{ color: '#ff5e00' }}></i> {selectedCategory ? topicsData[selectedCategory]?.title || 'Selected Topic' : 'Selected Topic'}</h2>
                        <div className="ai-topics-container">
                            {selectedCategory ? (
                                <div className="ai-topics-list">
                                    {topicsData[selectedCategory]?.items.map((item, index) => (
                                        <div key={index} className="ai-topic-item" onClick={() => showTopicAnswer(item.answer)}>
                                            <div className="topic-icon" style={{ background: topicsData[selectedCategory].bgColor, color: topicsData[selectedCategory].color }}>
                                                <i className={`fas ${item.icon}`}></i>
                                            </div>
                                            <div className="topic-content">
                                                <h4>{item.title}</h4>
                                                <p>{item.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="ai-topics-placeholder">
                                    <i className="fas fa-hand-pointer"></i>
                                    <p>Select a topic from the left to see detailed guides</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Card */}
                    <div className="ai-chat-container">
                        <div className="ai-chat-header">
                            <div className="ai-avatar">
                                <i className="fas fa-robot"></i>
                            </div>
                            <div className="ai-chat-title">
                                <h3>Speedly AI</h3>
                                <p>Online • Ready to help</p>
                            </div>
                        </div>

                        <div className="ai-chat-body" ref={chatBodyRef}>
                            {messages.map((message) => (
                                <div key={message.id} className={`ai-message ${message.isUser ? 'user' : 'ai'}`}>
                                    {formatMessageText(message.text)}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="ai-message ai typing">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="ai-quick-actions">
                            <button className="ai-quick-btn" onClick={() => askQuickQuestion('How do I book a ride?')}>
                                <i className="fas fa-car"></i> Book Ride
                            </button>
                            <button className="ai-quick-btn" onClick={() => askQuickQuestion('How do I add money?')}>
                                <i className="fas fa-plus"></i> Add Funds
                            </button>
                            <button className="ai-quick-btn" onClick={() => askQuickQuestion('How do I contact support?')}>
                                <i className="fas fa-headset"></i> Support
                            </button>
                            <button className="ai-quick-btn" onClick={() => askQuickQuestion('How do I cancel a ride?')}>
                                <i className="fas fa-times"></i> Cancel
                            </button>
                        </div>

                        <div className="ai-chat-input-row">
                            <input
                                type="text"
                                className="ai-chat-input"
                                placeholder="Type your question here..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button className="ai-send-btn" onClick={sendMessage}>
                                <i className="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientAIAssistant;