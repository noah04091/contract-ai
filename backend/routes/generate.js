import { db } from "@/db";
import { contracts, contractVersions, userProfiles, contractTemplates, contractShares, contractComments, contractActivities } from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, and, desc, sql, or, like, inArray, gte, lte } from "drizzle-orm";
import OpenAI from "openai";
import puppeteer from "puppeteer";
import crypto from 'crypto';
import QRCode from 'qrcode';
import { z } from 'zod';
import { ratelimit } from "@/lib/ratelimit";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { sendEmail } from "@/lib/email";
import { trackEvent } from "@/lib/analytics";
import PDFMerger from 'pdf-merger-js';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import { Readable } from 'stream';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// ENTERPRISE CONTRACT GENERATION SYSTEM V3
// ============================================
// Vollständige Version mit allen Features
// - Kein Contract AI Branding
// - Maximale Seitennutzung
// - Professionelles Kanzlei-Design
// - Alle Original-Funktionen erhalten
// - Batch Processing
// - Template System
// - Share & Collaboration
// - Activity Tracking
// - Export Features
// ============================================

// Configuration Constants
const CONFIG = {
  MAX_CONTRACTS_PER_BATCH: 50,
  MAX_FILE_SIZE_MB: 25,
  SUPPORTED_EXPORT_FORMATS: ['pdf', 'docx', 'html', 'json', 'xlsx'],
  RATE_LIMIT_PER_MINUTE: 30,
  CACHE_TTL_SECONDS: 3600,
  MAX_VERSIONS_PER_CONTRACT: 100,
  PUPPETEER_TIMEOUT: 60000,
  AI_MODEL: "gpt-4o-mini",
  AI_MAX_TOKENS: 4000,
  AI_TEMPERATURE: 0.3,
};

// Validation Schemas
const ContractGenerationSchema = z.object({
  prompt: z.string().min(10).max(5000),
  contractType: z.string().min(1).max(100),
  parties: z.array(z.object({
    role: z.string(),
    name: z.string(),
    address: z.string().optional(),
    registrationNumber: z.string().optional(),
    representative: z.string().optional(),
  })).optional(),
  clauses: z.array(z.string()).optional(),
  specialRequirements: z.string().optional(),
  templateId: z.string().optional(),
  language: z.enum(['de', 'en', 'fr', 'es', 'it']).default('de'),
});

const ContractUpdateSchema = z.object({
  contractId: z.string(),
  updates: z.record(z.any()),
  createVersion: z.boolean().default(false),
  versionDescription: z.string().optional(),
});

// Cache Implementation
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttl = CONFIG.CACHE_TTL_SECONDS) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000
    });
    
    // Clear existing timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttl * 1000);
    
    this.timers.set(key, timer);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer));
    this.cache.clear();
    this.timers.clear();
  }
}

const cache = new CacheManager();

// Error Classes
class ContractGenerationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ContractGenerationError';
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Logo Management System
class LogoManager {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 3600000; // 1 hour
  }

  async load(companyProfile) {
    const cacheKey = `logo_${companyProfile?.id || 'default'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const strategies = [
      () => this.loadFromProfile(companyProfile),
      () => this.loadFromDatabase(companyProfile),
      () => this.loadFromCloudinary(companyProfile),
      () => this.generatePlaceholder(companyProfile)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
          return result;
        }
      } catch (error) {
        console.warn('Logo loading strategy failed:', error);
      }
    }

    return null;
  }

  async loadFromProfile(profile) {
    if (!profile?.logo) return null;
    return this.fetchFromUrl(profile.logo);
  }

  async loadFromDatabase(profile) {
    if (!profile?.id) return null;
    
    const dbLogo = await db
      .select({ logo: userProfiles.logo })
      .from(userProfiles)
      .where(eq(userProfiles.id, profile.id))
      .limit(1);
    
    return dbLogo[0]?.logo || null;
  }

  async loadFromCloudinary(profile) {
    if (!profile?.cloudinaryId) return null;
    
    try {
      const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${profile.cloudinaryId}`;
      return this.fetchFromUrl(url);
    } catch (error) {
      console.error('Cloudinary fetch failed:', error);
      return null;
    }
  }

  async fetchFromUrl(url) {
    try {
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'ContractSystem/1.0'
        }
      });
      
      if (!response.ok) return null;
      
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to fetch logo:', error);
      return null;
    }
  }

  generatePlaceholder(profile) {
    const name = profile?.name || 'Company';
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const colors = [
      '#1a365d', '#2c5282', '#2b6cb1', '#3182ce',
      '#065f46', '#047857', '#059669', '#10b981',
      '#7c2d12', '#92400e', '#b45309', '#d97706'
    ];
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const svg = `
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill="url(#grad)" rx="12"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".35em" 
              fill="white" font-family="'Helvetica Neue', Arial, sans-serif" 
              font-size="48" font-weight="600">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
}

const logoManager = new LogoManager();

// QR Code Generator
class QRCodeGenerator {
  async generate(data, options = {}) {
    try {
      if (!QRCode) {
        console.warn('QRCode library not available');
        return null;
      }

      const defaultOptions = {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };

      const qrOptions = { ...defaultOptions, ...options };
      const qrDataUrl = await QRCode.toDataURL(data, qrOptions);
      return qrDataUrl;
    } catch (error) {
      console.error('QR Code generation failed:', error);
      return null;
    }
  }

  generateVerificationUrl(contractId, hash) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://contract.ai';
    return `${baseUrl}/verify/${contractId}?hash=${hash}`;
  }
}

const qrGenerator = new QRCodeGenerator();

// Template Manager
class TemplateManager {
  async loadTemplate(templateId, userId) {
    if (!templateId) return null;

    try {
      const template = await db
        .select()
        .from(contractTemplates)
        .where(
          and(
            eq(contractTemplates.id, templateId),
            or(
              eq(contractTemplates.userId, userId),
              eq(contractTemplates.isPublic, true)
            )
          )
        )
        .limit(1);

      if (!template[0]) return null;

      // Track template usage
      await db
        .update(contractTemplates)
        .set({ 
          usageCount: sql`${contractTemplates.usageCount} + 1`,
          lastUsedAt: new Date()
        })
        .where(eq(contractTemplates.id, templateId));

      return template[0];
    } catch (error) {
      console.error('Template loading failed:', error);
      return null;
    }
  }

  async createFromContract(contractId, userId, name, description) {
    try {
      const contract = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.id, contractId),
            eq(contracts.userId, userId)
          )
        )
        .limit(1);

      if (!contract[0]) {
        throw new Error('Contract not found');
      }

      const template = await db.insert(contractTemplates).values({
        id: crypto.randomBytes(16).toString('hex'),
        userId,
        name,
        description,
        content: contract[0].content,
        type: contract[0].type,
        category: contract[0].category || 'general',
        tags: [],
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return template[0];
    } catch (error) {
      console.error('Template creation failed:', error);
      throw error;
    }
  }
}

const templateManager = new TemplateManager();

// Activity Tracker
class ActivityTracker {
  async track(userId, contractId, action, details = {}) {
    try {
      await db.insert(contractActivities).values({
        id: crypto.randomBytes(16).toString('hex'),
        contractId,
        userId,
        action,
        details: JSON.stringify(details),
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
        createdAt: new Date()
      });

      // Also track in analytics if available
      if (trackEvent) {
        trackEvent(action, {
          userId,
          contractId,
          ...details
        });
      }
    } catch (error) {
      console.error('Activity tracking failed:', error);
    }
  }

  async getHistory(contractId, limit = 50) {
    try {
      const activities = await db
        .select()
        .from(contractActivities)
        .where(eq(contractActivities.contractId, contractId))
        .orderBy(desc(contractActivities.createdAt))
        .limit(limit);

      return activities;
    } catch (error) {
      console.error('Failed to fetch activity history:', error);
      return [];
    }
  }
}

const activityTracker = new ActivityTracker();

// Enhanced System Prompts
const SYSTEM_PROMPTS = {
  de: `Du bist ein hochspezialisierter KI-Assistent für die Erstellung professioneller, rechtssicherer Verträge nach deutschem Recht.

KERNKOMPETENZEN:
• Vertragsrecht (BGB, HGB, Spezialgesetze)
• Compliance & Regulatory Requirements
• ESG-Standards & Nachhaltigkeitsklauseln
• Datenschutz (DSGVO/GDPR)
• Internationale Vertragsstandards

DEFINITIONEN & STRUKTUR:
• Verwende präzise juristische Terminologie
• Strukturiere mit §-Zeichen und arabischen Ziffern
• Nutze Absätze (1), (2) und Unterpunkte a), b), c)
• Beginne mit klaren Definitionen aller Fachbegriffe
• Integriere Salvatorische Klauseln

SPRACHLICHE ANFORDERUNGEN:
• Präzise, eindeutige Formulierungen
• Aktiv- statt Passivkonstruktionen wo möglich
• Vermeidung von Redundanzen
• Klare Subjekt-Prädikat-Objekt-Struktur
• Konsistente Terminologie durchgehend

COMPLIANCE-CHECKLISTE:
☑ AGB-Kontrolle (§§ 305 ff. BGB)
☑ Verbraucherschutz wo anwendbar
☑ Formvorschriften beachtet
☑ Widerrufsrechte integriert
☑ Datenschutzklauseln aktuell
☑ Gerichtsstand & anwendbares Recht

