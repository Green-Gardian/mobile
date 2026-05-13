import { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { state } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef(null);

    useEffect(() => {
        if (state.accessToken && state.user && !socketRef.current) {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:3001';

            console.log('✅ Connecting to socket at:', apiUrl);
            console.log('🔐 User:', state.user.id, '| Role:', state.user.role, '| Society:', state.user.society_id);

            const newSocket = io(apiUrl, {
                auth: { token: state.accessToken },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                transports: ['websocket', 'polling'],
            });

            // ============ CONNECTION EVENTS ============

            newSocket.on('connect', () => {
                console.log('✅ Mobile Socket connected:', newSocket.id);
                setIsConnected(true);

                // Send authenticate event to join user-specific rooms
                newSocket.emit('authenticate', {
                    userId: state.user.id,
                    societyId: state.user.society_id,
                    role: state.user.role
                });
                console.log('📤 Sent authenticate event with user data');
            });

            newSocket.on('authenticated', (data) => {
                console.log('✅ Socket authenticated successfully:', data);
            });

            newSocket.on('auth-error', (error) => {
                console.error('❌ Socket authentication error:', error);
            });

            newSocket.on('connect_error', (err) => {
                console.error('❌ Mobile Socket connection error:', err.message || err);
                setIsConnected(false);
            });

            newSocket.on('disconnect', (reason) => {
                console.log('⚠️ Mobile Socket disconnected:', reason);
                setIsConnected(false);
            });

            // ============ TASK ASSIGNMENT EVENTS ============

            /**
             * Event: task:assigned
             * When: Task is assigned to driver
             * Data: { id, bin_name, priority, fill_level, bin_id, latitude, longitude, timestamp }
             */
            newSocket.on('task:assigned', (data) => {
                console.log('📢 Event Received: task:assigned', data);
                // This will be used by task screen components to update UI
            });

            /**
             * Event: task:driver-assigned
             * When: Driver is assigned to resident's task
             * Data: { id, bin_name, priority, driver_name, driver_id, driver_phone, timestamp }
             */
            newSocket.on('task:driver-assigned', (data) => {
                console.log('�  Event Received: task:driver-assigned', data);
                // This will be used by task screen components to update UI
            });

            // ============ SERVICE REQUEST ASSIGNMENT EVENTS ============

            /**
             * Event: service-request:assigned
             * When: Service request is assigned to driver
             * Data: { id, title, preferred_date, preferred_time_slot, driver_name, driver_id, driver_phone, timestamp }
             */
            newSocket.on('service-request:assigned', (data) => {
                console.log('📢 Event Received: service-request:assigned', data);
                // This will be used by service request screen components to update UI
            });

            /**
             * Event: service-request:driver-assigned
             * When: Driver is assigned to resident's service request
             * Data: { id, title, preferred_date, preferred_time_slot, driver_name, driver_id, driver_phone, status, timestamp }
             */
            newSocket.on('service-request:driver-assigned', (data) => {
                console.log('📢 Event Received: service-request:driver-assigned', data);
                // This will be used by service request screen components to update UI
            });

            // ============ OTHER EVENTS ============

            newSocket.on('drivers:update', (data) => {
                console.log('📍 Event Received: drivers:update', data);
            });

            newSocket.on('receiveMessage', (data) => {
                console.log('� Event RReceived: receiveMessage', data);
            });

            newSocket.on('new-alert', (data) => {
                console.log('🚨 Event Received: new-alert', data);
            });

            socketRef.current = newSocket;
            setSocket(newSocket);
        } else if (!state.accessToken && socketRef.current) {
            // Disconnect if logout
            console.log('🔴 Disconnecting socket due to logout');
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
            setIsConnected(false);
        }

        return () => {
            // Cleanup on unmount (usually app close)
            if (socketRef.current) {
                // We might not want to disconnect immediately on re-renders, 
                // but this useEffect depends on accessToken which changes rarely.
            }
        };
    }, [state.accessToken, state.user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
