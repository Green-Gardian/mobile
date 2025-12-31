import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { DriverAPI } from '../services/driver';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');

export default function BinMap({ height: mapHeight, style, showControls = true }) {
    const [bins, setBins] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const socket = useSocket();

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location.coords);

            // Center map on user initially
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }
        })();

        loadBins();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleBinsUpdate = (updates) => {
            setBins(prev => {
                const map = new Map(prev.map(b => [b.id, b]));
                const updateArray = Array.isArray(updates) ? updates : [updates];
                updateArray.forEach(u => map.set(u.id, u));
                return Array.from(map.values());
            });
        };

        socket.on('bins:update', handleBinsUpdate);

        return () => {
            socket.off('bins:update', handleBinsUpdate);
        };
    }, [socket]);

    const loadBins = async () => {
        try {
            setLoading(true);
            const response = await DriverAPI.getBins();
            if (response.data && response.data.data) {
                setBins(response.data.data);
            }
        } catch (err) {
            console.error('Failed to load bins', err);
        } finally {
            setLoading(false);
        }
    };

    const centerOnUser = async () => {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            });
        }
    };

    const mapStyle = style ? style : { height: mapHeight || 300, width: '100%' };

    return (
        <View style={[styles.container, mapStyle]}>
            <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                showsUserLocation={true}
                showsMyLocationButton={false}
                initialRegion={{
                    latitude: 33.6844,
                    longitude: 73.0479,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {bins.map((bin) => {
                    const lat = parseFloat(bin.latitude);
                    const lon = parseFloat(bin.longitude);
                    if (!lat || !lon) return null;

                    let color = 'green';
                    if (bin.fill_level >= 90) color = 'red';
                    else if (bin.fill_level >= 50) color = 'orange';

                    return (
                        <Marker
                            key={bin.id}
                            coordinate={{ latitude: lat, longitude: lon }}
                            title={`Bin #${bin.id}`}
                            description={`Fill: ${bin.fill_level}%`}
                        >
                            <View style={styles.markerContainer}>
                                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                                    <Ionicons name="trash" size={16} color="white" />
                                </View>
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{bin.fill_level}%</Text>
                                </View>
                            </View>
                        </Marker>
                    );
                })}
            </MapView>

            {showControls && (
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.btn} onPress={centerOnUser}>
                        <Ionicons name="locate" size={24} color="#6d28d9" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btn} onPress={loadBins}>
                        <Ionicons name="refresh" size={24} color="#6d28d9" />
                    </TouchableOpacity>
                </View>
            )}

            {showControls && (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: 'red' }]} />
                        <Text style={styles.legendText}>Alert (>90%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: 'orange' }]} />
                        <Text style={styles.legendText}>Warn (>50%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: 'green' }]} />
                        <Text style={styles.legendText}>OK</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        position: 'relative'
    },
    map: {
        width: '100%',
    },
    controls: {
        position: 'absolute',
        top: 10,
        right: 10,
        gap: 8
    },
    btn: {
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 20,
        elevation: 3,
    },
    legend: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6
    },
    legendText: {
        fontSize: 10,
        fontWeight: '600',
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: 'green',
        borderWidth: 2,
        borderColor: 'white',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    badge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: 'white',
        borderRadius: 10,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#eee',
        elevation: 2,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333',
    }
});