QUALITÄTSSICHERUNG:
• Vollständigkeit aller essentiellen Klauseln
• Widerspruchsfreiheit zwischen Paragraphen
• Praktikabilität der Regelungen
• Durchsetzbarkeit vor Gericht
• Balance der Parteiinteressen`,

  en: `You are a highly specialized AI assistant for creating professional, legally binding contracts under common law and international standards.

CORE COMPETENCIES:
• Contract Law (Common Law, UCC, International Treaties)
• Compliance & Regulatory Requirements
• ESG Standards & Sustainability Clauses
• Data Protection (GDPR/CCPA)
• International Contract Standards

STRUCTURE & DEFINITIONS:
• Use precise legal terminology
• Structure with numbered sections and subsections
• Use paragraphs (a), (b), (c) for subdivisions
• Begin with clear definitions of all technical terms
• Include severability clauses

LANGUAGE REQUIREMENTS:
• Precise, unambiguous formulations
• Active voice where appropriate
• Avoid redundancies
• Clear subject-predicate-object structure
• Consistent terminology throughout

COMPLIANCE CHECKLIST:
☑ Terms and conditions review
☑ Consumer protection where applicable
☑ Formal requirements observed
☑ Cancellation rights integrated
☑ Data protection clauses current
☑ Jurisdiction & applicable law

QUALITY ASSURANCE:
• Completeness of all essential clauses
• No contradictions between sections
• Practicality of provisions
• Enforceability in court
• Balance of party interests`,
};

// Main Contract Formatter - ASYNC FUNCTION
async function formatContractToHTML(contract, companyProfile = null, designVariant = 'minimal', options = {}) {
  try {
    const contractData = typeof contract === 'string' ? JSON.parse(contract) : contract;
    
    // Design System Configuration
    const designs = {
      minimal: {
        // Schwarz-Weiß Kanzlei-Style (DEFAULT)
        primaryColor: '#000000',
        secondaryColor: '#666666',
        accentColor: '#333333',
        backgroundColor: '#ffffff',
        fontFamily: "'Times New Roman', 'Georgia', serif",
        headerFont: "'Helvetica Neue', 'Arial', sans-serif",
        fontSize: '11pt',
        lineHeight: '1.6',
        containerBackground: 'transparent',
        containerBorder: 'none',
        containerShadow: 'none',
        containerPadding: '0',
        sectionSpacing: '8px',
        paragraphSpacing: '12px',
        useGradients: false,
        useDecorations: false,
        logoPosition: 'right',
        maxWidth: '100%',
        pageMargins: '15mm 15mm 20mm 15mm',
        headerHeight: '80px',
        footerHeight: '40px',
        professionalLayout: true
      },
      executive: {
        // Premium Executive Style
        primaryColor: '#1a365d',
        secondaryColor: '#2c5282',
        accentColor: '#2b6cb1',
        backgroundColor: '#f8fafc',
        fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
        headerFont: "'Playfair Display', 'Georgia', serif",
        fontSize: '10.5pt',
        lineHeight: '1.65',
        containerBackground: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        containerBorder: '1px solid #e2e8f0',
        containerShadow: '0 2px 4px rgba(0,0,0,0.05)',
        containerPadding: '0',
        sectionSpacing: '10px',
        paragraphSpacing: '14px',
        useGradients: true,
        useDecorations: false,
        logoPosition: 'left',
        maxWidth: '100%',
        pageMargins: '20mm 20mm 25mm 25mm',
        headerHeight: '100px',
        footerHeight: '50px',
        professionalLayout: false
      },
      modern: {
        // Clean Modern Style
        primaryColor: '#0f172a',
        secondaryColor: '#475569',
        accentColor: '#3b82f6',
        backgroundColor: '#ffffff',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        headerFont: "'Inter', 'Segoe UI', sans-serif",
        fontSize: '10pt',
        lineHeight: '1.7',
        containerBackground: 'transparent',
        containerBorder: 'none',
        containerShadow: 'none',
        containerPadding: '0',
        sectionSpacing: '10px',
        paragraphSpacing: '14px',
        useGradients: false,
        useDecorations: false,
        logoPosition: 'center',
        maxWidth: '100%',
        pageMargins: '18mm 18mm 22mm 18mm',
        headerHeight: '90px',
        footerHeight: '45px',
        professionalLayout: true
      },
      classic: {
        // Traditional Legal Style
        primaryColor: '#000000',
        secondaryColor: '#4a4a4a',
        accentColor: '#000000',
        backgroundColor: '#ffffff',
        fontFamily: "'Book Antiqua', 'Palatino', serif",
        headerFont: "'Garamond', 'Georgia', serif",
        fontSize: '12pt',
        lineHeight: '1.8',
        containerBackground: 'transparent',
        containerBorder: 'none',
        containerShadow: 'none',
        containerPadding: '0',
        sectionSpacing: '12px',
        paragraphSpacing: '16px',
        useGradients: false,
        useDecorations: false,
        logoPosition: 'none',
        maxWidth: '100%',
        pageMargins: '25mm 25mm 30mm 25mm',
        headerHeight: '60px',
        footerHeight: '40px',
        professionalLayout: true
      },
      corporate: {
        // Corporate Professional
        primaryColor: '#003366',
        secondaryColor: '#0066cc',
        accentColor: '#0099ff',
        backgroundColor: '#ffffff',
        fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
        headerFont: "'Montserrat', 'Arial', sans-serif",
        fontSize: '11pt',
        lineHeight: '1.65',
        containerBackground: '#fafbfc',
        containerBorder: '1px solid #d1d5db',
        containerShadow: 'none',
        containerPadding: '0',
        sectionSpacing: '12px',
        paragraphSpacing: '14px',
        useGradients: false,
        useDecorations: false,
        logoPosition: 'left',
        maxWidth: '100%',
        pageMargins: '20mm 20mm 25mm 20mm',
        headerHeight: '95px',
        footerHeight: '45px',
        professionalLayout: true
      }
    };

    const design = designs[designVariant] || designs.minimal;
    
    // Generate IDs and Hashes
    const contractId = contractData.id || crypto.randomBytes(16).toString('hex');
    const contractHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(contractData))
      .digest('hex')
      .substring(0, 12);
    
    // Generate QR Code if needed - WITH AWAIT IN ASYNC FUNCTION
    let qrCodeData = null;
    if (options.includeQR !== false) {
      const verificationUrl = qrGenerator.generateVerificationUrl(contractId, contractHash);
      qrCodeData = await qrGenerator.generate(verificationUrl);
    }

    // HTML Template
    const html = `
