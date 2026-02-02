import { Activity, AlertTriangle, Zap, ArrowRight } from 'lucide-react';
import { NavigateFunction } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Contract, ForecastData } from '../../types/legalPulse';
import styles from '../../pages/LegalPulse.module.css';

interface ForecastTabProps {
  selectedContract: Contract;
  onNavigate: NavigateFunction;
  forecastData: ForecastData | null;
  forecastLoading: boolean;
  forecastError: string | null;
  fetchForecast: (contractId: string) => void;
}

export default function ForecastTab({
  selectedContract,
  onNavigate,
  forecastData,
  forecastLoading,
  forecastError,
  fetchForecast
}: ForecastTabProps) {
  if (!selectedContract.legalPulse) {
    return (
      <div className={styles.forecastTab}>
        <div className={styles.noAnalysisState}>
          <div className={styles.noAnalysisIcon} style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' }}>
            <Zap size={32} color="#8b5cf6" />
          </div>
          <h3>ML-Prognose benötigt Analyse-Daten</h3>
          <p>Die KI-basierte Risikovorhersage benötigt eine abgeschlossene Vertragsanalyse als Grundlage. Nach der Analyse werden Prognosen für die nächsten 6 Monate erstellt.</p>
          <div className={styles.noAnalysisFeatures}>
            <div className={styles.noAnalysisFeature}>
              <Activity size={18} color="#8b5cf6" />
              <span>6-Monats-Prognose</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span>Risiko-Trends</span>
            </div>
            <div className={styles.noAnalysisFeature}>
              <Zap size={18} color="#3b82f6" />
              <span>KI-Konfidenzwerte</span>
            </div>
          </div>
          <button
            className={styles.noAnalysisCta}
            onClick={() => onNavigate(`/contracts`)}
          >
            <Zap size={16} />
            Vertrag analysieren
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.forecastTab}>
      <div className={styles.sectionHeader}>
        <h3>ML-Prognose</h3>
        <p>KI-basierte Vorhersagen für Risiken und Vertragsentwicklung</p>
      </div>

      {/* Loading State */}
      {forecastLoading && (
        <div className={styles.forecastLoading}>
          <div className={styles.loadingSpinner}></div>
          <p>Prognose wird berechnet...</p>
        </div>
      )}

      {/* Error State */}
      {forecastError && !forecastLoading && (
        <div className={styles.forecastError}>
          <div className={styles.infoBox} style={{ borderColor: '#ef4444', background: '#fef2f2' }}>
            <div className={styles.infoIcon}>⚠️</div>
            <div className={styles.infoContent}>
              <h4>Prognose nicht verfügbar</h4>
              <p>{forecastError}</p>
              <button
                className={styles.retryButton}
                onClick={() => fetchForecast(selectedContract._id)}
              >
                Erneut versuchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Data */}
      {forecastData && !forecastLoading && (
        <>
          {/* Forecast Overview Cards */}
          <div className={styles.forecastCards}>
            <div className={styles.forecastCard}>
              <div className={styles.cardIcon}>🎯</div>
              <div className={styles.cardContent}>
                <h4>Risiko-Trend (6 Monate)</h4>
                <div className={styles.cardValue} style={{
                  color: forecastData.summary.trend === 'increasing' ? '#ef4444' :
                         forecastData.summary.trend === 'stable' ? '#f59e0b' : '#10b981'
                }}>
                  {forecastData.summary.trend === 'increasing' ? '↑ Steigend' :
                   forecastData.summary.trend === 'stable' ? '→ Stabil' : '↓ Sinkend'}
                </div>
                <p className={styles.cardDescription}>
                  Durchschnittliches Risiko: {forecastData.summary.avgRisk}/100
                </p>
              </div>
            </div>
            <div className={styles.forecastCard}>
              <div className={styles.cardIcon}>⚠️</div>
              <div className={styles.cardContent}>
                <h4>Kritische Monate</h4>
                <div className={styles.cardValue} style={{
                  color: forecastData.summary.criticalMonths > 2 ? '#ef4444' :
                         forecastData.summary.criticalMonths > 0 ? '#f59e0b' : '#10b981'
                }}>
                  {forecastData.summary.criticalMonths} von 6
                </div>
                <p className={styles.cardDescription}>
                  Maximales Risiko: {forecastData.summary.maxRisk}/100
                </p>
              </div>
            </div>
            <div className={styles.forecastCard}>
              <div className={styles.cardIcon}>📊</div>
              <div className={styles.cardContent}>
                <h4>Modell-Typ</h4>
                <div className={styles.cardValue}>
                  {forecastData.forecastMethod === 'ml' ? '🧠 Machine Learning' : '📈 Heuristik'}
                </div>
                <p className={styles.cardDescription}>
                  Konfidenz: {forecastData.forecast[0]?.confidence
                    ? `${Math.round(forecastData.forecast[0].confidence * 100)}%`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Recommendation Box */}
          <div className={styles.mlStatus}>
            <div className={styles.infoBox}>
              <div className={styles.infoIcon}>💡</div>
              <div className={styles.infoContent}>
                <h4>Empfehlung</h4>
                <p>{forecastData.summary.recommendation}</p>
                {forecastData.summary.highProbabilityEvents > 0 && (
                  <p className={styles.infoNote}>
                    {forecastData.summary.highProbabilityEvents} wahrscheinliche Events in den nächsten 6 Monaten erwartet.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Forecast Chart */}
          <div className={styles.forecastSection}>
            <h4>📅 6-Monats-Prognose</h4>
            <div className={styles.forecastChart}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecastData.forecast}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(month) => `Monat ${month}`}
                  />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number, name: string) => [
                      `${Math.round(value)}/100`,
                      name === 'predictedRisk' ? 'Risiko' : 'Gesundheit'
                    ]}
                    labelFormatter={(month) => `Monat ${month}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedRisk"
                    stroke="#ef4444"
                    fill="#fef2f2"
                    strokeWidth={2}
                    name="Risiko"
                  />
                  <Area
                    type="monotone"
                    dataKey="predictedHealth"
                    stroke="#10b981"
                    fill="#ecfdf5"
                    strokeWidth={2}
                    name="Gesundheit"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Predicted Events Timeline */}
          {forecastData.forecast.some(f => f.events && f.events.length > 0) && (
            <div className={styles.forecastSection}>
              <h4>🔮 Vorhergesagte Events</h4>
              <div className={styles.eventsTimeline}>
                {forecastData.forecast.map((month, idx) => (
                  month.events && month.events.length > 0 && (
                    <div key={idx} className={styles.eventMonth}>
                      <div className={styles.eventMonthHeader}>
                        <span className={styles.monthLabel}>Monat {month.month}</span>
                        <span className={styles.eventDate}>
                          {new Date(month.date).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      {month.events.map((event, eventIdx) => (
                        <div
                          key={eventIdx}
                          className={styles.eventItem}
                          style={{
                            borderLeftColor: event.severity === 'critical' ? '#ef4444' :
                                             event.severity === 'high' ? '#f59e0b' :
                                             event.severity === 'medium' ? '#3b82f6' : '#10b981'
                          }}
                        >
                          <div className={styles.eventType}>
                            {event.type === 'law_change' ? '⚖️' :
                             event.type === 'expiry' ? '📅' :
                             event.type === 'deadline' ? '⏰' : '📊'} {event.type}
                          </div>
                          <div className={styles.eventDescription}>{event.description}</div>
                          <div className={styles.eventProbability}>
                            Wahrscheinlichkeit: {Math.round(event.probability * 100)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No contract selected */}
      {!selectedContract && !forecastLoading && (
        <div className={styles.mlStatus}>
          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>ℹ️</div>
            <div className={styles.infoContent}>
              <h4>Kein Vertrag ausgewählt</h4>
              <p>Wählen Sie einen Vertrag aus der Liste, um die ML-Prognose anzuzeigen.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
