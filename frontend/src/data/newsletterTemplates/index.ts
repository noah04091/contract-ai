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

import { freeToBusinessUltimateV3Template } from './freeToBusinessUltimateV3';
import { freeToBusinessUltimateV2Template } from './freeToBusinessUltimateV2';
import { freeToBusinessUltimateTemplate } from './freeToBusinessUltimate';
import { freeToBusinessTemplate } from './freeToBusiness';
import { freeToBusinessEditorialTemplate } from './freeToBusinessEditorial';
import { freeToBusinessOutcomeTemplate } from './freeToBusinessOutcome';
import { freeToBusinessKompaktTemplate } from './freeToBusinessKompakt';
import { freeToBusinessFeaturesTemplate } from './freeToBusinessFeatures';
import { freeInactiveReactivationTemplate } from './freeInactiveReactivation';

export const newsletterTemplates: NewsletterTemplate[] = [
  freeToBusinessUltimateV3Template,
  freeToBusinessUltimateV2Template,
  freeToBusinessUltimateTemplate,
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
