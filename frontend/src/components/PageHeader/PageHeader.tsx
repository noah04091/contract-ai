/**
 * PageHeader - Variante E: Premium Minimal
 *
 * Horizontal, kompakt, professionell
 * Solide Farben, subtile Features, Stripe/Linear-Style
 */

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Circle } from 'lucide-react';
import styles from './PageHeader.module.css';

// Badge variant types
export type BadgeVariant = 'premium' | 'beta' | 'new' | 'pro';

// Icon color variants
export type IconColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'indigo' | 'dark';

// Action button variant
export type ActionVariant = 'primary' | 'secondary' | 'ghost';

// Badge configuration
export interface PageHeaderBadge {
  text: string;
  variant: BadgeVariant;
}

// Action button configuration
export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: ActionVariant;
  disabled?: boolean;
}

// Feature configuration - can be string or object with icon
export interface PageHeaderFeature {
  text: string;
  icon?: LucideIcon;
}

// Main props interface
export interface PageHeaderProps {
  /** Lucide icon component to display */
  icon: LucideIcon;

  /** Main title text */
  title: string;

  /** Optional subtitle/description */
  subtitle?: string;

  /** Optional badge (Premium, Beta, etc.) */
  badge?: PageHeaderBadge;

  /** Feature highlights shown on the right (max 3 recommended) */
  features?: (string | PageHeaderFeature)[];

  /** Optional action buttons */
  actions?: PageHeaderAction[];

  /** Icon background color - defaults to primary blue gradient */
  iconColor?: IconColor;

  /** Additional className for custom styling */
  className?: string;

  /** Animation enabled (uses framer-motion) - defaults to true */
  animated?: boolean;
}

// Color class mapping
const iconColorMap: Record<IconColor, string> = {
  blue: styles.iconBlue,
  purple: styles.iconPurple,
  green: styles.iconGreen,
  orange: styles.iconOrange,
  red: styles.iconRed,
  indigo: styles.iconIndigo,
  dark: styles.iconDark,
};

// Badge variant class mapping
const badgeVariantMap: Record<BadgeVariant, string> = {
  premium: styles.badgePremium,
  beta: styles.badgeBeta,
  new: styles.badgeNew,
  pro: styles.badgePro,
};

// Action variant class mapping
const actionVariantMap: Record<ActionVariant, string> = {
  primary: styles.actionPrimary,
  secondary: styles.actionSecondary,
  ghost: styles.actionGhost,
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  badge,
  features,
  actions,
  iconColor = 'blue',
  className = '',
  animated = true,
}) => {
  const headerClassName = [styles.header, className].filter(Boolean).join(' ');

  const content = (
    <>
      {/* Linke Seite: Icon + Text */}
      <div className={styles.headerLeft}>
        <div className={`${styles.iconContainer} ${iconColorMap[iconColor]}`}>
          <Icon className={styles.icon} />
        </div>

        <div className={styles.content}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{title}</h1>
            {badge && (
              <span className={`${styles.badge} ${badgeVariantMap[badge.variant]}`}>
                {badge.text}
              </span>
            )}
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      {/* Rechte Seite: Features + Actions */}
      <div className={styles.headerRight}>
        {/* Features - Subtle with icons */}
        {features && features.length > 0 && (
          <div className={styles.features}>
            {features.map((feature, index) => {
              const isString = typeof feature === 'string';
              const text = isString ? feature : feature.text;
              const FeatureIcon = isString ? Circle : (feature.icon || Circle);
              return (
                <div key={index} className={styles.feature}>
                  <FeatureIcon className={styles.featureIcon} />
                  {text}
                </div>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        {actions && actions.length > 0 && (
          <div className={styles.actions}>
            {actions.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={index}
                  className={`${styles.actionButton} ${actionVariantMap[action.variant || 'secondary']}`}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {ActionIcon && <ActionIcon size={16} />}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  if (animated) {
    return (
      <motion.header
        className={headerClassName}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {content}
      </motion.header>
    );
  }

  return <header className={headerClassName}>{content}</header>;
};

export default PageHeader;
