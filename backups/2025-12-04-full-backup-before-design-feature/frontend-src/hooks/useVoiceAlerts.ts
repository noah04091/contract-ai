// 📁 frontend/src/hooks/useVoiceAlerts.ts
// Legal Pulse 2.0 Phase 3 - Voice Alert System

import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceAlertOptions {
  enabled?: boolean;
  voice?: 'male' | 'female' | 'auto';
  rate?: number; // 0.1 to 10, default 1
  pitch?: number; // 0 to 2, default 1
  volume?: number; // 0 to 1, default 1
  lang?: string; // e.g., 'de-DE', 'en-US'
}

interface VoiceAlert {
  text: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  priority?: number; // 1 (low) to 5 (critical)
}

export const useVoiceAlerts = (options: VoiceAlertOptions = {}) => {
  const {
    enabled = true,
    voice = 'auto',
    rate = 1,
    pitch = 1,
    volume = 0.8,
    lang = 'de-DE'
  } = options;

  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const queueRef = useRef<VoiceAlert[]>([]);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      synthRef.current = window.speechSynthesis;

      // Load voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };

      loadVoices();

      // Some browsers load voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      // Cleanup on unmount
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  /**
   * Select voice based on preferences
   */
  const selectVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (availableVoices.length === 0) return null;

    // Try to find German voice
    const germanVoices = availableVoices.filter(v => v.lang.startsWith('de'));

    if (voice === 'female') {
      const femaleVoice = germanVoices.find(v =>
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('anna') ||
        v.name.toLowerCase().includes('petra')
      );
      if (femaleVoice) return femaleVoice;
    } else if (voice === 'male') {
      const maleVoice = germanVoices.find(v =>
        v.name.toLowerCase().includes('male') ||
        v.name.toLowerCase().includes('markus') ||
        v.name.toLowerCase().includes('hans')
      );
      if (maleVoice) return maleVoice;
    }

    // Default: first German voice or first available voice
    return germanVoices[0] || availableVoices[0];
  }, [availableVoices, voice]);

  /**
   * Speak text
   */
  const speak = useCallback((alert: VoiceAlert) => {
    if (!synthRef.current || !isSupported || !isEnabled) {
      console.warn('[VOICE-ALERTS] Speech synthesis not available or disabled');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(alert.text);

    // Set voice
    const selectedVoice = selectVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Set parameters
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;
    utterance.lang = lang;

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('[VOICE-ALERTS] Speaking:', alert.text);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('[VOICE-ALERTS] Finished speaking');

      // Process queue
      if (queueRef.current.length > 0) {
        const nextAlert = queueRef.current.shift();
        if (nextAlert) {
          setTimeout(() => speak(nextAlert), 500); // Small delay between alerts
        }
      }
    };

    utterance.onerror = (event) => {
      console.error('[VOICE-ALERTS] Speech error:', event.error);
      setIsSpeaking(false);
    };

    // Speak
    synthRef.current.speak(utterance);
  }, [isSupported, isEnabled, selectVoice, rate, pitch, volume, lang]);

  /**
   * Alert with voice
   */
  const alert = useCallback((text: string, severity: VoiceAlert['severity'] = 'medium') => {
    if (!isSupported || !isEnabled) return;

    const voiceAlert: VoiceAlert = {
      text,
      severity,
      priority: severityToPriority(severity)
    };

    // If currently speaking, queue the alert
    if (isSpeaking) {
      queueRef.current.push(voiceAlert);
      // Sort queue by priority
      queueRef.current.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    } else {
      speak(voiceAlert);
    }
  }, [isSupported, isEnabled, isSpeaking, speak]);

  /**
   * Alert for critical issues
   */
  const alertCritical = useCallback((text: string) => {
    // Prefix with urgency indicator
    alert(`Achtung! ${text}`, 'critical');
  }, [alert]);

  /**
   * Alert for high priority
   */
  const alertHigh = useCallback((text: string) => {
    alert(`Wichtig: ${text}`, 'high');
  }, [alert]);

  /**
   * Alert for informational
   */
  const alertInfo = useCallback((text: string) => {
    alert(text, 'low');
  }, [alert]);

  /**
   * Stop speaking and clear queue
   */
  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      queueRef.current = [];
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Pause speaking
   */
  const pause = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.pause();
    }
  }, [isSpeaking]);

  /**
   * Resume speaking
   */
  const resume = useCallback(() => {
    if (synthRef.current && isSpeaking) {
      synthRef.current.resume();
    }
  }, [isSpeaking]);

  /**
   * Enable/disable voice alerts
   */
  const toggle = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  return {
    // State
    isSupported,
    isEnabled,
    isSpeaking,
    availableVoices,

    // Methods
    alert,
    alertCritical,
    alertHigh,
    alertInfo,
    speak,
    stop,
    pause,
    resume,
    toggle,
    setEnabled: setIsEnabled
  };
};

/**
 * Convert severity to priority number
 */
function severityToPriority(severity: VoiceAlert['severity']): number {
  const mapping: Record<string, number> = {
    'low': 1,
    'medium': 3,
    'high': 4,
    'critical': 5
  };
  return mapping[severity || 'medium'];
}

export default useVoiceAlerts;
