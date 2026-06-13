import React, { useState, useEffect, useCallback, useRef } from 'react';
import ClientNavMobile from '../../components/navbars/DriverNavMobile';
import Swal from 'sweetalert2';
import { loadGoogleMapsApi } from '../../lib/googleMaps';
import '../../../css/ClientLocationMobile.css';

// Types
interface LocationCoords {
    lat: number;
    lng: number;
    accuracy: number;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
}

interface AddressComponents {
    street: string;
    area: string;
    city: string;
    state: string;
    country: string;
    formatted: string;
}

interface PlaceResult {
    id: string;
    name: string;
    vicinity: string;
    location: { lat: number; lng: number };
}

const DriverLocationMobile: React.FC = () => {
    // State
    const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
    const [address, setAddress] = useState<AddressComponents>({
        street: 'Waiting for GPS...',
        area: '',
        city: '',
        state: '',
        country: '',
        formatted: 'Click "Enable Location" to see your exact position'
    });
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [gpsStatus, setGpsStatus] = useState<string>('WAITING FOR GPS');
    const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
    const [showPlaces, setShowPlaces] = useState<boolean>(false);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState<boolean>(false);
    const [isTracking, setIsTracking] = useState<boolean>(false);

    const watchIdRef = useRef<number | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const directionArrowRef = useRef<HTMLDivElement>(null);
    const mapInitRef = useRef(false);

    // Reactive state for location stats
    const [locationStats, setLocationStats] = useState({
        latitude: '--',
        longitude: '--',
        accuracy: '--',
        speed: '0',
        heading: '--',
        altitude: '--',
    });

    // initMap MUST be defined before the useEffects that list it as a dependency.
    // It was missing entirely from this file — every reference below was a
    // ReferenceError that crashed the component on mount, producing a blank page.
    const initMap = useCallback(() => {
        if (!mapRef.current || !window.google || mapInitRef.current) return;
        mapInitRef.current = true;

        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: 6.2109, lng: 6.7985 },
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
        });

        infoWindowRef.current = new google.maps.InfoWindow();
        placesServiceRef.current = new google.maps.places.PlacesService(mapInstanceRef.current);
    }, []);

    // Load Google Maps shared instance
    useEffect(() => {
        loadGoogleMapsApi().then(() => initMap()).catch(e => console.error('Maps:', e));
    }, [initMap]);

    // Init map after mount (fallback for when the API is already loaded)
    useEffect(() => {
        const timer = setTimeout(() => {
            initMap();
        }, 500);
        return () => clearTimeout(timer);
    }, [initMap]);

    // Check geolocation permission
    const checkGeolocationPermission = () => {
        if (!navigator.permissions) {
            return;
        }

        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'granted') {
                setHasPermission(true);
                setShowPermissionPrompt(false);
                startGPSTracking();
            } else if (result.state === 'prompt') {
                setShowPermissionPrompt(true);
            } else if (result.state === 'denied') {
                setHasPermission(false);
                setGpsStatus('GPS ACCESS DENIED');
                setShowPermissionPrompt(true);
            }

            result.addEventListener('change', () => {
                if (result.state === 'granted') {
                    setHasPermission(true);
                    setShowPermissionPrompt(false);
                    startGPSTracking();
                }
            });
        });
    };

    // Request location permission
    const requestLocationPermission = () => {
        setShowPermissionPrompt(false);
        setGpsStatus('REQUESTING GPS ACCESS...');
        setIsTracking(true);
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setHasPermission(true);
                setShowPermissionPrompt(false);
                startGPSTracking();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Location Enabled',
                    text: 'GPS tracking activated successfully',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            (error) => {
                console.error('GPS permission denied:', error.message);
                setHasPermission(false);
                setGpsStatus('GPS ACCESS DENIED');
                setShowPermissionPrompt(true);
                setIsTracking(false);
                
                Swal.fire({
                    icon: 'warning',
                    title: 'Location Required',
                    text: 'Please enable location to see your position on map',
                    confirmButtonColor: '#ff5e00'
                });
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
    };

    // Start GPS tracking
    const startGPSTracking = () => {
        if (!navigator.geolocation) return;

        setGpsStatus('GPS ACTIVE - TRACKING');
        setIsTracking(true);
        updateMobileGPSStatus('active');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading
                };
                updateLocation(coords);
                reverseGeocode(coords.lat, coords.lng);
                startWatchingPosition();
            },
            (error) => {
                console.error('GPS Error:', error.message);
                setGpsStatus('GPS ERROR');
                updateMobileGPSStatus('error');
                setIsTracking(false);
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
        );
    };

    // Stop GPS tracking
    const stopGPSTracking = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setIsTracking(false);
        setGpsStatus('GPS STOPPED');
        updateMobileGPSStatus('stopped');
        
        Swal.fire({
            icon: 'info',
            title: 'GPS Stopped',
            text: 'Location tracking has been stopped',
            timer: 1500,
            showConfirmButton: false
        });
    };

    // Start watching position
    const startWatchingPosition = () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading
                };
                updateLocation(coords);
                updateMapMarker(coords);
                reverseGeocode(coords.lat, coords.lng);
                updateDirectionArrow(coords.heading);
            },
            (error) => {
                console.log('Watch error:', error.message);
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
    };

    // Update location
    const updateLocation = (coords: LocationCoords) => {
        setUserLocation(coords);

        setLocationStats({
            latitude: coords.lat.toFixed(6),
            longitude: coords.lng.toFixed(6),
            accuracy: coords.accuracy.toFixed(0),
            speed: ((coords.speed || 0) * 3.6).toFixed(1),
            heading: (coords.heading ?? 0).toFixed(0),
            altitude: (coords.altitude ?? 0).toFixed(0),
        });

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: coords.lat, lng: coords.lng });
            mapInstanceRef.current.setZoom(18);
        }
    };

    // Update map marker
    const updateMapMarker = (coords: LocationCoords) => {
        if (!mapInstanceRef.current) return;

        const position = { lat: coords.lat, lng: coords.lng };

        if (markerRef.current) {
            markerRef.current.setPosition(position);
        } else {
            markerRef.current = new google.maps.Marker({
                position: position,
                map: mapInstanceRef.current,
                title: 'You are here',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#ff5e00',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2
                },
                animation: google.maps.Animation.DROP
            });
        }
    };

    // Update direction arrow
    const updateDirectionArrow = (heading: number | null) => {
        if (directionArrowRef.current && heading) {
            directionArrowRef.current.style.transform = `rotate(${heading}deg)`;
        }
    };

    // Reverse geocode
    const reverseGeocode = (lat: number, lng: number) => {
        const geocoder = new google.maps.Geocoder();

        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const components = results[0].address_components;
                let street = '', area = '', city = '', state = '', country = '';

                for (const component of components) {
                    if (component.types.includes('route')) street = component.long_name;
                    if (component.types.includes('sublocality') || component.types.includes('neighborhood')) area = component.long_name;
                    if (component.types.includes('locality')) city = component.long_name;
                    if (component.types.includes('administrative_area_level_1')) state = component.long_name;
                    if (component.types.includes('country')) country = component.long_name;
                }

                setAddress({
                    street: street || 'Unknown Street',
                    area,
                    city,
                    state: state || 'Anambra',
                    country: country || 'Nigeria',
                    formatted: results[0].formatted_address
                });
            }
        });
    };

    // Find nearby places
    const togglePlaces = () => {
        if (!userLocation || !placesServiceRef.current) {
            Swal.fire({ icon: 'warning', title: 'Location Required', text: 'Please enable GPS first', confirmButtonColor: '#ff5e00' });
            return;
        }

        if (showPlaces) {
            setShowPlaces(false);
            return;
        }

        const request: google.maps.places.NearbySearchRequest = {
            location: { lat: userLocation.lat, lng: userLocation.lng },
            radius: 1000,
            type: 'restaurant'
        };

        placesServiceRef.current.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const places: PlaceResult[] = results.slice(0, 10).map(place => ({
                    id: place.place_id || Math.random().toString(),
                    name: place.name || 'Unknown',
                    vicinity: place.vicinity || '',
                    location: { lat: place.geometry!.location!.lat(), lng: place.geometry!.location!.lng() }
                }));
                setNearbyPlaces(places);
                setShowPlaces(true);
            } else {
                Swal.fire({ icon: 'info', title: 'No Places Found', text: 'No nearby places found', confirmButtonColor: '#ff5e00' });
            }
        });
    };

    // Find nearby churches
    const findNearbyChurches = () => {
        if (!userLocation || !placesServiceRef.current) {
            Swal.fire({ icon: 'warning', title: 'Location Required', text: 'Please enable GPS first', confirmButtonColor: '#ff5e00' });
            return;
        }

        const request: google.maps.places.NearbySearchRequest = {
            location: { lat: userLocation.lat, lng: userLocation.lng },
            radius: 2000,
            keyword: 'church'
        };

        placesServiceRef.current.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const places: PlaceResult[] = results.slice(0, 10).map(place => ({
                    id: place.place_id || Math.random().toString(),
                    name: place.name || 'Unknown',
                    vicinity: place.vicinity || '',
                    location: { lat: place.geometry!.location!.lat(), lng: place.geometry!.location!.lng() }
                }));
                setNearbyPlaces(places);
                setShowPlaces(true);
            } else {
                Swal.fire({ icon: 'info', title: 'No Churches Found', text: 'No nearby churches found', confirmButtonColor: '#ff5e00' });
            }
        });
    };

    // Center on user
    const centerOnUser = () => {
        if (userLocation && mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
            mapInstanceRef.current.setZoom(18);
        } else {
            requestLocationPermission();
        }
    };

    // Go to place
    const goToPlace = (place: PlaceResult) => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(place.location);
            mapInstanceRef.current.setZoom(18);
            setShowPlaces(false);
        }
    };

    // Update mobile GPS status
    const updateMobileGPSStatus = (status: 'active' | 'denied' | 'error' | 'stopped') => {
        if (status === 'active') {
            setGpsStatus('🟢 GPS ACTIVE - TRACKING');
        } else if (status === 'denied') {
            setGpsStatus('❌ GPS ACCESS DENIED');
        } else if (status === 'stopped') {
            setGpsStatus('⏸️ GPS STOPPED');
        } else {
            setGpsStatus('⚠️ GPS ERROR');
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, []);

    return (
        <>
            {/* Force full width inline styles */}
            <style>{`
                /* Force full width - no white space */
                .mobile-location-container,
                .mobile-location-view {
                    width: 100vw !important;
                    max-width: 100vw !important;
                    min-width: 100vw !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    overflow-x: hidden !important;
                }
                
                .mobile-location-view {
                    overflow-y: auto !important;
                    overflow-x: hidden !important;
                    padding-bottom: 80px !important;
                    height: 100vh !important;
                    display: flex !important;
                    flex-direction: column !important;
                }
                
                /* Ensure body and html have no margins */
                html, body, #app, .app-container, main {
                    margin: 0 !important;
                    padding: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow-x: hidden !important;
                    background: white !important;
                }
                
                /* Full width for all containers */
                .mobile-location-card,
                .mobile-permission-prompt,
                .mobile-map-container {
                    margin-left: 0 !important;
                    margin-right: 0 !important;
                    border-radius: 0 !important;
                    width: 100% !important;
                }
                
                .mobile-location-card {
                    padding: 20px !important;
                    margin-bottom: 16px !important;
                }
                
                .mobile-permission-prompt {
                    padding: 20px !important;
                }
                
                .mobile-map-container {
                    margin-top: 0 !important;
                    margin-bottom: 16px !important;
                    border-radius: 0 !important;
                    flex-shrink: 0 !important;
                }
                
                /* Make content scrollable */
                .mobile-location-view {
                    scroll-behavior: smooth !important;
                }
                
                /* Ensure proper spacing */
                .mobile-location-content {
                    flex: 1 !important;
                    overflow-y: visible !important;
                }
            `}</style>
            
            <div className="mobile-location-container">
                <div className="mobile-location-view">
                    {/* Header */}
                    <div className="mobile-location-header">
                        <div className="mobile-location-user-info">
                            <h1>Live Location Tracker</h1>
                            <p>📍 Real-time GPS • Maps • Places • Directions</p>
                        </div>
                    </div>

                    {/* Enable Location Button - Always visible when GPS is not active */}
                    {(!hasPermission || !isTracking) && (
                        <div className="mobile-enable-location-btn-container">
                            <button className="mobile-enable-location-btn" onClick={requestLocationPermission}>
                                <i className="fas fa-location-dot"></i>
                                <span>Enable GPS Tracking</span>
                                <i className="fas fa-arrow-right"></i>
                            </button>
                            <p className="mobile-enable-location-hint">
                                Allow location access to see your real-time position on the map
                            </p>
                        </div>
                    )}

                    {/* Permission Prompt (Alternative) */}
                    {showPermissionPrompt && !hasPermission && !isTracking && (
                        <div className="mobile-permission-prompt">
                            <i className="fas fa-exclamation-triangle"></i>
                            <span>Location Access Required</span>
                            <p>Please enable location services to use GPS tracking features</p>
                            <button onClick={requestLocationPermission}>Enable Location</button>
                        </div>
                    )}

                    {/* GPS Status Card */}
                    <div className="mobile-location-card">
                        <div className="mobile-location-header-row">
                            <div className="mobile-location-title">
                                <span className={`mobile-gps-pulse ${hasPermission && isTracking ? 'active' : 'inactive'}`}></span>
                                <span className="mobile-gps-state">{gpsStatus}</span>
                            </div>
                            <span className="mobile-gps-badge">
                                <i className="fas fa-satellite-dish"></i> Mapbox GPS
                            </span>
                        </div>

                        {/* Stop/Start GPS Button */}
                        {hasPermission && (
                            <div className="mobile-gps-control">
                                {isTracking ? (
                                    <button className="mobile-stop-gps-btn" onClick={stopGPSTracking}>
                                        <i className="fas fa-stop-circle"></i> Stop Tracking
                                    </button>
                                ) : (
                                    <button className="mobile-start-gps-btn" onClick={startGPSTracking}>
                                        <i className="fas fa-play-circle"></i> Start Tracking
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="mobile-street-address">
                            <i className="fas fa-location-dot"></i>
                            <span className="mobile-street-name">
                                {address.street}
                            </span>
                        </div>

                        <div className="mobile-full-address">
                            <i className="fas fa-map-pin"></i>
                            <span>{address.formatted}</span>
                        </div>

                        <div className="mobile-coordinate-row">
                            <div className="mobile-coord-item">
                                <i className="fas fa-globe-africa"></i>
                                <div className="coord-label">Latitude</div>
                                <div className="coord-value font-roboto-number">{locationStats.latitude}</div>
                            </div>
                            <div className="mobile-coord-item">
                                <i className="fas fa-globe-americas"></i>
                                <div className="coord-label">Longitude</div>
                                <div className="coord-value font-roboto-number">{locationStats.longitude}</div>
                            </div>
                            <div className="mobile-coord-item">
                                <i className="fas fa-bullseye"></i>
                                <div className="coord-label">Accuracy</div>
                                <div className="coord-value font-roboto-number">{locationStats.accuracy}m</div>
                            </div>
                        </div>

                        <div className="mobile-movement-stats">
                            <div className="mobile-stat-badge">
                                <i className="fas fa-tachometer-alt"></i>
                                <span className="stat-label">Speed</span>
                                <span className="stat-value font-roboto-number">{locationStats.speed}</span>
                                <span className="stat-unit">km/h</span>
                            </div>
                            <div className="mobile-stat-badge">
                                <i className="fas fa-compass"></i>
                                <span className="stat-label">Heading</span>
                                <span className="stat-value font-roboto-number">{locationStats.heading}</span>
                                <span className="stat-unit">°</span>
                            </div>
                            <div className="mobile-stat-badge">
                                <i className="fas fa-mountain"></i>
                                <span className="stat-label">Altitude</span>
                                <span className="stat-value font-roboto-number">{locationStats.altitude}</span>
                                <span className="stat-unit">m</span>
                            </div>
                        </div>
                    </div>

                    {/* Map Container */}
                    <div className="mobile-map-container">
                        <div ref={mapRef} className="mobile-map"></div>
                        <div className="mobile-map-controls">
                            <button className="mobile-map-btn" onClick={togglePlaces} title="Find nearby restaurants">
                                <i className="fas fa-store"></i>
                            </button>
                            <button className="mobile-map-btn" onClick={findNearbyChurches} title="Find nearby churches">
                                <i className="fas fa-church"></i>
                            </button>
                            <button className="mobile-map-btn" onClick={centerOnUser} title="Center on my location">
                                <i className="fas fa-crosshairs"></i>
                            </button>
                        </div>
                        <div ref={directionArrowRef} className="mobile-direction-arrow">
                            <i className="fas fa-location-arrow"></i>
                        </div>

                        {/* Places Panel */}
                        {showPlaces && (
                            <div className="mobile-places-panel">
                                <div className="mobile-places-header">
                                    <h3>Nearby Places</h3>
                                    <button className="mobile-close-places" onClick={() => setShowPlaces(false)}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="mobile-places-list">
                                    {nearbyPlaces.map((place) => (
                                        <div key={place.id} className="mobile-place-item" onClick={() => goToPlace(place)}>
                                            <div className="mobile-place-icon">
                                                <i className="fas fa-map-marker-alt"></i>
                                            </div>
                                            <div className="mobile-place-info">
                                                <h4>{place.name}</h4>
                                                <p>{place.vicinity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Navigation */}
                    <ClientNavMobile />
                </div>
            </div>
        </>
    );
};

export default DriverLocationMobile;