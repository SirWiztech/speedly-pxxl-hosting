import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import ClientSidebarDesktop from '../components/navbars/ClientSidebarDesktop';
import Swal from 'sweetalert2';
import api from '../services/api';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import ClientBookRideMobile from '../components/mobileViewComponent/ClientBookRideMobile';
import { loadGoogleMapsApi } from '../lib/googleMaps';
import '../../css/ClientBookRide.css';

interface LocationData { address: string; lat: number | null; lng: number | null; placeId: string | null; }
interface BookingData { pickup: LocationData; destination: LocationData; plan: string; driverId: string | null; driverSelected: boolean; payment: string; distance: number; fare: number; }
interface Driver { id: string; name: string; rating: number; rides: number; distance: number; vehicle: string; plate: string; type: string; }
interface SavedLocation { address: string; lat: number; lng: number; type: string; last_used: string; }

const ClientBookRide: React.FC = () => {
    const [userData, setUserData] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [step, setStep] = useState<number>(1);
    const [booking, setBooking] = useState<BookingData>({ pickup: { address: '', lat: null, lng: null, placeId: null }, destination: { address: '', lat: null, lng: null, placeId: null }, plan: '', driverId: null, driverSelected: false, payment: '', distance: 0, fare: 0 });
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
    const [mode, setMode] = useState<'pickup' | 'destination'>('pickup');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapLoaded, setMapLoaded] = useState<boolean>(false);
    const [mapsApiReady, setMapsApiReady] = useState<boolean>(false);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [selectedPayment, setSelectedPayment] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [searching, setSearching] = useState<boolean>(false);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
    const destMarkerRef = useRef<google.maps.Marker | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const searchBoxRef = useRef<HTMLInputElement>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
    const geocoderRef = useRef<google.maps.Geocoder | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const mapInitRef = useRef(false);
    const actionsRef = useRef<any>({});
    const initTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const preloaderLoading = usePreloader(300);
    const isMobile = useMobile();

    const popularLocations = [
        { name: 'Lagos Airport', lat: 6.5774, lng: 3.3211, address: 'Murtala Muhammed International Airport, Lagos', icon: 'plane' },
        { name: 'Victoria Island', lat: 6.4281, lng: 3.4219, address: 'Victoria Island, Lagos, Nigeria', icon: 'building' },
        { name: 'Lekki Phase 1', lat: 6.4484, lng: 3.4719, address: 'Lekki Phase 1, Lagos, Nigeria', icon: 'map-pin' },
        { name: 'Ikeja City Mall', lat: 6.6018, lng: 3.3515, address: 'Ikeja City Mall, Lagos, Nigeria', icon: 'shopping-cart' },
        { name: 'Ajah', lat: 6.4700, lng: 3.5730, address: 'Ajah, Lagos, Nigeria', icon: 'market' },
        { name: 'Maryland Mall', lat: 6.5794, lng: 3.3622, address: 'Maryland Mall, Lagos, Nigeria', icon: 'store' }
    ];

    const fetchData = useCallback(async () => {
        try {
            const [profileResult, walletResult] = await Promise.allSettled([api.client.profile(), api.client.wallet()]);
            if (profileResult.status === 'fulfilled') { const d = profileResult.value; if (d.success || d.data) setUserData(d.data); }
            if (walletResult.status === 'fulfilled') { const d = walletResult.value; if (d.success) setWalletBalance(parseFloat(d.data.balance) || 0); }
        } catch {}
        finally { setLoading(false); }
    }, []);

    const fetchSavedLocations = useCallback(async () => {
        try { const d = await api.client.locations(); if (d.success && d.data) setSavedLocations(d.data.saved_locations || []); } catch {}
    }, []);

    const handleSearchInput = useCallback((value: string) => {
        setSearchQuery(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (value.length < 2) { setSearchResults([]); setShowDropdown(false); return; }
        setSearching(true);
        searchTimerRef.current = setTimeout(async () => {
            try {
                const data = await api.location.suggestions(value);
                if (data.success) {
                    setSearchResults(data.data?.suggestions || []);
                    setShowDropdown(true);
                }
            } catch {} finally { setSearching(false); }
        }, 300);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<{ address: string; placeId: string }> => {
        if (window.google && window.google.maps) {
            try {
                const result = await new Promise<{ address: string; placeId: string } | null>((resolve) => {
                    const geocoder = new google.maps.Geocoder();
                    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                        if (status === 'OK' && results?.[0]) resolve({ address: results[0].formatted_address, placeId: results[0].place_id || '' });
                        else resolve(null);
                    });
                });
                if (result) return result;
            } catch {}
        }
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`, { headers: { 'User-Agent': 'SpeedlyApp/1.0' } });
            const data = await res.json();
            if (data?.display_name) return { address: data.display_name, placeId: '' };
        } catch {}
        return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, placeId: '' };
    }, []);

    const handleMapClick = useCallback(async (lat: number, lng: number) => {
        const { address, placeId } = await reverseGeocode(lat, lng);
        if (mode === 'pickup') updatePickupLocation(lat, lng, address, placeId);
        else updateDestinationLocation(lat, lng, address, placeId);
    }, [mode]);

    const updatePickupLocation = useCallback((lat: number, lng: number, address: string, placeId: string | null) => {
        try {
            if (pickupMarkerRef.current) pickupMarkerRef.current.setMap(null);
            if (lat !== 0 && lng !== 0 && mapInstanceRef.current) {
                pickupMarkerRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapInstanceRef.current, title: 'Pickup', icon: { path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#4CAF50', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }, label: { text: 'P', color: 'white', fontSize: '12px', fontWeight: 'bold' }, animation: google.maps.Animation.DROP });
                setMode('destination');
            } else { setMode('pickup'); }
        } catch {}
        setBooking(prev => {
            const updated = { ...prev, pickup: { address, lat, lng, placeId } };
            if (updated.destination.lat && updated.destination.lng && lat !== 0 && lng !== 0) { drawRoute(updated.pickup, updated.destination); calculateFare(lat, lng, updated.destination.lat!, updated.destination.lng!); }
            return updated;
        });
    }, []);

    const updateDestinationLocation = useCallback((lat: number, lng: number, address: string, placeId: string | null) => {
        try {
            if (destMarkerRef.current) destMarkerRef.current.setMap(null);
            if (lat !== 0 && lng !== 0 && mapInstanceRef.current) {
                destMarkerRef.current = new google.maps.Marker({ position: { lat, lng }, map: mapInstanceRef.current, title: 'Destination', icon: { path: google.maps.SymbolPath.CIRCLE, scale: 12, fillColor: '#F44336', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }, label: { text: 'D', color: 'white', fontSize: '12px', fontWeight: 'bold' }, animation: google.maps.Animation.DROP });
            }
        } catch {}
        setBooking(prev => {
            const updated = { ...prev, destination: { address, lat, lng, placeId } };
            if (updated.pickup.lat && updated.pickup.lng && lat !== 0 && lng !== 0) { drawRoute(updated.pickup, updated.destination); calculateFare(updated.pickup.lat!, updated.pickup.lng!, lat, lng); }
            return updated;
        });
    }, []);

    const handleSelectPlace = useCallback((place: any) => {
        setShowDropdown(false);
        setSearchQuery(place.name);
        if (searchBoxRef.current) searchBoxRef.current.value = '';
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lng);
        if (!isNaN(lat) && !isNaN(lng)) {
            mapInstanceRef.current?.setCenter({ lat, lng });
            mapInstanceRef.current?.setZoom(16);
            if (mode === 'pickup') updatePickupLocation(lat, lng, place.full_address || place.name, null);
            else updateDestinationLocation(lat, lng, place.full_address || place.name, null);
        }
    }, [mode, updatePickupLocation, updateDestinationLocation]);

    const drawRoute = useCallback(() => {
        if (!directionsRendererRef.current || !booking.pickup.lat || !booking.destination.lat) return;
        const ds = new google.maps.DirectionsService();
        ds.route({ origin: { lat: booking.pickup.lat, lng: booking.pickup.lng }, destination: { lat: booking.destination.lat, lng: booking.destination.lng }, travelMode: google.maps.TravelMode.DRIVING }, (result, status) => { if (status === 'OK' && result) directionsRendererRef.current?.setDirections(result); });
    }, [booking.pickup.lat, booking.pickup.lng, booking.destination.lat, booking.destination.lng]);

    const calculateFare = useCallback(async (pickupLat: number, pickupLng: number, destLat: number, destLng: number) => {
        try {
            const data = await api.rides.calculateFare({ pickup_lat: pickupLat, pickup_lng: pickupLng, dropoff_lat: destLat, dropoff_lng: destLng, ride_type: booking.plan || 'economy' });
            if (data.success && data.data) { setBooking(prev => ({ ...prev, distance: data.data.distance_km || 0, fare: data.data.estimated_fare || 0 })); findNearbyDrivers(pickupLat, pickupLng); }
        } catch {}
    }, [booking.plan]);

    const findNearbyDrivers = async (lat: number, lng: number) => {
        try {
            const data = await api.driver.nearbyDrivers({ lat, lng, radius_km: 10 });
            if (data.success && data.data) { const r = Array.isArray(data.data) ? data.data : []; setDrivers(r.map((d: any) => ({ id: d.id, name: d.user?.full_name || 'Unknown', rating: d.average_rating || 0, rides: d.completed_rides || 0, distance: d.distance ? Math.round(d.distance*10)/10 : 0, vehicle: d.vehicle?.vehicle_type || 'Standard', plate: d.vehicle?.plate_number || '', type: d.vehicle?.vehicle_type || 'standard' }))); }
        } catch {}
    };

    const startWatchingPosition = useCallback(() => {
        if (!navigator.geolocation) return;
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => { const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setUserLocation(loc); if (mapInstanceRef.current && !booking.pickup.lat) mapInstanceRef.current.setCenter(loc); }, () => {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
        );
    }, [booking.pickup.lat]);

    const initMap = useCallback(() => {
        if (!mapRef.current || !window.google?.maps || mapInitRef.current) return;
        mapInitRef.current = true;
        const m = new google.maps.Map(mapRef.current, { center: { lat: 6.5244, lng: 3.3792 }, zoom: 12, mapTypeControl: true, streetViewControl: true, fullscreenControl: true, zoomControl: true, gestureHandling: 'greedy', maxZoom: 18, minZoom: 3 });
        mapInstanceRef.current = m;
        setMapLoaded(true);
        m.addListener('click', (e: google.maps.MapMouseEvent) => { if (e.latLng) actionsRef.current.handleMapClick(e.latLng.lat(), e.latLng.lng()); });
        directionsRendererRef.current = new google.maps.DirectionsRenderer({ map: m, suppressMarkers: true, polylineOptions: { strokeColor: '#ff5e00', strokeWeight: 5, strokeOpacity: 0.7 } });
        actionsRef.current.startWatchingPosition();
    }, []);

    useEffect(() => {
        if (window.google?.maps) { setMapsApiReady(true); setMapLoaded(true); return; }
        loadGoogleMapsApi().then(() => { setMapsApiReady(true); setMapLoaded(true); }).catch(() => setTimeout(() => loadGoogleMapsApi().then(() => { setMapsApiReady(true); setMapLoaded(true); }), 2000));
    }, []);

    useEffect(() => {
        if (!preloaderLoading && mapsApiReady && !isMobile && mapRef.current && !mapInitRef.current) {
            initTimeoutRef.current = setTimeout(() => {
                const idle = (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 1));
                idle(() => initMap());
            }, 50);
        }
        return () => { if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current); };
    }, [preloaderLoading, mapsApiReady, isMobile, initMap]);

    useEffect(() => { actionsRef.current = { mode, handleMapClick, updatePickupLocation, updateDestinationLocation, startWatchingPosition }; });
    useEffect(() => { if (step === 3 && booking.pickup.lat && booking.pickup.lng) findNearbyDrivers(booking.pickup.lat, booking.pickup.lng); }, [step]);
    useEffect(() => { fetchData(); fetchSavedLocations(); }, [fetchData, fetchSavedLocations]);
    useEffect(() => () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current); }, []);

    const centerOnUser = () => {
        const m = mapInstanceRef.current;
        if (userLocation && m) { m.setCenter(userLocation); m.setZoom(16); }
        else navigator.geolocation?.getCurrentPosition(p => { const l = { lat: p.coords.latitude, lng: p.coords.longitude }; setUserLocation(l); m?.setCenter(l); m?.setZoom(16); }, () => Swal.fire({ icon: 'error', title: 'Location Access Denied', confirmButtonColor: '#ff5e00' }));
    };

    const useSavedLocation = (loc: SavedLocation, type: 'pickup' | 'destination') => { mapInstanceRef.current?.setCenter({ lat: loc.lat, lng: loc.lng }); mapInstanceRef.current?.setZoom(16); type === 'pickup' ? updatePickupLocation(loc.lat, loc.lng, loc.address, null) : updateDestinationLocation(loc.lat, loc.lng, loc.address, null); };
    const usePopularLocation = (loc: typeof popularLocations[0], type: 'pickup' | 'destination') => { mapInstanceRef.current?.setCenter({ lat: loc.lat, lng: loc.lng }); mapInstanceRef.current?.setZoom(16); type === 'pickup' ? updatePickupLocation(loc.lat, loc.lng, loc.address, null) : updateDestinationLocation(loc.lat, loc.lng, loc.address, null); };
    const selectPlan = (plan: string) => { setSelectedPlan(plan); setBooking(prev => { const u = { ...prev, plan }; if (u.pickup.lat && u.pickup.lng && u.destination.lat && u.destination.lng) calculateFare(u.pickup.lat, u.pickup.lng, u.destination.lat, u.destination.lng); return u; }); };
    const selectDriver = (id: string) => { setSelectedDriverId(id); setBooking(prev => ({ ...prev, driverId: id, driverSelected: true })); Swal.fire({ icon: 'info', title: 'Private Ride', text: 'Driver notified.', timer: 3000, showConfirmButton: false, toast: true }); };
    const skipDriverSelection = () => { setSelectedDriverId(null); setBooking(prev => ({ ...prev, driverId: null, driverSelected: false })); Swal.fire({ icon: 'info', title: 'Public Ride', text: 'Visible to all nearby drivers.', timer: 3000, showConfirmButton: false, toast: true }); };
    const selectPayment = (p: string) => { setSelectedPayment(p); setBooking(prev => ({ ...prev, payment: p })); };
    const confirmBooking = async () => {
        if (!booking.pickup.address || !booking.destination.address || !booking.plan || !booking.payment) { Swal.fire({ icon: 'error', title: 'Incomplete', confirmButtonColor: '#ff5e00' }); return; }
        if (booking.payment === 'wallet' && booking.fare > walletBalance) { Swal.fire({ icon: 'error', title: 'Insufficient Balance', html: `Wallet: ₦${walletBalance.toLocaleString()}<br>Required: ₦${booking.fare.toLocaleString()}`, showCancelButton: true, confirmButtonColor: '#ff5e00' }).then(r => { if (r.isConfirmed) router.visit('/wallet'); }); return; }
        const result = await Swal.fire({ title: 'Confirm Booking', text: booking.driverId ? 'Private ride.' : 'Public ride.', icon: 'info', showCancelButton: true, confirmButtonColor: '#ff5e00', confirmButtonText: 'Book Now' });
        if (result.isConfirmed) {
            Swal.fire({ title: 'Booking...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                const data = await api.rides.book({ pickup_location: booking.pickup.address, dropoff_location: booking.destination.address, pickup_lat: booking.pickup.lat || 0, pickup_lng: booking.pickup.lng || 0, dropoff_lat: booking.destination.lat || 0, dropoff_lng: booking.destination.lng || 0, ride_type: booking.plan, notes: booking.driverId ? `Driver: ${booking.driverId}` : undefined });
                Swal.close();
                if (data.success) Swal.fire({ icon: 'success', title: 'Ride Booked!', html: `<p>Ride #${data.data?.ride_number || ''}</p><p>Fare: ₦${booking.fare.toLocaleString()}</p>`, confirmButtonColor: '#ff5e00', confirmButtonText: 'View Receipt' }).then(() => router.visit(`/generatereceipt?rideId=${data.data?.id || ''}`));
                else Swal.fire({ icon: 'error', title: 'Booking Failed', text: data.message, confirmButtonColor: '#ff5e00' });
            } catch (e: any) { Swal.close(); Swal.fire({ icon: 'error', title: 'Error', text: e?.message || 'Failed', confirmButtonColor: '#ff5e00' }); }
        }
    };
    const checkNotifications = async () => { try { const d = await api.notifications.list(); Swal.fire({ icon: 'info', title: 'Notifications', text: `${(d.data?.data || []).length} new`, confirmButtonColor: '#ff5e00' }); } catch { Swal.fire({ icon: 'info', title: 'Notifications', text: 'No new', confirmButtonColor: '#ff5e00' }); } };
    const nextStep = () => { if (step === 1 && (!booking.pickup.lat || !booking.destination.lat)) { Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Select pickup and destination', confirmButtonColor: '#ff5e00' }); return; } if (step === 2 && !booking.plan) { Swal.fire({ icon: 'warning', title: 'Incomplete', confirmButtonColor: '#ff5e00' }); return; } if (step < 4) { const n = step + 1; setStep(n); if (n === 3 && booking.pickup.lat && booking.pickup.lng) findNearbyDrivers(booking.pickup.lat, booking.pickup.lng); } };
    const prevStep = () => { if (step > 1) setStep(step - 1); };

    const formatCurrency = (a: number) => `₦${a.toLocaleString()}`;
    const tierColor = userData?.membership_tier === 'premium' ? '#ff5e00' : userData?.membership_tier === 'gold' ? '#ffd700' : '#6c757d';

    if (loading || preloaderLoading) return <DesktopPreloader />;
    if (isMobile) return <ClientBookRideMobile />;

    return (
        <div className="book-ride-desktop-container">
            <ClientSidebarDesktop userName={userData?.fullname || userData?.full_name || 'User'} profilePictureUrl={userData?.profile_picture_url} />
            <div className="book-ride-desktop-main">
                <div className="book-ride-desktop-header"><div className="book-ride-desktop-title"><h1>Book a Ride</h1><p className="wallet-balance">Wallet: <span className="font-roboto-number">{formatCurrency(walletBalance)}</span></p></div><button className="book-ride-notification-btn" onClick={checkNotifications}><i className="fas fa-bell"></i>{notificationCount > 0 && <span className="notification-badge font-roboto-number">{notificationCount}</span>}</button></div>
                <div className="book-ride-steps">
                    <div className={`step ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)}><div className="step-icon"><i className="fas fa-map-marker-alt"></i></div><h3>Select Location</h3><p>Pickup & destination</p></div>
                    <div className={`step ${step === 2 ? 'active' : ''}`} onClick={() => step > 1 && setStep(2)}><div className="step-icon"><i className="fas fa-car"></i></div><h3>Choose Plan</h3><p>Ride type</p></div>
                    <div className={`step ${step === 3 ? 'active' : ''}`} onClick={() => step > 2 && setStep(3)}><div className="step-icon"><i className="fas fa-user-tie"></i></div><h3>Select Driver</h3><p>Choose driver</p></div>
                    <div className={`step ${step === 4 ? 'active' : ''}`} onClick={() => step > 3 && setStep(4)}><div className="step-icon"><i className="fas fa-credit-card"></i></div><h3>Payment</h3><p>Pay securely</p></div>
                </div>
                {step === 1 && (
                    <div className="book-ride-location-step">
                        <div className="book-ride-map-section">
                            <div className="map-controls">
                                <div className="mode-selector">
                                    <button className={`mode-btn pickup ${mode === 'pickup' ? 'active' : ''}`} onClick={() => setMode('pickup')}><i className="fas fa-circle text-green-600"></i> Pickup</button>
                                    <button className={`mode-btn destination ${mode === 'destination' ? 'active' : ''}`} onClick={() => setMode('destination')}><i className="fas fa-map-marker-alt text-red-600"></i> Destination</button>
                                </div>
                                <div className="search-box-wrapper" ref={dropdownRef}>
                                    <div className="search-box"><i className="fas fa-search"></i><input type="text" ref={searchBoxRef} placeholder="Search for a location..." onChange={e => handleSearchInput(e.target.value)} onFocus={() => searchResults.length > 0 && setShowDropdown(true)} /></div>
                                    {showDropdown && (
                                        <div className="search-dropdown">
                                            {searching ? (
                                                <div className="search-dropdown-loading"><i className="fas fa-spinner fa-spin"></i> Searching...</div>
                                            ) : searchResults.length > 0 ? (
                                                searchResults.map((r, i) => (
                                                    <div key={r.id || i} className="search-result-item" onClick={() => handleSelectPlace(r)}>
                                                        <span className="result-icon">{r.feature_code === 'PPL' ? '🏘️' : r.feature_code === 'RD' ? '🛣️' : r.feature_code === 'RDH' ? '🛣️' : r.feature_code === 'SCH' ? '🎓' : r.feature_code === 'HSP' ? '🏥' : r.feature_code === 'MKT' ? '🛒' : r.feature_code === 'BNK' ? '🏦' : r.feature_code === 'REST' ? '🍽️' : r.feature_code === 'HTL' ? '🏨' : r.feature_code === 'CH' ? '⛪' : r.feature_code === 'RSTN' ? '🚉' : r.feature_code === 'OSM' ? '🌐' : '📌'}</span>
                                                        <div className="result-info">
                                                            <div className="result-name">{r.name}</div>
                                                            <div className="result-address">{r.state ? `${r.state}, Nigeria` : r.full_address}</div>
                                                        </div>
                                                        <span className="result-badge">{r.feature_code || '—'}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="search-dropdown-empty">No results found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div ref={mapRef} className="book-ride-map"></div>
                            <button className="center-location-btn" onClick={centerOnUser}><i className="fas fa-crosshairs"></i></button>
                        </div>
                        <div className="book-ride-location-panel">
                            <h3>Selected Locations</h3>
                            <div className="location-card"><div className="label"><i className="fas fa-circle text-green-600"></i> PICKUP</div><div className="address">{booking.pickup.address || 'Click map or search'}</div>{booking.pickup.lat && <button className="clear-btn" onClick={() => updatePickupLocation(0, 0, '', null)}>Clear</button>}</div>
                            <div className="location-card destination"><div className="label"><i className="fas fa-map-marker-alt text-red-600"></i> DESTINATION</div><div className="address">{booking.destination.address || 'Click map or search'}</div>{booking.destination.lat && <button className="clear-btn" onClick={() => updateDestinationLocation(0, 0, '', null)}>Clear</button>}</div>
                            {savedLocations.length > 0 && (<><h3 className="section-title">Saved Locations</h3><div className="saved-locations-grid">{savedLocations.map((l, i) => (<div key={i} className="saved-location-chip" onClick={() => useSavedLocation(l, mode)}><i className="fas fa-map-pin"></i><div className="name">{l.address.substring(0, 25)}</div></div>))}</div></>)}
                            <h3 className="section-title">Popular Locations</h3>
                            <div className="popular-locations-grid">{popularLocations.map(l => (<div key={l.name} className="popular-location-chip" onClick={() => usePopularLocation(l, mode)}><i className={`fas fa-${l.icon}`}></i><div className="name">{l.name}</div></div>))}</div>
                            <button className="continue-btn" onClick={nextStep} disabled={!booking.pickup.lat || !booking.destination.lat}><i className="fas fa-arrow-right"></i> CONTINUE</button>
                        </div>
                    </div>
                )}
                {step === 2 && (<div className="book-ride-plan-step"><h2>Choose Your Ride</h2><div className="plans-grid"><div className={`plan-card ${selectedPlan === 'economy' ? 'selected' : ''}`} onClick={() => selectPlan('economy')}><div className="plan-icon"><i className="fas fa-car"></i></div><h3>Economy</h3><ul><li><i className="fas fa-check"></i> Affordable</li><li><i className="fas fa-check"></i> 4 Seater</li><li><i className="fas fa-check"></i> Standard</li></ul><div className="plan-price font-roboto-number">₦1,000 <span>/km</span></div></div><div className={`plan-card ${selectedPlan === 'comfort' ? 'selected' : ''}`} onClick={() => selectPlan('comfort')}><div className="plan-icon"><i className="fas fa-car-side"></i></div><h3>Comfort</h3><ul><li><i className="fas fa-check"></i> Extra legroom</li><li><i className="fas fa-check"></i> Professional</li><li><i className="fas fa-check"></i> Premium</li></ul><div className="plan-price font-roboto-number">₦1,500 <span>/km</span></div></div></div><div className="action-buttons"><button className="back-btn" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button><button className="next-btn" onClick={nextStep} disabled={!booking.plan}><i className="fas fa-arrow-right"></i> Continue</button></div></div>)}
                {step === 3 && (<div className="book-ride-driver-step"><h2>Available Drivers</h2><p className="driver-status"><span className="font-roboto-number">{drivers.length}</span> drivers nearby</p><div className="driver-selection-info"><i className="fas fa-info-circle"></i><div className="info-text"><strong>Ride Privacy</strong><p>Select a driver for PRIVATE RIDE or Skip for PUBLIC RIDE</p></div></div><div className="drivers-grid">{drivers.map(d => (<div key={d.id} className={`driver-card ${selectedDriverId === d.id ? 'selected' : ''}`} onClick={() => selectDriver(d.id)}><div className="driver-info"><div className="driver-avatar">{d.name.charAt(0)}</div><div className="driver-details"><h4>{d.name}</h4><div className="driver-rating">★★★★★ <span className="font-roboto-number">{d.rating}</span></div><div className="driver-car"><i className="fas fa-car"></i> {d.vehicle}</div></div></div><div className="driver-stats"><div><span className="stat-value font-roboto-number">{d.distance}</span><span className="stat-label">km</span></div><div><span className="stat-value font-roboto-number">{d.rating}</span><span className="stat-label">rating</span></div><div><span className="stat-value font-roboto-number">{d.rides}+</span><span className="stat-label">rides</span></div></div></div>))}</div><button className="skip-driver-btn" onClick={skipDriverSelection}><i className="fas fa-globe"></i> Skip - Public Ride</button><div className="action-buttons"><button className="back-btn" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button><button className="next-btn" onClick={nextStep}><i className="fas fa-arrow-right"></i> Continue</button></div></div>)}
                {step === 4 && (<div className="book-ride-payment-step"><h2>Payment</h2><div className="payment-grid"><div className={`payment-card ${selectedPayment === 'wallet' ? 'selected' : ''}`} onClick={() => selectPayment('wallet')}><i className="fas fa-wallet"></i><h4>Wallet</h4><p>Balance: <span className="font-roboto-number">{formatCurrency(walletBalance)}</span></p></div><div className={`payment-card ${selectedPayment === 'card' ? 'selected' : ''}`} onClick={() => selectPayment('card')}><i className="fas fa-credit-card"></i><h4>Card</h4><p>Pay with card</p></div></div>{booking.distance > 0 && (<div className="fare-summary"><h3>Fare Summary</h3><div className="fare-item"><span>Distance</span><span className="font-roboto-number">{booking.distance.toFixed(1)} km</span></div><div className="fare-item"><span>Rate/km</span><span className="font-roboto-number">₦{booking.plan === 'economy' ? '1,000' : '1,500'}</span></div><div className="fare-item"><span>Base</span><span className="font-roboto-number">₦500</span></div><div className="fare-item total"><span>Total</span><span className="font-roboto-number">₦{booking.fare.toLocaleString()}</span></div>{booking.payment === 'wallet' && booking.fare > walletBalance && <div className="insufficient-warning">⚠️ Insufficient balance</div>}</div>)}<div className="action-buttons"><button className="back-btn" onClick={prevStep}><i className="fas fa-arrow-left"></i> Back</button><button className="book-btn" onClick={confirmBooking} disabled={!booking.payment || (booking.payment === 'wallet' && booking.fare > walletBalance)}><i className="fas fa-check"></i> Confirm & Book</button></div></div>)}
            </div>
        </div>
    );
};

export default ClientBookRide;
