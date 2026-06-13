
import { useState, useEffect, useCallback } from 'react';
import '../../css/CookieConsent.css';

const COOKIE_CONSENT_KEY = 'speedly_cookie_consent';
const COOKIE_CONSENT_VERSION = 1;

interface ConsentState {
  accepted: boolean;
  version: number;
  timestamp: number;
  preferences: {
    essential: boolean;
    performance: boolean;
    analytics: boolean;
  };
}

function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version === COOKIE_CONSENT_VERSION) return parsed;
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    return null;
  } catch {
    return null;
  }
}

function storeConsent(state: ConsentState): void {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(state));
  document.cookie = `speedly_perf_consent=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function applyPerformanceOptimizations(): void {
  // Preconnect to Google Maps & CDNs — run on EVERY page load if consent exists
  const preconnects = [
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://ka-f.fontawesome.com',
  ];
  preconnects.forEach(url => {
    const exists = document.querySelector(`link[rel="preconnect"][href="${url}"]`);
    if (exists) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.prepend(link);
  });

  // Preload the Google Maps API script so it's ready before any page needs it
  const existingPreload = document.querySelector('link[rel="preload"][href*="maps.googleapis.com"]');
  if (!existingPreload) {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'script';
    preloadLink.href = 'https://maps.googleapis.com/maps/api/js?key=' +
      (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '') +
      '&libraries=places,geometry&loading=async';
    document.head.prepend(preloadLink);
  }

  // DNS prefetch
  const dnsPrefetches = ['//127.0.0.1:8000', 'https://maps.googleapis.com', 'https://maps.gstatic.com'];
  dnsPrefetches.forEach(url => {
    if (document.querySelector(`link[rel="dns-prefetch"][href="${url}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = url;
    document.head.prepend(link);
  });

  // Set cache markers
  sessionStorage.setItem('speedly_cache_ts', Date.now().toString());
  document.documentElement.setAttribute('data-cached', 'true');
}

const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    performance: true,
    analytics: true,
  });

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored?.accepted) {
      applyPerformanceOptimizations();
      return;
    }

    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const acceptAll = useCallback(() => {
    const state: ConsentState = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: Date.now(),
      preferences: { essential: true, performance: true, analytics: true },
    };
    storeConsent(state);
    applyPerformanceOptimizations();
    setVisible(false);
  }, []);

  const acceptSelected = useCallback(() => {
    const state: ConsentState = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: Date.now(),
      preferences: { ...preferences },
    };
    storeConsent(state);
    if (preferences.performance || preferences.analytics) {
      applyPerformanceOptimizations();
    }
    setVisible(false);
  }, [preferences]);

  const rejectAll = useCallback(() => {
    const state: ConsentState = {
      accepted: false,
      version: COOKIE_CONSENT_VERSION,
      timestamp: Date.now(),
      preferences: { essential: true, performance: false, analytics: false },
    };
    storeConsent(state);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-consent-overlay">
      <div className="cookie-consent-banner">
        <div className="cookie-consent-header">
          <div className="cookie-consent-icon">
            <i className="fas fa-cookie-bite"></i>
          </div>
          <div>
            <h3>We Use Cookies</h3>
            <p>
              We use cookies to remember your preferences and make Speedly
              load faster on return visits. By clicking Accept, you help us
              deliver a better experience.
            </p>
          </div>
        </div>

        {showPreferences && (
          <div className="cookie-preferences">
            <label className="cookie-pref-row">
              <input type="checkbox" checked={preferences.essential} disabled />
              <div>
                <strong>Essential</strong>
                <span>Required for the website to function. Always enabled.</span>
              </div>
            </label>
            <label className="cookie-pref-row">
              <input
                type="checkbox"
                checked={preferences.performance}
                onChange={e =>
                  setPreferences(p => ({ ...p, performance: e.target.checked }))
                }
              />
              <div>
                <strong>Performance</strong>
                <span>
                  Preloads maps &amp; images so pages open instantly on your next
                  visit.
                </span>
              </div>
            </label>
            <label className="cookie-pref-row">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={e =>
                  setPreferences(p => ({ ...p, analytics: e.target.checked }))
                }
              />
              <div>
                <strong>Analytics</strong>
                <span>
                  Helps us understand how you use Speedly so we can make it
                  faster.
                </span>
              </div>
            </label>
          </div>
        )}

        <div className="cookie-consent-actions">
          <button
            className="cookie-btn cookie-btn-prefs"
            onClick={() => setShowPreferences(!showPreferences)}
          >
            <i className="fas fa-sliders-h"></i> Preferences
          </button>
          <button className="cookie-btn cookie-btn-reject" onClick={rejectAll}>
            Reject
          </button>
          {showPreferences ? (
            <button
              className="cookie-btn cookie-btn-accept"
              onClick={acceptSelected}
            >
              Save &amp; Accept
            </button>
          ) : (
            <button
              className="cookie-btn cookie-btn-accept"
              onClick={acceptAll}
            >
              Accept All
            </button>
          )}
        </div>

        <p className="cookie-consent-footer">
          By accepting, you agree to our use of cookies for performance and
          analytics. You can change your choice anytime in Settings.
        </p>
      </div>
    </div>
  );
};

export default CookieConsent;
