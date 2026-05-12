export interface NewsletterTemplate {
  id: string;
  label: string;
  description: string;
  subject: string;
  preheader: string;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

import { freeToBusinessTemplate } from './freeToBusiness';
import { freeToBusinessEditorialTemplate } from './freeToBusinessEditorial';
import { freeToBusinessOutcomeTemplate } from './freeToBusinessOutcome';
import { freeToBusinessKompaktTemplate } from './freeToBusinessKompakt';
import { freeToBusinessFeaturesTemplate } from './freeToBusinessFeatures';
import { freeInactiveReactivationTemplate } from './freeInactiveReactivation';

export const newsletterTemplates: NewsletterTemplate[] = [
  freeToBusinessTemplate,
  freeToBusinessFeaturesTemplate,
  freeToBusinessOutcomeTemplate,
  freeToBusinessEditorialTemplate,
  freeToBusinessKompaktTemplate,
  freeInactiveReactivationTemplate,
];

export function getNewsletterTemplateById(id: string): NewsletterTemplate | undefined {
  return newsletterTemplates.find((t) => t.id === id);
}
