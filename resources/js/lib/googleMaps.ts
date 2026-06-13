// Shared Google Maps loader — loads API once, cached across page navigations
let loadPromise: Promise<void> | null = null;
let scriptLoaded = false;

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function loadGoogleMapsApi(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const existing = document.querySelector('script#google-maps-api');
  if (existing) {
    scriptLoaded = true;
    return Promise.resolve();
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const cbName = 'gmapsInit_' + Date.now();

    (window as any)[cbName] = () => {
      scriptLoaded = true;
      delete (window as any)[cbName];
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'google-maps-api';
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=${cbName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

export { GOOGLE_MAPS_API_KEY };
