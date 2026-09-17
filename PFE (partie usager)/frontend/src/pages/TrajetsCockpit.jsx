/**
 * TrajetsCockpit — Version native React du sheet Knowage "Trajets" (Déplacements).
 * Les deux sélecteurs Zone/Département et Mode de transport ont été retirés :
 * ils étaient purement cosmétiques dans Knowage (aucun cross-filtering
 * configuré sur le document, vérifié cette session — `cross` vide sur les
 * 5 widgets du sheet).
 */
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useTheme } from '../theme';
import ChartCard, { tooltipStyle } from '../components/ChartCard';
import { colorAt } from '../data/chartPalette';
import {
  MOTIF_TOP10, DUREE_PAR_MOTIF, COUT_PAR_MODE, PICS_AFFLUENCE, MODAL_SPLIT_COMPLET,
} from '../data/trajetsData';

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const iv = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function TrajetsCockpit() {
  const { theme } = useTheme();
  const tt = tooltipStyle(theme);

  return (
    <motion.div variants={cv} initial="hidden" animate="visible" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <motion.div variants={iv} style={{ flex: '1 1 480px' }}>
        <ChartCard title="Répartition des déplacements par motif" subtitle="Top 10 motifs (nombre de déplacements)" height={340}>
          <ResponsiveContainer>
            <BarChart data={MOTIF_TOP10} margin={{ bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="motif" tick={{ fill: theme.muted, fontSize: 9 }} angle={-45} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="nb" name="Déplacements" fill={theme.accent} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Répartition modale des déplacements" subtitle="19 modes de transport (EMD 2015)" height={340}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={MODAL_SPLIT_COMPLET} dataKey="nb" nameKey="mode" outerRadius={110} paddingAngle={1}>
                {MODAL_SPLIT_COMPLET.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
              </Pie>
              <Tooltip {...tt} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 480px' }}>
        <ChartCard title="Durée moyenne de déplacement par motif (min)" subtitle="Mêmes 10 motifs" height={340}>
          <ResponsiveContainer>
            <BarChart data={DUREE_PAR_MOTIF} margin={{ bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="motif" tick={{ fill: theme.muted, fontSize: 9 }} angle={-45} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="duree" name="Durée (min)" fill={theme.blue} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 480px' }}>
        <ChartCard title="Coût moyen par mode de transport (FCFA)" subtitle="Top 10 modes" height={340}>
          <ResponsiveContainer>
            <BarChart data={COUT_PAR_MODE} margin={{ bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="mode" tick={{ fill: theme.muted, fontSize: 9 }} angle={-45} textAnchor="end" interval={0} height={90} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="cout" name="Coût (FCFA)" fill={theme.green} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title="Pics d'affluence aux heures de pointe" height={300}>
          <ResponsiveContainer>
            <BarChart data={PICS_AFFLUENCE}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="periode" tick={{ fill: theme.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="nb" name="Déplacements" radius={[4, 4, 0, 0]}>
                {PICS_AFFLUENCE.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
