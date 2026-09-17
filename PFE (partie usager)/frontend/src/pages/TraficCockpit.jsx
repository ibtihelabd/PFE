/**
 * TraficCockpit — Version native React du sheet Knowage "Trafic".
 * Reprend les 6 widgets (+ carte) après les corrections appliquées cette
 * session sur les données sous-jacentes (troncature des libellés, mapping
 * zone/catégorie, type de graphique Sites de comptage / Points de saturation).
 */
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useTheme } from '../theme';
import ChartCard, { tooltipStyle } from '../components/ChartCard';
import SitesComptageMap from '../components/SitesComptageMap';
import { colorAt } from '../data/chartPalette';
import {
  SITES_COMPTAGE, EVOLUTION_HORAIRE, EVOLUTION_DEPLACEMENTS, FLUX_ZONES, SENS_CIRCULATION,
} from '../data/traficData';

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const iv = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

// Vue triée par volume décroissant pour les deux graphiques "sites"
const SITES_SORTED = [...SITES_COMPTAGE].sort((a, b) => b.volume_total - a.volume_total);

export default function TraficCockpit() {
  const { theme } = useTheme();
  const tt = tooltipStyle(theme);

  return (
    <motion.div variants={cv} initial="hidden" animate="visible" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title="Évolution horaire du trafic — pics de saturation" subtitle="Volume total (véhicules), comptages routiers 7h–19h">
          <ResponsiveContainer>
            <LineChart data={EVOLUTION_HORAIRE}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="heure" tick={{ fill: theme.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="volume" name="Volume" stroke={theme.accent} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title="Évolution des déplacements au fil de la journée" subtitle="Nombre de déplacements EMD par heure (0h–23h)">
          <ResponsiveContainer>
            <LineChart data={EVOLUTION_DEPLACEMENTS}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="heure" tick={{ fill: theme.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="nb" name="Déplacements" stroke={theme.blue} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title="Sites de comptage : analyse détaillée des volumes" subtitle={`${SITES_COMPTAGE.length} sites — volume total (véhicules)`} height={340}>
          <ResponsiveContainer>
            <BarChart data={SITES_SORTED} margin={{ bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="site" tick={{ fill: theme.muted, fontSize: 9 }} angle={-60} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="volume_total" name="Volume" fill={theme.orange} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title="Points de saturation : volume de trafic par site de comptage" subtitle="Mêmes données que ci-dessus — vue dédiée « points de saturation »" height={340}>
          <ResponsiveContainer>
            <BarChart data={SITES_SORTED} margin={{ bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="site" tick={{ fill: theme.muted, fontSize: 9 }} angle={-60} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="volume_total" name="Volume" fill={theme.red} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '2 1 520px' }}>
        <ChartCard title="Flux de déplacement inter-zones" subtitle="Volume total entrant + sortant par zone (15 zones)" height={340}>
          <ResponsiveContainer>
            <BarChart data={FLUX_ZONES} margin={{ bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="zone" tick={{ fill: theme.muted, fontSize: 9 }} angle={-60} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="flux_total" name="Flux total" fill={theme.purple} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 320px' }}>
        <ChartCard title="Répartition du trafic par sens de circulation" height={280}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={SENS_CIRCULATION} dataKey="value" nameKey="label" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {SENS_CIRCULATION.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
              </Pie>
              <Tooltip {...tt} />
              <Legend wrapperStyle={{ fontSize: 11, color: theme.text }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title={`Carte du trafic : localisation et volume par site (${SITES_COMPTAGE.length} sites GPS)`} height={420}>
          <SitesComptageMap sites={SITES_COMPTAGE} height={420} />
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
