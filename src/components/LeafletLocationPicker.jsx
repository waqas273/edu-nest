/**
 * LeafletLocationPicker (100% FREE, No Credit Card Required)
 * ─────────────────────────────────────────────────────────────────────────────
 * An interactive Leaflet map component styled like a premium vector map.
 * Replaced Mapbox to avoid credit-card setup constraints while retaining
 * beautiful light/dark mode and full onboarding/profile compatibility.
 *
 * Features:
 *  • Search-as-you-type city/address geocoding (via Nominatim — free, no key)
 *  • Click anywhere on map to place a pin
 *  • Automatic reverse geocoding on click (city + full address via Nominatim)
 *  • Dark mode aware (uses CartoDB Dark Matter / Voyager light tiles)
 *  • Interactive Layer Switcher: Toggle between sleek "Map" and high-res "Satellite" views!
 *  • Pulsing custom SVG marker pin (zero asset resolution issues)
 *  • Debounced search to avoid API hammering
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Search, Loader2, X, Navigation, Layers } from 'lucide-react';

// Nominatim — completely FREE, no key required
const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';

// Beautiful Map Tiles (100% Free, No Credit Card or Signup Required)
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a>';

// Helper to create a premium pulsing marker icon
const createPickerIcon = () => {
    return L.divIcon({
        className: 'custom-leaflet-picker-pin',
        html: `
            <div class="flex flex-col items-center" style="transform: translate(-2px, -8px);">
                <div class="relative">
                    <div class="absolute -inset-2 bg-blue-500/30 rounded-full animate-ping"></div>
                    <div class="relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-2.5 shadow-xl border-2 border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                </div>
                <div class="w-1.5 h-3 bg-gradient-to-b from-blue-500 to-indigo-600 -mt-0.5 shadow-sm"></div>
            </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 46],
    });
};

const LeafletLocationPicker = ({
    initialLat = 30.3753,
    initialLng = 69.3451, // Centre of Pakistan as default
    initialLocationText = '',
    onLocationSelected,
}) => {
    const [markerPos, setMarkerPos] = useState(
        initialLat !== 30.3753 ? { lat: initialLat, lng: initialLng } : null
    );

    const [locationText, setLocationText] = useState(initialLocationText);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
    const [mapMode, setMapMode] = useState('streets'); // 'streets' | 'satellite'
    const [isDark, setIsDark] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches ||
        document.documentElement.classList.contains('dark')
    );

    const debounceTimer = useRef(null);
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markerInstanceRef = useRef(null);

    // Detect dark mode changes
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Get Active Tile URL based on Mode and Theme
    const getTileUrl = useCallback(() => {
        if (mapMode === 'satellite') return TILE_SATELLITE;
        return isDark ? TILE_DARK : TILE_LIGHT;
    }, [mapMode, isDark]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const defaultLat = initialLat !== 30.3753 ? initialLat : 30.3753;
        const defaultLng = initialLng !== 69.3451 ? initialLng : 69.3451;
        const defaultZoom = initialLat === 30.3753 ? 5 : 13;

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView([defaultLat, defaultLng], defaultZoom);

        mapInstanceRef.current = map;

        // Add Zoom Control at Custom position
        L.control.zoom({ position: 'topright' }).addTo(map);
        L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map);

        // Add Tile layer
        const tileLayer = L.tileLayer(getTileUrl(), {
            attribution: ATTRIBUTION,
            maxZoom: 19,
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        // Add Initial Marker if pos is set
        if (initialLat !== 30.3753) {
            const marker = L.marker([initialLat, initialLng], { icon: createPickerIcon() }).addTo(map);
            markerInstanceRef.current = marker;
        }

        // On Click event
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            setMarkerPos({ lat, lng });

            // Create/Move Marker
            if (markerInstanceRef.current) {
                markerInstanceRef.current.setLatLng([lat, lng]);
            } else {
                const marker = L.marker([lat, lng], { icon: createPickerIcon() }).addTo(map);
                markerInstanceRef.current = marker;
            }

            reverseGeocode(lat, lng);
        });

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerInstanceRef.current = null;
                tileLayerRef.current = null;
            }
        };
    }, []);

    // Handle Map Mode & Theme Switches dynamically
    useEffect(() => {
        if (tileLayerRef.current) {
            tileLayerRef.current.setUrl(getTileUrl());
        }
    }, [isDark, mapMode, getTileUrl]);

    // Debounced search via Nominatim
    const handleSearchInput = useCallback((value) => {
        setSearchQuery(value);
        clearTimeout(debounceTimer.current);
        if (!value.trim() || value.length < 2) {
            setSearchResults([]);
            return;
        }
        debounceTimer.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(
                    `${NOMINATIM_SEARCH}?q=${encodeURIComponent(value)}&format=json&limit=6&countrycodes=pk`
                );
                const data = await res.json();
                setSearchResults(data);
            } catch (_) {
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 400);
    }, []);

    // Reverse geocode a lat/lng
    const reverseGeocode = useCallback(async (lat, lng) => {
        setIsReverseGeocoding(true);
        try {
            const res = await fetch(
                `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await res.json();
            const addr = data.address || {};
            const city =
                addr.city || addr.town || addr.village || addr.county || addr.state_district || addr.state || 'Pakistan';
            const country = addr.country || 'Pakistan';
            const location = `${city}, ${country}`;
            const fullAddress = data.display_name || location;

            setLocationText(location);
            onLocationSelected?.({
                latitude: lat,
                longitude: lng,
                city,
                location,
                fullAddress,
            });
        } catch (_) {
            const fallback = { latitude: lat, longitude: lng, city: '', location: '', fullAddress: '' };
            onLocationSelected?.(fallback);
        } finally {
            setIsReverseGeocoding(false);
        }
    }, [onLocationSelected]);

    // Select search result
    const handleSelectResult = useCallback((result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        setMarkerPos({ lat, lng });
        setSearchResults([]);
        setSearchQuery('');

        const addr = result.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || result.display_name.split(',')[0];
        const country = addr.country || 'Pakistan';
        const location = `${city}, ${country}`;

        setLocationText(location);

        // Center map and update/add marker
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 14);
            if (markerInstanceRef.current) {
                markerInstanceRef.current.setLatLng([lat, lng]);
            } else {
                const marker = L.marker([lat, lng], { icon: createPickerIcon() }).addTo(mapInstanceRef.current);
                markerInstanceRef.current = marker;
            }
        }

        onLocationSelected?.({
            latitude: lat,
            longitude: lng,
            city,
            location,
            fullAddress: result.display_name,
        });
    }, [onLocationSelected]);

    // Use device GPS
    const handleUseMyLocation = useCallback(() => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                setMarkerPos({ lat, lng });

                if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([lat, lng], 14);
                    if (markerInstanceRef.current) {
                        markerInstanceRef.current.setLatLng([lat, lng]);
                    } else {
                        const marker = L.marker([lat, lng], { icon: createPickerIcon() }).addTo(mapInstanceRef.current);
                        markerInstanceRef.current = marker;
                    }
                }

                reverseGeocode(lat, lng);
            },
            () => {},
            { enableHighAccuracy: true }
        );
    }, [reverseGeocode]);

    return (
        <div className="space-y-3">
            {/* ── Search Bar ── */}
            <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Search for university city or address..."
                    className="w-full pl-10 pr-10 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition-all"
                />
                {isSearching && (
                    <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
                )}
                {searchQuery && !isSearching && (
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                        <X size={15} />
                    </button>
                )}

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[9999]">
                        {searchResults.map((r, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleSelectResult(r)}
                                className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex items-start gap-2"
                            >
                                <MapPin size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                                <span className="line-clamp-2">{r.display_name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Map Container ── */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-10" style={{ height: 280 }}>
                {/* DOM Node for Leaflet Map */}
                <div ref={mapContainerRef} className="w-full h-full bg-slate-900 cursor-crosshair" />

                {/* Use My Location Button */}
                <button
                    type="button"
                    onClick={handleUseMyLocation}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/10 hover:bg-blue-600 hover:border-blue-500 transition-all shadow-lg z-[999]"
                >
                    <Navigation size={13} className="text-blue-400" />
                    Use My Location
                </button>

                {/* Satellite/Street Toggle Button */}
                <button
                    type="button"
                    onClick={() => setMapMode(prev => prev === 'streets' ? 'satellite' : 'streets')}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/10 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all shadow-lg z-[999]"
                >
                    <Layers size={13} className="text-blue-400" />
                    {mapMode === 'streets' ? 'Satellite View' : 'Map View'}
                </button>

                {isReverseGeocoding && (
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[999]">
                        <div className="flex items-center gap-2 bg-slate-900/90 px-4 py-2 rounded-xl text-white text-sm font-medium border border-white/10">
                            <Loader2 size={16} className="animate-spin text-blue-400" />
                            Getting location details...
                        </div>
                    </div>
                )}
            </div>

            {/* ── Selected Location Display ── */}
            {locationText && (
                <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-500/10 border border-blue-500/25 rounded-xl">
                    <MapPin size={16} className="text-blue-400 flex-shrink-0" />
                    <div>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Selected Location</p>
                        <p className="text-sm text-white font-semibold">{locationText}</p>
                    </div>
                </div>
            )}

            {!markerPos && (
                <p className="text-xs text-slate-500 text-center">
                    🗺️ Click anywhere on the map or use the search bar to set your campus location
                </p>
            )}
        </div>
    );
};

export default LeafletLocationPicker;
