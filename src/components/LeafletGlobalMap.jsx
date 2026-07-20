import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Map, Navigation2 } from 'lucide-react';

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const LeafletGlobalMap = ({ universities, studentCoords }) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const tileLayerRef = useRef(null);
    const markerGroupRef = useRef(null);
    const navigate = useNavigate();

    const [isDark, setIsDark] = useState(
        window.matchMedia('(prefers-color-scheme: dark)').matches ||
        document.documentElement.classList.contains('dark')
    );

    // Watch dark mode alterations
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Get Active Tile URL based on Theme
    const getTileUrl = useCallback(() => {
        return isDark ? TILE_DARK : TILE_LIGHT;
    }, [isDark]);

    // Initialize Map Instance
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Default view (e.g. center of Pakistan, or center of the world if no student location)
        const defaultCenter = [30.3753, 69.3451]; // Pakistan center
        const defaultZoom = 5;

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
            zoomControl: false,
            attributionControl: false,
            minZoom: 3,
        }).setView(studentCoords ? [studentCoords.lat, studentCoords.lng] : defaultCenter, studentCoords ? 10 : defaultZoom);

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

        markerGroupRef.current = L.layerGroup().addTo(map);

        return () => {
            map.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run once on mount

    // Update Tile Layer when Dark Mode changes
    useEffect(() => {
        if (tileLayerRef.current) {
            tileLayerRef.current.setUrl(getTileUrl());
        }
    }, [getTileUrl]);

    // Update Markers when universities or student coords change
    useEffect(() => {
        if (!mapInstanceRef.current || !markerGroupRef.current) return;
        
        const map = mapInstanceRef.current;
        const markerGroup = markerGroupRef.current;
        
        // Clear existing markers
        markerGroup.clearLayers();

        const bounds = L.latLngBounds();
        let hasValidBounds = false;

        // Draw Universities
        universities.forEach(uni => {
            const lat = parseFloat(uni.latitude);
            const lng = parseFloat(uni.longitude);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                hasValidBounds = true;
                bounds.extend([lat, lng]);

                const profilePic = uni.profilePic || uni.photoURL || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=150&q=80';
                const isRecommended = uni._isRecommended ? 'is-recommended' : '';
                
                const customIcon = L.divIcon({
                    html: `
                        <div class="custom-uni-marker-inner" title="${uni.universityName}">
                            <img src="${profilePic}" crossorigin="anonymous" alt="${uni.universityName}" />
                        </div>
                    `,
                    className: `custom-uni-marker ${isRecommended}`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20]
                });

                const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markerGroup);

                // Add Popup
                const popupContent = `
                    <div class="custom-leaflet-glass-popup text-slate-800 dark:text-white p-2 font-sans" style="min-width: 200px;">
                        <img src="${profilePic}" crossorigin="anonymous" style="width: 100%; height: 100px; object-fit: cover; border-radius: 12px; margin-bottom: 12px;" />
                        <h4 class="font-bold text-lg leading-tight mb-1">${uni.universityName}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">${uni.location || 'Location Not Specified'}</p>
                        <button onclick="window.location.href='/university/${uni.id}'" class="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 rounded-xl text-xs transition-colors">
                            View Profile
                        </button>
                    </div>
                `;

                marker.bindPopup(popupContent, {
                    className: 'custom-leaflet-glass-bubble-wrapper',
                    closeButton: true,
                    maxWidth: 260
                });
            }
        });

        // Draw Student Location
        if (studentCoords) {
            const lat = studentCoords.lat;
            const lng = studentCoords.lng;
            hasValidBounds = true;
            bounds.extend([lat, lng]);

            const studentIcon = L.divIcon({
                html: `<div class="custom-student-marker-inner"></div>`,
                className: 'custom-student-marker',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
                popupAnchor: [0, -8]
            });

            L.marker([lat, lng], { icon: studentIcon, zIndexOffset: 1000 })
                .addTo(markerGroup)
                .bindPopup(`
                    <div class="custom-leaflet-glass-popup text-slate-800 dark:text-white p-2 font-sans text-center">
                        <div class="font-bold text-sm text-cyan-500 mb-1">Your Location</div>
                        <div class="text-xs text-slate-500">Live GPS Coordinates</div>
                    </div>
                `, {
                    className: 'custom-leaflet-glass-bubble-wrapper'
                });
        }

        // Fit bounds if we have valid coordinates and the user just loaded the page
        // Wait a tiny bit for the map container to be fully sized
        if (hasValidBounds) {
            setTimeout(() => {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
            }, 100);
        }

    }, [universities, studentCoords]);

    return (
        <div className="w-full h-full relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl group">
            {/* Overlay Gradient for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-[400]" />
            
            {/* Info Badge */}
            <div className="absolute top-4 left-4 z-[400] pointer-events-none">
                <div className="bg-white/90 dark:bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200/50 dark:border-white/10 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-white">
                        <Map size={14} className="text-cyan-500" />
                        <span>Interactive Map</span>
                    </div>
                    <div className="w-px h-4 bg-slate-300 dark:bg-white/20" />
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {studentCoords && (
                            <>
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                You
                            </>
                        )}
                        <span className="w-2 h-2 rounded-full bg-cyan-500 ml-2" />
                        Universities
                    </div>
                </div>
            </div>

            {/* Recenter Button */}
            {studentCoords && (
                <button 
                    onClick={() => {
                        if (mapInstanceRef.current && studentCoords) {
                            mapInstanceRef.current.setView([studentCoords.lat, studentCoords.lng], 12);
                        }
                    }}
                    className="absolute bottom-6 right-6 z-[400] w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-slate-700 dark:text-white hover:text-cyan-500 hover:scale-105 transition-all border border-slate-200 dark:border-slate-700 pointer-events-auto"
                    title="Recenter to my location"
                >
                    <Navigation2 size={20} className="text-blue-500" />
                </button>
            )}

            {/* Leaflet DOM Ref Container */}
            <div ref={mapContainerRef} className="w-full h-full bg-slate-100 dark:bg-slate-900" />
        </div>
    );
};

export default LeafletGlobalMap;
