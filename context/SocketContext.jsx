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
        if (state.accessToken && !socketRef.current) {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.9:3001';

            console.log('Connecting to socket at:', apiUrl);

            const newSocket = io(apiUrl, {
                auth: { token: state.accessToken },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });

            newSocket.on('connect', () => {
                console.log('Mobile Socket connected:', newSocket.id);
            });

            newSocket.on('connect_error', (err) => {
                console.error('Mobile Socket connection error:', err);
            });

            newSocket.on('disconnect', (reason) => {
                console.log('Mobile Socket disconnected:', reason);
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
    }, [state.accessToken]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
