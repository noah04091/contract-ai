// 📁 frontend/src/hooks/useCelebration.ts
// 🎉 Enterprise Celebration System - Premium Feel

import confetti from 'canvas-confetti';
import { useCallback } from 'react';

// Celebration Types
export type CelebrationType =
  | 'onboarding-complete'
  | 'first-upload'
  | 'first-analysis'
  | 'checklist-complete'
  | 'milestone'
  | 'achievement';

// Achievement definitions
//
// Ton (überarbeitet 23.08.2026): ruhig und deutsch statt Ausrufezeichen und
// Denglisch. Die Meldung erscheint jetzt auf einer hellen Karte, da wirkt
// "Achievement freigeschaltet!" fehl am Platz.
//
// Wichtig bei 'onboarding-complete': Der Text darf NICHT behaupten, die
// Einrichtung sei fertig. Diese Meldung kommt nach der Einführungstour,
// während der Erststart-Bereich auf dem Dashboard noch bei 2 von 4 steht.
// Vorher stand hier "Du hast das Onboarding abgeschlossen", was sich direkt
// widersprach.
export const ACHIEVEMENTS = {
  'onboarding-complete': {
    title: 'Willkommen an Bord',
    description: 'Alles Weitere findest du auf deinem Dashboard',
    icon: '🚀'
  },
  'first-upload': {
    title: 'Erster Vertrag gespeichert',
    description: 'Er liegt jetzt sicher in deiner Verwaltung',
    icon: '📄'
  },
  'first-analysis': {
    title: 'Erste Analyse fertig',
    description: 'Risiken und Fristen sind ausgewertet',
    icon: '🔍'
  },
  'checklist-complete': {
    title: 'Einrichtung abgeschlossen',
    description: 'Du hast alle Schritte erledigt',
    icon: '✅'
  },
  'milestone': {
    title: 'Meilenstein erreicht',
    description: 'Du machst gute Fortschritte',
    icon: '🏆'
  },
  'achievement': {
    title: 'Geschafft',
    description: 'Weiter so',
    icon: '⭐'
  }
} as const;

// Premium confetti configurations
const confettiConfigs = {
  // Standard celebration - colorful burst
  standard: () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  },

  // Fireworks - multiple bursts
  fireworks: () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: ReturnType<typeof setInterval> = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Random positions
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  },

  // Stars - golden stars falling
  stars: () => {
    const defaults: confetti.Options = {
      spread: 360,
      ticks: 100,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFB347'],
      shapes: ['star'] as confetti.Shape[],
      zIndex: 9999
    };

    function shoot() {
      confetti({
        ...defaults,
        particleCount: 40,
        scalar: 1.2,
        origin: { x: 0.5, y: 0.5 }
      });

      confetti({
        ...defaults,
        particleCount: 20,
        scalar: 0.75,
        origin: { x: 0.5, y: 0.5 }
      });
    }

    setTimeout(shoot, 0);
    setTimeout(shoot, 100);
    setTimeout(shoot, 200);
  },

  // Side cannons - burst from both sides
  sideCannons: () => {
    const end = Date.now() + 1000;
    // Markenfarben: Blau führt, Grün für Erledigtes, Orange für Fristen.
    // Das frühere Lila (#8B5CF6) gehört nicht zur Palette.
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#60A5FA'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors,
        zIndex: 9999
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors,
        zIndex: 9999
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  },

  // Subtle - minimal, professional
  subtle: () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#3B82F6', '#60A5FA', '#93C5FD'],
      zIndex: 9999
    });
  }
};

// Map celebration types to confetti effects
const celebrationToEffect: Record<CelebrationType, keyof typeof confettiConfigs> = {
  'onboarding-complete': 'fireworks',
  'first-upload': 'standard',
  'first-analysis': 'stars',
  'checklist-complete': 'sideCannons',
  'milestone': 'standard',
  'achievement': 'subtle'
};

export function useCelebration() {
  // Trigger a celebration with confetti
  const celebrate = useCallback((type: CelebrationType) => {
    const effect = celebrationToEffect[type];
    const config = confettiConfigs[effect];

    if (config) {
      config();
    }
  }, []);

  // Get achievement info
  const getAchievement = useCallback((type: CelebrationType) => {
    return ACHIEVEMENTS[type];
  }, []);

  // Celebrate with custom options
  const customCelebration = useCallback((options: confetti.Options) => {
    confetti({
      zIndex: 9999,
      ...options
    });
  }, []);

  return {
    celebrate,
    getAchievement,
    customCelebration,
    // Direct access to effects
    effects: {
      standard: confettiConfigs.standard,
      fireworks: confettiConfigs.fireworks,
      stars: confettiConfigs.stars,
      sideCannons: confettiConfigs.sideCannons,
      subtle: confettiConfigs.subtle
    }
  };
}

export default useCelebration;
