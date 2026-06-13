import React, { useState, useEffect, useCallback, useRef } from 'react';
import { router } from '@inertiajs/react';
import DriverSidebarDesktop from '../components/navbars/DriverSidebarDesktop';
import Swal from 'sweetalert2';
import { usePreloader } from '../hooks/usePreloader';
import { useMobile } from '../hooks/useMobile';
import DesktopPreloader from '../components/preloader/DesktopPreloader';
import DriverLocationMobile from '../components/mobileViewComponent/DriverLocationMobile';
import api from '../services/api';
import { loadGoogleMapsApi } from '../lib/googleMaps';
import '../../css/DriverLocation.css';

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
    types: string[];
}

const DriverLocation: React.FC = () => {
    // State
    const [userData, setUserData] = useState<any>(null);
    const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
    const [address, setAddress] = useState<AddressComponents>({
        street: 'Waiting for GPS...',
        area: '',
        city: '',
        state: '',
        country: '',
        formatted: 'Click "Allow" to see your exact location'
    });
    const [hasPermission, setHasPermission] = useState<boolean>(false);
    const [isTracking, setIsTracking] = useState<boolean>(false);
    const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
    const [showPlaces, setShowPlaces] = useState<boolean>(false);
    const [gpsStatus, setGpsStatus] = useState<string>('WAITING FOR GPS');
    const watchIdRef = useRef<number | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markerRef = useRef<google.maps.Marker | null>(null);
    const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const directionArrowRef = useRef<HTMLDivElement>(null);
    const mapInitRef = useRef(false);

    // Initialize map
    const initMap = useCallback(() => {
        if (!mapRef.current || !window.google || mapInitRef.current) return;
        mapInitRef.current = true;

        const defaultCenter = { lat: 6.2109, lng: 6.7985 };

        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 15,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "on" }]
                },
                {
                    featureType: "road",
                    elementType: "labels",
                    stylers: [{ visibility: "on" }]
                }
            ]
        });

        infoWindowRef.current = new google.maps.InfoWindow();
        placesServiceRef.current = new google.maps.places.PlacesService(mapInstanceRef.current);
    }, []);

    const preloaderLoading = usePreloader(300);
    const isMobile = useMobile();

    // Load Google Maps shared instance
    useEffect(() => {
        const load = async () => {
            try {
                await loadGoogleMapsApi();
                initMap();
            } catch (e) {
                console.error("Failed to load maps:", e);
            }
        };
        load();
    }, [initMap]);

    useEffect(() => {
        if (!preloaderLoading) {
            initMap();
        }
    }, [preloaderLoading, initMap]);

    const fetchUserData = useCallback(async () => {
        try {
            const data = await api.driver.profile();
            if (data.success || data.data) {
                const user = data.data?.user || data.user || data.data;
                setUserData(user);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    }, []);

    useEffect(() => {
        fetchUserData();
    }, [fetchUserData]);

    const requestLocationPermission = () => {
        setGpsStatus('Getting your location...');

        // First attempt: cached/low-accuracy for instant display
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setHasPermission(true);
                setIsTracking(true);
                setGpsStatus('Location acquired. Refining accuracy...');

                const coords = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    speed: position.coords.speed,
                    heading: position.coords.heading,
                };
                updateLocation(coords);
                reverseGeocode(coords.lat, coords.lng);
                startWatchingPosition();
                updateGPSStatus('active');

                // Second attempt: force high accuracy for refinement
                navigator.geolocation.getCurrentPosition(
                    (refinedPosition) => {
                        const refinedCoords = {
                            lat: refinedPosition.coords.latitude,
                            lng: refinedPosition.coords.longitude,
                            accuracy: refinedPosition.coords.accuracy,
                            altitude: refinedPosition.coords.altitude,
                            speed: refinedPosition.coords.speed,
                            heading: refinedPosition.coords.heading,
                        };
                        updateLocation(refinedCoords);
                        updateMapMarker(refinedCoords);
                        reverseGeocode(refinedCoords.lat, refinedCoords.lng);
                        setGpsStatus('GPS active — live tracking');
                    },
                    () => { /* refinement failed, using initial position */ },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            },
            (error) => {
                console.error('GPS error:', error.message);
                setHasPermission(false);
                setIsTracking(false);

                if (error.code === 1) {
                    setGpsStatus('Location access denied. Please enable in browser settings.');
                } else {
                    setGpsStatus('Unable to get location. Check your connection.');
                }
                updateGPSStatus('denied');
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
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

    // Update location state
    const updateLocation = (coords: LocationCoords) => {
        setUserLocation(coords);
        
        // Update map center
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter({ lat: coords.lat, lng: coords.lng });
            mapInstanceRef.current.setZoom(18);
        }
    };

    // Update map marker with accuracy circle
    const updateMapMarker = (coords: LocationCoords) => {
        if (!mapInstanceRef.current) return;

        const position = { lat: coords.lat, lng: coords.lng };

        mapInstanceRef.current.setCenter(position);

        if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setCenter(position);
            accuracyCircleRef.current.setRadius(coords.accuracy || 10);
        } else {
            accuracyCircleRef.current = new google.maps.Circle({
                map: mapInstanceRef.current,
                center: position,
                radius: coords.accuracy || 10,
                fillColor: '#ff5e00',
                fillOpacity: 0.05,
                strokeColor: '#ff5e00',
                strokeOpacity: 0.25,
                strokeWeight: 1,
            });
        }

        if (markerRef.current) {
            markerRef.current.setPosition(position);
        } else {
            const markerSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="#ff5e00" stroke="white" stroke-width="2.5"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                </svg>`;

            markerRef.current = new google.maps.Marker({
                position,
                map: mapInstanceRef.current,
                title: 'Your exact location',
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerSvg),
                    scaledSize: new google.maps.Size(36, 36),
                    anchor: new google.maps.Point(18, 18),
                },
                zIndex: 1000,
                animation: google.maps.Animation.DROP,
            });

            markerRef.current.addListener('click', () => {
                if (infoWindowRef.current && markerRef.current) {
                    infoWindowRef.current.setContent(`
                        <div style="padding: 12px; font-family: sans-serif; min-width: 180px;">
                            <h3 style="font-weight: bold; color: #ff5e00; margin-bottom: 6px;">📍 Your Location</h3>
                            <p style="margin: 3px 0; font-size: 13px;">Accuracy: ±<strong>${coords.accuracy.toFixed(0)}m</strong></p>
                            <p style="margin: 3px 0; font-size: 13px;">Speed: <strong>${((coords.speed || 0) * 3.6).toFixed(1)} km/h</strong></p>
                            <p style="margin: 3px 0; font-size: 13px;">Alt: <strong>${(coords.altitude || 0).toFixed(0)}m</strong></p>
                        </div>
                    `);
                    infoWindowRef.current.open(mapInstanceRef.current, markerRef.current);
                }
            });
        }

        if (!accuracyCircleRef.current) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(position);
            mapInstanceRef.current.fitBounds(bounds, { maxZoom: 18 });
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
    const findNearbyPlaces = (type: string = 'restaurant') => {
        if (!userLocation || !placesServiceRef.current) {
            Swal.fire({ icon: 'warning', title: 'Location Required', text: 'Please enable GPS first', confirmButtonColor: '#ff5e00' });
            return;
        }

        const request: google.maps.places.NearbySearchRequest = {
            location: { lat: userLocation.lat, lng: userLocation.lng },
            radius: 1000,
            type: type as google.maps.places.PlaceType
        };

        placesServiceRef.current.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const places: PlaceResult[] = results.slice(0, 10).map(place => ({
                    id: place.place_id || Math.random().toString(),
                    name: place.name || 'Unknown',
                    vicinity: place.vicinity || '',
                    location: { lat: place.geometry!.location!.lat(), lng: place.geometry!.location!.lng() },
                    types: place.types || []
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
                    location: { lat: place.geometry!.location!.lat(), lng: place.geometry!.location!.lng() },
                    types: place.types || []
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

            new google.maps.Marker({
                position: place.location,
                map: mapInstanceRef.current,
                title: place.name,
                animation: google.maps.Animation.DROP
            });

            setShowPlaces(false);
        }
    };

    // Update GPS status — drives UI through React state only.
    // The old version wrote directly into DOM nodes that React controls via
    // {gpsStatus} and the isTracking CSS class; those DOM writes were
    // overwritten on every re-render, causing a flicker conflict.
    const updateGPSStatus = (status: 'active' | 'denied' | 'error') => {
        if (status === 'active') {
            setGpsStatus('🟢 GPS ACTIVE - LIVE TRACKING');
        } else if (status === 'denied') {
            setGpsStatus('❌ GPS ACCESS DENIED');
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

    const formatSpeed = (speed: number | null) => ((speed || 0) * 3.6).toFixed(1);
    const formatAccuracy = (accuracy: number) => accuracy.toFixed(0);

    if (preloaderLoading) {
        return <DesktopPreloader />;
    }

    // Render mobile view
    if (isMobile) {
        return <DriverLocationMobile />;
    }

    return (
        <div className="location-desktop-container">
            <DriverSidebarDesktop userName={userData?.fullname || userData?.full_name || 'Driver'} profilePictureUrl={userData?.profile_picture_url} />

            <div className="location-desktop-main">
                {/* Header */}
                <div className="location-desktop-header">
                    <div className="location-desktop-title">
                        <h1>⚡ Google Cloud Maps - All Features</h1>
                        <p>📍 Live Location • Places • Streets • Churches</p>
                    </div>
                </div>

                {/* Map and Panel Container */}
                <div className="location-desktop-grid">
                    {/* Map Column */}
                    <div className="location-map-col">
                        <div ref={mapRef} className="location-map"></div>
                        <div className="location-map-controls">
                            <button className="location-map-btn" onClick={() => findNearbyPlaces('restaurant')} title="Nearby Places">
                                <i className="fas fa-store"></i>
                            </button>
                            <button className="location-map-btn" onClick={findNearbyChurches} title="Nearby Churches">
                                <i className="fas fa-church"></i>
                            </button>
                            <button className="location-map-btn" onClick={centerOnUser} title="My Location">
                                <i className="fas fa-crosshairs"></i>
                            </button>
                        </div>
                        <div ref={directionArrowRef} className="location-direction-arrow">
                            <i className="fas fa-location-arrow"></i>
                        </div>

                        {/* Places Panel */}
                        {showPlaces && (
                            <div className="location-places-panel">
                                <div className="location-places-header">
                                    <h3>Nearby Places</h3>
                                    <button className="location-close-places" onClick={() => setShowPlaces(false)}>
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                                <div className="location-places-list">
                                    {nearbyPlaces.map((place) => (
                                        <div key={place.id} className="location-place-item" onClick={() => goToPlace(place)}>
                                            <div className="location-place-icon">
                                                <i className="fas fa-map-marker-alt"></i>
                                            </div>
                                            <div className="location-place-info">
                                                <h4>{place.name}</h4>
                                                <p>{place.vicinity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info Panel */}
                    <div className="location-info-panel">
                        <div className="location-gps-header">
                            <span className={`desktop-gps-pulse ${isTracking ? 'active' : ''}`}></span>
                            <span className="desktop-gps-state">{gpsStatus}</span>
                        </div>

                        {!isTracking && (
                            <button className="location-permission-btn" onClick={requestLocationPermission}>
                                <i className="fas fa-location-arrow"></i>
                                ALLOW GPS ACCESS FOR ALL FEATURES
                            </button>
                        )}

                        {/* Address Card */}
                        <div className="location-address-card">
                            <div className="location-address-title">
                                <i className="fas fa-location-dot"></i>
                                <span>{address.street}</span>
                            </div>
                            <div className="location-address-full">{address.formatted}</div>
                        </div>

                        {/* Coordinates Grid */}
                        <div className="location-coord-grid">
                            <div className="location-coord-item">
                                <div className="coord-label">LATITUDE</div>
                                <div className="coord-value font-roboto-number">{userLocation?.lat.toFixed(6) || '--'}</div>
                            </div>
                            <div className="location-coord-item">
                                <div className="coord-label">LONGITUDE</div>
                                <div className="coord-value font-roboto-number">{userLocation?.lng.toFixed(6) || '--'}</div>
                            </div>
                            <div className="location-coord-item">
                                <div className="coord-label">ACCURACY</div>
                                <div className="coord-value font-roboto-number">±{userLocation ? formatAccuracy(userLocation.accuracy) : '--'}m</div>
                            </div>
                            <div className="location-coord-item">
                                <div className="coord-label">GPS SOURCE</div>
                                <div className="coord-value">Google Maps</div>
                            </div>
                        </div>

                        {/* Movement Stats */}
                        <div className="location-movement-stats">
                            <div className="location-stat-badge">
                                <i className="fas fa-tachometer-alt"></i>
                                <span className="stat-label">Speed</span>
                                <span className="stat-value font-roboto-number">{userLocation ? formatSpeed(userLocation.speed) : '0'}</span>
                                <span className="stat-unit">km/h</span>
                            </div>
                            <div className="location-stat-badge">
                                <i className="fas fa-compass"></i>
                                <span className="stat-label">Heading</span>
                                <span className="stat-value font-roboto-number">{userLocation?.heading?.toFixed(0) || '--'}</span>
                                <span className="stat-unit">°</span>
                            </div>
                            <div className="location-stat-badge">
                                <i className="fas fa-mountain"></i>
                                <span className="stat-label">Altitude</span>
                                <span className="stat-value font-roboto-number">{userLocation?.altitude?.toFixed(0) || '--'}</span>
                                <span className="stat-unit">m</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverLocation;