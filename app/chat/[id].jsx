import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChatAPI } from '../../services/chat';

export default function ChatRoomScreen() {
    const router = useRouter();
    const { id, title } = useLocalSearchParams();
    const chatId = id;
    const insets = useSafeAreaInsets();
    const { state } = useAuth();
    const { socket } = useSocket();

    const isDriver = state.user?.role === 'driver';
    const headerColors = ['#047857', '#065f46'];
    const primaryColor = '#10b981';

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [inputMessage, setInputMessage] = useState('');
    const flatListRef = useRef(null);

    useEffect(() => {
        loadMessages();
        joinChatRoom();

        if (socket) {
            socket.on('receiveMessage', handleReceiveMessage);
            socket.on('messageSent', handleMessageSent);
        }

        return () => {
            if (socket) {
                socket.off('receiveMessage', handleReceiveMessage);
                socket.off('messageSent', handleMessageSent);
                // Maybe rejoin society/user rooms? The backend leaves them on joinRoom.
                // Re-authentication event might differ.
            }
        };
    }, [chatId, socket]);

    const joinChatRoom = () => {
        if (socket && state.user) {
            socket.emit('joinRoom', { chatId, userId: state.user.id });
        }
    };

    const loadMessages = async () => {
        try {
            setLoading(true);
            const response = await ChatAPI.getChatMessages(chatId);
            // Backend returns array of messages. 
            // Need to ensure format matches: { id, content, sender_id, sender_name, created_at, isMine }
            setMessages(response.data || []);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 500);
        } catch (err) {
            console.error('Error loading messages:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleReceiveMessage = (newMessage) => {
        if (String(newMessage.chatId) === String(chatId)) {
            setMessages((prev) => {
                const isMine = String(newMessage.senderId) === String(state.user.id);
                const incoming = { ...newMessage, isMine };
                // Replace optimistic message if we sent it, otherwise append
                if (isMine) {
                    const optIdx = prev.findIndex(m => String(m.id).startsWith('opt-'));
                    if (optIdx !== -1) {
                        const next = [...prev];
                        next[optIdx] = incoming;
                        return next;
                    }
                }
                // Avoid duplicate by real id
                if (prev.some(m => String(m.id) === String(incoming.id))) return prev;
                return [...prev, incoming];
            });
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    const handleMessageSent = (response) => {
        // confirm receipt if needed, mostly handled by receiveMessage broadcast
        if (!response.success) {
            console.error("Failed to send message:", response.error);
            alert("Failed to send message");
        }
    };

    const sendMessage = () => {
        console.log("Attempting to send message...");
        if (!inputMessage.trim()) {
            console.log("Send failed: Input message is empty.");
            return;
        }

        if (!socket) {
            console.log("Send failed: Socket object is null/undefined.");
            alert("Connection error: Socket not initialized");
            return;
        }

        if (!socket.connected) {
            console.log("Send failed: Socket is not connected. Socket ID:", socket.id);
            alert("Connection error: Not connected to server");
            return;
        }

        const content = inputMessage.trim();
        setInputMessage('');

        // Optimistic append — show immediately
        const optimistic = {
            id: `opt-${Date.now()}`,
            content,
            sender_id: state.user.id,
            isMine: true,
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        socket.emit('message', { chatId, content });
        console.log("Message emitted to socket");
    };

    const renderMessageItem = ({ item }) => {
        // Handle both DB (snake_case) and Socket (camelCase) formats, and ensure loose equality for ID type mismatch
        const messageSenderId = item.sender_id || item.senderId;
        const isMine = String(messageSenderId) === String(state.user.id);

        // Debugging logs for isMine logic
        if (!isMine && messageSenderId == state.user.id) {
            console.log("ID MISMATCH DEBUG:", { messageSenderId, userStateId: state.user.id, comparison: String(messageSenderId) === String(state.user.id) });
        }

        return (
            <View style={[styles.messageBubbleContainer, isMine ? styles.myMessageContainer : styles.theirMessageContainer]}>
                <View style={[styles.messageBubble, isMine ? { ...styles.myMessage, backgroundColor: primaryColor } : styles.theirMessage]}>
                    <Text style={[styles.messageText, isMine ? styles.myMessageText : styles.theirMessageText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.timestamp, isMine ? styles.myTimestamp : styles.theirTimestamp]}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={headerColors} style={[styles.headerGradient, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Chat'}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={primaryColor} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item, index) => item.id ? String(item.id) : `temp-${index}`}
                        renderItem={renderMessageItem}
                        contentContainerStyle={styles.messageList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />
                )}

                <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
                    <TextInput
                        style={styles.input}
                        value={inputMessage}
                        onChangeText={setInputMessage}
                        placeholder="Type a message..."
                        placeholderTextColor="#94a3b8"
                        multiline
                        maxLength={500}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, !inputMessage.trim() && styles.sendButtonDisabled, { backgroundColor: primaryColor }]}
                        onPress={sendMessage}
                        disabled={!inputMessage.trim()}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    headerInfo: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    keyboardView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageList: {
        padding: 20,
        paddingBottom: 0,
    },
    messageBubbleContainer: {
        marginBottom: 12,
        flexDirection: 'row',
    },
    myMessageContainer: {
        justifyContent: 'flex-end',
    },
    theirMessageContainer: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    myMessage: {
        // backgroundColor is set dynamically
        borderBottomRightRadius: 4,
    },
    theirMessage: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#fff',
    },
    theirMessageText: {
        color: '#1e293b',
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTimestamp: {
        color: 'rgba(255,255,255,0.7)',
    },
    theirTimestamp: {
        color: '#94a3b8',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 100,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 15,
        color: '#1e293b',
        marginRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        // backgroundColor is set dynamically
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#cbd5e1',
    },
});
