import React, { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { AppState, Alert } from 'react-native';

export default function LocationTracker() {
    const { state } = useAuth();
    const { socket } = useSocket();
    const [subscription, setSubscription] = useState(null);

    useEffect(() => {
        // Only track if user is logged in and is a driver
        if (!state.user || state.user.role !== 'driver') return;

        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required for driver tracking.');
                    console.log('Permission to access location was denied');
                    return;
                }

                console.log('Starting location tracking...');
                // Optional: Alert.alert('Tracking Started', 'Your location is being shared with the admin.');

                // Start watching position
                const sub = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 10000,
                        distanceInterval: 10,
                    },
                    (location) => {
                        const { latitude, longitude, speed, heading } = location.coords;

                        if (socket && socket.connected) {
                            socket.emit('driver:update-location', {
                                latitude,
                                longitude,
                                speed,
                                heading
                            });
                        }
                    }
                );

                setSubscription(sub);
            } catch (err) {
                console.error('Error starting location tracking:', err);
                Alert.alert('Error', 'Failed to start location tracking.');
            }
        })();

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [state.user, socket]);

    return null;
}
