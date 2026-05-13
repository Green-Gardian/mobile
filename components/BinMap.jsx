import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { DriverAPI } from '../services/driver';
import { useSocket } from '../context/SocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Try native maps first (dev build)
let MapView, Marker, Polyline;
let mapsAvailable = false;
try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    mapsAvailable = true;
} catch (_) {}

// WebView fallback (works in Expo Go)
let WebViewComponent;
let webViewAvailable = false;
try {
    WebViewComponent = require('react-native-webview').WebView;
    webViewAvailable = true;
} catch (_) {}

const { width } = Dimensions.get('window');
const DEFAULT_LAT = 33.6844;
const DEFAULT_LNG = 73.0479;

function buildMapHTML(bins, tasks, userLat, userLng) {
    const centerLat = userLat || DEFAULT_LAT;
    const centerLng = userLng || DEFAULT_LNG;
    const hasUser = !!(userLat && userLng);

    const binData = bins
        .filter(b => b.latitude && b.longitude)
        .map(b => ({
            lat: parseFloat(b.latitude),
            lng: parseFloat(b.longitude),
            id: b.id,
            fill: b.fill_level || 0,
        }));

    const pendingTasks = (tasks || []).filter(t => t.status !== 'completed');
    const taskData = pendingTasks
        .filter(t => t.location && t.location.lat && t.location.lng)
        .map((t, idx) => ({
            lat: parseFloat(t.location.lat),
            lng: parseFloat(t.location.lng),
            id: t.id,
            binId: t.bin_id || '',
            fill: t.fill_level || 0,
            priority: t.priority || 'normal',
            address: t.location?.address || '',
            serviceType: t.service_type || t.service_category || '',
            title: t.title || `Service Request`,
            isActive: idx === 0,
        }));

    // SVGs with double-quoted attributes — safe to JSON.stringify into JS
    const binSvg = `<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;
    const pinSvg = `<svg viewBox="0 0 24 24" fill="white" width="15" height="15"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%;overflow:hidden}
