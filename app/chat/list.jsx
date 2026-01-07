import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { ChatAPI } from '../../services/chat';

export default function ChatListScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { state } = useAuth();
    const isDriver = state.user?.role === 'driver';
    const headerColors = isDriver ? ['#6d28d9', '#8b5cf6'] : ['#10b981', '#059669'];

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chats, setChats] = useState([]);
    const [error, setError] = useState(null);
    const [messages, setMessages] = useState([]); // This seems unused in list, maybe from copy-paste
    const [socketConnected, setSocketConnected] = useState(false);
    const [processSupportParams, setProcessSupportParams] = useState(false);

    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        // handle contact support specifically?
    }, []);

    const handleContactSupport = async () => {
        try {
            setLoading(true);
            const response = await ChatAPI.initiateSupportChat();
            if (response.data && response.data.id) {
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: response.data.id, title: 'Customer Support' }
                });
            } else {
                // If it returns existing chat directly or created chat
                // The controller returns the chat object directly or in a specific format?
                // ChatService.createChat returns "chat" object.
                // Controller: res.json(chat);
                // Axios response: response.data = chat object
                router.push({
                    pathname: '/chat/[id]',
                    params: { id: response.data?.id || response.data?.chat?.id, title: 'Customer Support' }
                });
            }
        } catch (error) {
            console.error("Error initiating support chat:", error);
            alert("Failed to contact support. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const loadChats = async () => {
        try {
            setError(null);
            const response = await ChatAPI.getChatGroups();
            setChats(response.data || []);
        } catch (err) {
            console.error('Error loading chats:', err);
            // If error is 404, valid but empty
            if (err.response?.status === 404) {
                setChats([]);
            } else {
                setError('Failed to load chats');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadChats();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={headerColors} style={[styles.headerGradient, { paddingTop: insets.top }]}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Messages</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </LinearGradient>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={headerColors} style={[styles.headerGradient, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity onPress={handleContactSupport} style={styles.iconBtn}>
                        <Ionicons name="headset-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {error && (
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={40} color="#ef4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={loadChats} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!error && (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#10b981']}
                            tintColor="#10b981"
                        />
                    }
                >
                    {chats.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="chatbubbles-outline" size={80} color="#cbd5e1" />
                            </View>
                            <Text style={styles.emptyTitle}>No messages yet</Text>
                            <Text style={styles.emptyMessage}>
                                Chats will appear here when you are assigned tasks or contact support.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.chatList}>
                            {chats.map((chat) => (
                                <TouchableOpacity
                                    key={chat.id}
                                    style={styles.chatCard}
                                    activeOpacity={0.7}
                                    onPress={() => router.push(`/chat/${chat.id}?title=${chat.chatTitle}`)}
                                >
                                    <View style={styles.avatarContainer}>
                                        <Ionicons name="person-circle" size={48} color="#cbd5e1" />
                                    </View>
                                    <View style={styles.chatContent}>
                                        <View style={styles.chatHeader}>
                                            <Text style={styles.chatTitle} numberOfLines={1}>
                                                {chat.chatTitle && chat.chatTitle !== 'undefined' ? chat.chatTitle : (chat.title && chat.title !== 'undefined' ? chat.title : 'Customer Support')}
                                            </Text>
                                            <Text style={styles.dateText}>
                                                {formatDate(chat.updated_at)}
                                            </Text>
                                        </View>
                                        <Text style={styles.lastMessage} numberOfLines={1}>
                                            {chat.lastmessage || 'No messages yet'}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    headerGradient: {
        paddingBottom: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    iconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 100,
    },
    emptyIconContainer: {
        width: 140,
        height: 140,
        backgroundColor: '#f1f5f9',
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1e293b',
        marginBottom: 12,
    },
    emptyMessage: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 24,
    },
    chatList: {
        padding: 20,
    },
    chatCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        marginRight: 12,
    },
    chatContent: {
        flex: 1,
        marginRight: 8,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    chatTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        flex: 1,
        marginRight: 8,
    },
    dateText: {
        fontSize: 12,
        color: '#94a3b8',
    },
    lastMessage: {
        fontSize: 14,
        color: '#64748b',
    },
});
