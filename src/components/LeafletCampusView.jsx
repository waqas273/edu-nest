/**
 * LeafletCampusView (100% FREE, No Credit Card Required)
 * ─────────────────────────────────────────────────────────────────────────────
 * Interactive Leaflet campus view component styled with modern premium themes.
 * Replaced Mapbox to avoid credit-card setup constraints while retaining
 * beautiful light/dark mode and campus overlays.
 *
 * Features:
 *  • Interactive map displaying university marker with a premium glassmorphic popup.
 *  • Debounced theme switches (listens to root dark/light changes dynamically)
 *  • Premium pulsing marker matching university primary identity
 *  • Interactive Layer Switcher: Street style vs High-res satellite view
 *  • Seamless fallbacks to Google Maps iframe if coordinates are invalid or missing
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Layers } from 'lucide-react';

// Tile Layer URLs
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a>';

// Custom Marker Creator matching the neon cyan/indigo styling
const createCampusIcon = (name) => {
    return L.divIcon({
        className: 'custom-leaflet-campus-pin',
        html: `
            <div class="flex flex-col items-center" style="transform: translate(-2px, -8px);">
                <div class="relative">
                    <div class="absolute -inset-2.5 bg-cyan-500/30 rounded-full animate-ping"></div>
                    <div class="relative bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full p-2.5 shadow-2xl border-2 border-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                </div>
                <div class="w-1.5 h-3 bg-gradient-to-b from-cyan-500 to-blue-600 -mt-0.5 shadow-md"></div>
            </div>
        `,
        iconSize: [36, 46],
        iconAnchor: [18, 46],
    });
};

const LeafletCampusView = ({ university }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markerRef = useRef(null);

    const [mapMode, setMapMode] = useState('streets'); // 'streets' | 'satellite'
    const [isDark, setIsDark] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches ||
        document.documentElement.classList.contains('dark')
    );

    const lat = parseFloat(university?.latitude);
    const lng = parseFloat(university?.longitude);
    const hasCoordinates = !isNaN(lat) && !isNaN(lng);

    // Watch dark mode root class alterations
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

    // Initialize Map Instance
    useEffect(() => {
        if (!hasCoordinates || !mapContainerRef.current) return;

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
        }).setView([lat, lng], 15);

        mapInstanceRef.current = map;

        // Add Premium UI Controllers
        L.control.zoom({ position: 'topright' }).addTo(map);
        L.control.attribution({ position: 'bottomright', prefix: '' }).addTo(map);

        // Add Active Layer
        const tileLayer = L.tileLayer(getTileUrl(), {
            attribution: ATTRIBUTION,
            maxZoom: 19,
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        // Add Custom Neon Marker
        const marker = L.marker([lat, lng], { icon: createCampusIcon(university?.universityName) }).addTo(map);
        markerRef.current = marker;

        // Build premium vector blur popup card
        const popupContent = `
            <div class="custom-leaflet-glass-popup text-slate-800 dark:text-white p-3 font-sans" style="min-width: 220px;">
                <div class="flex items-center gap-2 mb-2">
                    <span class="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
                    </span>
                    <strong class="text-sm font-black text-slate-800 dark:text-slate-100">${university?.universityName || 'University Campus'}</strong>
                </div>
                <div class="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin flex-shrink-0 mt-0.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span class="line-clamp-2">${university?.location || 'Pakistan'}</span>
                </div>
                <hr class="my-2.5 border-slate-100 dark:border-white/10" />
                <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 w-full justify-center px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-bold text-[10px] tracking-wider uppercase transition-all shadow-md">
                    Open in Google Maps
                </a>
            </div>
        `;
        marker.bindPopup(popupContent, {
            className: 'custom-leaflet-glass-bubble-wrapper',
            maxWidth: 320,
        }).openPopup();

        // Cleanup instance
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                markerRef.current = null;
                tileLayerRef.current = null;
            }
        };
    }, [hasCoordinates, lat, lng]);

    // Handle map view changes dynamically
    useEffect(() => {
        if (tileLayerRef.current) {
            tileLayerRef.current.setUrl(getTileUrl());
        }
    }, [isDark, mapMode, getTileUrl]);

    // If no coordinates are set, fall back gracefully to a search iframe
    if (!hasCoordinates) {
        const fallbackSearch = encodeURIComponent(
            `${university?.universityName || ''} ${university?.location || 'Pakistan'}`
        );
        const gmapsIframe = `https://maps.google.com/maps?q=${fallbackSearch}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

        return (
            <div className="space-y-4">
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-slate-100 dark:bg-white/[0.02]" style={{ height: 350 }}>
                    <iframe
                        title="Google Maps Campus View"
                        src={gmapsIframe}
                        className="w-full h-full border-0 filter dark:invert dark:grayscale dark:contrast-125"
                        allowFullScreen=""
                        loading="lazy"
                    />
                </div>
                <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
                    <MapPin size={18} className="text-amber-500 flex-shrink-0" />
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">Iframe Search Fallback</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            This campus does not have Leaflet map coordinates configured. Showing search matching fallback.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Map Visual Container ── */}
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl z-10" style={{ height: 350 }}>
                {/* Leaflet DOM Ref Container */}
                <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />

                {/* Open in Google Maps overlay button */}
                <a
                    href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 left-4 flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl border border-white/10 hover:bg-cyan-600 hover:border-cyan-500 hover:shadow-lg transition-all shadow-md z-[999]"
                >
                    <Navigation size={13} className="text-cyan-400" />
                    Get Directions
                </a>

                {/* Layer Swapper Overlay */}
                <button
                    onClick={() => setMapMode(prev => prev === 'streets' ? 'satellite' : 'streets')}
                    className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-2xl border border-white/10 hover:bg-cyan-600 hover:border-cyan-500 hover:shadow-lg transition-all shadow-md z-[999]"
                >
                    <Layers size={13} className="text-cyan-400" />
                    {mapMode === 'streets' ? 'Satellite View' : 'Map View'}
                </button>
            </div>
        </div>
    );
};

export default LeafletCampusView;