<!DOCTYPE html>
<html lang="${options.language || 'de'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${contractData.title || 'Vertragsdokument'}">
  <meta name="author" content="${companyProfile?.name || 'Contract System'}">
  <title>${contractData.title || 'Vertragsdokument'}</title>
  
  <style>
    /* ============================= */
    /* RESET & BASE STYLES           */
    /* ============================= */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    :root {
      --primary-color: ${design.primaryColor};
      --secondary-color: ${design.secondaryColor};
      --accent-color: ${design.accentColor};
      --background-color: ${design.backgroundColor};
      --border-color: #e5e7eb;
      --text-muted: #6b7280;
      --success-color: #10b981;
      --warning-color: #f59e0b;
      --error-color: #ef4444;
    }
    
    @page {
      size: A4;
      margin: ${design.pageMargins};
      
      @bottom-left {
        content: "Dokument-ID: ${contractId.substring(0, 8)}";
      }
      
      @bottom-center {
        content: counter(page) " / " counter(pages);
      }
      
      @bottom-right {
        content: "${new Date().toLocaleDateString('de-DE')}";
      }
    }
    
    @page:first {
      margin-top: 10mm;
    }
    
    body {
      font-family: ${design.fontFamily};
      font-size: ${design.fontSize};
      line-height: ${design.lineHeight};
      color: var(--primary-color);
      background: var(--background-color);
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      font-feature-settings: "kern" 1, "liga" 1;
    }
    
    /* ============================= */
    /* LAYOUT STRUCTURE              */
    /* ============================= */
    .contract-wrapper {
      max-width: 210mm;
      margin: 0 auto;
      background: white;
      min-height: 297mm;
      position: relative;
      overflow: hidden;
    }
    
    .contract-content {
      padding: 20px 30px;
      padding-bottom: 80px;
      min-height: calc(297mm - 160px);
    }
    
    /* ============================= */
    /* PROFESSIONAL HEADER           */
    /* ============================= */
    .contract-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 30px 30px 20px 30px;
      border-bottom: ${design.professionalLayout ? '2px solid var(--primary-color)' : '1px solid var(--border-color)'};
      margin-bottom: 30px;
      min-height: ${design.headerHeight};
      page-break-after: avoid;
      background: ${design.useGradients ? 'linear-gradient(to bottom, #ffffff, #fafafa)' : 'transparent'};
    }
    
    .company-info {
      flex: 1;
      ${design.logoPosition === 'right' ? 'order: 1;' : design.logoPosition === 'center' ? 'text-align: center;' : 'order: 2;'}
    }
    
    .company-name {
      font-family: ${design.headerFont};
      font-size: ${design.logoPosition === 'none' ? '20pt' : '18pt'};
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 8px;
      letter-spacing: -0.5px;
      ${design.logoPosition === 'center' ? 'text-align: center;' : ''}
    }
    
    .company-tagline {
      font-size: 10pt;
      color: var(--secondary-color);
      font-style: italic;
      margin-bottom: 10px;
    }
    
    .company-details {
      font-size: 9pt;
      color: var(--secondary-color);
      line-height: 1.4;
      ${design.logoPosition === 'center' ? 'text-align: center;' : ''}
    }
    
    .company-details div {
      margin-bottom: 2px;
    }
    
    .company-details .detail-icon {
      display: inline-block;
      width: 14px;
      margin-right: 5px;
      color: var(--text-muted);
    }
    
    .logo-container {
      width: ${design.logoPosition === 'none' ? '0' : '100px'};
      height: ${design.logoPosition === 'none' ? '0' : '100px'};
      ${design.logoPosition === 'right' ? 'order: 2; margin-left: 30px;' : 
        design.logoPosition === 'center' ? 'position: absolute; left: 50%; transform: translateX(-50%); top: 30px;' : 
        design.logoPosition === 'none' ? 'display: none;' : 'order: 1; margin-right: 30px;'}
    }
    
    .logo-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: ${design.professionalLayout ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'};
    }
    
    /* ============================= */
    /* CONTRACT TITLE SECTION        */
    /* ============================= */
    .contract-title-section {
      text-align: center;
      margin: 40px 0 30px 0;
      padding: 0 30px;
      page-break-after: avoid;
    }
    
    .contract-type {
      font-size: 10pt;
      color: var(--secondary-color);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
      font-weight: 500;
    }
    
    .contract-main-title {
      font-family: ${design.headerFont};
      font-size: 24pt;
      font-weight: 700;
      color: var(--primary-color);
      margin-bottom: 15px;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    
    .contract-subtitle {
      font-size: 11pt;
      color: var(--secondary-color);
      font-style: italic;
      margin-bottom: 10px;
    }
    
    .contract-metadata {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 15px;
      font-size: 9pt;
      color: var(--text-muted);
    }
    
    .metadata-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    /* ============================= */
    /* STATUS INDICATORS             */
    /* ============================= */
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 10px;
    }
    
    .status-draft {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    
    .status-review {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
    }
    
    .status-final {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #6ee7b7;
    }
    
    .status-signed {
      background: #e9d5ff;
      color: #6b21a8;
      border: 1px solid #c084fc;
    }
    
    /* ============================= */
    /* PARTIES SECTION               */
    /* ============================= */
    .parties-section {
      background: ${design.professionalLayout ? 'transparent' : '#f8f9fa'};
      border: ${design.professionalLayout ? '1px solid var(--primary-color)' : '1px solid var(--border-color)'};
      padding: 20px;
      margin: 20px 0;
      page-break-inside: avoid;
      ${!design.professionalLayout ? 'border-radius: 8px;' : ''}
    }
    
    .parties-title {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 15px;
      color: var(--primary-color);
      ${design.professionalLayout ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
    }
    
    .parties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    
    .party {
      padding: 15px;
      background: ${design.professionalLayout ? 'transparent' : 'white'};
      border: ${design.professionalLayout ? 'none' : '1px solid var(--border-color)'};
      ${!design.professionalLayout ? 'border-radius: 6px;' : 'border-bottom: 1px solid var(--border-color);'}
    }
    
    .party-role {
      font-weight: 600;
      color: var(--primary-color);
      margin-bottom: 8px;
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .party-name {
      font-size: 11pt;
      font-weight: 500;
      color: var(--primary-color);
      margin-bottom: 5px;
    }
    
    .party-details {
      color: var(--secondary-color);
      line-height: 1.5;
      font-size: 10pt;
    }
    
    .party-details .detail-line {
      margin-bottom: 3px;
    }
    
    /* ============================= */
    /* TABLE OF CONTENTS             */
    /* ============================= */
    .toc-section {
      margin: 30px 0;
      padding: 20px;
      background: ${design.professionalLayout ? 'transparent' : '#fafafa'};
      border: ${design.professionalLayout ? '1px solid var(--primary-color)' : '1px solid var(--border-color)'};
      page-break-inside: avoid;
      ${!design.professionalLayout ? 'border-radius: 8px;' : ''}
    }
    
    .toc-title {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 15px;
      color: var(--primary-color);
      ${design.professionalLayout ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
    }
    
    .toc-list {
      list-style: none;
      padding: 0;
    }
    
    .toc-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 8px;
      font-size: 10pt;
      color: var(--secondary-color);
      padding: 5px 0;
      border-bottom: 1px dotted var(--border-color);
    }
    
    .toc-item:last-child {
      border-bottom: none;
    }
    
    .toc-item-title {
      flex: 1;
      padding-right: 10px;
    }
    
    .toc-item-number {
      font-weight: 600;
      margin-right: 10px;
      color: var(--primary-color);
    }
    
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted var(--text-muted);
      margin: 0 5px;
      min-width: 20px;
      max-width: 300px;
    }
    
    .toc-page {
      font-weight: 500;
      color: var(--primary-color);
    }
    
    /* ============================= */
    /* CONTRACT SECTIONS             */
    /* ============================= */
    .contract-sections {
      margin-top: 30px;
    }
    
    .contract-section {
      margin-bottom: ${design.sectionSpacing};
      page-break-inside: avoid;
      width: ${design.maxWidth};
    }
    
    .section-container {
      background: ${design.containerBackground};
      border: ${design.containerBorder};
      box-shadow: ${design.containerShadow};
      padding: ${design.containerPadding};
      ${!design.professionalLayout ? 'border-radius: 6px;' : ''}
    }
    
    .section-header {
      font-size: 13pt;
      font-weight: 600;
      color: var(--primary-color);
      margin-bottom: ${design.paragraphSpacing};
      display: flex;
      align-items: baseline;
      ${design.professionalLayout ? 'border-bottom: 1px solid var(--primary-color); padding-bottom: 5px;' : ''}
    }
    
    .section-number {
      font-weight: 700;
      margin-right: 12px;
      color: var(--primary-color);
      min-width: 30px;
    }
    
    .section-title {
      flex: 1;
    }
    
    .section-content {
      text-align: justify;
      hyphens: auto;
      -webkit-hyphens: auto;
      -moz-hyphens: auto;
      color: var(--primary-color);
      padding-left: ${design.professionalLayout ? '0' : '42px'};
    }
    
    .section-content p {
      margin-bottom: ${design.paragraphSpacing};
      line-height: ${design.lineHeight};
      text-indent: ${design.professionalLayout ? '0' : '0'};
    }
    
    .section-content > p:first-child {
      text-indent: 0;
    }
    
    /* ============================= */
    /* SUBSECTIONS & LISTS           */
    /* ============================= */
    .subsection {
      margin-left: 20px;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    
    .subsection-number {
      font-weight: 600;
      margin-right: 10px;
      color: var(--primary-color);
    }
    
    .subsection-letter {
      font-weight: 500;
      margin-right: 8px;
      color: var(--primary-color);
    }
    
    .section-content ul,
    .section-content ol {
      margin-left: 25px;
      margin-bottom: ${design.paragraphSpacing};
    }
    
    .section-content li {
      margin-bottom: 6px;
      line-height: ${design.lineHeight};
    }
    
    .section-content ul {
      list-style-type: disc;
    }
    
    .section-content ul ul {
      list-style-type: circle;
    }
    
    .section-content ol {
      list-style-type: decimal;
    }
    
    .section-content ol ol {
      list-style-type: lower-alpha;
    }
    
    /* ============================= */
    /* SPECIAL CLAUSES               */
    /* ============================= */
    .important-clause {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 15px;
      margin: 15px 0;
      font-weight: 500;
    }
    
    .legal-note {
      font-size: 9pt;
      color: var(--secondary-color);
      font-style: italic;
      margin: 10px 0;
      padding: 10px;
      background: #f8f9fa;
      border-left: 3px solid var(--accent-color);
    }
    
    .definition {
      font-weight: 600;
      color: var(--primary-color);
      border-bottom: 1px dotted var(--secondary-color);
      cursor: help;
    }
    
    .reference {
      color: var(--accent-color);
      text-decoration: none;
      border-bottom: 1px dotted var(--accent-color);
    }
    
    /* ============================= */
    /* SIGNATURE SECTION             */
    /* ============================= */
    .signature-section {
      margin-top: 60px;
      page-break-inside: avoid;
      page-break-before: auto;
      border-top: ${design.professionalLayout ? '2px solid var(--primary-color)' : '1px solid var(--border-color)'};
      padding-top: 40px;
    }
    
    .signature-title {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 30px;
      text-align: center;
      color: var(--primary-color);
      ${design.professionalLayout ? 'text-transform: uppercase; letter-spacing: 1px;' : ''}
    }
    
    .signature-preamble {
      text-align: center;
      font-style: italic;
      color: var(--secondary-color);
      margin-bottom: 40px;
      font-size: 10pt;
    }
    
    .signature-date-location {
      margin-bottom: 40px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
    }
    
    .date-block,
    .location-block {
      position: relative;
    }
    
    .date-label,
    .location-label {
      font-size: 9pt;
      color: var(--secondary-color);
      margin-bottom: 5px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .date-input,
    .location-input {
      border-bottom: 1px solid var(--primary-color);
      min-height: 30px;
      position: relative;
    }
    
    .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 50px;
      margin-top: 60px;
    }
    
    .signature-block {
      min-height: 150px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    
    .signature-line {
      border-bottom: 1px solid var(--primary-color);
      margin-bottom: 10px;
      min-height: 50px;
      position: relative;
    }
    
    .signature-line::before {
      content: "Unterschrift";
      position: absolute;
      bottom: -20px;
      left: 0;
      font-size: 8pt;
      color: var(--text-muted);
      font-style: italic;
    }
    
    .signature-name {
      font-size: 10pt;
      color: var(--primary-color);
      margin-bottom: 3px;
      font-weight: 500;
    }
    
    .signature-role {
      font-size: 9pt;
      color: var(--secondary-color);
      font-style: italic;
    }
    
    .signature-company {
      font-size: 9pt;
      color: var(--secondary-color);
      margin-top: 3px;
    }
    
    /* ============================= */
    /* WITNESS SECTION               */
    /* ============================= */
    .witness-section {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px dashed var(--border-color);
    }
    
    .witness-title {
      font-size: 11pt;
      font-weight: 600;
      margin-bottom: 30px;
      text-align: center;
      color: var(--primary-color);
    }
    
    .witness-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 40px;
    }
    
    /* ============================= */
    /* APPENDIX & ATTACHMENTS        */
    /* ============================= */
    .appendix-section {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid var(--primary-color);
      page-break-before: always;
    }
    
    .appendix-title {
      font-size: 14pt;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .attachment-list {
      list-style-type: none;
      padding-left: 0;
    }
    
    .attachment-item {
      padding: 12px 15px;
      background: #f8f9fa;
      border-left: 3px solid var(--accent-color);
      margin-bottom: 10px;
      font-size: 10pt;
      display: flex;
      align-items: center;
      gap: 10px;
      ${!design.professionalLayout ? 'border-radius: 4px;' : ''}
    }
    
    .attachment-number {
      font-weight: 600;
      color: var(--primary-color);
      min-width: 60px;
    }
    
    .attachment-title {
      flex: 1;
    }
    
    .attachment-pages {
      color: var(--text-muted);
      font-size: 9pt;
    }
    
    /* ============================= */
    /* VERIFICATION SECTION          */
    /* ============================= */
    .verification-section {
      margin-top: 40px;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
      border: 1px solid var(--border-color);
      text-align: center;
      page-break-inside: avoid;
      ${!design.professionalLayout ? 'border-radius: 8px;' : ''}
    }
    
    .verification-title {
      font-size: 11pt;
      font-weight: 600;
      color: var(--primary-color);
      margin-bottom: 15px;
    }
    
    .qr-code {
      width: 120px;
      height: 120px;
      margin: 0 auto 15px;
      padding: 10px;
      background: white;
      border: 1px solid var(--border-color);
      ${!design.professionalLayout ? 'border-radius: 4px;' : ''}
    }
    
    .qr-code img {
      width: 100%;
      height: 100%;
    }
    
    .verification-text {
      font-size: 9pt;
      color: var(--secondary-color);
      line-height: 1.4;
      margin-bottom: 10px;
    }
    
    .verification-id {
      font-family: 'Courier New', monospace;
      font-size: 10pt;
      color: var(--primary-color);
      font-weight: 600;
      margin-top: 10px;
      padding: 8px 12px;
      background: #f3f4f6;
      display: inline-block;
      ${!design.professionalLayout ? 'border-radius: 4px;' : ''}
    }
    
    .verification-hash {
      font-family: 'Courier New', monospace;
      font-size: 8pt;
      color: var(--text-muted);
      margin-top: 5px;
    }
    
    /* ============================= */
    /* FOOTER                        */
    /* ============================= */
    .contract-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${design.footerHeight};
      background: white;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 30px;
      font-size: 8pt;
      color: var(--secondary-color);
      z-index: 100;
    }
    
    .footer-left {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .footer-center {
      text-align: center;
      flex: 1;
    }
    
    .footer-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .footer-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .footer-separator {
      color: var(--text-muted);
      margin: 0 5px;
    }
    
    .page-numbers {
      font-weight: 500;
    }
    
    /* ============================= */
    /* WATERMARKS & OVERLAYS         */
    /* ============================= */
    .draft-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(255, 0, 0, 0.08);
      font-weight: bold;
      z-index: -1;
      pointer-events: none;
      text-transform: uppercase;
      letter-spacing: 20px;
      white-space: nowrap;
    }
    
    .confidential-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 100pt;
      color: rgba(0, 0, 255, 0.05);
      font-weight: bold;
      z-index: -1;
      pointer-events: none;
      text-transform: uppercase;
      letter-spacing: 15px;
      white-space: nowrap;
    }
    
    /* ============================= */
    /* PRINT OPTIMIZATIONS           */
    /* ============================= */
    @media print {
      body {
        background: white;
        color: black;
      }
      
      .contract-wrapper {
        box-shadow: none !important;
        max-width: 100%;
      }
      
      .contract-content {
        padding: 0;
      }
      
      .section-container {
        box-shadow: none !important;
        border-color: #000 !important;
        page-break-inside: avoid;
      }
      
      .contract-header {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .parties-section,
      .toc-section,
      .signature-section,
      .verification-section {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .contract-section {
        break-inside: avoid;
        page-break-inside: avoid;
        widows: 3;
        orphans: 3;
      }
      
      .contract-footer {
        display: none;
      }
      
      /* Remove all shadows and decorative elements */
      * {
        box-shadow: none !important;
        text-shadow: none !important;
        filter: none !important;
      }
      
      /* Ensure links are visible */
      a {
        color: black !important;
        text-decoration: underline;
      }
      
      /* Optimize images */
      img {
        max-width: 100% !important;
        page-break-inside: avoid;
      }
      
      /* Force background printing for important elements */
      .status-badge,
      .important-clause,
      .verification-id {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Hide interactive elements */
      button,
      .no-print {
        display: none !important;
      }
      
      /* Ensure maximum space utilization */
      .contract-header,
      .contract-content {
        padding: 0;
      }
      
      @page {
        margin: 15mm;
      }
      
      @page:first {
        margin-top: 10mm;
      }
    }
    
    /* ============================= */
    /* RESPONSIVE DESIGN             */
    /* ============================= */
    @media screen and (max-width: 1024px) {
      .contract-wrapper {
        max-width: 100%;
      }
      
      .signature-grid,
      .witness-grid {
        grid-template-columns: 1fr;
      }
      
      .parties-grid {
        grid-template-columns: 1fr;
      }
    }
    
    @media screen and (max-width: 768px) {
      body {
        font-size: 10pt;
      }
      
      .contract-header {
        flex-direction: column;
        text-align: center;
      }
      
      .logo-container {
        order: -1;
        margin: 0 auto 20px;
      }
      
      .contract-main-title {
        font-size: 20pt;
      }
      
      .section-header {
        font-size: 12pt;
      }
      
      .signature-date-location {
        grid-template-columns: 1fr;
      }
      
      .contract-content {
        padding: 15px;
      }
      
      .footer-left,
      .footer-right {
        display: none;
      }
    }
    
    @media screen and (max-width: 480px) {
      body {
        font-size: 9pt;
      }
      
      .contract-main-title {
        font-size: 18pt;
      }
      
      .section-header {
        font-size: 11pt;
      }
      
      .contract-content {
        padding: 10px;
      }
    }
    
    /* ============================= */
    /* ACCESSIBILITY                 */
    /* ============================= */
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
    
    @media (prefers-color-scheme: dark) {
      /* Dark mode support for digital viewing */
      @media screen {
        :root {
          --primary-color: #e5e7eb;
          --secondary-color: #9ca3af;
          --background-color: #111827;
          --border-color: #374151;
        }
        
        body {
          background: var(--background-color);
          color: var(--primary-color);
        }
        
        .contract-wrapper {
          background: #1f2937;
        }
      }
    }
    
    /* High contrast mode support */
    @media (prefers-contrast: high) {
      :root {
        --primary-color: #000000;
        --secondary-color: #333333;
        --border-color: #000000;
      }
      
      * {
        border-width: 2px !important;
      }
    }
    
    /* ============================= */
    /* ANIMATIONS                    */
    /* ============================= */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideIn {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .fade-in {
      animation: fadeIn 0.3s ease-in;
    }
    
    .slide-in {
      animation: slideIn 0.3s ease-out;
    }
  </style>
</head>
<body>
  <div class="contract-wrapper">
    ${contractData.status === 'draft' ? '<div class="draft-watermark">ENTWURF</div>' : ''}
    ${contractData.confidential ? '<div class="confidential-watermark">VERTRAULICH</div>' : ''}
    
    <!-- Professional Header -->
    <header class="contract-header">
      <div class="company-info">
        <div class="company-name">
          ${companyProfile?.name || ''}
        </div>
        ${companyProfile?.tagline ? `<div class="company-tagline">${companyProfile.tagline}</div>` : ''}
        <div class="company-details">
          ${companyProfile?.address ? `<div>${companyProfile.address}</div>` : ''}
          ${companyProfile?.zipCity ? `<div>${companyProfile.zipCity}</div>` : ''}
          ${companyProfile?.phone ? `<div>Tel: ${companyProfile.phone}</div>` : ''}
          ${companyProfile?.email ? `<div>E-Mail: ${companyProfile.email}</div>` : ''}
          ${companyProfile?.website ? `<div>Web: ${companyProfile.website}</div>` : ''}
          ${companyProfile?.registrationNumber ? `<div>HRB: ${companyProfile.registrationNumber}</div>` : ''}
          ${companyProfile?.vatId ? `<div>USt-IdNr.: ${companyProfile.vatId}</div>` : ''}
        </div>
      </div>
      ${companyProfile?.logo && design.logoPosition !== 'none' ? `
        <div class="logo-container">
          <img src="${companyProfile.logo}" alt="${companyProfile.name} Logo" />
        </div>
      ` : ''}
    </header>
    
    <!-- Contract Title Section -->
    <div class="contract-title-section">
      ${contractData.type ? `<div class="contract-type">${contractData.type}</div>` : ''}
      <h1 class="contract-main-title">${contractData.title || 'Vertragsdokument'}</h1>
      ${contractData.subtitle ? `<div class="contract-subtitle">${contractData.subtitle}</div>` : ''}
      <div class="status-badge status-${contractData.status || 'draft'}">${
        contractData.status === 'draft' ? 'Entwurf' :
        contractData.status === 'review' ? 'In Prüfung' :
        contractData.status === 'final' ? 'Finale Version' :
        contractData.status === 'signed' ? 'Unterzeichnet' :
        contractData.status || 'Entwurf'
      }</div>
      <div class="contract-metadata">
        <div class="metadata-item">
          <span>Erstellt:</span>
          <span>${new Date(contractData.createdAt || Date.now()).toLocaleDateString('de-DE')}</span>
        </div>
        ${contractData.version ? `
          <div class="metadata-item">
            <span>Version:</span>
            <span>${contractData.version}</span>
          </div>
        ` : ''}
        ${contractData.validUntil ? `
          <div class="metadata-item">
            <span>Gültig bis:</span>
            <span>${new Date(contractData.validUntil).toLocaleDateString('de-DE')}</span>
          </div>
        ` : ''}
      </div>
    </div>
    
    <!-- Main Contract Content -->
    <div class="contract-content">
      
      <!-- Parties Section -->
      ${contractData.parties && contractData.parties.length > 0 ? `
        <div class="parties-section">
          <h2 class="parties-title">Vertragsparteien</h2>
          <div class="parties-grid">
            ${contractData.parties.map((party, index) => `
              <div class="party">
                <div class="party-role">${party.role || `Partei ${index + 1}`}</div>
                <div class="party-name">${party.name || ''}</div>
                <div class="party-details">
                  ${party.address ? `<div class="detail-line">${party.address}</div>` : ''}
                  ${party.zipCity ? `<div class="detail-line">${party.zipCity}</div>` : ''}
                  ${party.country ? `<div class="detail-line">${party.country}</div>` : ''}
                  ${party.registrationNumber ? `<div class="detail-line">HRB: ${party.registrationNumber}</div>` : ''}
                  ${party.vatId ? `<div class="detail-line">USt-IdNr.: ${party.vatId}</div>` : ''}
                  ${party.representative ? `<div class="detail-line">Vertreten durch: ${party.representative}</div>` : ''}
                  ${party.email ? `<div class="detail-line">E-Mail: ${party.email}</div>` : ''}
                  ${party.phone ? `<div class="detail-line">Tel: ${party.phone}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Preamble if exists -->
      ${contractData.preamble ? `
        <div class="contract-section">
          <div class="section-content">
            <p style="font-style: italic; text-align: center; margin: 30px 0;">
              ${contractData.preamble}
            </p>
          </div>
        </div>
      ` : ''}
      
      <!-- Table of Contents - only for 8+ sections -->
      ${contractData.sections && contractData.sections.length >= 8 ? `
        <div class="toc-section">
          <h2 class="toc-title">Inhaltsverzeichnis</h2>
          <ul class="toc-list">
            ${contractData.sections.map((section, index) => `
              <li class="toc-item">
                <span class="toc-item-title">
                  <span class="toc-item-number">§ ${index + 1}</span>
                  ${section.title}
                </span>
                <span class="toc-dots"></span>
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      <!-- Contract Sections -->
      <div class="contract-sections">
        ${contractData.sections && contractData.sections.map((section, index) => `
          <div class="contract-section">
            <div class="section-container">
              <h2 class="section-header">
                <span class="section-number">§ ${index + 1}</span>
                <span class="section-title">${section.title}</span>
              </h2>
              <div class="section-content">
                ${formatSectionContent(section.content, design)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Closing Provisions -->
      ${contractData.closingProvisions ? `
        <div class="contract-section">
          <div class="section-container">
            <h2 class="section-header">
              <span class="section-title">Schlussbestimmungen</span>
            </h2>
            <div class="section-content">
              ${formatSectionContent(contractData.closingProvisions, design)}
            </div>
          </div>
        </div>
      ` : ''}
      
      <!-- Signature Section -->
      <div class="signature-section">
        <h2 class="signature-title">Unterschriften</h2>
        
        ${contractData.signaturePreamble ? `
          <div class="signature-preamble">
            ${contractData.signaturePreamble}
          </div>
        ` : `
          <div class="signature-preamble">
            Die Parteien bestätigen mit ihrer Unterschrift, dass sie den Inhalt dieses Vertrages vollständig gelesen, 
            verstanden und akzeptiert haben.
          </div>
        `}
        
        <div class="signature-date-location">
          <div class="date-block">
            <div class="date-label">Datum</div>
            <div class="date-input"></div>
          </div>
          <div class="location-block">
            <div class="location-label">Ort</div>
            <div class="location-input"></div>
          </div>
        </div>
        
        <div class="signature-grid">
          ${contractData.parties && contractData.parties.map(party => `
            <div class="signature-block">
              <div class="signature-line"></div>
              <div class="signature-name">${party.name || 'Name'}</div>
              <div class="signature-role">${party.role || 'Vertragspartei'}</div>
              ${party.company ? `<div class="signature-company">${party.company}</div>` : ''}
            </div>
          `).join('')}
        </div>
        
        <!-- Witnesses if required -->
        ${contractData.requiresWitnesses ? `
          <div class="witness-section">
            <h3 class="witness-title">Zeugen</h3>
            <div class="witness-grid">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Zeuge 1</div>
                <div class="signature-role">Name, Adresse</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-name">Zeuge 2</div>
                <div class="signature-role">Name, Adresse</div>
              </div>
            </div>
          </div>
        ` : ''}
      </div>
      
      <!-- Appendix / Attachments -->
      ${contractData.attachments && contractData.attachments.length > 0 ? `
        <div class="appendix-section">
          <h2 class="appendix-title">Anlagen</h2>
          <ul class="attachment-list">
            ${contractData.attachments.map((attachment, index) => `
              <li class="attachment-item">
                <span class="attachment-number">Anlage ${index + 1}:</span>
                <span class="attachment-title">${attachment.title || attachment}</span>
                ${attachment.pages ? `<span class="attachment-pages">(${attachment.pages} Seiten)</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
      
      <!-- Verification Section -->
      ${contractData.verificationEnabled !== false ? `
        <div class="verification-section">
          <h3 class="verification-title">Dokumentenverifikation</h3>
          ${qrCodeData ? `
            <div class="qr-code">
              <img src="${qrCodeData}" alt="Verification QR Code" />
            </div>
          ` : ''}
          <div class="verification-text">
            Dieses Dokument wurde digital erstellt und signiert. 
            Die Echtheit kann über den QR-Code oder die Dokument-ID verifiziert werden.
          </div>
          <div class="verification-id">
            ${contractId.substring(0, 8)}-${contractId.substring(8, 12)}-${contractId.substring(12, 16)}
          </div>
          <div class="verification-hash">
            Hash: ${contractHash}
          </div>
        </div>
      ` : ''}
      
    </div>
    
    <!-- Footer - nur für Screen, nicht für Print -->
    <footer class="contract-footer">
      <div class="footer-left">
        <span class="footer-item">Dokument-ID: ${contractId.substring(0, 8)}</span>
      </div>
      <div class="footer-center">
        <span class="page-numbers">
          <!-- Page numbers will be added by puppeteer -->
        </span>
      </div>
      <div class="footer-right">
        <span class="footer-item">${new Date().toLocaleDateString('de-DE')}</span>
      </div>
    </footer>
  </div>
</body>
</html>`;

    return html;
  } catch (error) {
    console.error('Error formatting contract to HTML:', error);
    throw new ContractGenerationError(
      'Failed to format contract',
      'FORMAT_ERROR',
      { originalError: error.message }
    );
  }
}

// Helper Function for Section Content Formatting
function formatSectionContent(content, design) {
  if (!content) return '';
  
  let formatted = content;
  
  // Handle numbered paragraphs (1), (2), (3)
  formatted = formatted.replace(/^\((\d+)\)\s+(.+)$/gm, (match, num, text) => {
    return `<div class="subsection"><span class="subsection-number">(${num})</span>${text}</div>`;
  });
  
  // Handle letter subsections a), b), c)
  formatted = formatted.replace(/^([a-z])\)\s+(.+)$/gm, (match, letter, text) => {
    return `<div class="subsection"><span class="subsection-letter">${letter})</span>${text}</div>`;
  });
  
  // Handle bullet points
  formatted = formatted.replace(/^[•·]\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Handle numbered lists
  formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*<\/li>\n?)+/g, match => {
    if (!match.includes('<ul>')) {
      return '<ol>' + match + '</ol>';
    }
    return match;
  });
  
  // Handle paragraphs
  const paragraphs = formatted.split('\n\n');
  formatted = paragraphs.map(para => {
    para = para.trim();
    if (!para) return '';
    if (para.startsWith('<div') || para.startsWith('<ul') || para.startsWith('<ol')) {
      return para;
    }
    return `<p>${para}</p>`;
  }).join('');
  
  // Handle emphasis and strong
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Handle legal references
  formatted = formatted.replace(/§§?\s*\d+[a-z]?\s*(Abs\.\s*\d+)?(\s+\w+)?/g, match => {
    return `<span class="reference">${match}</span>`;
  });
  
  return formatted;
}

// Database Helper Functions
async function getContractData(contractId, versionId, userId) {
  if (versionId) {
    const version = await db
      .select()
      .from(contractVersions)
      .where(
        and(
          eq(contractVersions.id, versionId),
          eq(contractVersions.contractId, contractId)
        )
      )
      .limit(1);
    
    if (!version[0]) {
      throw new ContractGenerationError('Version not found', 'VERSION_NOT_FOUND');
    }
    
    return version[0];
  } else {
    const contract = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, contractId),
          eq(contracts.userId, userId)
        )
      )
      .limit(1);
    
    if (!contract[0]) {
      throw new ContractGenerationError('Contract not found', 'CONTRACT_NOT_FOUND');
    }
    
    return contract[0];
  }
}

async function getCompanyProfile(userId) {
  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);
  
  return profile[0] || null;
}

// PDF Generation with Puppeteer
async function generatePDF(html, options = {}) {
  let browser;
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--deterministic-fetch',
        '--disable-features=IsolateOrigins',
        '--disable-site-isolation-trials'
        // --single-process entfernt für Stabilität
      ],
      timeout: CONFIG.PUPPETEER_TIMEOUT
    });
    
    const page = await browser.newPage();
    
    // Set viewport for A4
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2
    });
    
    // Set content
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: CONFIG.PUPPETEER_TIMEOUT
    });
    
    // Wait for critical elements
    await page.waitForSelector('.contract-wrapper', { 
      timeout: 5000,
      visible: true 
    });
    
    // Add custom page numbers if needed
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        @page {
          @bottom-center {
            content: counter(page) " / " counter(pages);
          }
        }
      `;
      document.head.appendChild(style);
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="width: 100%; font-size: 8pt; color: #666; 
                    display: flex; justify-content: space-between; 
                    padding: 0 30px; font-family: Arial, sans-serif;">
          <span>${options.footerLeft || ''}</span>
          <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span>
          <span>${options.footerRight || new Date().toLocaleDateString('de-DE')}</span>
        </div>
      `,
      margin: {
        top: options.marginTop || '15mm',
        right: options.marginRight || '15mm',
        bottom: options.marginBottom || '25mm',
        left: options.marginLeft || '15mm'
      },
      preferCSSPageSize: true,
      timeout: CONFIG.PUPPETEER_TIMEOUT,
      ...options.pdfOptions
    });
    
    return pdfBuffer;
    
  } catch (error) {
    throw error;
  } finally {
    // ALWAYS close browser
    if (browser) {
      await browser.close();
    }
  }
}

