/**
 * SitesComptageMap — Carte Leaflet (vanilla JS, comme MapView.jsx) des 49 sites
 * de comptage trafic de l'EMD, colorés par volume total (véhicules cumulés).
 */
import { useEffect, useRef } from 'react';

const TIERS = [
  { max: 94445.33,  color: '#69db7c', label: '6 821 – 94 445' },
  { max: 182069.67, color: '#ffa94d', label: '94 445 – 182 070' },
  { max: Infinity,  color: '#ff6b6b', label: '182 070 – 269 694' },
];

function colorFor(volume) {
  return (TIERS.find((t) => volume <= t.max) || TIERS[TIERS.length - 1]).color;
}

export default function SitesComptageMap({ sites = [], height = 420 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) { resolve(window.L); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(window.L);
      document.head.appendChild(script);
    });

    loadLeaflet().then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, { zoomControl: false }).setView([14.72, -17.45], 11);
      mapRef.current = map;

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const allPts = [];
      sites.filter((s) => s.lat && s.lon).forEach((s) => {
        const color = colorFor(s.volume_total);
        const radius = Math.min(6 + s.volume_total / 22000, 20);
        const circle = L.circleMarker([s.lat, s.lon], {
          radius, color, fillColor: color, fillOpacity: 0.45, weight: 2, opacity: 0.9,
        });
        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif;min-width:170px">
            <div style="font-weight:700;margin-bottom:4px;color:${color}">${s.site}</div>
            <div>Volume total : <strong>${s.volume_total.toLocaleString('fr')}</strong> véh.</div>
          </div>
        `);
        circle.bindTooltip(`<b style="color:${color}">${s.site}</b> — ${s.volume_total.toLocaleString('fr')} véh.`, { sticky: true });
        circle.addTo(map);
        allPts.push([s.lat, s.lon]);
      });

      if (allPts.length > 0) {
        try { map.fitBounds(allPts, { padding: [24, 24], maxZoom: 13 }); } catch {}
      }

      setTimeout(() => map && map.invalidateSize(), 200);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [sites]);

  return (
    <div style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%', background: 'var(--dtk-bg)' }} />
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: 'var(--dtk-navbar)', border: '1px solid var(--dtk-vmuted)',
        borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(10px)',
        minWidth: 150, pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--dtk-muted)', marginBottom: 8 }}>
          Volume trafic (véh.)
        </div>
        {TIERS.map((t) => (
          <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, boxShadow: `0 0 5px ${t.color}80` }} />
            <span style={{ fontSize: 10.5, color: 'var(--dtk-sub)' }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