.bin-marker{
  width:36px;height:36px;border-radius:10px;border:2.5px solid #fff;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:1px;box-shadow:0 2px 8px rgba(0,0,0,0.30);
}
.bin-fill-bar{
  width:20px;height:4px;border-radius:2px;background:rgba(255,255,255,0.3);overflow:hidden;
}
.bin-fill-inner{height:100%;border-radius:2px;background:rgba(255,255,255,0.9);}
.task-pin{
  width:40px;height:48px;display:flex;flex-direction:column;align-items:center;
}
.task-pin-circle{
  width:40px;height:40px;border-radius:50%;border:3px solid #fff;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 3px 12px rgba(0,0,0,0.35);
}
.task-pin-tail{
  width:0;height:0;border-left:6px solid transparent;
  border-right:6px solid transparent;border-top-width:10px;border-top-style:solid;
  margin-top:-2px;
}
.task-pin-active .task-pin-circle{transform:scale(1.15);box-shadow:0 4px 16px rgba(4,120,87,0.5);}
.pulse-ring{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
.pulse{width:14px;height:14px;border-radius:50%;background:#047857;animation:pulse 1.8s infinite;}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(4,120,87,0.6);}60%{box-shadow:0 0 0 14px rgba(4,120,87,0);}100%{box-shadow:0 0 0 0 rgba(4,120,87,0);}}
.leaflet-popup-content{font-family:system-ui,sans-serif;min-width:180px;font-size:13px}
.pt{font-weight:700;font-size:14px;color:#1e293b;margin-bottom:6px}
.pr{color:#475569;margin-bottom:4px;font-size:12px;line-height:1.4}
.pb{display:inline-block;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;margin-top:5px}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:true}).setView([${centerLat},${centerLng}],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap',maxZoom:19
}).addTo(map);

// User location marker (pulse)
${hasUser ? `
L.marker([${userLat},${userLng}],{
    icon:L.divIcon({html:'<div class="pulse-ring"><div class="pulse"></div></div>',className:'',iconSize:[34,34],iconAnchor:[17,17],popupAnchor:[0,-20]}),
    zIndexOffset:1000
}).bindPopup('<div class="pt">Your Location</div>').addTo(map);
` : ''}

// Bin markers — trash can icon + fill level bar + color coded
var binSvg = ${JSON.stringify(binSvg)};
var bins=${JSON.stringify(binData)};
bins.forEach(function(b){
    var fill = b.fill || 0;
    var bg = fill>=90 ? '#ef4444' : fill>=50 ? '#d97706' : '#10b981';
    var status = fill>=90 ? 'CRITICAL' : fill>=50 ? 'FILLING' : 'OK';
    var statBg = fill>=90 ? '#fef2f2' : fill>=50 ? '#fffbeb' : '#ecfdf5';
    var statC = fill>=90 ? '#dc2626' : fill>=50 ? '#d97706' : '#047857';
    var html = '<div class="bin-marker" style="background:'+bg+'">'+
               binSvg+
               '<div class="bin-fill-bar"><div class="bin-fill-inner" style="width:'+fill+'%"></div></div>'+
               '</div>';
    var popup = '<div class="pt">Bin #'+b.id+'</div>'+
                '<div class="pr">Fill Level: <b>'+fill+'%</b></div>'+
                '<span class="pb" style="background:'+statBg+';color:'+statC+'">'+status+'</span>';
    L.marker([b.lat,b.lng],{
        icon:L.divIcon({html:html,className:'',iconSize:[36,36],iconAnchor:[18,18],popupAnchor:[0,-22]})
    }).bindPopup(popup).addTo(map);
});

// Task markers — location pin icon
var pinSvg = ${JSON.stringify(pinSvg)};
var tasks=${JSON.stringify(taskData)};
var routeLine = null;

tasks.forEach(function(t,idx){
    var isActive = t.isActive;
    var bg = isActive ? '#065f46' : '#047857';
    var pinHtml = '<div class="task-pin'+(isActive?' task-pin-active':'')+'">'+
                  '<div class="task-pin-circle" style="background:'+bg+'">'+pinSvg+'</div>'+
                  '<div class="task-pin-tail" style="border-top-color:'+bg+'"></div>'+
                  '</div>';
    var popup = '<div class="pt">'+(isActive ? '🎯 ' : '')+(t.title||'Service Request')+'</div>'+
                (t.address ? '<div class="pr">📍 '+t.address+'</div>' : '')+
                (t.serviceType ? '<div class="pr">Type: <b>'+t.serviceType+'</b></div>' : '')+
                '<div class="pr">Priority: <b>'+t.priority.toUpperCase()+'</b></div>'+
                '<span class="pb" style="background:#ecfdf5;color:#047857">ASSIGNED TO YOU</span>';
    var marker = L.marker([t.lat,t.lng],{
        icon:L.divIcon({html:pinHtml,className:'',iconSize:[40,48],iconAnchor:[20,48],popupAnchor:[0,-50]}),
        zIndexOffset: isActive ? 600 : 300
    }).bindPopup(popup).addTo(map);
    if(isActive) marker.openPopup();
});

// Route from driver to first/active task using OSRM
var activeTask = tasks.find(function(t){return t.isActive;}) || (tasks.length>0?tasks[0]:null);
${hasUser ? `
if(activeTask){
    var routeUrl='https://router.project-osrm.org/route/v1/driving/'+${userLng}+','+${userLat}+';'+activeTask.lng+','+activeTask.lat+'?overview=full&geometries=geojson';
    fetch(routeUrl)
        .then(function(r){return r.json();})
        .then(function(data){
            if(data.routes && data.routes[0]){
                var coords=data.routes[0].geometry.coordinates.map(function(c){return[c[1],c[0]];});
                routeLine=L.polyline(coords,{color:'#047857',weight:4,opacity:0.85}).addTo(map);
                // Fit map to show driver + route + task
                var bounds=[].concat([[${userLat},${userLng}]],coords.slice(0,1),[[activeTask.lat,activeTask.lng]]);
                try{map.fitBounds(bounds,{padding:[60,60],maxZoom:16});}catch(e){}
            } else {
                // Fallback straight line
                L.polyline([[${userLat},${userLng}],[activeTask.lat,activeTask.lng]],{color:'#047857',weight:3,opacity:0.6,dashArray:'10,6'}).addTo(map);
            }
        })
        .catch(function(){
            L.polyline([[${userLat},${userLng}],[activeTask.lat,activeTask.lng]],{color:'#047857',weight:3,opacity:0.6,dashArray:'10,6'}).addTo(map);
        });
} else {
    var allPts=[[${userLat},${userLng}]];
    bins.forEach(function(b){allPts.push([b.lat,b.lng]);});
    if(allPts.length>1){try{map.fitBounds(allPts,{padding:[60,60],maxZoom:16});}catch(e){}}
}
` : `
// No user location — fit to tasks + bins
var allPts=[];
bins.forEach(function(b){allPts.push([b.lat,b.lng]);});
tasks.forEach(function(t){allPts.push([t.lat,t.lng]);});
if(allPts.length>1){try{map.fitBounds(allPts,{padding:[60,60],maxZoom:15});}catch(e){}}
else if(allPts.length===1){map.setView(allPts[0],15);}
`}
</script>
</body>
</html>`;
}

async function geocodeAddress(address) {
    if (!address) return null;
    const tryGeocode = async (query) => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=pk&limit=1`;
            const res = await fetch(url, { headers: { 'User-Agent': 'GreenGuardianMobile/1.0' } });
            const data = await res.json();
            if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch (_) {}
        return null;
    };
    // Try full address first, then city-only fallback
    return (await tryGeocode(address)) || (await tryGeocode(address.split(',').pop()?.trim() || address));
}