// Export Handlers for Different Formats
class ExportHandler {
  async exportAsJSON(contractData) {
    return JSON.stringify(contractData, null, 2);
  }
  
  async exportAsHTML(contractData, companyProfile, designVariant) {
    return formatContractToHTML(contractData, companyProfile, designVariant);
  }
  
  async exportAsPDF(contractData, companyProfile, designVariant) {
    const html = await this.exportAsHTML(contractData, companyProfile, designVariant);
    return generatePDF(html);
  }
  
  async exportAsDocx(contractData) {
    // Implementation would require a DOCX library
    throw new Error('DOCX export not yet implemented');
  }
  
  async exportAsExcel(contracts) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contracts');
    
    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 15 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created', key: 'created', width: 20 },
      { header: 'Updated', key: 'updated', width: 20 }
    ];
    
    // Add data
    contracts.forEach(contract => {
      worksheet.addRow({
        id: contract.id,
        title: contract.title,
        type: contract.type,
        status: contract.status,
        created: contract.createdAt,
        updated: contract.updatedAt
      });
    });
    
    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    
    return workbook.xlsx.writeBuffer();
  }
}

const exportHandler = new ExportHandler();

// ===========================
// API ROUTE HANDLERS
// ===========================

// GET Route Handler
export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Route to appropriate handler
    switch (action) {
      case "preview":
        return handlePreview(searchParams, userId);
      case "download":
        return handleDownload(searchParams, userId);
      case "batch-export":
        return handleBatchExport(searchParams, userId);
      case "list":
        return handleList(searchParams, userId);
      case "search":
        return handleSearch(searchParams, userId);
      case "stats":
        return handleStats(userId);
      case "activity":
        return handleActivity(searchParams, userId);
      case "templates":
        return handleTemplates(searchParams, userId);
      case "share":
        return handleShare(searchParams, userId);
      case "versions":
        return handleVersions(searchParams, userId);
      case "compare":
        return handleCompare(searchParams, userId);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }), 
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("GET request error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }), 
      { status: 500 }
    );
  }
}

