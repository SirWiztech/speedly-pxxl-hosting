import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ClientLocationMobile from '../components/mobileViewComponent/ClientLocationMobile';
import api from '../services/api';
import { loadGoogleMapsApi } from '../lib/googleMaps';
import '../../css/ClientLocation.css';

interface LocationCoords { lat: number; lng: number; accuracy: number; altitude: number | null; speed: number | null; heading: number | null; }
interface AddressComponents { street: string; area: string; city: string; state: string; country: string; formatted: string; }
interface PlaceResult { id: string; name: string; vicinity: string; location: { lat: number; lng: number }; types: string[]; }

const ClientLocation: React.FC = () => {
    const [userData, setUserData] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
    const [address, setAddress] = useState<AddressComponents>({ street: 'Waiting for GPS...', area: '', city: '', state: '', country: '', formatted: 'Click "Allow" to see your location' });
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isTracking, setIsTracking] = useState<boolean>(false);
    const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
    const [showPlaces, setShowPlaces] = useState<boolean>(false);
    const [gpsStatus, setGpsStatus] = useState<string>('Click "Allow GPS" to enable tracking');

    const watchIdRef = useRef<number | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const directionArrowRef = useRef<HTMLDivElement>(null);
    const mapInitRef = useRef(false);
    const initTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const preloaderLoading = usePreloader(300);
    const isMobile = useMobile();

    const fetchProfileData = useCallback(async () => {
        try { const d = await api.client.profile(); if (d.success || d.data) { const u = d.data?.user || d.user || d.data; setUserData(u); } } catch {}
    }, []);

    useEffect(() => { const t = setTimeout(fetchProfileData, 0); return () => clearTimeout(t); }, [fetchProfileData]);

    const initMap = useCallback(() => {
        if (!mapRef.current || !window.google || mapInitRef.current) return;
        mapInitRef.current = true;
        mapInstanceRef.current = new google.maps.Map(mapRef.current, { center: { lat: 6.2109, lng: 6.7985 }, zoom: 14, mapTypeControl: true, streetViewControl: true, fullscreenControl: true, zoomControl: true, gestureHandling: 'greedy', maxZoom: 20, minZoom: 3 });
        infoWindowRef.current = new google.maps.InfoWindow();
    }, []);

    useEffect(() => { const f = async () => { try { await loadGoogleMapsApi(); initMap(); } catch {} }; f(); }, [initMap]);
    useEffect(() => { if (!preloaderLoading) { initTimeoutRef.current = setTimeout(() => { const idle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1)); idle(() => initMap()); }, 100); } return () => { if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current); }; }, [preloaderLoading, initMap]);

    const requestLocationPermission = () => {
        setGpsStatus('Getting location...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setHasPermission(true); setIsTracking(true); setGpsStatus('Refining...');
                const coords: LocationCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude, speed: pos.coords.speed, heading: pos.coords.heading };
                updateLocation(coords); doReverseGeocode(coords.lat, coords.lng); startWatchingPosition(); updateGPSStatus('active');
                navigator.geolocation.getCurrentPosition(
                    (ref) => { const rc: LocationCoords = { lat: ref.coords.latitude, lng: ref.coords.longitude, accuracy: ref.coords.accuracy, altitude: ref.coords.altitude, speed: ref.coords.speed, heading: ref.coords.heading }; updateLocation(rc); updateMapMarker(rc); doReverseGeocode(rc.lat, rc.lng); setGpsStatus('Live tracking'); },
                    () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            },
            (err) => { setHasPermission(false); setIsTracking(false); setGpsStatus(err.code === 1 ? 'Location denied' : 'Unable to get location'); updateGPSStatus('denied'); },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
        );
    };

    const startWatchingPosition = () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => { const c: LocationCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, altitude: pos.coords.altitude, speed: pos.coords.speed, heading: pos.coords.heading }; updateLocation(c); updateMapMarker(c); doReverseGeocode(c.lat, c.lng); updateDirectionArrow(c.heading); },
            () => {}, { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
        );
    };

    const updateLocation = (coords: LocationCoords) => { setUserLocation(coords); mapInstanceRef.current?.setCenter({ lat: coords.lat, lng: coords.lng }); };

    const updateMapMarker = (coords: LocationCoords) => {
        const m = mapInstanceRef.current; if (!m) return;
        const pos = { lat: coords.lat, lng: coords.lng };
        if (accuracyCircleRef.current) { accuracyCircleRef.current.setCenter(pos); accuracyCircleRef.current.setRadius(coords.accuracy || 10); }
        else accuracyCircleRef.current = new google.maps.Circle({ map: m, center: pos, radius: coords.accuracy || 10, fillColor: '#ff5e00', fillOpacity: 0.05, strokeColor: '#ff5e00', strokeOpacity: 0.25, strokeWeight: 1 });
        if (markerRef.current) { markerRef.current.setPosition(pos); }
        else {
            const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ff5e00" stroke="white" stroke-width="2.5"/><circle cx="12" cy="12" r="4" fill="white"/></svg>');
            markerRef.current = new google.maps.Marker({ position: pos, map: m, title: 'You', icon: { url: 'data:image/svg+xml;charset=UTF-8,' + svg, scaledSize: new google.maps.Size(36, 36), anchor: new google.maps.Point(18, 18) }, zIndex: 1000, animation: google.maps.Animation.DROP });
            markerRef.current.addListener('click', () => {
                if (infoWindowRef.current && markerRef.current) { infoWindowRef.current.setContent(`<div style="padding:12px;min-width:180px"><h3 style="color:#ff5e00;margin-bottom:6px">📍 Your Location</h3><p>Accuracy: <strong>±${coords.accuracy.toFixed(0)}m</strong></p><p>Speed: <strong>${((coords.speed||0)*3.6).toFixed(1)} km/h</strong></p><p>Alt: <strong>${(coords.altitude||0).toFixed(0)}m</strong></p></div>`); infoWindowRef.current.open(m, markerRef.current); }
            });
        }
    };

    const updateDirectionArrow = (heading: number | null) => { if (directionArrowRef.current && heading != null) directionArrowRef.current.style.transform = `rotate(${heading}deg)`; };

    const doReverseGeocode = useCallback((lat: number, lng: number) => {
        if (!window.google) return;
        if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();
        geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            if (status !== 'OK' || !results?.length) return;
            const c = results[0].address_components; let street = '', area = '', city = '', state = '', country = '';
            for (const comp of c) { if (comp.types.includes('route')) street = comp.long_name; if (comp.types.includes('sublocality') || comp.types.includes('neighborhood')) area = comp.long_name; if (comp.types.includes('locality')) city = comp.long_name; if (comp.types.includes('administrative_area_level_1')) state = comp.long_name; if (comp.types.includes('country')) country = comp.long_name; }
            setAddress({ street: street || 'Unknown', area, city, state: state || 'Anambra', country: country || 'Nigeria', formatted: results[0].formatted_address });
        });
    }, []);

    const findNearbyPlaces = (type: string = 'restaurant') => {
        if (!userLocation) { Swal.fire({ icon: 'warning', title: 'Location Required', confirmButtonColor: '#ff5e00' }); return; }
        if (!placesServiceRef.current && mapInstanceRef.current) placesServiceRef.current = new google.maps.places.PlacesService(mapInstanceRef.current);
        if (!placesServiceRef.current) return;
        placesServiceRef.current.nearbySearch({ location: { lat: userLocation.lat, lng: userLocation.lng }, radius: 1000, type: type as any }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) { setNearbyPlaces(results.slice(0, 10).map(p => ({ id: p.place_id || Math.random().toString(), name: p.name || 'Unknown', vicinity: p.vicinity || '', location: { lat: p.geometry!.location!.lat(), lng: p.geometry!.location!.lng() }, types: p.types || [] }))); setShowPlaces(true); }
            else Swal.fire({ icon: 'info', title: 'No Places', confirmButtonColor: '#ff5e00' });
        });
    };

    const findNearbyChurches = () => {
        if (!userLocation) { Swal.fire({ icon: 'warning', title: 'Location Required', confirmButtonColor: '#ff5e00' }); return; }
        if (!placesServiceRef.current && mapInstanceRef.current) placesServiceRef.current = new google.maps.places.PlacesService(mapInstanceRef.current);
        if (!placesServiceRef.current) return;
        placesServiceRef.current.nearbySearch({ location: { lat: userLocation.lat, lng: userLocation.lng }, radius: 2000, keyword: 'church' }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) { setNearbyPlaces(results.slice(0, 10).map(p => ({ id: p.place_id || Math.random().toString(), name: p.name || 'Unknown', vicinity: p.vicinity || '', location: { lat: p.geometry!.location!.lat(), lng: p.geometry!.location!.lng() }, types: p.types || [] }))); setShowPlaces(true); }
            else Swal.fire({ icon: 'info', title: 'No Churches', confirmButtonColor: '#ff5e00' });
        });
    };

    const centerOnUser = () => { if (userLocation && mapInstanceRef.current) { mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng }); mapInstanceRef.current.setZoom(18); } else requestLocationPermission(); };
    const goToPlace = (place: PlaceResult) => { if (mapInstanceRef.current) { mapInstanceRef.current.setCenter(place.location); mapInstanceRef.current.setZoom(18); new google.maps.Marker({ position: place.location, map: mapInstanceRef.current, title: place.name, animation: google.maps.Animation.DROP }); setShowPlaces(false); } };

    const updateGPSStatus = (status: 'active' | 'denied' | 'error') => {
        const p = document.querySelector('.desktop-gps-pulse') as HTMLElement; const s = document.querySelector('.desktop-gps-state') as HTMLElement;
        if (!p || !s) return;
        if (status === 'active') { p.style.background = '#4ade80'; s.innerHTML = '🟢 GPS ACTIVE'; s.style.color = '#4caf50'; }
        else if (status === 'denied') { p.style.background = '#ef4444'; s.innerHTML = '❌ GPS DENIED'; s.style.color = '#ef4444'; }
        else { p.style.background = '#ff9800'; s.innerHTML = '⚠️ GPS ERROR'; s.style.color = '#ff9800'; }
    };

    useEffect(() => () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current); }, []);

    const formatSpeed = (s: number | null) => ((s || 0) * 3.6).toFixed(1);
    const formatAccuracy = (a: number) => a.toFixed(0);

    if (preloaderLoading) return <DesktopPreloader />;
    if (isMobile) return <ClientLocationMobile />;

    return (
        <div className="location-desktop-container">
            <ClientSidebarDesktop userName={userData?.fullname || userData?.full_name || 'User'} profilePictureUrl={userData?.profile_picture_url} />
            <div className="location-desktop-main">
                <div className="location-desktop-header"><div className="location-desktop-title"><h1>⚡ Live Location</h1><p>📍 Real-time GPS • Places • Streets</p></div></div>
                <div className="location-desktop-grid">
                    <div className="location-map-col">
                        <div ref={mapRef} className="location-map"></div>
                        <div className="location-map-controls"><button className="location-map-btn" onClick={() => findNearbyPlaces('restaurant')} title="Nearby Places"><i className="fas fa-store"></i></button><button className="location-map-btn" onClick={findNearbyChurches} title="Churches"><i className="fas fa-church"></i></button><button className="location-map-btn" onClick={centerOnUser} title="My Location"><i className="fas fa-crosshairs"></i></button></div>
                        <div ref={directionArrowRef} className="location-direction-arrow"><i className="fas fa-location-arrow"></i></div>
                        {showPlaces && (<div className="location-places-panel"><div className="location-places-header"><h3>Nearby</h3><button className="location-close-places" onClick={() => setShowPlaces(false)}><i className="fas fa-times"></i></button></div><div className="location-places-list">{nearbyPlaces.map(p => (<div key={p.id} className="location-place-item" onClick={() => goToPlace(p)}><div className="location-place-icon"><i className="fas fa-map-marker-alt"></i></div><div className="location-place-info"><h4>{p.name}</h4><p>{p.vicinity}</p></div></div>))}</div></div>)}
                    </div>
                    <div className="location-info-panel">
                        <div className="location-gps-header"><span className={`desktop-gps-pulse ${isTracking ? 'active' : ''}`}></span><span className="desktop-gps-state">{gpsStatus}</span></div>
                        {!isTracking && <button className="location-permission-btn" onClick={requestLocationPermission}><i className="fas fa-location-arrow"></i> ALLOW GPS</button>}
                        <div className="location-address-card"><div className="location-address-title"><i className="fas fa-location-dot"></i><span>{address.street}</span></div><div className="location-address-full">{address.formatted}</div></div>
                        <div className="location-coord-grid">
                            <div className="location-coord-item"><div className="coord-label">LATITUDE</div><div className="coord-value">{userLocation?.lat.toFixed(6) || '--'}</div></div>
                            <div className="location-coord-item"><div className="coord-label">LONGITUDE</div><div className="coord-value">{userLocation?.lng.toFixed(6) || '--'}</div></div>
                            <div className="location-coord-item"><div className="coord-label">ACCURACY</div><div className="coord-value">±{userLocation ? formatAccuracy(userLocation.accuracy) : '--'}m</div></div>
                            <div className="location-coord-item"><div className="coord-label">GPS SOURCE</div><div className="coord-value">Google Maps</div></div>
                        </div>
                        <div className="location-movement-stats">
                            <div className="location-stat-badge"><i className="fas fa-tachometer-alt"></i><span className="stat-label">Speed</span><span className="stat-value">{userLocation ? formatSpeed(userLocation.speed) : '0'}</span><span className="stat-unit">km/h</span></div>
                            <div className="location-stat-badge"><i className="fas fa-compass"></i><span className="stat-label">Heading</span><span className="stat-value">{userLocation?.heading?.toFixed(0) || '--'}</span><span className="stat-unit">°</span></div>
                            <div className="location-stat-badge"><i className="fas fa-mountain"></i><span className="stat-label">Altitude</span><span className="stat-value">{userLocation?.altitude?.toFixed(0) || '--'}</span><span className="stat-unit">m</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientLocation;
