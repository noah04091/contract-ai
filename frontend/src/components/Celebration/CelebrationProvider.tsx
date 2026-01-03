// 📁 frontend/src/components/Celebration/CelebrationProvider.tsx
// 🎉 Global Celebration Provider - Trigger celebrations from anywhere

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useCelebration, CelebrationType, ACHIEVEMENTS } from '../../hooks/useCelebration';
import { AchievementToast } from './AchievementToast';

interface CelebrationContextType {
  celebrate: (type: CelebrationType, showToast?: boolean) => void;
  celebrateCustom: (options: {
    title: string;
    description: string;
    icon: string;
    effect?: 'standard' | 'fireworks' | 'stars' | 'sideCannons' | 'subtle';
  }) => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(undefined);

export function useCelebrationContext() {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebrationContext must be used within CelebrationProvider');
  }
  return context;
}

interface CelebrationProviderProps {
  children: ReactNode;
}

export function CelebrationProvider({ children }: CelebrationProviderProps) {
  const { celebrate: triggerConfetti, effects } = useCelebration();
  const [toast, setToast] = useState<{
    isVisible: boolean;
    title: string;
    description: string;
    icon: string;
  }>({
    isVisible: false,
    title: '',
    description: '',
    icon: ''
  });

  // Celebrate with predefined type
  const celebrate = useCallback((type: CelebrationType, showToast = true) => {
    // Trigger confetti
    triggerConfetti(type);

    // Show toast if enabled
    if (showToast) {
      const achievement = ACHIEVEMENTS[type];
      setToast({
        isVisible: true,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon
      });
    }
  }, [triggerConfetti]);

  // Custom celebration
  const celebrateCustom = useCallback((options: {
    title: string;
    description: string;
    icon: string;
    effect?: 'standard' | 'fireworks' | 'stars' | 'sideCannons' | 'subtle';
  }) => {
    const { title, description, icon, effect = 'standard' } = options;

    // Trigger confetti effect
    effects[effect]();

    // Show toast
    setToast({
      isVisible: true,
      title,
      description,
      icon
    });
  }, [effects]);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, isVisible: false }));
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate, celebrateCustom }}>
      {children}
      <AchievementToast
        isVisible={toast.isVisible}
        title={toast.title}
        description={toast.description}
        icon={toast.icon}
        onClose={hideToast}
      />
    </CelebrationContext.Provider>
  );
}

export default CelebrationProvider;