// POST Route Handler
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    const identifier = `generate_${userId}`;
    const { success } = await ratelimit.limit(identifier);
    
    if (!success) {
      throw new RateLimitError(
        'Too many requests',
        60
      );
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = ContractGenerationSchema.parse(body);
    
    // Track activity
    await activityTracker.track(userId, null, 'contract_generation_started', {
      contractType: validatedData.contractType,
      language: validatedData.language
    });

    // Load template if provided
    let templateContent = null;
    if (validatedData.templateId) {
      const template = await templateManager.loadTemplate(
        validatedData.templateId,
        userId
      );
      if (template) {
        templateContent = template.content;
      }
    }

    // Generate contract with AI
    const generatedContract = await generateContractWithAI(
      validatedData,
      templateContent,
      validatedData.language
    );

    // Save to database
    const contractId = crypto.randomBytes(16).toString('hex');
    
    const savedContract = await db.insert(contracts).values({
      id: contractId,
      userId,
      title: generatedContract.title,
      type: validatedData.contractType,
      content: JSON.stringify(generatedContract),
      status: 'draft',
      designVariant: 'minimal',
      language: validatedData.language,
      metadata: JSON.stringify({
        generatedWith: 'AI',
        model: CONFIG.AI_MODEL,
        templateUsed: validatedData.templateId || null
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Create first version
    await db.insert(contractVersions).values({
      id: crypto.randomBytes(16).toString('hex'),
      contractId: savedContract[0].id,
      versionNumber: 1,
      content: JSON.stringify(generatedContract),
      status: 'draft',
      changeDescription: 'Initial version',
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Track success
    await activityTracker.track(userId, savedContract[0].id, 'contract_generated', {
      contractType: validatedData.contractType,
      language: validatedData.language,
      templateUsed: validatedData.templateId || null
    });

    return new Response(
      JSON.stringify({
        success: true,
        contractId: savedContract[0].id,
        contract: generatedContract,
        message: "Contract generated successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Contract generation error:", error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: error.errors
        }),
        { status: 400 }
      );
    }
    
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          error: error.message,
          retryAfter: error.retryAfter
        }),
        { 
          status: 429,
          headers: {
            'Retry-After': error.retryAfter.toString()
          }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: "Failed to generate contract",
        details: error.message
      }),
      { status: 500 }
    );
  }
}

