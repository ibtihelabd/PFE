/**
 * AccessibiliteCockpit — Version native React du sheet Knowage "Accessibilite".
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
  PROBLEMES_ACCES, INONDATIONS, RECLAMATIONS_TRANSPORT, NIVEAU_ACCESSIBILITE,
} from '../data/accessibiliteData';

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const iv = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

export default function AccessibiliteCockpit() {
  const { theme } = useTheme();
  const tt = tooltipStyle(theme);

  return (
    <motion.div variants={cv} initial="hidden" animate="visible" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Problèmes d'accès identifiés par type" height={280}>
          <ResponsiveContainer>
            <BarChart data={PROBLEMES_ACCES}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="nb" name="Réponses" fill={theme.red} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Inondations : fréquence signalée par les usagers" height={280}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={INONDATIONS} dataKey="nb" nameKey="label" innerRadius={50} outerRadius={95} paddingAngle={2}>
                {INONDATIONS.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
              </Pie>
              <Tooltip {...tt} />
              <Legend wrapperStyle={{ fontSize: 10.5, color: theme.text }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Réclamations liées au manque de transport" height={280}>
          <ResponsiveContainer>
            <BarChart data={RECLAMATIONS_TRANSPORT}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="nb" name="Réponses" fill={theme.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>

      <motion.div variants={iv} style={{ flex: '1 1 380px' }}>
        <ChartCard title="Niveau d'accessibilité aux services" height={280}>
          <ResponsiveContainer>
            <BarChart data={NIVEAU_ACCESSIBILITE}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="label" tick={{ fill: theme.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: theme.muted, fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="nb" name="Réponses" radius={[4, 4, 0, 0]}>
                {NIVEAU_ACCESSIBILITE.map((_, i) => <Cell key={i} fill={colorAt(i)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </motion.div>
    </motion.div>
  );
}
