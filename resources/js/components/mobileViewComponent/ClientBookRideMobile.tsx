import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import ClientNavMobile from '../../components/navbars/ClientNavMobile';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { loadGoogleMapsApi } from '../../lib/googleMaps';
import '../../../css/ClientBookRideMobileView.css';

// Types (same as before)
interface LocationData {
    address: string;
    lat: number | null;
    lng: number | null;
    placeId: string | null;
}

interface BookingData {
    pickup: LocationData;
    destination: LocationData;
    plan: string;
    driverId: string | null;
    driverSelected: boolean;
    payment: string;
    distance: number;
    fare: number;
}

interface Driver {
    id: string;
    name: string;
    rating: number;
    rides: number;
    distance: number;
    vehicle: string;
    plate: string;
    type: string;
}

interface SavedLocation {
    address: string;
    lat: number;
    lng: number;
    type: string;
    last_used: string;
}

const ClientBookRideMobile: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [notificationCount, setNotificationCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [step, setStep] = useState<number>(1);
    const [booking, setBooking] = useState<BookingData>({
        pickup: { address: '', lat: null, lng: null, placeId: null },
        destination: { address: '', lat: null, lng: null, placeId: null },
        plan: '',
        driverId: null,
        driverSelected: false,
        payment: '',
        distance: 0,
        fare: 0
    });
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
    const [mode, setMode] = useState<'pickup' | 'destination'>('pickup');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [mapLoaded, setMapLoaded] = useState<boolean>(false);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<string>('');
    const [selectedPayment, setSelectedPayment] = useState<string>('');
    const [showPickupCard, setShowPickupCard] = useState<boolean>(false);
    const [showDestCard, setShowDestCard] = useState<boolean>(false);
    const [currentLat, setCurrentLat] = useState<string>('--');
    const [currentLng, setCurrentLng] = useState<string>('--');
    const [mapInitError, setMapInitError] = useState<boolean>(false);
    const [retryCount, setRetryCount] = useState<number>(0);

    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
    const destMarkerRef = useRef<google.maps.Marker | null>(null);
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
    const searchBoxRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const mapInitRef = useRef(false);
    const actionsRef = useRef<any>({});

    // Popular locations
    const popularLocations = [
        { name: 'Lagos Airport', lat: 6.5774, lng: 3.3211, address: 'Murtala Muhammed International Airport, Lagos', icon: 'plane' },
        { name: 'Victoria Island', lat: 6.4281, lng: 3.4219, address: 'Victoria Island, Lagos, Nigeria', icon: 'building' },
        { name: 'Lekki Phase 1', lat: 6.4484, lng: 3.4719, address: 'Lekki Phase 1, Lagos, Nigeria', icon: 'map-pin' },
        { name: 'Ikeja City Mall', lat: 6.6018, lng: 3.3515, address: 'Ikeja City Mall, Lagos, Nigeria', icon: 'shopping-cart' },
        { name: 'Ajah', lat: 6.4700, lng: 3.5730, address: 'Ajah, Lagos, Nigeria', icon: 'market' },
        { name: 'Maryland Mall', lat: 6.5794, lng: 3.3622, address: 'Maryland Mall, Lagos, Nigeria', icon: 'store' }
    ];

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            const [profileResult, walletResult] = await Promise.allSettled([
                api.client.profile(),
                api.client.wallet()
            ]);

            if (profileResult.status === 'fulfilled') {
                const profileData = profileResult.value;
                if (profileData.success || profileData.data) {
                    setUserData(profileData.data);
                }
            }

            if (walletResult.status === 'fulfilled') {
                const walletData = walletResult.value;
                if (walletData.success) {
                    setWalletBalance(parseFloat(walletData.data.balance) || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch saved locations
    const fetchSavedLocations = useCallback(async () => {
        try {
            const data = await api.client.locations();
            if (data.success && data.data) {
                setSavedLocations(data.data.saved_locations || []);
            }
        } catch (error) {
            console.error('Error fetching saved locations:', error);
        }
    }, []);

    // Reverse geocode with Nominatim fallback
    const reverseGeocode = async (lat: number, lng: number): Promise<{ address: string; placeId: string }> => {
        if (!window.google) {
            return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, placeId: '' };
        }
        
        try {
            const result = await new Promise<{ address: string; placeId: string } | null>((resolve) => {
                const geocoder = new google.maps.Geocoder();
                geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === 'OK' && results && results[0]) {
                        resolve({ address: results[0].formatted_address, placeId: results[0].place_id || '' });
                    } else {
                        resolve(null);
                    }
                });
            });
            if (result) return result;
        } catch {}

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`, {
                headers: { 'User-Agent': 'SpeedlyApp/1.0' }
            });
            const data = await res.json();
            if (data && data.display_name) {
                return { address: data.display_name, placeId: '' };
            }
        } catch {}

        return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, placeId: '' };
    };

    // Handle map click
    const handleMapClick = useCallback(async (lat: number, lng: number) => {
        const { address, placeId } = await reverseGeocode(lat, lng);
        if (mode === 'pickup') {
            updatePickupLocation(lat, lng, address, placeId);
        } else {
            updateDestinationLocation(lat, lng, address, placeId);
        }
    }, [mode]);

    // Update pickup location
    const updatePickupLocation = useCallback((lat: number, lng: number, address: string, placeId: string | null) => {
        if (!window.google || !mapInstanceRef.current) return;
        
        try {
            if (pickupMarkerRef.current) {
                pickupMarkerRef.current.setMap(null);
            }

            if (lat !== 0 && lng !== 0) {
                pickupMarkerRef.current = new google.maps.Marker({
                    position: { lat, lng },
                    map: mapInstanceRef.current,
                    title: 'Pickup Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#4CAF50',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    },
                    label: { text: 'P', color: 'white', fontSize: '12px', fontWeight: 'bold' },
                    animation: google.maps.Animation.DROP
                });
            }
        } catch (err) {
            console.error('Error creating pickup marker:', err);
        }

        setBooking(prev => ({
            ...prev,
            pickup: { address, lat, lng, placeId }
        }));
        
        setShowPickupCard(true);

        // Auto-switch to destination mode after pickup is set
        if (lat !== 0 && lng !== 0 && !booking.destination.lat) {
            setMode('destination');
            Swal.fire({
                icon: 'success',
                title: 'Pickup Set!',
                text: 'Now tap on the map to set your destination',
                timer: 1500,
                showConfirmButton: false,
                position: 'top'
            });
        }
    }, [booking.destination.lat]);

    // Update destination location
    const updateDestinationLocation = useCallback((lat: number, lng: number, address: string, placeId: string | null) => {
        if (!window.google || !mapInstanceRef.current) return;
        
        try {
            if (destMarkerRef.current) {
                destMarkerRef.current.setMap(null);
            }

            if (lat !== 0 && lng !== 0) {
                destMarkerRef.current = new google.maps.Marker({
                    position: { lat, lng },
                    map: mapInstanceRef.current,
                    title: 'Destination',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: '#F44336',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    },
                    label: { text: 'D', color: 'white', fontSize: '12px', fontWeight: 'bold' },
                    animation: google.maps.Animation.DROP
                });
            }
        } catch (err) {
            console.error('Error creating destination marker:', err);
        }

        setBooking(prev => ({
            ...prev,
            destination: { address, lat, lng, placeId }
        }));
        
        setShowDestCard(true);
    }, []);

    // Draw route
    const drawRoute = useCallback(() => {
        if (!directionsRendererRef.current || !window.google) return;
        
        const originLat = booking.pickup.lat;
        const originLng = booking.pickup.lng;
        const destLat = booking.destination.lat;
        const destLng = booking.destination.lng;

        if (!originLat || !originLng || !destLat || !destLng) return;

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
            origin: { lat: originLat, lng: originLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: google.maps.TravelMode.DRIVING
        }, (result, status) => {
            if (status === 'OK' && result) {
                directionsRendererRef.current?.setDirections(result);
            }
        });
    }, [booking.pickup.lat, booking.pickup.lng, booking.destination.lat, booking.destination.lng]);

    // Calculate fare
    const calculateFare = useCallback(async () => {
        const pLat = booking.pickup.lat;
        const pLng = booking.pickup.lng;
        const dLat = booking.destination.lat;
        const dLng = booking.destination.lng;
        if (!pLat || !pLng || !dLat || !dLng) return;

        try {
            const data = await api.rides.calculateFare({
                pickup_lat: pLat,
                pickup_lng: pLng,
                dropoff_lat: dLat,
                dropoff_lng: dLng,
                ride_type: booking.plan || 'economy'
            });

            if (data.success && data.data) {
                setBooking(prev => ({
                    ...prev,
                    distance: data.data.distance_km || 0,
                    fare: data.data.estimated_fare || 0
                }));
            }
        } catch (error) {
            console.error('Error calculating fare:', error);
        }
    }, [booking.pickup.lat, booking.pickup.lng, booking.destination.lat, booking.destination.lng, booking.plan]);

    // Find nearby drivers
    const findNearbyDrivers = useCallback(async (lat: number, lng: number, rideType: string) => {
        try {
            const data = await api.driver.nearbyDrivers({ lat, lng, radius_km: 10 });
            
            if (data.success && data.data) {
                const rawList = Array.isArray(data.data) ? data.data : [];
                setDrivers(rawList.map((d: any) => ({
                    id: d.id,
                    name: d.user?.full_name || 'Unknown',
                    rating: d.average_rating || 0,
                    rides: d.completed_rides || 0,
                    distance: d.distance ? Math.round(d.distance * 10) / 10 : 0,
                    vehicle: d.vehicle?.vehicle_type || 'Standard',
                    plate: d.vehicle?.plate_number || '',
                    type: d.vehicle?.vehicle_type || 'standard'
                })));
            }
        } catch (error) {
            console.error('Error finding drivers:', error);
        }
    }, []);

    // Update route and fare when both locations are set
    useEffect(() => {
        if (booking.pickup.lat && booking.pickup.lng && booking.destination.lat && booking.destination.lng) {
            drawRoute();
            calculateFare();
            
            // Show success message for destination
            Swal.fire({
                icon: 'success',
                title: 'Destination Set!',
                text: 'Locations confirmed. Continue to select your ride plan.',
                timer: 1500,
                showConfirmButton: false,
                position: 'top'
            });
        }
    }, [booking.pickup.lat, booking.pickup.lng, booking.destination.lat, booking.destination.lng, drawRoute, calculateFare]);

    // Clear location
    const clearLocation = useCallback((type: 'pickup' | 'destination') => {
        if (type === 'pickup') {
            if (pickupMarkerRef.current) {
                pickupMarkerRef.current.setMap(null);
                pickupMarkerRef.current = null;
            }
            setBooking(prev => ({
                ...prev,
                pickup: { address: '', lat: null, lng: null, placeId: null }
            }));
            setShowPickupCard(false);
            setMode('pickup');
        } else {
            if (destMarkerRef.current) {
                destMarkerRef.current.setMap(null);
                destMarkerRef.current = null;
            }
            setBooking(prev => ({
                ...prev,
                destination: { address: '', lat: null, lng: null, placeId: null }
            }));
            setShowDestCard(false);
        }
    }, []);

    // Confirm location
    const confirmLocation = useCallback((type: 'pickup' | 'destination') => {
        if (type === 'pickup') {
            Swal.fire({
                icon: 'success',
                title: 'Pickup Confirmed!',
                text: booking.pickup.address.substring(0, 50),
                timer: 1500,
                showConfirmButton: false,
                position: 'top'
            });
            setMode('destination');
        } else {
            Swal.fire({
                icon: 'success',
                title: 'Destination Confirmed!',
                text: booking.destination.address.substring(0, 50),
                timer: 1500,
                showConfirmButton: false,
                position: 'top'
            });
        }
    }, [booking.pickup.address, booking.destination.address]);

    // Start watching position
    const startWatchingPosition = useCallback(() => {
        if (!navigator.geolocation) return;

        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setUserLocation(location);
                
                if (mapInstanceRef.current && !booking.pickup.lat) {
                    mapInstanceRef.current.setCenter(location);
                    mapInstanceRef.current.setZoom(14);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    }, [booking.pickup.lat]);

    // Center on user location
    const centerOnUser = useCallback(() => {
        if (userLocation && mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(userLocation);
            mapInstanceRef.current.setZoom(16);
        } else if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setUserLocation(location);
                    mapInstanceRef.current?.setCenter(location);
                    mapInstanceRef.current?.setZoom(16);
                },
                () => {
                    Swal.fire({ icon: 'error', title: 'Location Access Denied', text: 'Please enable location services', confirmButtonColor: '#ff5e00' });
                }
            );
        }
    }, [userLocation]);

    // Initialize map - FIXED VERSION
    const initMap = useCallback(() => {
        // Critical check: ensure map container exists and Google Maps is loaded
        if (!mapRef.current) {
            console.warn('Map container not ready');
            return false;
        }
        
        if (!window.google || !window.google.maps) {
            console.warn('Google Maps not loaded yet');
            return false;
        }
        
        if (mapInitRef.current) {
            console.log('Map already initialized');
            return true;
        }

        try {
            const defaultCenter = { lat: 6.5244, lng: 3.3792 };
            
            mapInstanceRef.current = new google.maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: 13,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true
            });

            // Add click listener
            mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
                if (e.latLng) {
                    handleMapClick(e.latLng.lat(), e.latLng.lng());
                }
            });

            // Update coordinates on map move
            mapInstanceRef.current.addListener('center_changed', () => {
                const center = mapInstanceRef.current?.getCenter();
                if (center) {
                    setCurrentLat(center.lat().toFixed(6));
                    setCurrentLng(center.lng().toFixed(6));
                }
            });

            // Setup search box
            if (searchBoxRef.current) {
                autocompleteRef.current = new google.maps.places.Autocomplete(searchBoxRef.current, {
                    componentRestrictions: { country: 'ng' },
                    fields: ['place_id', 'geometry', 'formatted_address', 'name']
                });
                
                autocompleteRef.current.addListener('place_changed', () => {
                    const place = autocompleteRef.current?.getPlace();
                    if (place?.geometry?.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        const address = place.formatted_address || '';
                        
                        mapInstanceRef.current?.setCenter({ lat, lng });
                        mapInstanceRef.current?.setZoom(16);
                        
                        if (mode === 'pickup') {
                            updatePickupLocation(lat, lng, address, place.place_id);
                        } else {
                            updateDestinationLocation(lat, lng, address, place.place_id);
                        }
                        
                        if (searchBoxRef.current) searchBoxRef.current.value = '';
                    }
                });
            }

            // Initialize directions renderer
            directionsRendererRef.current = new google.maps.DirectionsRenderer({
                map: mapInstanceRef.current,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#ff5e00',
                    strokeWeight: 5,
                    strokeOpacity: 0.7
                }
            });

            // Start watching user location
            startWatchingPosition();
            
            mapInitRef.current = true;
            setMapLoaded(true);
            setMapInitError(false);
            
            console.log('Map initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing map:', error);
            setMapInitError(true);
            return false;
        }
    }, [handleMapClick, mode, updatePickupLocation, updateDestinationLocation, startWatchingPosition]);

    // Retry map initialization
    const retryMapInit = useCallback(() => {
        if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            mapInitRef.current = false;
            setTimeout(() => initMap(), 500);
        }
    }, [retryCount, initMap]);

    // Load Google Maps script - FIXED VERSION
    useEffect(() => {
        // Check if already loaded
        if (window.google && window.google.maps) {
            setMapLoaded(true);
            // Small delay to ensure DOM is ready
            setTimeout(() => initMap(), 100);
            return;
        }

        // Check if script is already loading
        const existingScript = document.querySelector('#google-maps-script-mobile');
        if (existingScript) {
            const checkGoogleMaps = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkGoogleMaps);
                    setMapLoaded(true);
                    setTimeout(() => initMap(), 100);
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkGoogleMaps);
                if (!window.google || !window.google.maps) {
                    console.error('Google Maps timeout');
                    setMapInitError(true);
                }
            }, 10000);
            
            return;
        }

        // Create and load script
        const script = document.createElement('script');
        script.id = 'google-maps-script-mobile';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initMapMobile&loading=async`;
        script.async = true;
        script.defer = true;
        
        window.initMapMobile = () => {
            console.log('Google Maps callback fired');
            setMapLoaded(true);
            // Small delay to ensure DOM is fully ready
            setTimeout(() => initMap(), 200);
            delete window.initMapMobile;
        };
        
        script.onerror = () => {
            console.error('Failed to load Google Maps script');
            setMapInitError(true);
        };
        
        document.head.appendChild(script);
        
        return () => {
            // Cleanup
            if (window.initMapMobile) {
                delete window.initMapMobile;
            }
        };
    }, [initMap]);

    // Watch for map container availability
    useEffect(() => {
        if (!loading && mapRef.current && !mapInitRef.current && mapLoaded && !mapInitError) {
            const timer = setTimeout(() => {
                initMap();
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [loading, mapLoaded, mapInitError, initMap]);

    // Use saved location
    const useSavedLocation = useCallback((location: SavedLocation) => {
        const lat = location.lat;
        const lng = location.lng;
        const address = location.address;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            mapInstanceRef.current.setZoom(16);
        }

        if (mode === 'pickup') {
            updatePickupLocation(lat, lng, address, null);
        } else {
            updateDestinationLocation(lat, lng, address, null);
        }
    }, [mode, updatePickupLocation, updateDestinationLocation]);

    // Use popular location
    const usePopularLocation = useCallback((location: typeof popularLocations[0]) => {
        const lat = location.lat;
        const lng = location.lng;
        const address = location.address;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat, lng });
            mapInstanceRef.current.setZoom(16);
        }

        if (mode === 'pickup') {
            updatePickupLocation(lat, lng, address, null);
        } else {
            updateDestinationLocation(lat, lng, address, null);
        }
    }, [mode, updatePickupLocation, updateDestinationLocation]);

    // Select plan
    const selectPlan = useCallback((plan: string) => {
        setSelectedPlan(plan);
        setBooking(prev => ({ ...prev, plan }));
    }, []);

    // Select driver
    const selectDriver = useCallback((driverId: string) => {
        setSelectedDriverId(driverId);
        setBooking(prev => ({ ...prev, driverId, driverSelected: true }));
        
        Swal.fire({
            icon: 'info',
            title: 'Private Ride',
            text: 'This driver will be privately notified of your ride.',
            timer: 3000,
            showConfirmButton: false,
            position: 'top',
            toast: true
        });
    }, []);

    // Skip driver selection
    const skipDriverSelection = useCallback(() => {
        setSelectedDriverId(null);
        setBooking(prev => ({ ...prev, driverId: null, driverSelected: false }));
        
        Swal.fire({
            icon: 'info',
            title: 'Public Ride',
            text: 'Your ride will be visible to all nearby drivers.',
            timer: 3000,
            showConfirmButton: false,
            position: 'top',
            toast: true
        });
    }, []);

    // Select payment
    const selectPayment = useCallback((payment: string) => {
        setSelectedPayment(payment);
        setBooking(prev => ({ ...prev, payment }));
    }, []);

    // Check balance sufficiency
    const isBalanceSufficient = useCallback((): boolean => {
        if (booking.payment === 'card') return true;
        return walletBalance >= booking.fare;
    }, [booking.payment, booking.fare, walletBalance]);

    // Next step
    const nextStep = useCallback(() => {
        if (step === 1 && (!booking.pickup.lat || !booking.destination.lat)) {
            Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Please select both pickup and destination', confirmButtonColor: '#ff5e00' });
            return;
        }
        if (step === 2 && !booking.plan) {
            Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'Please select a ride plan', confirmButtonColor: '#ff5e00' });
            return;
        }
        
        if (step < 4) {
            const next = step + 1;
            setStep(next);
            if (next === 3 && booking.pickup.lat && booking.pickup.lng) {
                findNearbyDrivers(booking.pickup.lat, booking.pickup.lng, booking.plan || 'economy');
            }
        }
    }, [step, booking, findNearbyDrivers]);

    // Previous step
    const prevStep = useCallback(() => {
        if (step > 1) {
            setStep(step - 1);
        }
    }, [step]);

    // Process booking
    const processBooking = useCallback(async () => {
        Swal.fire({ title: 'Booking your ride...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const formData = new FormData();
        formData.append('pickup_address', booking.pickup.address);
        formData.append('pickup_lat', booking.pickup.lat?.toString() || '');
        formData.append('pickup_lng', booking.pickup.lng?.toString() || '');
        formData.append('pickup_place_id', booking.pickup.placeId || '');
        formData.append('dest_address', booking.destination.address);
        formData.append('dest_lat', booking.destination.lat?.toString() || '');
        formData.append('dest_lng', booking.destination.lng?.toString() || '');
        formData.append('dest_place_id', booking.destination.placeId || '');
        formData.append('distance', booking.distance.toString());
        formData.append('fare', booking.fare.toString());
        formData.append('driver_id', booking.driverId || '');
        formData.append('ride_type', booking.plan);
        formData.append('payment_method', booking.payment);

        try {
            const data = await api.rides.book({
                pickup_location: booking.pickup.address,
                dropoff_location: booking.destination.address,
                pickup_lat: booking.pickup.lat || 0,
                pickup_lng: booking.pickup.lng || 0,
                dropoff_lat: booking.destination.lat || 0,
                dropoff_lng: booking.destination.lng || 0,
                ride_type: booking.plan,
                notes: booking.driverId ? `Driver ID: ${booking.driverId}` : undefined
            });
            Swal.close();

            if (data.success) {
                const rideData = data.data;
                const message = data.driver_assigned 
                    ? 'Your selected driver has been notified and will respond shortly.'
                    : 'Nearby drivers have been notified and will respond shortly.';
                
                Swal.fire({
                    icon: 'success',
                    title: 'Ride Booked!',
                    html: `<div><p><strong>Ride #${rideData?.ride_number || ''}</strong></p><p>${message}</p><p>Wallet Balance: ₦${walletBalance.toLocaleString()}</p></div>`,
                    confirmButtonColor: '#ff5e00'
                }).then(() => {
                    router.visit('/clientridehistory');
                });
            } else if (data.insufficient_balance) {
                Swal.fire({
                    icon: 'error',
                    title: 'Insufficient Balance',
                    html: `<p>Current Balance: ₦${data.current_balance.toLocaleString()}</p><p>Required: ₦${data.required_amount.toLocaleString()}</p><p>Shortage: ₦${data.shortage.toLocaleString()}</p>`,
                    showCancelButton: true,
                    confirmButtonText: 'Add Funds',
                    confirmButtonColor: '#ff5e00'
                }).then((result) => {
                    if (result.isConfirmed) router.visit('/clientwallet');
                });
            } else {
                Swal.fire({ icon: 'error', title: 'Booking Failed', text: data.message, confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to book ride', confirmButtonColor: '#ff5e00' });
        }
    }, [booking, walletBalance]);

    // Confirm booking
    const confirmBooking = useCallback(async () => {
        if (!booking.pickup.address || !booking.destination.address || !booking.plan || !booking.payment) {
            Swal.fire({ icon: 'error', title: 'Incomplete Booking', text: 'Please complete all steps', confirmButtonColor: '#ff5e00' });
            return;
        }

        if (booking.payment === 'wallet' && booking.fare > walletBalance) {
            Swal.fire({
                icon: 'error',
                title: 'Insufficient Balance',
                html: `Your wallet balance (₦${walletBalance.toLocaleString()}) is insufficient.<br>Required: ₦${booking.fare.toLocaleString()}`,
                showCancelButton: true,
                confirmButtonText: 'Add Funds',
                confirmButtonColor: '#ff5e00'
            }).then((result) => {
                if (result.isConfirmed) router.visit('/clientwallet');
            });
            return;
        }

        const message = booking.driverId 
            ? 'This will be a PRIVATE ride sent only to the selected driver. Continue?'
            : 'This will be a PUBLIC ride visible to all nearby drivers. Continue?';

        const result = await Swal.fire({
            title: 'Confirm Booking',
            text: message,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#ff5e00',
            confirmButtonText: 'Yes, Book Now',
            cancelButtonText: 'Cancel'
        });

        if (result.isConfirmed) {
            processBooking();
        }
    }, [booking, walletBalance, processBooking]);

    // Handle next button click (for step 4 it books)
    const handleNextAction = useCallback(() => {
        if (step === 4) {
            confirmBooking();
        } else {
            nextStep();
        }
    }, [step, confirmBooking, nextStep]);

    // Check notifications
    const checkNotifications = useCallback(async () => {
        try {
            const data = await api.notifications.list();
            const notifs = data.data?.data || [];
            
            if (notifs.length > 0) {
                let html = '<div style="text-align: left; max-height: 400px; overflow-y: auto;">';
                notifs.forEach((notif: any) => {
                    html += `<div style="padding: 10px; border-bottom: 1px solid #eee;"><p><strong>${notif.title}</strong></p><p>${notif.message}</p><p style="font-size: 12px; color: #999;">${new Date(notif.created_at).toLocaleString()}</p></div>`;
                });
                html += '</div>';
                
                const result = await Swal.fire({
                    icon: 'info',
                    title: `Notifications (${notifs.length})`,
                    html: html,
                    confirmButtonColor: '#ff5e00',
                    confirmButtonText: 'Close',
                    showDenyButton: true,
                    denyButtonText: 'Clear All'
                });
                
                if (result.isDenied) {
                    await api.notifications.clearAll();
                    setNotificationCount(0);
                }
            } else {
                Swal.fire({ icon: 'info', title: 'Notifications', text: 'No new notifications', confirmButtonColor: '#ff5e00' });
            }
        } catch (error) {
            Swal.fire({ icon: 'info', title: 'Notifications', text: 'No new notifications', confirmButtonColor: '#ff5e00' });
        }
    }, []);

    // Fetch drivers when entering step 3
    useEffect(() => {
        if (step === 3 && booking.pickup.lat && booking.pickup.lng) {
            findNearbyDrivers(booking.pickup.lat, booking.pickup.lng, booking.plan || 'economy');
        }
    }, [step, booking.pickup.lat, booking.pickup.lng, booking.plan, findNearbyDrivers]);

    // Initial data fetch
    useEffect(() => {
        fetchData();
        fetchSavedLocations();
    }, [fetchData, fetchSavedLocations]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;
    const getButtonText = () => {
        if (step === 1) return 'Next: Choose Ride Plan';
        if (step === 2) return 'Next: Select Driver';
        if (step === 3) return 'Next: Payment';
        return 'Confirm & Book Ride';
    };

    const getButtonIcon = () => {
        if (step === 1) return 'fas fa-arrow-right';
        if (step === 2) return 'fas fa-arrow-right';
        if (step === 3) return 'fas fa-arrow-right';
        return 'fas fa-check';
    };

    const isNextDisabled = () => {
        if (step === 1) return !(booking.pickup.lat && booking.destination.lat);
        if (step === 2) return !booking.plan;
        if (step === 3) return false;
        return !booking.payment || (booking.payment === 'wallet' && booking.fare > walletBalance);
    };

    const tierColor = userData?.membership_tier === 'premium' ? '#ff5e00' : userData?.membership_tier === 'gold' ? '#ffd700' : '#6c757d';

    return (
        <div className="mobile-book-ride-container">
            {/* Loading overlay */}
            {loading && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(255,255,255,0.9)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 12
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        border: '4px solid #f3f3f3',
                        borderTop: '4px solid #ff5e00',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                    <p style={{ color: '#ff5e00', fontWeight: 600 }}>Loading...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
            
            {/* Main content - always rendered but hidden during loading */}
            <div className="mobile-book-ride-view" style={{ display: loading ? 'none' : 'block' }}>
                {/* Header */}
                <div className="mobile-book-ride-header">
                    <div className="mobile-book-ride-user-info">
                        <h1>Book a Ride</h1>
                        <div className="mobile-flex mobile-items-center mobile-gap-2 mobile-mt-1">
                            <span className="mobile-tier-badge" style={{ backgroundColor: tierColor }}>
                                {userData?.membership_tier ? userData.membership_tier.charAt(0).toUpperCase() + userData.membership_tier.slice(1) : 'Basic'} Member
                            </span>
                            <p className="mobile-wallet-balance">Wallet: {formatCurrency(walletBalance)}</p>
                        </div>
                    </div>
                    <button className="mobile-book-ride-notification-btn" onClick={checkNotifications}>
                        <i className="fas fa-bell"></i>
                        {notificationCount > 0 && <span className="mobile-notification-badge">{notificationCount}</span>}
                    </button>
                </div>

                {/* Map Error Retry */}
                {mapInitError && (
                    <div className="mobile-map-error" style={{
                        background: '#fff3e0',
                        padding: '12px',
                        borderRadius: '8px',
                        margin: '10px 15px',
                        textAlign: 'center',
                        border: '1px solid #ff5e00'
                    }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: '#ff5e00', marginRight: '8px' }}></i>
                        <span>Map loading issue. </span>
                        <button 
                            onClick={retryMapInit}
                            style={{
                                background: '#ff5e00',
                                color: 'white',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '4px',
                                marginLeft: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Steps */}
                <div className="mobile-booking-steps">
                    <div className={`mobile-step ${step === 1 ? 'active' : ''}`}>
                        <div className="mobile-step-number">1</div>
                        <h3>Location</h3>
                    </div>
                    <div className={`mobile-step ${step === 2 ? 'active' : ''}`}>
                        <div className="mobile-step-number">2</div>
                        <h3>Plan</h3>
                    </div>
                    <div className={`mobile-step ${step === 3 ? 'active' : ''}`}>
                        <div className="mobile-step-number">3</div>
                        <h3>Driver</h3>
                    </div>
                    <div className={`mobile-step ${step === 4 ? 'active' : ''}`}>
                        <div className="mobile-step-number">4</div>
                        <h3>Payment</h3>
                    </div>
                </div>

                {/* Step 1: Location Selection */}
                {step === 1 && (
                    <div className="mobile-booking-step-content">
                        <h2 className="mobile-section-title">
                            <i className="fas fa-map-marker-alt"></i> Tap on Map to Select Locations
                        </h2>
                        <p className="mobile-section-subtitle">
                            <span className="pickup-mode-text">● Pickup mode</span> / 
                            <span className="dest-mode-text"> ● Destination mode</span>
                        </p>

                        {/* Map Container - Ensure it has dimensions */}
                        <div className="mobile-map-picker-container">
                            <div 
                                ref={mapRef} 
                                className="mobile-map" 
                                style={{ minHeight: '300px', height: '400px', width: '100%' }}
                            ></div>

                            {/* Map Controls */}
                            <div className="mobile-map-overlay">
                                <div className="mobile-mode-selector">
                                    <button className={`mobile-mode-btn pickup ${mode === 'pickup' ? 'active' : ''}`} onClick={() => setMode('pickup')}>
                                        <i className="fas fa-circle"></i> Pickup
                                    </button>
                                    <button className={`mobile-mode-btn destination ${mode === 'destination' ? 'active' : ''}`} onClick={() => setMode('destination')}>
                                        <i className="fas fa-map-marker-alt"></i> Destination
                                    </button>
                                </div>
                                <div className="mobile-search-box">
                                    <i className="fas fa-search"></i>
                                    <input type="text" ref={searchBoxRef} placeholder="Search for a location..." />
                                </div>
                            </div>

                            {/* Center Button */}
                            <button className="mobile-center-location-btn" onClick={centerOnUser}>
                                <i className="fas fa-crosshairs"></i>
                            </button>

                            {/* Location Cards */}
                            {showPickupCard && (
                                <div className="mobile-location-card pickup-card">
                                    <div className="mobile-location-card-label">
                                        <i className="fas fa-circle"></i> PICKUP LOCATION
                                    </div>
                                    <div className="mobile-location-card-address">{booking.pickup.address}</div>
                                    <div className="mobile-location-card-actions">
                                        <button className="clear-btn" onClick={() => clearLocation('pickup')}>Clear</button>
                                        <button className="confirm-btn" onClick={() => confirmLocation('pickup')}>Confirm</button>
                                    </div>
                                </div>
                            )}

                            {showDestCard && (
                                <div className="mobile-location-card dest-card">
                                    <div className="mobile-location-card-label">
                                        <i className="fas fa-map-marker-alt"></i> DESTINATION
                                    </div>
                                    <div className="mobile-location-card-address">{booking.destination.address}</div>
                                    <div className="mobile-location-card-actions">
                                        <button className="clear-btn" onClick={() => clearLocation('destination')}>Clear</button>
                                        <button className="confirm-btn" onClick={() => confirmLocation('destination')}>Confirm</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Saved Locations */}
                        {savedLocations.length > 0 && (
                            <div className="mobile-saved-locations">
                                <h3>Your Saved Locations</h3>
                                <div className="mobile-saved-locations-grid">
                                    {savedLocations.map((loc, idx) => (
                                        <div key={idx} className="mobile-saved-location-chip" onClick={() => useSavedLocation(loc)}>
                                            <i className="fas fa-map-pin"></i>
                                            <div className="name">{loc.address.substring(0, 20)}</div>
                                            <div className="address">{loc.address.substring(0, 20)}...</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular Locations */}
                        <div className="mobile-popular-locations">
                            <h3>Popular Locations</h3>
                            <div className="mobile-popular-locations-grid">
                                {popularLocations.map(loc => (
                                    <div key={loc.name} className="mobile-popular-location-chip" onClick={() => usePopularLocation(loc)}>
                                        <i className={`fas fa-${loc.icon}`}></i>
                                        <div className="name">{loc.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Select Plan */}
                {step === 2 && (
                    <div className="mobile-booking-step-content">
                        <h2 className="mobile-section-title">
                            <i className="fas fa-car"></i> Choose Your Ride
                        </h2>
                        <p className="mobile-section-subtitle">Select the perfect ride for your journey</p>

                        <div className="mobile-ride-plans">
                            <div className={`mobile-plan-card ${selectedPlan === 'economy' ? 'selected' : ''}`} onClick={() => selectPlan('economy')}>
                                <div className="mobile-plan-header">
                                    <div className="mobile-plan-icon"><i className="fas fa-car"></i></div>
                                    <div>
                                        <div className="mobile-plan-title">Economy</div>
                                        <div className="mobile-plan-price">₦1,000 per km</div>
                                    </div>
                                </div>
                                <ul className="mobile-plan-features">
                                    <li><i className="fas fa-check"></i> Affordable rates</li>
                                    <li><i className="fas fa-check"></i> 4 Seater cars</li>
                                    <li><i className="fas fa-check"></i> Standard comfort</li>
                                    <li><i className="fas fa-check"></i> Air conditioned</li>
                                </ul>
                            </div>

                            <div className={`mobile-plan-card ${selectedPlan === 'comfort' ? 'selected' : ''}`} onClick={() => selectPlan('comfort')}>
                                <div className="mobile-plan-header">
                                    <div className="mobile-plan-icon"><i className="fas fa-car-side"></i></div>
                                    <div>
                                        <div className="mobile-plan-title">Comfort</div>
                                        <div className="mobile-plan-price">₦1,500 per km</div>
                                    </div>
                                </div>
                                <ul className="mobile-plan-features">
                                    <li><i className="fas fa-check"></i> Extra legroom</li>
                                    <li><i className="fas fa-check"></i> Professional drivers</li>
                                    <li><i className="fas fa-check"></i> Premium vehicles</li>
                                    <li><i className="fas fa-check"></i> Free water</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Select Driver */}
                {step === 3 && (
                    <div className="mobile-booking-step-content">
                        <h2 className="mobile-section-title">
                            <i className="fas fa-user-tie"></i> Available Drivers
                        </h2>
                        <p className="mobile-section-subtitle" id="driver-status-mobile">
                            {drivers.length > 0 ? `${drivers.length} drivers available nearby` : 'Select pickup and destination to see drivers'}
                        </p>

                        <div className="mobile-driver-selection-info">
                            <i className="fas fa-info-circle"></i>
                            <div className="info-text">
                                <strong>Choose a specific driver or let anyone accept</strong>
                                <p>Select a driver below for a private ride, or click "Skip" to make this ride public.</p>
                            </div>
                        </div>

                        <div className="mobile-drivers-list">
                            {drivers.length > 0 ? (
                                drivers.map(driver => (
                                    <div key={driver.id} className={`mobile-driver-card ${selectedDriverId === driver.id ? 'selected' : ''}`} onClick={() => selectDriver(driver.id)}>
                                        <div className="mobile-driver-info">
                                            <div className="mobile-driver-avatar">{driver.name.charAt(0)}</div>
                                            <div className="mobile-driver-details">
                                                <h4>{driver.name}</h4>
                                                <div className="mobile-driver-rating">
                                                    {'★'.repeat(Math.floor(driver.rating))}{'☆'.repeat(5 - Math.floor(driver.rating))}
                                                    <span>{driver.rating}</span>
                                                </div>
                                                <div className="mobile-driver-vehicle"><i className="fas fa-car"></i> {driver.vehicle}</div>
                                            </div>
                                        </div>
                                        <div className="mobile-driver-stats">
                                            <div><span className="stat-value">{driver.distance}</span><span className="stat-label">km away</span></div>
                                            <div><span className="stat-value">{driver.rating}</span><span className="stat-label">rating</span></div>
                                            <div><span className="stat-value">{driver.rides}+</span><span className="stat-label">rides</span></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="mobile-no-drivers">
                                    <i className="fas fa-car-side"></i>
                                    <p>No drivers available</p>
                                    <p className="subtext">Please select pickup and destination first</p>
                                </div>
                            )}
                        </div>

                        <button className="mobile-skip-driver-btn" onClick={skipDriverSelection}>
                            <i className="fas fa-globe"></i> Skip - Make Ride Public (Any Driver Can Accept)
                        </button>
                    </div>
                )}

                {/* Step 4: Payment */}
                {step === 4 && (
                    <div className="mobile-booking-step-content">
                        <h2 className="mobile-section-title">
                            <i className="fas fa-credit-card"></i> Payment Method
                        </h2>
                        <p className="mobile-section-subtitle">Select your preferred payment method</p>

                        <div className="mobile-payment-options">
                            <div className={`mobile-payment-option ${selectedPayment === 'wallet' ? 'selected' : ''}`} onClick={() => selectPayment('wallet')}>
                                <i className="fas fa-wallet"></i>
                                <h4>Speedly Wallet</h4>
                                <p>Balance: {formatCurrency(walletBalance)}</p>
                            </div>
                            <div className={`mobile-payment-option ${selectedPayment === 'card' ? 'selected' : ''}`} onClick={() => selectPayment('card')}>
                                <i className="fas fa-credit-card"></i>
                                <h4>Card</h4>
                                <p>Pay with card</p>
                            </div>
                        </div>

                        {booking.distance > 0 && (
                            <div className="mobile-fare-summary">
                                <h3>Fare Summary</h3>
                                <div className="mobile-fare-item"><span>Distance</span><span>{booking.distance.toFixed(1)} km</span></div>
                                <div className="mobile-fare-item"><span>Rate per km</span><span>₦{booking.plan === 'economy' ? '1,000' : '1,500'}</span></div>
                                <div className="mobile-fare-item"><span>Base fare</span><span>₦500</span></div>
                                <div className="mobile-fare-item total"><span>Total Amount</span><span>₦{booking.fare.toLocaleString()}</span></div>
                                {selectedPayment === 'wallet' && booking.fare > walletBalance && (
                                    <div className="mobile-insufficient-warning">⚠️ Insufficient balance. Please add funds.</div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mobile-action-buttons">
                    {step > 1 && (
                        <button className="mobile-back-btn" onClick={prevStep}>
                            <i className="fas fa-arrow-left"></i> Back
                        </button>
                    )}
                    <button 
                        className="mobile-next-btn" 
                        onClick={handleNextAction}
                        disabled={isNextDisabled()}
                    >
                        <i className={getButtonIcon()}></i>
                        <span>{getButtonText()}</span>
                    </button>
                </div>

                {/* Bottom Navigation */}
                <ClientNavMobile />
            </div>
        </div>
    );
};

export default ClientBookRideMobile;