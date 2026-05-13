import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from 'react-native';
import * as Location from 'expo-location';

let MapView, Marker, Polyline;
let mapsAvailable = false;
try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    mapsAvailable = true;
} catch (_) {
    // react-native-maps requires a development build, not available in Expo Go
}
import { Ionicons } from '@expo/vector-icons';
import { DriverAPI } from '../services/driver';
import { useSocket } from '../context/SocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function BinMap({ height: mapHeight, style, showControls = true, tasks = [] }) {
    const [bins, setBins] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef(null);
    const { socket } = useSocket();
    const insets = useSafeAreaInsets();

    // Identify the active task (the oldest non-completed task)
    const activeTask = [...(tasks || [])]
        .filter(t => t.status !== 'completed')
        .sort((a, b) => new Date(a.assigned_at) - new Date(b.assigned_at))[0];

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                console.log('Permission to access location was denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setLocation(location.coords);

            // If we have an active task, fit to driver + bin
            if (activeTask && activeTask.location?.lat && activeTask.location?.lng) {
                fitToTask(location.coords, activeTask);
            } else if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
            }
        })();

        // Always load bins so they are visible alongside task markers
        loadBins();
    }, [tasks?.length, activeTask?.id]);

    const fitToTask = (driverLoc, task) => {
        if (!mapRef.current) return;

        const coords = [
            { latitude: driverLoc.latitude, longitude: driverLoc.longitude },
            { latitude: parseFloat(task.location.lat), longitude: parseFloat(task.location.lng) }
        ];

        setTimeout(() => {
            mapRef.current?.fitToCoordinates(coords, {
                edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
                animated: true,
            });
        }, 500);
    };

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
            if (activeTask && activeTask.location?.lat && activeTask.location?.lng) {
                fitToTask(location.coords, activeTask);
            } else {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        }
    };

    // Always show all bins; task markers are rendered separately on top
    const binMarkers = bins.map(b => ({
        id: `bin-${b.id}`,
        latitude: b.latitude,
        longitude: b.longitude,
        name: `Bin #${b.id}`,
        fill_level: b.fill_level,
        status: 'ok',
        isTask: false,
    }));

    const taskMarkers = (tasks || []).map(t => ({
        id: `task-${t.id}`,
        taskId: t.id,
        latitude: t.location?.lat,
        longitude: t.location?.lng,
        name: t.bin_id,
        fill_level: t.fill_level,
        priority: t.priority,
        status: t.status,
        isTask: true,
    }));

    const markersToRender = [...binMarkers, ...taskMarkers];

    const mapStyle = style ? style : { height: mapHeight || 300, width: '100%' };

    if (!mapsAvailable) {
        return (
            <View style={[styles.container, mapStyle, styles.fallback]}>
                <Text style={styles.fallbackText}>Map unavailable in Expo Go</Text>
                <Text style={styles.fallbackSub}>Use a development build to enable maps</Text>
            </View>
        );
    }

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
                {markersToRender.map((marker) => {
                    const lat = parseFloat(marker.latitude);
                    const lon = parseFloat(marker.longitude);
                    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

                    // Task markers get purple; bin markers get fill-level color
                    const isActive = activeTask && marker.isTask && activeTask.id === marker.taskId;
                    let color = 'green';
                    if (marker.isTask) {
                        color = isActive ? '#6d28d9' : '#8b5cf6';
                    } else {
                        if (marker.fill_level >= 90) color = '#ef4444';
                        else if (marker.fill_level >= 50) color = '#f97316';
                    }

                    return (
                        <Marker
                            key={marker.id}
                            coordinate={{ latitude: lat, longitude: lon }}
                            title={marker.name}
                            description={
                                marker.isTask
                                    ? `Task | Fill: ${marker.fill_level ?? 0}kg | ${marker.priority?.toUpperCase() ?? ''}`
                                    : `Fill: ${marker.fill_level ?? 0}%${marker.status ? ` - ${marker.status.toUpperCase()}` : ''}`
                            }
                            zIndex={marker.isTask ? 10 : 1}
                        >
                            <View style={styles.markerContainer}>
                                <View style={[
                                    styles.iconContainer,
                                    { backgroundColor: color },
                                    isActive && { borderColor: '#4c1d95', borderWidth: 3, transform: [{ scale: 1.2 }] },
                                    marker.isTask && !isActive && { borderColor: '#a78bfa', borderWidth: 2 },
                                ]}>
                                    <Ionicons
                                        name={marker.isTask ? (isActive ? 'navigate' : 'construct') : 'trash'}
                                        size={isActive ? 18 : 16}
                                        color="white"
                                    />
                                </View>
                                <View style={[styles.badge, marker.isTask && { backgroundColor: '#ede9fe', borderColor: '#a78bfa' }]}>
                                    <Text style={[styles.badgeText, marker.isTask && { color: '#6d28d9' }]}>
                                        {marker.isTask ? `${marker.fill_level ?? 0}kg` : `${marker.fill_level ?? 0}%`}
                                    </Text>
                                </View>
                            </View>
                        </Marker>
                    );
                })}

                {/* Draw Route Polyline to Active Task */}
                {location && activeTask && activeTask.location?.lat && activeTask.location?.lng && (
                    <Polyline
                        coordinates={[
                            { latitude: location.latitude, longitude: location.longitude },
                            { latitude: parseFloat(activeTask.location.lat), longitude: parseFloat(activeTask.location.lng) }
                        ]}
                        strokeColor="#6d28d9"
                        strokeWidth={4}
                        lineDashPattern={[10, 5]}
                    />
                )}
            </MapView>

            {/* Active Task Info Overlay */}
            {activeTask && (
                <View style={[styles.taskOverlay, { bottom: (insets?.bottom || 0) + 140 }]}>
                    <View style={styles.taskOverlayHeader}>
                        <Ionicons name="navigate-circle" size={24} color="#6d28d9" />
                        <Text style={styles.taskOverlayTitle}>Current Target</Text>
                    </View>
                    <Text style={styles.taskOverlayBin}>{activeTask.bin_id}</Text>
                    <Text style={styles.taskOverlayAddress} numberOfLines={1}>
                        {activeTask.location?.address || 'Location information unavailable'}
                    </Text>
                    <View style={styles.taskOverlayFooter}>
                        <Text style={styles.taskOverlayDetail}>Priority: {activeTask.priority?.toUpperCase()}</Text>
                        <Text style={styles.taskOverlayDetail}>Fill: {activeTask.fill_level}%</Text>
                    </View>
                </View>
            )}

            {showControls && (
                <View style={[styles.controls, { top: (insets?.top || 0) + 10 }]}>
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
                        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendText}>Alert (>90%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
                        <Text style={styles.legendText}>Warn (>50%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.dot, { backgroundColor: 'green' }]} />
                        <Text style={styles.legendText}>OK</Text>
                    </View>
                    {(tasks && tasks.length > 0) && (
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#8b5cf6' }]} />
                            <Text style={styles.legendText}>Request</Text>
                        </View>
                    )}
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
    },
    taskOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        zIndex: 10,
        borderLeftWidth: 5,
        borderLeftColor: '#6d28d9'
    },
    taskOverlayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8
    },
    taskOverlayTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6d28d9',
        textTransform: 'uppercase'
    },
    taskOverlayBin: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2
    },
    taskOverlayAddress: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 10
    },
    taskOverlayFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        paddingTop: 10
    },
    taskOverlayDetail: {
        fontSize: 11,
        fontWeight: '600',
        color: '#475569'
    },
    fallback: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    fallbackText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 4,
    },
    fallbackSub: {
        fontSize: 12,
        color: '#94a3b8',
    },
});
