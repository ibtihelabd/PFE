/**
 * ExportPDF — Génère un rapport PDF professionnel depuis les données de l'API
 * Utilise jsPDF + html2canvas (pas de dépendance serveur)
 * Installation : npm install jspdf html2canvas
 */
import { useState } from 'react';
import { FileDown, Loader } from 'lucide-react';

const ACCENT = '#ff6b35';

export default function ExportPDF({ type = 'zones', data = {}, label = 'Exporter PDF' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const W = 210, margin = 18;
      let y = 0;

      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      // ── Palette ──
      const rgb = {
        dark:   [10,  13,  20],
        panel:  [22,  26,  38],
        accent: [255, 107, 53],
        blue:   [116, 192, 252],
        red:    [255, 107, 107],
        orange: [255, 169, 77],
        green:  [105, 219, 124],
        purple: [218, 119, 242],
        white:  [255, 255, 255],
        muted:  [140, 150, 170],
      };

      const setFill  = (c) => doc.setFillColor(...c);
      const setDraw  = (c) => doc.setDrawColor(...c);
      const setTxt   = (c) => doc.setTextColor(...c);
      const setFont  = (size, style = 'normal') => { doc.setFontSize(size); doc.setFont('helvetica', style); };

      // ══ FOND ══
      setFill(rgb.dark); doc.rect(0, 0, W, 297, 'F');

      // ══ HEADER BANNER ══
      setFill(rgb.panel); doc.rect(0, 0, W, 42, 'F');
      setFill(rgb.accent); doc.rect(0, 0, 5, 42, 'F');

      // Logo texte
      setFont(16, 'bold'); setTxt(rgb.white);
      doc.text('Transport', margin, 16);
      setTxt(rgb.accent);
      doc.text('Dakar', margin + 28, 16);

      setFont(8); setTxt(rgb.muted);
      doc.text('CETUD · Système Décisionnel · PFE 2026', margin, 23);

      // Badge type rapport
      const badgeLabel = type === 'zones' ? 'RAPPORT INACCESSIBILITÉ' : 'RAPPORT ANOMALIES TRAFIC';
      const badgeColor = type === 'zones' ? rgb.red : rgb.blue;
      setFill(badgeColor); doc.roundedRect(margin, 28, 68, 8, 2, 2, 'F');
      setFont(7, 'bold'); setTxt(rgb.white);
      doc.text(badgeLabel, margin + 3, 33.5);

      // Date
      setFont(8); setTxt(rgb.muted);
      doc.text(`Généré le ${dateStr} à ${timeStr}`, W - margin, 16, { align: 'right' });

      y = 52;

      // ══ TITRE PRINCIPAL ══
      setFont(18, 'bold'); setTxt(rgb.white);
      if (type === 'zones') {
        doc.text("Analyse des zones à risque", margin, y);
        y += 8;
        setTxt(rgb.red);
        doc.text("d'inaccessibilité — Dakar", margin, y);
      } else {
        doc.text("Détection des anomalies", margin, y);
        y += 8;
        setTxt(rgb.blue);
        doc.text("de trafic — Réseau Dakar", margin, y);
      }
      y += 12;

      // ══ KPI CARDS (4 colonnes) ══
      const kpis = type === 'zones'
        ? [
            { label: 'Zones analysées',    val: data.total_zones || 41,             color: rgb.blue   },
            { label: 'Risque ÉLEVÉ',       val: data.zones_elevees || 0,            color: rgb.red    },
            { label: 'Risque MODÉRÉ',      val: data.zones_moderees || 0,           color: rgb.orange },
            { label: 'Risque FAIBLE',      val: data.zones_faibles || 0,            color: rgb.green  },
          ]
        : [
            { label: 'Observations',       val: data.total || 0,                    color: rgb.blue   },
            { label: 'Anomalies consensus',val: data.anomalies || 0,               color: rgb.red    },
            { label: 'Sites à risque',     val: data.sites_at_risk || 0,           color: rgb.orange },
            { label: 'Taux anomalies',     val: data.total ? `${((data.anomalies/data.total)*100).toFixed(1)}%` : '—', color: rgb.purple },
          ];

      const kpiW = (W - margin * 2 - 9) / 4;
      kpis.forEach((kpi, i) => {
        const x = margin + i * (kpiW + 3);
        setFill(rgb.panel); doc.roundedRect(x, y, kpiW, 22, 3, 3, 'F');
        setFill(kpi.color.map(v => Math.round(v * 0.3)));
        doc.roundedRect(x, y, 3, 22, 1, 1, 'F');
        setFont(14, 'bold'); setTxt(kpi.color);
        doc.text(String(kpi.val), x + 6, y + 10);
        setFont(7); setTxt(rgb.muted);
        doc.text(kpi.label, x + 6, y + 17);
      });
      y += 30;

      if (type === 'zones') {
        // ══ TOP ZONES À RISQUE ══
        setFont(10, 'bold'); setTxt(rgb.white);
        doc.text('Zones prioritaires — Classement par niveau de risque', margin, y);
        y += 6;

        // Ligne séparatrice
        setDraw(rgb.panel); doc.setLineWidth(0.3);
        doc.line(margin, y, W - margin, y);
        y += 5;

        // En-têtes tableau
        const cols = [
          { label: '#',            w: 10, x: margin },
          { label: 'Zone / Strate', w: 65, x: margin + 10 },
          { label: 'Niveau',        w: 25, x: margin + 75 },
          { label: 'Probabilité',   w: 22, x: margin + 100 },
          { label: 'Ménages',       w: 20, x: margin + 122 },
          { label: '% à risque',    w: 20, x: margin + 142 },
          { label: 'TC dispo.',     w: 18, x: margin + 162 },
        ];

        setFill(rgb.panel); doc.rect(margin, y - 3, W - margin * 2, 8, 'F');
        setFont(7, 'bold'); setTxt(rgb.muted);
        cols.forEach(c => doc.text(c.label.toUpperCase(), c.x + 1, y + 2));
        y += 8;

        const NIVEAU_COLOR = { 'ÉLEVÉ': rgb.red, 'MODÉRÉ': rgb.orange, 'FAIBLE': rgb.green };
        const topZones = (data.zones || []).slice(0, 20);

        topZones.forEach((z, i) => {
          if (y > 265) { doc.addPage(); setFill(rgb.dark); doc.rect(0,0,W,297,'F'); y = 20; }

          if (i % 2 === 0) { setFill([15,18,28]); doc.rect(margin, y - 3, W - margin * 2, 8, 'F'); }

          const nColor = NIVEAU_COLOR[z.niveau_risque] || rgb.green;
          const probPct = Math.round((z.prob_risque || 0) * 100);

          setFont(7); setTxt(rgb.muted);
          doc.text(String(z.rang || i + 1), cols[0].x + 1, y + 2);

          setTxt(rgb.white);
          const zoneName = (z.zone || '').length > 28 ? (z.zone || '').slice(0, 27) + '…' : (z.zone || '');
          doc.text(zoneName, cols[1].x + 1, y + 2);

          // Badge niveau
          setFill(nColor.map(v => Math.round(v * 0.2)));
          doc.roundedRect(cols[2].x, y - 2, 22, 6, 1.5, 1.5, 'F');
          setFont(6, 'bold'); setTxt(nColor);
          doc.text(z.niveau_risque || '', cols[2].x + 2, y + 2);

          // Barre probabilité
          setFont(7, 'bold'); setTxt(nColor);
          doc.text(`${probPct}%`, cols[3].x + 1, y + 2);
          setFill([30,35,50]); doc.roundedRect(cols[3].x + 12, y - 1, 8, 3.5, 1, 1, 'F');
          setFill(nColor); doc.roundedRect(cols[3].x + 12, y - 1, 8 * probPct / 100, 3.5, 1, 1, 'F');

          setFont(7); setTxt(rgb.muted);
          doc.text(String(z.nb_menages || ''), cols[4].x + 1, y + 2);
          doc.text(`${(z.pct_risque || 0).toFixed(1)}%`, cols[5].x + 1, y + 2);
          doc.text((z.tc_disponibles || 0).toFixed(1), cols[6].x + 1, y + 2);

          y += 8;
        });

        y += 8;

        // ══ TOP 5 ZONES PRIORITAIRES (encadré) ══
        if (y < 220 && data.top5_risque?.length) {
          setFill(rgb.panel); doc.roundedRect(margin, y, W - margin * 2, 48, 3, 3, 'F');
          setFill(rgb.red.map(v => Math.round(v * 0.3)));
          doc.roundedRect(margin, y, 3, 48, 1, 1, 'F');

          setFont(8, 'bold'); setTxt(rgb.white);
          doc.text('🚨  TOP 5 ZONES PRIORITAIRES — INTERVENTION RECOMMANDÉE', margin + 7, y + 8);

          data.top5_risque.slice(0, 5).forEach((z, i) => {
            const cx = margin + 7 + i * 37;
            setFont(11, 'bold'); setTxt(rgb.red);
            doc.text(`${Math.round((z.prob_risque || 0) * 100)}%`, cx, y + 20);
            setFont(6); setTxt(rgb.muted);
            const name = (z.zone || '').slice(0, 14);
            doc.text(name, cx, y + 27);
            setFont(6, 'bold'); setTxt(rgb.orange);
            doc.text(z.niveau_risque || '', cx, y + 33);
          });

          y += 55;
        }

      } else {
        // ══ TOP SITES ANOMALIES ══
        setFont(10, 'bold'); setTxt(rgb.white);
        doc.text('Sites de comptage les plus anormaux', margin, y);
        y += 8;

        const topSites = (data.top_sites || []).slice(0, 15);
        topSites.forEach((s, i) => {
          if (y > 265) { doc.addPage(); setFill(rgb.dark); doc.rect(0,0,W,297,'F'); y = 20; }
          if (i % 2 === 0) { setFill([15,18,28]); doc.rect(margin, y - 3, W - margin*2, 8, 'F'); }

          setFont(7); setTxt(rgb.white);
          const nm = (s.Description_site_comptage || '').slice(0, 45);
          doc.text(nm, margin + 2, y + 2);
          setTxt(rgb.red); setFont(7, 'bold');
          doc.text(`${s.count} anomalies`, W - margin - 30, y + 2);
          setFont(7); setTxt(rgb.muted);
          doc.text(`Vol. max: ${s.max_vol}`, W - margin - 30, y + 6);
          y += 9;
        });
      }

      // ══ SECTION RECOMMANDATIONS ══
      if (y > 245) { doc.addPage(); setFill(rgb.dark); doc.rect(0,0,W,297,'F'); y = 20; }

      setFill(rgb.panel); doc.roundedRect(margin, y, W - margin * 2, 38, 3, 3, 'F');
      setFill(rgb.blue.map(v => Math.round(v * 0.3)));
      doc.roundedRect(margin, y, 3, 38, 1, 1, 'F');

      setFont(9, 'bold'); setTxt(rgb.white);
      doc.text('Recommandations opérationnelles', margin + 7, y + 9);

      const recos = type === 'zones'
        ? [
            `• Déployer des dessertes TC complémentaires sur les ${data.zones_elevees || 0} zones à risque élevé identifiées.`,
            `• Coordonner avec la DGI pour les zones inondables avant la saison des pluies.`,
            `• Inscrire les zones enclavées dans le Programme de Modernisation des Transports (PMT).`,
          ]
        : [
            `• Renforcer la surveillance sur les ${data.sites_at_risk || 0} sites à comportement anormal détectés.`,
            `• Déployer des patrouilles régulatrices aux créneaux horaires identifiés comme critiques.`,
            `• Coordonner avec les autorités pour les axes saturés (Corniche, Port, Aéroport).`,
          ];

      setFont(7); setTxt(rgb.muted);
      recos.forEach((r, i) => { doc.text(r, margin + 7, y + 17 + i * 7); });
      y += 45;

      // ══ FOOTER ══
      const dataYear = type === 'zones' ? '2015' : '2019';
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        setFill(rgb.panel); doc.rect(0, 285, W, 12, 'F');
        setFill(rgb.accent); doc.rect(0, 285, 5, 12, 'F');
        setFont(7); setTxt(rgb.muted);
        doc.text(`TransportDakar — PFE 2026 · CETUD · Données EMD ${dataYear}`, margin, 292);
        doc.text(`Page ${p} / ${totalPages}`, W - margin, 292, { align: 'right' });
      }

      const filename = type === 'zones'
        ? `rapport_zones_risque_${new Date().toISOString().slice(0,10)}.pdf`
        : `rapport_anomalies_trafic_${new Date().toISOString().slice(0,10)}.pdf`;

      doc.save(filename);
    } catch (err) {
      console.error('Erreur PDF:', err);
      alert('Erreur lors de la génération du PDF. Vérifiez que jsPDF est installé : npm install jspdf');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleExport} disabled={loading} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(255,107,53,0.3)',
      background: loading ? 'rgba(255,107,53,0.1)' : 'rgba(255,107,53,0.12)',
      color: loading ? 'rgba(255,107,53,0.5)' : '#ff6b35',
      fontSize: 12, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,107,53,0.22)'; e.currentTarget.style.borderColor = 'rgba(255,107,53,0.5)'; }}}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,53,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,107,53,0.3)'; }}
    >
      {loading
        ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Génération...</>
        : <><FileDown size={13} /> {label}</>
      }
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </button>
  );
}