// PUT Route Handler for Updates
export async function PUT(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const validatedData = ContractUpdateSchema.parse(body);

    // Get current contract
    const currentContract = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, validatedData.contractId),
          eq(contracts.userId, userId)
        )
      )
      .limit(1);

    if (!currentContract[0]) {
      return new Response(
        JSON.stringify({ error: "Contract not found" }),
        { status: 404 }
      );
    }

    // Parse current content
    const currentContent = typeof currentContract[0].content === 'string'
      ? JSON.parse(currentContract[0].content)
      : currentContract[0].content;

    // Merge updates
    const updatedContent = {
      ...currentContent,
      ...validatedData.updates,
      lastModified: new Date().toISOString()
    };

    // Create new version if requested
    if (validatedData.createVersion) {
      const latestVersion = await db
        .select({ versionNumber: contractVersions.versionNumber })
        .from(contractVersions)
        .where(eq(contractVersions.contractId, validatedData.contractId))
        .orderBy(desc(contractVersions.versionNumber))
        .limit(1);

      const newVersionNumber = latestVersion[0] 
        ? latestVersion[0].versionNumber + 1 
        : 1;

      await db.insert(contractVersions).values({
        id: crypto.randomBytes(16).toString('hex'),
        contractId: validatedData.contractId,
        versionNumber: newVersionNumber,
        content: JSON.stringify(updatedContent),
        status: updatedContent.status || 'draft',
        changeDescription: validatedData.versionDescription || 'Manual update',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Update main contract
    await db
      .update(contracts)
      .set({
        content: JSON.stringify(updatedContent),
        status: updatedContent.status || currentContract[0].status,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(contracts.id, validatedData.contractId),
          eq(contracts.userId, userId)
        )
      );

    // Track activity
    await activityTracker.track(userId, validatedData.contractId, 'contract_updated', {
      createVersion: validatedData.createVersion,
      changes: Object.keys(validatedData.updates)
    });

    return new Response(
      JSON.stringify({
        success: true,
        contractId: validatedData.contractId,
        updatedContent,
        message: validatedData.createVersion 
          ? "Contract updated and new version created" 
          : "Contract updated successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Contract update error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to update contract",
        details: error.message
      }),
      { status: 500 }
    );
  }
}

// DELETE Route Handler
export async function DELETE(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get("contractId");

    if (!contractId) {
      return new Response(
        JSON.stringify({ error: "Contract ID required" }),
        { status: 400 }
      );
    }

    // Check ownership
    const contract = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, contractId),
          eq(contracts.userId, userId)
        )
      )
      .limit(1);

    if (!contract[0]) {
      return new Response(
        JSON.stringify({ error: "Contract not found or unauthorized" }),
        { status: 404 }
      );
    }

    // Delete related data
    await db.delete(contractVersions).where(eq(contractVersions.contractId, contractId));
    await db.delete(contractShares).where(eq(contractShares.contractId, contractId));
    await db.delete(contractComments).where(eq(contractComments.contractId, contractId));
    await db.delete(contractActivities).where(eq(contractActivities.contractId, contractId));

    // Delete contract
    await db.delete(contracts).where(
      and(
        eq(contracts.id, contractId),
        eq(contracts.userId, userId)
      )
    );

    // Track activity
    await activityTracker.track(userId, contractId, 'contract_deleted', {
      title: contract[0].title
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contract deleted successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("Contract deletion error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to delete contract",
        details: error.message
      }),
      { status: 500 }
    );
  }
}

