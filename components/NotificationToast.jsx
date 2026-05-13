import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNotifications } from '../context/NotificationContext';

const TOAST_ANIMATION_DURATION = 300;

export const NotificationToast = ({ notification, onRemove }) => {
    const [slideAnim] = useState(new Animated.Value(-100));

    useEffect(() => {
        // Slide in
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: TOAST_ANIMATION_DURATION,
            useNativeDriver: true,
        }).start();

        // Auto slide out after 4.5 seconds (toast auto-removes after 5)
        const timer = setTimeout(() => {
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: TOAST_ANIMATION_DURATION,
                useNativeDriver: true,
            }).start(() => {
                onRemove(notification.id);
            });
        }, 4500);

        return () => clearTimeout(timer);
    }, [notification.id, onRemove, slideAnim]);

    const getBackgroundColor = () => {
        switch (notification.type) {
            case 'task_assigned':
                return '#4CAF50'; // Green for task assigned
            case 'task_driver_assigned':
                return '#2196F3'; // Blue for task update
            case 'service_request_assigned':
                return '#4CAF50'; // Green for service request assigned
            case 'service_request_driver_assigned':
                return '#2196F3'; // Blue for service request update
            default:
                return '#333';
        }
    };

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                {
                    transform: [{ translateY: slideAnim }],
                    backgroundColor: getBackgroundColor()
                }
            ]}
        >
            <TouchableOpacity
                onPress={() => onRemove(notification.id)}
                activeOpacity={0.7}
                style={styles.toastContent}
            >
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    <Text style={styles.message} numberOfLines={2}>
                        {notification.message}
                    </Text>
                </View>
                <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const NotificationContainer = () => {
    const { notifications, removeNotification } = useNotifications();

    return (
        <View style={styles.container}>
            {notifications.map(notification => (
                <NotificationToast
                    key={notification.id}
                    notification={notification}
                    onRemove={removeNotification}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'box-none',
    },
    toastContainer: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 5,
        overflow: 'hidden',
    },
    toastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: 12,
    },
    title: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    message: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        lineHeight: 18,
    },
    closeButton: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
});
