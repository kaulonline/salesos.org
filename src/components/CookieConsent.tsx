import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Settings, Check } from 'lucide-react';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'salesos_cookie_consent';
const COOKIE_PREFERENCES_KEY = 'salesos_cookie_preferences';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always required
    analytics: false,
    preferences: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    } else {
      // Load saved preferences
      const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
    };
    saveConsent(allAccepted);
  };

  const handleAcceptEssential = () => {
    const essentialOnly: CookiePreferences = {
      essential: true,
      analytics: false,
      preferences: false,
      marketing: false,
    };
    saveConsent(essentialOnly);
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setIsVisible(false);

    // Dispatch custom event for analytics initialization
    window.dispatchEvent(
      new CustomEvent('cookieConsentUpdated', { detail: prefs })
    );
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden">
          {!showPreferences ? (
            // Simple consent view
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center flex-shrink-0">
                  <Cookie className="w-6 h-6 text-[#EAD07D]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    We value your privacy
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    We use cookies to enhance your browsing experience, analyze site traffic, and
                    personalize content. By clicking "Accept All", you consent to our use of cookies.
                    Read our{' '}
                    <Link to="/privacy" className="text-[#EAD07D] hover:underline">
                      Privacy Policy
                    </Link>{' '}
                    for more information.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleAcceptAll}
                      className="px-5 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-semibold hover:bg-[#d4bc6e] transition-colors flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Accept All
                    </button>
                    <button
                      onClick={handleAcceptEssential}
                      className="px-5 py-2.5 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                    >
                      Essential Only
                    </button>
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="px-5 py-2.5 text-white/70 rounded-full text-sm font-medium hover:text-white transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Customize
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleAcceptEssential}
                  className="text-white/40 hover:text-white/70 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            // Detailed preferences view
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-[#EAD07D]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Cookie Preferences</h3>
                </div>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {/* Essential Cookies */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-medium">Essential Cookies</h4>
                      <span className="px-2 py-0.5 bg-[#93C01F]/20 text-[#93C01F] rounded text-xs font-medium">
                        Required
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">
                      These cookies are necessary for the website to function and cannot be disabled.
                    </p>
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-7 bg-[#93C01F] rounded-full relative cursor-not-allowed">
                      <div className="absolute right-1 top-1 w-5 h-5 bg-white rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">Analytics Cookies</h4>
                    <p className="text-white/60 text-sm">
                      Help us understand how visitors interact with our website by collecting anonymous
                      information.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() =>
                        setPreferences((p) => ({ ...p, analytics: !p.analytics }))
                      }
                      className={`w-12 h-7 rounded-full relative transition-colors ${
                        preferences.analytics ? 'bg-[#93C01F]' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                          preferences.analytics ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Preference Cookies */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">Preference Cookies</h4>
                    <p className="text-white/60 text-sm">
                      Remember your settings and preferences to provide a more personalized experience.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() =>
                        setPreferences((p) => ({ ...p, preferences: !p.preferences }))
                      }
                      className={`w-12 h-7 rounded-full relative transition-colors ${
                        preferences.preferences ? 'bg-[#93C01F]' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                          preferences.preferences ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-start justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex-1">
                    <h4 className="text-white font-medium mb-1">Marketing Cookies</h4>
                    <p className="text-white/60 text-sm">
                      Used to deliver relevant advertisements and track ad campaign performance.
                    </p>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() =>
                        setPreferences((p) => ({ ...p, marketing: !p.marketing }))
                      }
                      className={`w-12 h-7 rounded-full relative transition-colors ${
                        preferences.marketing ? 'bg-[#93C01F]' : 'bg-white/20'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                          preferences.marketing ? 'right-1' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSavePreferences}
                  className="flex-1 px-5 py-2.5 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-semibold hover:bg-[#d4bc6e] transition-colors"
                >
                  Save Preferences
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook to get current cookie preferences
export function useCookiePreferences(): CookiePreferences | null {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (saved) {
      setPreferences(JSON.parse(saved));
    }

    const handleUpdate = (event: CustomEvent<CookiePreferences>) => {
      setPreferences(event.detail);
    };

    window.addEventListener('cookieConsentUpdated', handleUpdate as EventListener);
    return () => {
      window.removeEventListener('cookieConsentUpdated', handleUpdate as EventListener);
    };
  }, []);

  return preferences;
}

export default CookieConsent;
