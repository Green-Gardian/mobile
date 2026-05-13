import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    const { socket } = useSocket();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    /**
     * Add a notification to the list
     */
    const addNotification = useCallback((notification) => {
        const id = `${Date.now()}-${Math.random()}`;
        const newNotification = {
            id,
            timestamp: new Date().toISOString(),
            ...notification
        };

        console.log('📬 Notification Added:', newNotification);
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            removeNotification(id);
        }, 5000);

        return id;
    }, []);

    /**
     * Remove a notification
     */
    const removeNotification = useCallback((id) => {
        setNotifications(prev => {
            const found = prev.find(n => n.id === id);
            if (found) {
                setUnreadCount(p => Math.max(0, p - 1));
            }
            return prev.filter(n => n.id !== id);
        });
    }, []);

    /**
     * Clear all notifications
     */
    const clearAll = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    /**
     * Mark notification as read
     */
    const markAsRead = useCallback((id) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    // Setup socket event listeners
    useEffect(() => {
        if (!socket) return;

        // ============ TASK ASSIGNMENT NOTIFICATIONS ============

        /**
         * Driver receives task assignment
         */
        const handleTaskAssigned = (data) => {
            console.log('🚛 Task assigned to driver:', data);
            addNotification({
                type: 'task_assigned',
                title: '🚛 New Task Assigned!',
                message: `Task for ${data.bin_name} - Priority: ${data.priority}`,
                data,
                action: 'VIEW_TASK',
                actionData: { taskId: data.id }
            });
        };

        /**
         * Resident receives driver assignment confirmation
         */
        const handleTaskDriverAssigned = (data) => {
            console.log('✅ Driver assigned to task:', data);
            addNotification({
                type: 'task_driver_assigned',
                title: '✅ Driver Assigned!',
                message: `${data.driver_name} will handle your task. Call: ${data.driver_phone}`,
                data,
                action: 'VIEW_TASK',
                actionData: { taskId: data.id }
            });
        };

        // ============ SERVICE REQUEST ASSIGNMENT NOTIFICATIONS ============

        /**
         * Driver receives service request assignment
         */
        const handleServiceRequestAssigned = (data) => {
            console.log('🔧 Service request assigned to driver:', data);
            addNotification({
                type: 'service_request_assigned',
                title: '🔧 New Service Request!',
                message: `${data.title} - ${data.preferred_date} ${data.preferred_time_slot || ''}`,
                data,
                action: 'VIEW_REQUEST',
                actionData: { serviceRequestId: data.id }
            });
        };

        /**
         * Resident receives driver acceptance of service request
         */
        const handleServiceRequestDriverAssigned = (data) => {
            console.log('✅ Driver assigned to service request:', data);
            addNotification({
                type: 'service_request_driver_assigned',
                title: '✅ Request Accepted!',
                message: `${data.driver_name} accepted your request. Call: ${data.driver_phone}`,
                data,
                action: 'VIEW_REQUEST',
                actionData: { serviceRequestId: data.id }
            });
        };

        // Register listeners
        socket.on('task:assigned', handleTaskAssigned);
        socket.on('task:driver-assigned', handleTaskDriverAssigned);
        socket.on('service-request:assigned', handleServiceRequestAssigned);
        socket.on('service-request:driver-assigned', handleServiceRequestDriverAssigned);

        return () => {
            socket.off('task:assigned', handleTaskAssigned);
            socket.off('task:driver-assigned', handleTaskDriverAssigned);
            socket.off('service-request:assigned', handleServiceRequestAssigned);
            socket.off('service-request:driver-assigned', handleServiceRequestDriverAssigned);
        };
    }, [socket, addNotification]);

    const value = {
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        clearAll,
        markAsRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