export default function BinMap({ height: mapHeight, style, showControls = true, tasks = [] }) {
    const [bins, setBins] = useState([]);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [htmlContent, setHtmlContent] = useState('');
    const [webViewKey, setWebViewKey] = useState(0);
    const [geocodedTasks, setGeocodedTasks] = useState([]);
    const mapRef = useRef(null);
    const { socket } = useSocket();
    const insets = useSafeAreaInsets();

    const effectiveTasks = geocodedTasks.length > 0 ? geocodedTasks : (tasks || []).filter(t => t.status !== 'completed');
    const activeTask = [...effectiveTasks]
        .sort((a, b) => new Date(a.assigned_at) - new Date(b.assigned_at))[0];

    // Geocode tasks that have address but no lat/lng
    useEffect(() => {
        const pending = (tasks || []).filter(t => t.status !== 'completed');
        const hasCoords = pending.filter(t => t.location?.lat && t.location?.lng);
        const needsGeocode = pending.filter(t => t.location?.address && !(t.location?.lat && t.location?.lng));

        console.log('[BinMap] Tasks:', pending.length, '| Has coords:', hasCoords.length, '| Needs geocode:', needsGeocode.length);
        if (pending.length > 0) {
            console.log('[BinMap] First task location:', JSON.stringify(pending[0]?.location));
        }

        if (needsGeocode.length === 0) {
            setGeocodedTasks(hasCoords);
            return;
        }

        (async () => {
            const results = await Promise.all(
                needsGeocode.map(async t => {
                    const coords = await geocodeAddress(t.location.address);
                    if (coords) {
                        console.log('[BinMap] Geocoded', t.location.address, '->', coords);
                        return { ...t, location: { ...t.location, lat: coords.lat, lng: coords.lng } };
                    }
                    console.log('[BinMap] Geocode FAILED for:', t.location.address);
                    return null;
                })
            );
            const geocoded = results.filter(Boolean);
            console.log('[BinMap] Geocoded', geocoded.length, 'tasks');
            setGeocodedTasks([...hasCoords, ...geocoded]);
        })();
    }, [tasks]);

    // Rebuild HTML whenever data changes (WebView mode)
    useEffect(() => {
        if (!mapsAvailable && webViewAvailable) {
            const html = buildMapHTML(
                bins,
                geocodedTasks.length > 0 ? geocodedTasks : (tasks || []).filter(t => t.status !== 'completed'),
                location?.latitude,
                location?.longitude
            );
            setHtmlContent(html);
            setWebViewKey(k => k + 1);
        }
    }, [bins, geocodedTasks, location]);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                let loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
                if (mapsAvailable && activeTask?.location?.lat && mapRef.current) {
                    setTimeout(() => {
                        mapRef.current?.fitToCoordinates([
                            { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                            { latitude: parseFloat(activeTask.location.lat), longitude: parseFloat(activeTask.location.lng) }
                        ], { edgePadding: { top: 100, right: 100, bottom: 100, left: 100 }, animated: true });
                    }, 600);
                }
            }
            loadBins();
        })();
    }, [tasks?.length, activeTask?.id]);

    useEffect(() => {
        if (!socket) return;
        const handleBinsUpdate = (updates) => {
            setBins(prev => {
                const map = new Map(prev.map(b => [b.id, b]));
                const arr = Array.isArray(updates) ? updates : [updates];
                arr.forEach(u => map.set(u.id, u));
                return Array.from(map.values());
            });
        };
        socket.on('bins:update', handleBinsUpdate);
        return () => socket.off('bins:update', handleBinsUpdate);
    }, [socket]);

    const loadBins = async () => {
        try {
            setLoading(true);
            const response = await DriverAPI.getBins();
            if (response.data?.data) setBins(response.data.data);
        } catch (_) {
            // bins endpoint may not be available — silently ignore, map still shows task markers
        } finally {
            setLoading(false);
        }
    };

    const refreshMap = async () => {
        await loadBins();
        if (location === null) {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setLocation(loc.coords);
            }
        }
    };

    const mapStyle = style || { height: mapHeight || 300, width: '100%' };

    // ── Native maps (dev build) ──────────────────────────────────────────
    if (mapsAvailable) {
        const binMarkers = bins.map(b => ({
            id: `bin-${b.id}`,
            latitude: b.latitude,
            longitude: b.longitude,
            name: `Bin #${b.id}`,
            fill_level: b.fill_level,
            isTask: false,
        }));

        const taskMarkers = (tasks || []).filter(t => t.status !== 'completed').map(t => ({
            id: `task-${t.id}`,
            taskId: t.id,
            latitude: t.location?.lat,
            longitude: t.location?.lng,
            name: `Bin #${t.bin_id}`,
            fill_level: t.fill_level,
            priority: t.priority,
            address: t.location?.address,
            isTask: true,
        }));

        return (
            <View style={[styles.container, mapStyle]}>
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    showsUserLocation
                    showsMyLocationButton={false}
                    initialRegion={{ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, latitudeDelta: 0.0922, longitudeDelta: 0.0421 }}
                >
                    {[...binMarkers, ...taskMarkers].map(m => {
                        const lat = parseFloat(m.latitude);
                        const lon = parseFloat(m.longitude);
                        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                        const isActive = activeTask && m.isTask && activeTask.id === m.taskId;
                        let color = '#10b981';
                        if (m.isTask) color = isActive ? '#065f46' : '#047857';
                        else if (m.fill_level >= 90) color = '#ef4444';
                        else if (m.fill_level >= 50) color = '#d97706';
                        return (
                            <Marker
                                key={m.id}
                                coordinate={{ latitude: lat, longitude: lon }}
                                title={m.name}
                                description={m.isTask ? `${m.address || ''} · Fill: ${m.fill_level ?? 0}%` : `Fill: ${m.fill_level ?? 0}%`}
                                zIndex={m.isTask ? 10 : 1}
                            >
                                <View style={styles.markerContainer}>
                                    <View style={[styles.iconContainer, { backgroundColor: color }, isActive && styles.activeMarker]}>
                                        <Ionicons name={m.isTask ? (isActive ? 'navigate' : 'construct') : 'trash'} size={isActive ? 18 : 16} color="white" />
                                    </View>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{m.isTask ? `${m.fill_level ?? 0}kg` : `${m.fill_level ?? 0}%`}</Text>
                                    </View>
                                </View>
                            </Marker>
                        );
                    })}
                    {location && activeTask?.location?.lat && activeTask?.location?.lng && (
                        <Polyline
                            coordinates={[
                                { latitude: location.latitude, longitude: location.longitude },
                                { latitude: parseFloat(activeTask.location.lat), longitude: parseFloat(activeTask.location.lng) }
                            ]}
                            strokeColor="#047857"
                            strokeWidth={3}
                            lineDashPattern={[10, 5]}
                        />
                    )}
                </MapView>
                {activeTask && (
                    <View style={[styles.taskOverlay, { bottom: (insets?.bottom || 0) + 140 }]}>
                        <View style={styles.taskOverlayHeader}>
                            <Ionicons name="navigate-circle" size={22} color="#047857" />
                            <Text style={styles.taskOverlayTitle}>Current Target</Text>
                        </View>
                        <Text style={styles.taskOverlayBin}>Bin #{activeTask.bin_id}</Text>
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
                        <TouchableOpacity style={styles.btn} onPress={refreshMap}>
                            <Ionicons name="refresh" size={22} color="#047857" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    }

    // ── WebView + Leaflet (Expo Go) ──────────────────────────────────────
    if (webViewAvailable) {
        const pendingTasks = (tasks || []).filter(t => t.status !== 'completed');
        const hasTaskLocations = pendingTasks.some(t => t.location?.lat && t.location?.lng);

        return (
            <View style={[styles.container, mapStyle]}>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#10b981" size="large" />
                        <Text style={styles.loadingText}>Loading map...</Text>
                    </View>
                )}
                {htmlContent ? (
                    <WebViewComponent
                        key={webViewKey}
                        source={{ html: htmlContent }}
                        style={{ flex: 1 }}
                        javaScriptEnabled
                        originWhitelist={['*']}
                        mixedContentMode="always"
                        onLoadEnd={() => setLoading(false)}
                        onError={() => setLoading(false)}
                    />
                ) : (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#10b981" size="large" />
                    </View>
                )}

                {/* Active task banner — always show if there's an active task */}
                {activeTask && (
                    <View style={styles.taskBanner}>
                        <Ionicons name="navigate-circle" size={20} color="#047857" />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.taskBannerTitle}>
                                {activeTask.title || (activeTask.service_type ? `${activeTask.service_type} Pickup` : `Bin #${activeTask.bin_id}`)}
                            </Text>
                            {activeTask.location?.address ? (
                                <Text style={styles.taskBannerAddr} numberOfLines={2}>{activeTask.location.address}</Text>
                            ) : activeTask.location?.landmark ? (
                                <Text style={styles.taskBannerAddr} numberOfLines={1}>{activeTask.location.landmark}</Text>
                            ) : (
                                <Text style={[styles.taskBannerAddr, { color: '#94a3b8' }]}>No address on file</Text>
                            )}
                        </View>
                        <View style={styles.taskPriorityBadge}>
                            <Text style={styles.taskPriorityText}>{(activeTask.priority || 'normal').toUpperCase()}</Text>
                        </View>
                    </View>
                )}

                {showControls && (
                    <TouchableOpacity style={styles.refreshFab} onPress={refreshMap}>
                        <Ionicons name="refresh" size={22} color="#047857" />
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // ── No map available ────────────────────────────────────────────────
    return (
        <View style={[styles.container, mapStyle, styles.fallback]}>
            <Ionicons name="map-outline" size={48} color="#d1fae5" />
            <Text style={styles.fallbackText}>Map unavailable</Text>
            <Text style={styles.fallbackSub}>Run: npx expo install react-native-webview</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        borderRadius: 12,
        backgroundColor: '#f0fdf4',
        position: 'relative',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: '#047857',
        fontWeight: '600',
    },
    controls: {
        position: 'absolute',
        top: 10,
        right: 10,
        gap: 8,
        zIndex: 20,
    },
    btn: {
        backgroundColor: 'white',
        padding: 8,
        borderRadius: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 1 },
    },
    refreshFab: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'white',
        padding: 10,
        borderRadius: 22,
        zIndex: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    taskBanner: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#047857',
        borderWidth: 1,
        borderColor: '#d1fae5',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    taskBannerTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1e293b',
    },
    taskBannerAddr: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 2,
    },
    taskPriorityBadge: {
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    taskPriorityText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#047857',
    },
    // Native maps styles
    markerContainer: { alignItems: 'center' },
    iconContainer: {
        padding: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
    },
    activeMarker: {
        borderColor: '#065f46',
        borderWidth: 3,
        transform: [{ scale: 1.2 }],
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
        borderColor: '#d1fae5',
    },
    badgeText: { fontSize: 9, fontWeight: 'bold', color: '#333' },
    taskOverlay: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 14,
        padding: 14,
        zIndex: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#047857',
        borderWidth: 1,
        borderColor: '#d1fae5',
    },
    taskOverlayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
    taskOverlayTitle: { fontSize: 12, fontWeight: 'bold', color: '#047857', textTransform: 'uppercase' },
    taskOverlayBin: { fontSize: 17, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
    taskOverlayAddress: { fontSize: 12, color: '#64748b', marginBottom: 8 },
    taskOverlayFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
    taskOverlayDetail: { fontSize: 11, fontWeight: '600', color: '#475569' },
    fallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4', gap: 8 },
    fallbackText: { fontSize: 15, fontWeight: '600', color: '#475569' },
    fallbackSub: { fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingHorizontal: 20 },
});
