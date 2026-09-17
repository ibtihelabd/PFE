/**
 * DemographieCockpit — Version native React du sheet Knowage "Demographie"
 * (inclut les widgets fusionnés depuis l'ancien sheet "Socio-démographie"
 * cette session : Mobilité selon le sexe / l'activité / l'instruction,
 * Motifs de déplacement les plus fréquents).
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
  PROFIL_SEXE, STATUT_MATRIMONIAL, ORIGINE_NATIONALITE, NIVEAU_INSTRUCTION, PROFIL_ECONOMIQUE,
  MOBILITE_SEXE, MOBILITE_ACTIVITE, MOBILITE_INSTRUCTION, MOTIFS_FREQUENTS,
} from '../data/demographieData';

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

function Pie2({ data, height = 280 }) {
  const { theme } = useTheme();
  const tt = tooltipStyle(theme);
  return (
    <ResponsiveContainer height={height}>
      <PieChart>
        <Pie data={data} dataKey="nb" nameKey="label" innerRadius={50} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
        </Pie>
        <Tooltip {...tt} />
        <Legend wrapperStyle={{ fontSize: 11, color: theme.text }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Bar2({ data, xKey, color, height = 280, angled = false }) {
  const { theme } = useTheme();
  const tt = tooltipStyle(theme);
  return (
    <ResponsiveContainer height={height}>
      <BarChart data={data} margin={angled ? { bottom: 70 } : undefined}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
        <XAxis dataKey={xKey} tick={{ fill: theme.muted, fontSize: 9 }}
          angle={angled ? -45 : 0} textAnchor={angled ? 'end' : 'middle'} interval={0} height={angled ? 90 : 30} />
        <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
        <Tooltip {...tt} />
        <Bar dataKey="nb" name="Effectif" fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DemographieCockpit() {
  const { theme } = useTheme();

  return (
    <motion.div variants={cv} initial="hidden" animate="visible" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <motion.div variants={iv} style={{ flex: '1 1 320px' }}>
        <ChartCard title="Profil de la population par sexe" height={280}><Pie2 data={PROFIL_SEXE} /></ChartCard>
      </motion.div>
      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Statut matrimonial des enquêtés" height={280}><Bar2 data={STATUT_MATRIMONIAL} xKey="label" color={theme.blue} /></ChartCard>
      </motion.div>
      <motion.div variants={iv} style={{ flex: '1 1 320px' }}>
        <ChartCard title="Origine et nationalité des enquêtés" height={280}><Pie2 data={ORIGINE_NATIONALITE} /></ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Niveau d'instruction de la population" height={280}><Bar2 data={NIVEAU_INSTRUCTION} xKey="label" color={theme.green} /></ChartCard>
      </motion.div>
      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Profil économique : activité principale" height={280}><Bar2 data={PROFIL_ECONOMIQUE} xKey="label" color={theme.purple} angled /></ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 320px' }}>
        <ChartCard title="Mobilité selon le sexe" height={280}><Pie2 data={MOBILITE_SEXE} /></ChartCard>
      </motion.div>
      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Mobilité selon l'activité économique" height={280}><Bar2 data={MOBILITE_ACTIVITE} xKey="label" color={theme.orange} angled /></ChartCard>
      </motion.div>
      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Mobilité selon le niveau d'instruction" height={280}><Bar2 data={MOBILITE_INSTRUCTION} xKey="label" color={theme.red} /></ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 100%' }}>
        <ChartCard title="Motifs de déplacement les plus fréquents" subtitle="24 motifs — répartition complète" height={340}>
          <Bar2 data={MOTIFS_FREQUENTS} xKey="motif" color={theme.accent} height={340} angled />
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