// Handler Functions
async function handlePreview(searchParams, userId) {
  try {
    const contractId = searchParams.get("contractId");
    const versionId = searchParams.get("versionId");
    const design = searchParams.get("design") || "minimal";
    
    const contractData = await getContractData(contractId, versionId, userId);
    const companyProfile = await getCompanyProfile(userId);
    
    // Load logo with fallbacks
    if (companyProfile) {
      companyProfile.logo = await logoManager.load(companyProfile);
    }
    
    const html = formatContractToHTML(
      contractData.content,
      companyProfile,
      design
    );
    
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache"
      },
    });
  } catch (error) {
    console.error("Preview error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

async function handleDownload(searchParams, userId) {
  try {
    const contractId = searchParams.get("contractId");
    const versionId = searchParams.get("versionId");
    const format = searchParams.get("format") || "pdf";
    const design = searchParams.get("design") || "minimal";
    
    const contractData = await getContractData(contractId, versionId, userId);
    const companyProfile = await getCompanyProfile(userId);
    
    // Load logo
    if (companyProfile) {
      companyProfile.logo = await logoManager.load(companyProfile);
    }
    
    // Parse content
    const parsedContent = typeof contractData.content === 'string' 
      ? JSON.parse(contractData.content) 
      : contractData.content;
    
    // Generate QR Code
    const qrData = await qrGenerator.generate(
      qrGenerator.generateVerificationUrl(contractId, 'hash123')
    );
    if (qrData) {
      parsedContent.qrCode = qrData;
    }
    
    let result;
    let contentType;
    let fileName;
    
    switch (format.toLowerCase()) {
      case 'pdf':
        const html = formatContractToHTML(parsedContent, companyProfile, design);
        result = await generatePDF(html, {
          footerLeft: `ID: ${contractId.substring(0, 8)}`,
          footerRight: new Date().toLocaleDateString('de-DE')
        });
        contentType = 'application/pdf';
        fileName = `Vertrag_${contractId.substring(0, 8)}.pdf`;
        break;
        
      case 'html':
        result = formatContractToHTML(parsedContent, companyProfile, design);
        contentType = 'text/html';
        fileName = `Vertrag_${contractId.substring(0, 8)}.html`;
        break;
        
      case 'json':
        result = JSON.stringify(parsedContent, null, 2);
        contentType = 'application/json';
        fileName = `Vertrag_${contractId.substring(0, 8)}.json`;
        break;
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    
    // Track download
    await activityTracker.track(userId, contractId, 'contract_downloaded', {
      format,
      design
    });
    
    return new Response(result, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Download error:', error);
    return new Response(
      JSON.stringify({
        error: 'Download failed',
        message: error.message
      }),
      { status: 500 }
    );
  }
}

async function handleBatchExport(searchParams, userId) {
  try {
    const contractIds = searchParams.get("contractIds")?.split(',') || [];
    const format = searchParams.get("format") || "pdf";
    
    if (contractIds.length === 0) {
      throw new Error("No contract IDs provided");
    }
    
    if (contractIds.length > CONFIG.MAX_CONTRACTS_PER_BATCH) {
      throw new Error(`Maximum ${CONFIG.MAX_CONTRACTS_PER_BATCH} contracts per batch`);
    }
    
    const results = [];
    const companyProfile = await getCompanyProfile(userId);
    
    for (const contractId of contractIds) {
      try {
        const contractData = await getContractData(contractId, null, userId);
        const parsedContent = typeof contractData.content === 'string' 
          ? JSON.parse(contractData.content) 
          : contractData.content;
        
        let exportData;
        
        switch (format) {
          case 'pdf':
            const html = await formatContractToHTML(parsedContent, companyProfile, 'minimal');
            exportData = await generatePDF(html);
            break;
          case 'json':
            exportData = JSON.stringify(parsedContent);
            break;
          default:
            throw new Error(`Unsupported format: ${format}`);
        }
        
        results.push({
          id: contractId,
          success: true,
          data: Buffer.from(exportData).toString('base64'),
          filename: `${parsedContent.title || contractId}.${format}`
        });
        
      } catch (error) {
        results.push({
          id: contractId,
          success: false,
          error: error.message
        });
      }
    }
    
    // Create ZIP archive if multiple files
    if (results.length > 1 && format === 'pdf') {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks = [];
      
      archive.on('data', chunk => chunks.push(chunk));
      
      results.forEach(result => {
        if (result.success) {
          archive.append(Buffer.from(result.data, 'base64'), {
            name: result.filename
          });
        }
      });
      
      await archive.finalize();
      
      const zipBuffer = Buffer.concat(chunks);
      
      return new Response(zipBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="contracts_export.zip"`,
        },
      });
    }
    
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Batch export error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

async function handleList(searchParams, userId) {
  try {
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";
    
    const offset = (page - 1) * limit;
    
    let query = db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId));
    
    if (status) {
      query = query.where(eq(contracts.status, status));
    }
    
    if (type) {
      query = query.where(eq(contracts.type, type));
    }
    
    // Apply sorting
    const sortColumn = contracts[sort] || contracts.createdAt;
    query = order === 'desc' 
      ? query.orderBy(desc(sortColumn))
      : query.orderBy(sortColumn);
    
    // Apply pagination
    query = query.limit(limit).offset(offset);
    
    const results = await query;
    
    // Get total count
    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(contracts)
      .where(eq(contracts.userId, userId));
    
    if (status) {
      countQuery.where(eq(contracts.status, status));
    }
    
    if (type) {
      countQuery.where(eq(contracts.type, type));
    }
    
    const totalCount = await countQuery;
    
    return new Response(
      JSON.stringify({
        contracts: results,
        pagination: {
          page,
          limit,
          total: parseInt(totalCount[0]?.count || 0),
          pages: Math.ceil(parseInt(totalCount[0]?.count || 0) / limit)
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('List error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

async function handleSearch(searchParams, userId) {
  try {
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: "Search query required" }),
        { status: 400 }
      );
    }
    
    const results = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.userId, userId),
          or(
            like(contracts.title, `%${query}%`),
            like(contracts.content, `%${query}%`)
          )
        )
      )
      .limit(limit)
      .orderBy(desc(contracts.updatedAt));
    
    return new Response(
      JSON.stringify({
        results,
        query,
        count: results.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

async function handleStats(userId) {
  try {
    const stats = await db
      .select({
        total: sql`count(*)`,
        draft: sql`sum(case when status = 'draft' then 1 else 0 end)`,
        review: sql`sum(case when status = 'review' then 1 else 0 end)`,
        final: sql`sum(case when status = 'final' then 1 else 0 end)`,
        signed: sql`sum(case when status = 'signed' then 1 else 0 end)`
      })
      .from(contracts)
      .where(eq(contracts.userId, userId));
    
    const recentActivity = await db
      .select()
      .from(contractActivities)
      .where(eq(contractActivities.userId, userId))
      .orderBy(desc(contractActivities.createdAt))
      .limit(10);
    
    return new Response(
      JSON.stringify({
        stats: stats[0],
        recentActivity
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error) {
    console.error('Stats error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
}

// AI Contract Generation
async function generateContractWithAI(data, templateContent, language = 'de') {
  try {
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.de;
    
    const structuredPrompt = `
${language === 'de' ? 'Erstelle einen professionellen' : 'Create a professional'} ${data.contractType} ${language === 'de' ? 'mit folgenden Anforderungen:' : 'with the following requirements:'}

${language === 'de' ? 'HAUPTANFORDERUNG:' : 'MAIN REQUIREMENT:'}
${data.prompt}

${data.parties ? `${language === 'de' ? 'VERTRAGSPARTEIEN:' : 'CONTRACT PARTIES:'}
${data.parties.map(p => `- ${p.role}: ${p.name}, ${p.address || ''}`).join('\n')}` : ''}

${data.clauses ? `${language === 'de' ? 'SPEZIELLE KLAUSELN:' : 'SPECIAL CLAUSES:'}
${data.clauses.join('\n')}` : ''}

${data.specialRequirements ? `${language === 'de' ? 'ZUSÄTZLICHE ANFORDERUNGEN:' : 'ADDITIONAL REQUIREMENTS:'}
${data.specialRequirements}` : ''}

${templateContent ? `${language === 'de' ? 'BASIEREND AUF TEMPLATE:' : 'BASED ON TEMPLATE:'}
${JSON.stringify(templateContent)}` : ''}

${language === 'de' ? 'AUSGABEFORMAT:' : 'OUTPUT FORMAT:'}
${language === 'de' ? 'Erstelle den Vertrag als strukturiertes JSON-Objekt mit folgendem Schema:' : 'Create the contract as a structured JSON object with the following schema:'}
{
  "title": "${language === 'de' ? 'Haupttitel des Vertrags' : 'Main contract title'}",
  "type": "${data.contractType}",
  "subtitle": "${language === 'de' ? 'Optionaler Untertitel' : 'Optional subtitle'}",
  "parties": [
    {
      "role": "${language === 'de' ? 'Rolle der Partei' : 'Party role'}",
      "name": "Name",
      "address": "${language === 'de' ? 'Adresse' : 'Address'}",
      "registrationNumber": "${language === 'de' ? 'HRB-Nummer falls vorhanden' : 'Registration number if available'}",
      "representative": "${language === 'de' ? 'Vertretungsberechtigter falls vorhanden' : 'Representative if available'}"
    }
  ],
  "sections": [
    {
      "title": "${language === 'de' ? 'Titel des Paragraphen' : 'Section title'}",
      "content": "${language === 'de' ? 'Inhalt mit Absätzen und Unterpunkten. Nutze Nummerierung (1), (2) für Absätze und a), b) für Unterpunkte.' : 'Content with paragraphs and sub-points. Use numbering (1), (2) for paragraphs and a), b) for sub-points.'}"
    }
  ],
  "attachments": ["${language === 'de' ? 'Liste der Anlagen falls erwähnt' : 'List of attachments if mentioned'}"],
  "status": "draft"
}`;

    const completion = await openai.chat.completions.create({
      model: CONFIG.AI_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: structuredPrompt
        }
      ],
      temperature: CONFIG.AI_TEMPERATURE,
      max_tokens: CONFIG.AI_MAX_TOKENS,
      response_format: { type: "json_object" }
    });

    const generatedContract = JSON.parse(completion.choices[0].message.content);
    
    // Validate structure
    if (!generatedContract.sections || generatedContract.sections.length === 0) {
      throw new Error("Invalid contract structure generated");
    }
    
    // Add metadata
    generatedContract.generatedAt = new Date().toISOString();
    generatedContract.language = language;
    generatedContract.aiModel = CONFIG.AI_MODEL;
    
    return generatedContract;
    
  } catch (error) {
    console.error('AI generation error:', error);
    throw new ContractGenerationError(
      'Failed to generate contract with AI',
      'AI_GENERATION_ERROR',
      { originalError: error.message }
    );
  }
}

// Additional Handler Functions
async function handleActivity(searchParams, userId) {
  const contractId = searchParams.get("contractId");
  const limit = parseInt(searchParams.get("limit") || "50");
  
  const activities = await activityTracker.getHistory(contractId, limit);
  
  return new Response(
    JSON.stringify({ activities }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function handleTemplates(searchParams, userId) {
  const action = searchParams.get("subaction");
  
  switch (action) {
    case "list":
      const templates = await db
        .select()
        .from(contractTemplates)
        .where(
          or(
            eq(contractTemplates.userId, userId),
            eq(contractTemplates.isPublic, true)
          )
        )
        .orderBy(desc(contractTemplates.usageCount));
      
      return new Response(
        JSON.stringify({ templates }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    case "create":
      const contractId = searchParams.get("contractId");
      const name = searchParams.get("name");
      const description = searchParams.get("description");
      
      const template = await templateManager.createFromContract(
        contractId,
        userId,
        name,
        description
      );
      
      return new Response(
        JSON.stringify({ template }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    default:
      return new Response(
        JSON.stringify({ error: "Invalid template action" }),
        { status: 400 }
      );
  }
}

async function handleShare(searchParams, userId) {
  const contractId = searchParams.get("contractId");
  const email = searchParams.get("email");
  const permission = searchParams.get("permission") || "view";
  
  // Create share record
  const share = await db.insert(contractShares).values({
    id: crypto.randomBytes(16).toString('hex'),
    contractId,
    sharedBy: userId,
    sharedWith: email,
    permission,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    createdAt: new Date()
  }).returning();
  
  // Send email notification
  if (sendEmail) {
    await sendEmail({
      to: email,
      subject: 'Contract shared with you',
      body: `A contract has been shared with you. Access it here: ${process.env.NEXT_PUBLIC_APP_URL}/shared/${share[0].id}`
    });
  }
  
  return new Response(
    JSON.stringify({ share: share[0] }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function handleVersions(searchParams, userId) {
  const contractId = searchParams.get("contractId");
  
  const versions = await db
    .select()
    .from(contractVersions)
    .where(eq(contractVersions.contractId, contractId))
    .orderBy(desc(contractVersions.versionNumber));
  
  return new Response(
    JSON.stringify({ versions }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

async function handleCompare(searchParams, userId) {
  const version1Id = searchParams.get("v1");
  const version2Id = searchParams.get("v2");
  
  const [v1, v2] = await Promise.all([
    db.select().from(contractVersions).where(eq(contractVersions.id, version1Id)).limit(1),
    db.select().from(contractVersions).where(eq(contractVersions.id, version2Id)).limit(1)
  ]);
  
  if (!v1[0] || !v2[0]) {
    return new Response(
      JSON.stringify({ error: "Version not found" }),
      { status: 404 }
    );
  }
  
  const changes = compareVersions(v1[0], v2[0]);
  
  return new Response(
    JSON.stringify({ 
      version1: v1[0],
      version2: v2[0],
      changes 
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Version Comparison Function
function compareVersions(v1, v2) {
  const changes = [];
  
  const content1 = typeof v1.content === 'string' ? JSON.parse(v1.content) : v1.content;
  const content2 = typeof v2.content === 'string' ? JSON.parse(v2.content) : v2.content;
  
  // Compare sections
  if (content1.sections?.length !== content2.sections?.length) {
    changes.push({
      type: 'section_count',
      old: content1.sections?.length,
      new: content2.sections?.length
    });
  }
  
  // Compare each section
  const maxSections = Math.max(
    content1.sections?.length || 0,
    content2.sections?.length || 0
  );
  
  for (let i = 0; i < maxSections; i++) {
    const s1 = content1.sections?.[i];
    const s2 = content2.sections?.[i];
    
    if (!s1 && s2) {
      changes.push({
        type: 'section_added',
        index: i,
        section: s2
      });
    } else if (s1 && !s2) {
      changes.push({
        type: 'section_removed',
        index: i,
        section: s1
      });
    } else if (s1 && s2) {
      if (s1.title !== s2.title) {
        changes.push({
          type: 'section_title_changed',
          index: i,
          old: s1.title,
          new: s2.title
        });
      }
      if (s1.content !== s2.content) {
        changes.push({
          type: 'section_content_changed',
          index: i,
          old: s1.content,
          new: s2.content
        });
      }
    }
  }
  
  // Compare status
  if (content1.status !== content2.status) {
    changes.push({
      type: 'status',
      old: content1.status,
      new: content2.status
    });
  }
  
  // Compare parties
  if (JSON.stringify(content1.parties) !== JSON.stringify(content2.parties)) {
    changes.push({
      type: 'parties',
      old: content1.parties,
      new: content2.parties
    });
  }
  
  return changes;
}

// Performance Monitoring
const performanceMetrics = {
  pdfGenerationTime: [],
  htmlGenerationTime: [],
  aiGenerationTime: [],
  dbQueryTime: []
};

function logPerformance(metric, time) {
  if (performanceMetrics[metric]) {
    performanceMetrics[metric].push(time);
    
    // Keep only last 100 entries
    if (performanceMetrics[metric].length > 100) {
      performanceMetrics[metric].shift();
    }
  }
}

function getPerformanceStats() {
  const stats = {};
  
  for (const [key, values] of Object.entries(performanceMetrics)) {
    if (values.length > 0) {
      stats[key] = {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
        last: values[values.length - 1]
      };
    }
  }
  
  return stats;
}

// Export configuration
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
  maxDuration: 60,
};

// Initialization
console.log(`
===============================================
CONTRACT GENERATION SYSTEM V3.0 - ENTERPRISE
===============================================
Status: READY
Features: ALL ENABLED
Total Lines: ${__filename.split('\n').length}
Environment: ${process.env.NODE_ENV}
===============================================
`);

// Export utilities for testing
export {
  ContractGenerationError,
  ValidationError,
  RateLimitError,
  CacheManager,
  LogoManager,
  QRCodeGenerator,
  TemplateManager,
  ActivityTracker,
  ExportHandler,
  formatContractToHTML,
  formatSectionContent,
  generatePDF,
  generateContractWithAI,
  compareVersions,
  logPerformance,
  getPerformanceStats,
  cache,
  logoManager,
  qrGenerator,
  templateManager,
  activityTracker,
  exportHandler
};
