import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Map, Navigation2 } from 'lucide-react';

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Function to calculate distance in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

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
            attributionControl: false, // Removed attribution watermark
            minZoom: 3,
        }).setView(studentCoords ? [studentCoords.lat, studentCoords.lng] : defaultCenter, studentCoords ? 10 : defaultZoom);

        mapInstanceRef.current = map;

        // Add Premium UI Controllers
        L.control.zoom({ position: 'topright' }).addTo(map);

        // Add Active Layer
        const tileLayer = L.tileLayer(getTileUrl(), {
            maxZoom: 19,
        }).addTo(map);
        tileLayerRef.current = tileLayer;

        markerGroupRef.current = L.layerGroup().addTo(map);

        return () => {
            mapInstanceRef.current = null;
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
                
                // Calculate distance if student location is available
                let distanceHtml = '';
                if (studentCoords && studentCoords.lat && studentCoords.lng) {
                    const dist = calculateDistance(studentCoords.lat, studentCoords.lng, lat, lng);
                    distanceHtml = `<div class="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded shadow-sm inline-block mt-0.5 border border-cyan-100 dark:border-cyan-500/30">${dist.toFixed(1)} km away</div>`;
                }
                
                const customIcon = L.divIcon({
                    html: `
                        <div class="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1 pr-4 border border-slate-200 dark:border-slate-700 transition-all hover:scale-105 hover:border-cyan-500 hover:shadow-[0_10px_40px_rgba(6,182,212,0.3)] group cursor-pointer w-max">
                            <div class="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-100 shrink-0 flex items-center justify-center p-0.5 shadow-inner">
                                <img src="${profilePic}" crossorigin="anonymous" alt="${uni.universityName}" class="w-full h-full object-contain rounded-full" />
                            </div>
                            <div class="flex flex-col py-1 justify-center">
                                <span class="text-[11px] font-black text-slate-800 dark:text-white leading-tight max-w-[120px] truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">${uni.universityName}</span>
                                ${distanceHtml}
                            </div>
                        </div>
                    `,
                    className: 'custom-uni-marker-empty',
                    iconSize: [48, 48], // Enough space to anchor at the circle
                    iconAnchor: [24, 24], // Center anchor on the image part (first 48px roughly)
                    popupAnchor: [60, -20]
                });

                const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markerGroup);

                // Add Popup
                const popupContent = `
                    <div class="custom-leaflet-glass-popup text-slate-800 dark:text-white p-2 font-sans" style="min-width: 200px;">
                        <img src="${profilePic}" crossorigin="anonymous" style="width: 100%; height: 100px; object-contain; background: white; border-radius: 12px; margin-bottom: 12px; border: 1px solid #f1f5f9;" />
                        <h4 class="font-bold text-lg leading-tight mb-1">${uni.universityName}</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">${uni.location || 'Location Not Specified'}</p>
                        <button onclick="window.location.href='/university/${uni.id}'" class="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-lg shadow-cyan-500/20">
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
            const lat = parseFloat(studentCoords.lat);
            const lng = parseFloat(studentCoords.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend([lat, lng]);
                hasValidBounds = true;
            }

            const studentIcon = L.divIcon({
                html: `
                    <div class="custom-student-marker-inner" title="Your Current Location">
                    </div>
                `,
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
        // Use invalidateSize to fix Leaflet size issues inside Framer Motion animations
        if (hasValidBounds && bounds.isValid()) {
            const timer = setTimeout(() => {
                if (mapInstanceRef.current && mapInstanceRef.current._container) {
                    mapInstanceRef.current.invalidateSize();
                    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12, animate: false });
                }
            }, 300);
            return () => clearTimeout(timer);
        }

    }, [universities, studentCoords]);

    // Compute top 7 nearest universities
    const nearestUniversities = useMemo(() => {
        if (!studentCoords || !universities) return [];
        
        const withDistance = universities.map(uni => {
            const lat = parseFloat(uni.latitude);
            const lng = parseFloat(uni.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;
            
            const distance = calculateDistance(studentCoords.lat, studentCoords.lng, lat, lng);
            return { ...uni, distance };
        }).filter(Boolean);

        return withDistance.sort((a, b) => a.distance - b.distance).slice(0, 7);
    }, [universities, studentCoords]);

    return (
        <div className="absolute inset-0 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl group">
            {/* Overlay Gradient for premium feel */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-[400]" />
            
            {/* Info Badge */}
            <div className="absolute top-4 left-4 z-[1000] pointer-events-none">
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

            {/* Top 7 Nearest List */}
            {studentCoords && nearestUniversities.length > 0 && (
                <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
                    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-64 overflow-hidden flex flex-col max-h-[300px]">
                        <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider">Nearest to You</span>
                            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm">Top 7</span>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                            {nearestUniversities.map((uni) => (
                                <div key={uni.id} onClick={() => mapInstanceRef.current?.setView([parseFloat(uni.latitude), parseFloat(uni.longitude)], 14)} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 dark:border-slate-600 overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                                        <img src={uni.profilePic || uni.photoURL || 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=150&q=80'} crossOrigin="anonymous" alt="" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{uni.universityName}</span>
                                        <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-semibold">{uni.distance.toFixed(1)} km away</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Recenter Button */}
            {studentCoords && (
                <button 
                    onClick={() => {
                        if (mapInstanceRef.current && studentCoords) {
                            mapInstanceRef.current.setView([studentCoords.lat, studentCoords.lng], 12);
                        }
                    }}
                    className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-xl flex items-center justify-center text-slate-700 dark:text-white hover:text-cyan-500 hover:scale-105 transition-all border border-slate-200 dark:border-slate-700 pointer-events-auto"
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
