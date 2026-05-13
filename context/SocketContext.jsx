import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const { state } = useAuth();
    const [socket, setSocket] = useState(null);
    const socketRef = useRef(null);

    useEffect(() => {
        if (state.accessToken && state.user && !socketRef.current) {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:3001';

            console.log('Connecting to socket at:', apiUrl);
            console.log('User info:', { id: state.user.id, role: state.user.role, society_id: state.user.society_id });

            const newSocket = io(apiUrl, {
                auth: { token: state.accessToken },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                transports: ['websocket', 'polling'],
            });

            newSocket.on('connect', () => {
                console.log('✅ Mobile Socket connected:', newSocket.id);
                
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
                console.error('❌ Mobile Socket connection error:', err.message);
            });

            newSocket.on('disconnect', (reason) => {
                console.log('🔌 Mobile Socket disconnected:', reason);
            });

            // Test listeners for debugging
            newSocket.on('service-request:assigned', (data) => {
                console.log('🔔 Received service-request:assigned event:', data);
            });

            newSocket.on('task:assigned', (data) => {
                console.log('🔔 Received task:assigned event:', data);
            });

            socketRef.current = newSocket;
            setSocket(newSocket);
        } else if (!state.accessToken && socketRef.current) {
            // Disconnect if logout
            console.log('Disconnecting socket due to logout');
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
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
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
