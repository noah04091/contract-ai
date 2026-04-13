import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import styles from '../../styles/PulseV2.module.css';

interface TimelineEntry {
  date: string;
  score: number;
  risk: number;
  compliance: number;
  delta: number;
  newFindings: { title: string; severity: string }[];
}

interface ScoreTrendProps {
  contractId: string;
}

const API_BASE = '/api';

export const ScoreTrend: React.FC<ScoreTrendProps> = ({ contractId }) => {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/legal-pulse-v2/contract/${contractId}/timeline`, {
          credentials: 'include',
        });
        const data = await res.json();
        setTimeline(data.timeline || []);
      } catch (err) {
        console.error('Timeline load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [contractId]);

  if (loading) return null;
  if (timeline.length < 2) return null; // Need at least 2 points for a trend

  const latest = timeline[timeline.length - 1];
  const previous = timeline[timeline.length - 2];
  const delta = latest.score - previous.score;
  const trendColor = delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#6b7280';
  const trendArrow = delta > 0 ? '\u2191' : delta < 0 ? '\u2193' : '\u2192';

  const chartData = timeline.map(t => ({
    ...t,
    label: new Date(t.date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
  }));

  return (
    <div className={`${styles.sectionCard} ${styles.fadeIn}`} style={{
      background: '#fff',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 16,
      padding: 24,
      marginBottom: 28,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
            Score-Entwicklung
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            {timeline.length} Analysen
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: trendColor }}>
            {trendArrow} {delta > 0 ? '+' : ''}{delta}
          </span>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>
            seit letzter Analyse
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                fontSize: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [`${value}/100`, 'Score']}
              labelFormatter={(label: string) => label}
            />
            <ReferenceLine y={70} stroke="#eab308" strokeDasharray="3 3" />
            <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* New findings from latest analysis */}
      {latest.newFindings && latest.newFindings.length > 0 && (
        <div style={{
          marginTop: 12,
          padding: '10px 12px',
          background: '#fef2f2',
          borderRadius: 8,
          border: '1px solid #fecaca',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>
            Neue Befunde seit letzter Analyse:
          </div>
          {latest.newFindings.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
              {f.severity === 'critical' ? '\u2757' : '\u26a0\ufe0f'} {f.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
