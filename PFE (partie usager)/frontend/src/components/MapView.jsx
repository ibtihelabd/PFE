/**
 * MapView — Carte Leaflet (vanilla JS, pas react-leaflet)
 * Évite le conflit double-instance React de react-leaflet
 */
import { useEffect, useRef } from 'react';

const RISK_COLOR = {
  'ÉLEVÉ':  '#ff6b6b',
  'MODÉRÉ': '#ffa94d',
  'FAIBLE': '#69db7c',
};

const STATUS_COLOR = {
  'CRITIQUE': '#ff4444',
  'ÉLEVÉ':    '#ffa94d',
  'MODÉRÉ':   '#74c0fc',
};

export default function MapView({
  zones         = [],
  anomalies     = [],
  height        = 420,
  showZones     = true,
  showAnomalies = true,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);

  useEffect(() => {
    // Charger Leaflet CSS si pas déjà chargé
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id   = 'leaflet-css';
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Charger Leaflet JS
    const loadLeaflet = () => new Promise((resolve) => {
      if (window.L) { resolve(window.L); return; }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve(window.L);
      document.head.appendChild(script);
    });

    let map = null;

    loadLeaflet().then(L => {
      if (!containerRef.current || mapRef.current) return;

      // Initialiser la carte
      map = L.map(containerRef.current, { zoomControl: false }).setView([14.72, -17.45], 11);
      mapRef.current = map;

      // Tuiles sombres CartoDB
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);

      // Contrôle zoom
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const allPts = [];

      // ── Zones à risque ──
      if (showZones) {
        zones.filter(z => z.lat && z.lon).forEach(z => {
          const color  = RISK_COLOR[z.niveau_risque] || '#69db7c';
          const radius = Math.min(8 + (z.nb_menages || 50) / 25, 28);
          const circle = L.circleMarker([z.lat, z.lon], {
            radius, color, fillColor: color, fillOpacity: 0.35, weight: 2, opacity: 0.8,
          });
          circle.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:160px">
              <div style="font-weight:700;margin-bottom:4px;color:${color}">${z.zone || ''}</div>
              <div>Risque : <strong>${z.niveau_risque || ''}</strong></div>
              <div>Probabilité : <strong>${Math.round((z.prob_risque || 0) * 100)}%</strong></div>
              ${z.nb_menages ? `<div>Ménages : <strong>${z.nb_menages}</strong></div>` : ''}
              ${z.dur_sante  ? `<div>Accès santé : <strong>${Math.round(z.dur_sante)} min</strong></div>` : ''}
            </div>
          `);
          circle.bindTooltip(`<b style="color:${color}">${z.zone}</b> — ${z.niveau_risque} (${Math.round((z.prob_risque||0)*100)}%)`, { sticky: true });
          circle.addTo(map);
          allPts.push([z.lat, z.lon]);
        });
      }

      // ── Sites anomalies ──
      if (showAnomalies) {
        anomalies.filter(a => a.lat && a.lon).forEach(a => {
          const color  = STATUS_COLOR[a.status] || '#74c0fc';
          const radius = Math.min(5 + (a.anom_counts || 0) * 0.3, 18);
          const circle = L.circleMarker([a.lat, a.lon], {
            radius, color, fillColor: color, fillOpacity: 0.6, weight: 2, opacity: 0.9,
            dashArray: a.status === 'CRITIQUE' ? '4 2' : undefined,
          });
          circle.bindPopup(`
            <div style="font-family:Inter,sans-serif">
              <div style="font-weight:700;margin-bottom:3px;color:${color}">${a.nom || ''}</div>
              <div>Statut : <strong>${a.status || ''}</strong></div>
              <div>Anomalies : <strong>${a.anom_counts || 0}</strong></div>
              <div>Volume max : <strong>${a.max_vol || 0} véh.</strong></div>
            </div>
          `);
          circle.bindTooltip(`<b style="color:${color}">${a.nom}</b> — ${a.status} (${a.anom_counts} anomalies)`, { sticky: true });
          circle.addTo(map);
          allPts.push([a.lat, a.lon]);
        });
      }

      // Ajuster la vue sur tous les points
      if (allPts.length > 0) {
        try { map.fitBounds(allPts, { padding: [30, 30], maxZoom: 13 }); } catch {}
      }

      // Forcer le recalcul de taille après rendu
      setTimeout(() => map && map.invalidateSize(), 200);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  // Mettre à jour les marqueurs quand les données changent
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L   = window.L;
    const map = mapRef.current;
    // Supprimer les calques existants sauf la tuile
    map.eachLayer(layer => { if (!(layer instanceof L.TileLayer)) map.removeLayer(layer); });

    const allPts = [];

    if (showZones) {
      zones.filter(z => z.lat && z.lon).forEach(z => {
        const color  = RISK_COLOR[z.niveau_risque] || '#69db7c';
        const radius = Math.min(8 + (z.nb_menages || 50) / 25, 28);
        const c = L.circleMarker([z.lat, z.lon], { radius, color, fillColor: color, fillOpacity: 0.35, weight: 2, opacity: 0.8 });
        c.bindPopup(`<div style="font-family:Inter,sans-serif"><b style="color:${color}">${z.zone}</b><br/>${z.niveau_risque} — ${Math.round((z.prob_risque||0)*100)}%</div>`);
        c.bindTooltip(`<b style="color:${color}">${z.zone}</b> — ${Math.round((z.prob_risque||0)*100)}%`, { sticky: true });
        c.addTo(map);
        allPts.push([z.lat, z.lon]);
      });
    }
    if (showAnomalies) {
      anomalies.filter(a => a.lat && a.lon).forEach(a => {
        const color  = STATUS_COLOR[a.status] || '#74c0fc';
        const radius = Math.min(5 + (a.anom_counts || 0) * 0.3, 18);
        const c = L.circleMarker([a.lat, a.lon], { radius, color, fillColor: color, fillOpacity: 0.6, weight: 2, opacity: 0.9 });
        c.bindPopup(`<div style="font-family:Inter,sans-serif"><b style="color:${color}">${a.nom}</b><br/>${a.status} — ${a.anom_counts} anomalies</div>`);
        c.bindTooltip(`<b style="color:${color}">${a.nom}</b> — ${a.status}`, { sticky: true });
        c.addTo(map);
        allPts.push([a.lat, a.lon]);
      });
    }
    if (allPts.length > 0) {
      try { map.fitBounds(allPts, { padding: [30, 30], maxZoom: 13 }); } catch {}
    }
  }, [zones, anomalies, showZones, showAnomalies]);

  return (
    <div style={{ position: 'relative', height, borderRadius: 12, overflow: 'hidden' }}>
      {/* Carte */}
      <div ref={containerRef} style={{ height: '100%', width: '100%', background: 'var(--dtk-bg)' }} />

      {/* Légende */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: 'var(--dtk-navbar)', border: '1px solid var(--dtk-vmuted)',
        borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(10px)',
        minWidth: 130, pointerEvents: 'none',
      }}>
        {showZones && (<>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--dtk-muted)', marginBottom: 8 }}>
            Zones — Risque
          </div>
          {Object.entries(RISK_COLOR).map(([label, color]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}80` }} />
              <span style={{ fontSize: 11, color: 'var(--dtk-sub)' }}>{label}</span>
            </div>
          ))}
        </>)}
        {showAnomalies && (<>
          <div style={{ height: 1, background: 'var(--dtk-panel)', margin: '8px 0' }} />
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--dtk-muted)', marginBottom: 8 }}>
            Anomalies trafic
          </div>
          {[['#ff4444','CRITIQUE'],['#ffa94d','ÉLEVÉ'],['#74c0fc','MODÉRÉ']].map(([c, l]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
              <span style={{ fontSize: 11, color: 'var(--dtk-sub)' }}>{l}</span>
            </div>
          ))}
        </>)}
      </div>
    </div>
  );
}
