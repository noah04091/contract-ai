// 📁 backend/utils/pdfGenerator.js
// 🎯 Premium Feature: Advanced PDF Generation für Contract AI
// 
// Zweck: Generiert Clean-PDF & Redline-PDF mit professioneller Formatierung
// Inputs: contractText, changes[], format ('clean'|'redline'), options{}
// Outputs: PDF Buffer
// ENV-Flags: PDF_WATERMARK, PDF_SIGNATURE_BLOCKS, PDF_FOOTER_TEXT

const PDFDocument = require('pdfkit');
const { createHash } = require('crypto');

class AdvancedPDFGenerator {
  
  /**
   * Generiert Clean-PDF (finale optimierte Fassung)
   */
  static async generateCleanPDF(optimizedText, metadata = {}, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log('📄 Generating Clean PDF (optimized version)...');
        
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          font: 'Helvetica',
          bufferPages: true,
          info: {
            Title: metadata.title || 'Optimierter Vertrag',
            Subject: 'Vertrag - Optimierte Fassung',
            Author: 'Contract AI',
            Creator: 'Contract AI - Legal Document Platform',
            Producer: 'Contract AI PDF Generator',
            CreationDate: new Date(),
            ModDate: new Date()
          }
        });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`✅ Clean PDF generated: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        
        // Header mit Wasserzeichen (falls aktiviert)
        if (process.env.PDF_WATERMARK === 'true') {
          this.addWatermark(doc, 'OPTIMIERT');
        }
        
        // Titel-Seite
        this.addTitlePage(doc, metadata, 'CLEAN');
        
        // Vertragsinhalt
        this.addOptimizedContent(doc, optimizedText, metadata);
        
        // Signatur-Felder (falls aktiviert)
        if (process.env.PDF_SIGNATURE_BLOCKS === 'true') {
          this.addSignatureFields(doc);
        }
        
        // Footer auf allen Seiten
        this.addPageFooters(doc, 'clean', metadata);
        
        // Rechtliche Hinweise
        this.addLegalDisclaimer(doc);
        
        doc.end();
        
      } catch (error) {
        console.error('❌ Clean PDF generation failed:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Generiert Redline-PDF (Änderungen markiert)
   */
  static async generateRedlinePDF(originalText, optimizedText, changes = [], metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔴 Generating Redline PDF (changes marked)...');
        
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          font: 'Helvetica',
          bufferPages: true,
          info: {
            Title: (metadata.title || 'Vertrag') + ' - Redline Version',
            Subject: 'Vertrag - Änderungsübersicht',
            Author: 'Contract AI',
            Creator: 'Contract AI - Legal Document Platform',
            Producer: 'Contract AI PDF Generator',
            CreationDate: new Date(),
            ModDate: new Date()
          }
        });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`✅ Redline PDF generated: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        
        // Header mit Wasserzeichen
        if (process.env.PDF_WATERMARK === 'true') {
          this.addWatermark(doc, 'REDLINE');
        }
        
        // Titel-Seite
        this.addTitlePage(doc, metadata, 'REDLINE');
        
        // Änderungslegende
        this.addRedlineLegend(doc, changes);
        
        // Redline-Vertragsinhalt
        this.addRedlineContent(doc, originalText, optimizedText, changes);
        
        // Änderungsübersicht
        this.addChangesSummary(doc, changes);
        
        // Footer auf allen Seiten  
        this.addPageFooters(doc, 'redline', metadata);
        
        // Rechtliche Hinweise
        this.addLegalDisclaimer(doc);
        
        doc.end();
        
      } catch (error) {
        console.error('❌ Redline PDF generation failed:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Generiert Executive Summary PDF
   */
  static async generateExecutiveSummaryPDF(summaryData, metadata = {}) {
    return new Promise((resolve, reject) => {
      try {
        console.log('📊 Generating Executive Summary PDF...');
        
        const doc = new PDFDocument({
          margin: 50,
          size: 'A4',
          font: 'Helvetica',
          bufferPages: true,
          info: {
            Title: 'Executive Summary - Vertragsanalyse',
            Subject: 'Executive Summary',
            Author: 'Contract AI',
            Creator: 'Contract AI - Legal Document Platform',
            Producer: 'Contract AI PDF Generator',
            CreationDate: new Date()
          }
        });
        
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          console.log(`✅ Executive Summary PDF generated: ${pdfBuffer.length} bytes`);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);
        
        // Executive Summary Layout
        this.addExecutiveSummaryContent(doc, summaryData, metadata);
        
        // Footer
        this.addPageFooters(doc, 'executive', metadata);
        
        doc.end();
        
      } catch (error) {
        console.error('❌ Executive Summary PDF generation failed:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Fügt Wasserzeichen hinzu
   */
  static addWatermark(doc, text) {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    
    doc.fontSize(120).fillColor('#f0f0f0', 0.3)
       .rotate(45, { origin: [pageWidth / 2, pageHeight / 2] })
       .text(text, pageWidth / 2 - 200, pageHeight / 2 - 50, { align: 'center' })
       .rotate(-45, { origin: [pageWidth / 2, pageHeight / 2] })
       .fillColor('#000000', 1.0);
  }
  
  /**
   * Fügt Titel-Seite hinzu
   */
  static addTitlePage(doc, metadata, type) {
    // Haupttitel
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text(metadata.title || 'VERTRAG', { align: 'center' });
    
    doc.moveDown(0.5);
    
    // Untertitel basierend auf Typ
    const subtitles = {
      'CLEAN': 'OPTIMIERTE FASSUNG',
      'REDLINE': 'ÄNDERUNGSÜBERSICHT (REDLINE)'
    };
    
    doc.fontSize(16).font('Helvetica').fillColor('#666666')
       .text(subtitles[type] || 'VERTRAGSANALYSE', { align: 'center' });
    
    doc.moveDown(2);
    
    // Metadaten-Box
    const metaY = doc.y;
    doc.rect(50, metaY, 495, 200).fill('#f8f9fa').stroke('#e0e0e0');
    
    // Metadaten-Inhalt
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#333333')
       .text('📋 DOKUMENTINFORMATIONEN', 70, metaY + 20);
    
    let infoY = metaY + 50;
    const infoItems = [
      { label: 'Vertragstyp:', value: metadata.type || 'Sonstiges' },
      { label: 'Jurisdiktion:', value: metadata.jurisdiction || 'Deutschland' },
      { label: 'Erstellt am:', value: new Date().toLocaleDateString('de-DE') },
      { label: 'Version:', value: metadata.version || '1.0' },
      { label: 'Dokument-ID:', value: metadata.documentId || this.generateDocumentId() },
      { label: 'Bearbeitung:', value: type === 'CLEAN' ? 'Finale Fassung' : 'Änderungsnachweis' }
    ];
    
    doc.fontSize(10).font('Helvetica').fillColor('#555555');
    for (const item of infoItems) {
      doc.font('Helvetica-Bold').text(item.label, 70, infoY, { continued: true, width: 120 })
         .font('Helvetica').text(' ' + item.value, { width: 350 });
      infoY += 20;
    }
    
    doc.moveDown(3);
  }
  
  /**
   * Fügt optimierten Vertragsinhalt hinzu (Clean-PDF)
   */
  static addOptimizedContent(doc, optimizedText, metadata) {
    doc.addPage();
    
    // Inhalts-Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('VERTRAGSTEXT', { align: 'center' });
    
    doc.moveDown(1);
    
    // Vertragstext in Blöcken
    const paragraphs = optimizedText.split('\n\n').filter(p => p.trim());
    
    doc.fontSize(11).font('Helvetica').fillColor('#333333');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      if (!paragraph) continue;
      
      // Prüfe ob es eine Überschrift ist (beginnt mit §, Ziffer, etc.)
      if (paragraph.match(/^§|^\d+\.|^[A-Z][^a-z]*$/)) {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a1a')
           .text(paragraph, { align: 'left' });
        doc.moveDown(0.5);
      } else {
        doc.fontSize(11).font('Helvetica').fillColor('#333333')
           .text(paragraph, { align: 'justify', lineGap: 2 });
        doc.moveDown(0.8);
      }
      
      // Neue Seite falls nötig
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }
    }
  }
  
  /**
   * Fügt Redline-Legende hinzu
   */
  static addRedlineLegend(doc, changes) {
    doc.addPage();
    
    // Legenden-Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('📖 ÄNDERUNGSLEGENDE', { align: 'center' });
    
    doc.moveDown(1);
    
    // Legende-Box
    const legendY = doc.y;
    doc.rect(50, legendY, 495, 120).fill('#fff3e0').stroke('#ff9800');
    
    // Legende-Einträge
    doc.fontSize(11).font('Helvetica').fillColor('#333333');
    
    const legendItems = [
      { color: '#d32f2f', text: 'Gelöschter Text (rot durchgestrichen)' },
      { color: '#2e7d32', text: 'Eingefügter Text (grün unterstrichen)' },
      { color: '#1976d2', text: 'Geänderter Text (blau markiert)' },
      { color: '#f57c00', text: 'Neue Klausel (orange hinterlegt)' }
    ];
    
    let legendItemY = legendY + 20;
    for (const item of legendItems) {
      // Farb-Indikator
      doc.rect(70, legendItemY, 12, 12).fill(item.color).stroke(item.color);
      
      // Text
      doc.fillColor('#333333').text(item.text, 90, legendItemY + 2);
      legendItemY += 20;
    }
    
    // Statistiken
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('📊 ÄNDERUNGSSTATISTIK');
    
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#555555')
       .text(`Gesamtanzahl Änderungen: ${changes.length}`)
       .text(`Angewendete Optimierungen: ${changes.filter(c => c.type === 'applied').length}`)
       .text(`Übersprungene Änderungen: ${changes.filter(c => c.type === 'rejected').length}`);
  }
  
  /**
   * Fügt Redline-Inhalt hinzu
   */
  static addRedlineContent(doc, originalText, optimizedText, changes) {
    doc.addPage();
    
    // Redline-Header
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('VERTRAGSTEXT MIT ÄNDERUNGSMARKIERUNGEN', { align: 'center' });
    
    doc.moveDown(1);
    
    // Vereinfachte Redline-Darstellung
    // (In einer Vollimplementierung würde hier ein differzierteres Diff-System verwendet)
    
    const paragraphs = optimizedText.split('\n\n').filter(p => p.trim());
    doc.fontSize(11).font('Helvetica').fillColor('#333333');
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue;
      
      // Prüfe ob dieser Paragraph eine Änderung enthält
      const hasChange = changes.some(change => 
        paragraph.includes(change.improved) || paragraph.includes(change.original)
      );
      
      if (hasChange) {
        // Markiere als geändert
        doc.fillColor('#2e7d32').text('+ ' + paragraph, { 
          align: 'justify', 
          lineGap: 2,
          underline: true 
        });
      } else {
        // Normaler Text
        doc.fillColor('#333333').text(paragraph, { 
          align: 'justify', 
          lineGap: 2 
        });
      }
      
      doc.moveDown(0.8);
      
      // Neue Seite falls nötig
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }
    }
  }
  
  /**
   * Fügt Änderungsübersicht hinzu
   */
  static addChangesSummary(doc, changes) {
    doc.addPage();
    
    // Übersicht-Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('📋 DETAILLIERTE ÄNDERUNGSÜBERSICHT', { align: 'center' });
    
    doc.moveDown(1);
    
    let changeIndex = 1;
    for (const change of changes.slice(0, 10)) { // Max 10 Änderungen
      if (change.type !== 'applied') continue;
      
      // Änderungs-Box
      const changeY = doc.y;
      doc.rect(50, changeY, 495, 80).fill('#f8f9fa').stroke('#e0e0e0');
      
      // Änderungs-Header
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#1976d2')
         .text(`${changeIndex}. ${change.category?.toUpperCase() || 'OPTIMIERUNG'}`, 60, changeY + 10);
      
      // Änderungs-Details
      doc.fontSize(9).font('Helvetica').fillColor('#555555')
         .text(`Original: "${(change.original || 'FEHLT').substring(0, 100)}..."`, 60, changeY + 30, { width: 475 })
         .text(`Optimiert: "${(change.improved || '').substring(0, 100)}..."`, 60, changeY + 45, { width: 475 })
         .text(`Begründung: ${(change.reasoning || 'Optimierung für bessere Rechtssicherheit').substring(0, 80)}...`, 60, changeY + 60, { width: 475 });
      
      doc.y = changeY + 90;
      changeIndex++;
      
      // Neue Seite falls nötig
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }
    }
  }
  
  /**
   * Fügt Executive Summary Inhalt hinzu
   */
  static addExecutiveSummaryContent(doc, summaryData, metadata) {
    // Executive Summary Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('📊 EXECUTIVE SUMMARY', { align: 'center' });
    
    doc.fontSize(12).font('Helvetica').fillColor('#666666')
       .text('Vertragsoptimierung - Managementbericht', { align: 'center' });
    
    doc.moveDown(2);
    
    // Health Score Dashboard
    this.addHealthScoreDashboard(doc, summaryData.healthScore);
    
    // Key Metrics
    this.addKeyMetrics(doc, summaryData.changesSummary);
    
    // Top Risks
    this.addTopRisks(doc, summaryData.topRisks);
    
    // Quick Wins
    this.addQuickWins(doc, summaryData.quickWins);
    
    // Recommendations
    this.addRecommendations(doc, summaryData.recommendations);
    
    // Next Steps
    this.addNextSteps(doc, summaryData.nextSteps);
  }
  
  /**
   * Health Score Dashboard
   */
  static addHealthScoreDashboard(doc, healthScore) {
    const dashY = doc.y;
    doc.rect(50, dashY, 495, 100).fill('#e3f2fd').stroke('#1976d2');
    
    // Header
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976d2')
       .text('❤️ VERTRAGS-GESUNDHEITSSCORE', 70, dashY + 15);
    
    // Score Anzeige
    doc.fontSize(36).font('Helvetica-Bold').fillColor('#2e7d32')
       .text(healthScore.after.toString(), 70, dashY + 40);
    
    doc.fontSize(12).font('Helvetica').fillColor('#333333')
       .text('/100', 130, dashY + 55)
       .text(`Verbesserung: +${healthScore.improvement} Punkte`, 200, dashY + 45)
       .text(`Bewertung: ${healthScore.rating}`, 200, dashY + 65);
    
    doc.y = dashY + 120;
  }
  
  /**
   * Key Metrics
   */
  static addKeyMetrics(doc, changesSummary) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('📈 KERNKENNZAHLEN');
    
    doc.moveDown(0.5);
    
    const metrics = [
      { label: 'Gesamtoptimierungen', value: changesSummary.totalOptimizations },
      { label: 'Umgesetzte Änderungen', value: changesSummary.appliedChanges },
      { label: 'Erfolgsquote', value: changesSummary.successRate + '%' },
      { label: 'Hauptkategorien', value: changesSummary.keyCategories.join(', ') }
    ];
    
    doc.fontSize(10).font('Helvetica').fillColor('#555555');
    for (const metric of metrics) {
      doc.font('Helvetica-Bold').text(metric.label + ':', { continued: true, width: 150 })
         .font('Helvetica').text(' ' + metric.value);
    }
    
    doc.moveDown(1);
  }
  
  /**
   * Top Risks
   */
  static addTopRisks(doc, topRisks) {
    if (!topRisks.length) return;
    
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#d32f2f')
       .text('⚠️ HAUPTRISIKEN');
    
    doc.moveDown(0.5);
    
    for (let i = 0; i < Math.min(3, topRisks.length); i++) {
      const risk = topRisks[i];
      doc.fontSize(10).font('Helvetica').fillColor('#333333')
         .text(`${i + 1}. ${risk.category}: ${risk.risk}`, { indent: 10 });
    }
    
    doc.moveDown(1);
  }
  
  /**
   * Quick Wins
   */
  static addQuickWins(doc, quickWins) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2e7d32')
       .text('⚡ QUICK WINS');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica').fillColor('#333333')
       .text(`${quickWins.implemented} Optimierungen implementiert`)
       .text(`Kategorien: ${quickWins.categories.join(', ')}`)
       .text(`Geschätzte Umsetzungszeit: ${quickWins.estimatedTimeToImplement}`);
    
    doc.moveDown(1);
  }
  
  /**
   * Recommendations
   */
  static addRecommendations(doc, recommendations) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1976d2')
       .text('💡 EMPFEHLUNGEN');
    
    doc.moveDown(0.5);
    
    const sections = [
      { title: 'Sofort:', items: recommendations.immediate },
      { title: 'Kurzfristig:', items: recommendations.shortTerm },
      { title: 'Langfristig:', items: recommendations.longTerm }
    ];
    
    for (const section of sections) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333')
         .text(section.title);
      
      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      for (const item of section.items) {
        doc.text(`• ${item}`, { indent: 10 });
      }
      doc.moveDown(0.3);
    }
    
    doc.moveDown(1);
  }
  
  /**
   * Next Steps
   */
  static addNextSteps(doc, nextSteps) {
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#ff9800')
       .text('🎯 NÄCHSTE SCHRITTE');
    
    doc.moveDown(0.5);
    
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    for (let i = 0; i < nextSteps.length; i++) {
      doc.text(`${i + 1}. ${nextSteps[i]}`, { indent: 10 });
    }
  }
  
  /**
   * Fügt Signatur-Felder hinzu (falls ENV aktiviert)
   */
  static addSignatureFields(doc) {
    doc.addPage();
    
    // Signatur-Header
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a1a1a')
       .text('📝 UNTERSCHRIFTEN', { align: 'center' });
    
    doc.moveDown(2);
    
    // Signatur-Blöcke (wie im bestehenden Code)
    this.createSignatureBlock(doc, 'Vertragspartei 1', 50, doc.y);
    this.createSignatureBlock(doc, 'Vertragspartei 2', 305, doc.y);
  }
  
  /**
   * Erstellt einen Signatur-Block
   */
  static createSignatureBlock(doc, title, x, y) {
    const blockHeight = 80;
    
    doc.rect(x, y, 240, blockHeight).stroke('#d0d0d0');
    doc.fontSize(12).fillColor('#333333').text(title, x + 10, y + 10);
    doc.fontSize(10).fillColor('#666666')
       .text('Name: _________________________________', x + 10, y + 30)
       .text('Datum: _______________________________', x + 10, y + 45)
       .text('Unterschrift: ________________________', x + 10, y + 60);
  }
  
  /**
   * Fügt Seiten-Footer hinzu
   */
  static addPageFooters(doc, type, metadata) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      const footerY = doc.page.height - 50;
      
      // Trennlinie
      doc.moveTo(50, footerY - 10)
         .lineTo(doc.page.width - 50, footerY - 10)
         .stroke('#cccccc');
      
      // Footer-Text
      doc.fontSize(8).fillColor('#666666');
      
      const footerText = process.env.PDF_FOOTER_TEXT || 'Generiert durch Contract AI - Juristische Optimierungsplattform';
      const versionText = `Version ${metadata.version || '1.0'} | ${type.toUpperCase()} | Seite ${i + 1}/${pageCount}`;
      const dateText = new Date().toLocaleDateString('de-DE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      doc.text(footerText, 50, footerY, { align: 'left' })
         .text(versionText, 50, footerY + 10, { align: 'center' })
         .text(dateText, 50, footerY, { align: 'right' });
    }
  }
  
  /**
   * Fügt rechtliche Hinweise hinzu
   */
  static addLegalDisclaimer(doc) {
    doc.addPage();
    
    // Disclaimer-Header
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#d32f2f')
       .text('⚖️ RECHTLICHE HINWEISE', { align: 'center' });
    
    doc.moveDown(1);
    
    // Disclaimer-Box
    const disclaimerY = doc.y;
    doc.rect(50, disclaimerY, 495, 180).fill('#fff3e0').stroke('#ff9800');
    
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#e65100')
       .text('⚠️ HAFTUNGSAUSSCHLUSS', 60, disclaimerY + 15);
    
    const disclaimerTexts = [
      '• Diese Optimierungen wurden durch KI-Systeme generiert und ersetzen NICHT die Beratung durch einen qualifizierten Rechtsanwalt.',
      '• Vor Verwendung dieses optimierten Vertrags sollte eine rechtliche Prüfung durch einen Fachanwalt erfolgen.',
      '• Contract AI übernimmt keine Haftung für rechtliche Konsequenzen aus der Verwendung dieser Optimierungen.',
      '• Alle Angaben ohne Gewähr. Änderungen vorbehalten.',
      '• Diese Analyse dient nur als Entscheidungshilfe und stellt keine Rechtsberatung dar.'
    ];
    
    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    let disclaimerTextY = disclaimerY + 35;
    
    for (const text of disclaimerTexts) {
      doc.text(text, 60, disclaimerTextY, { width: 475, align: 'justify' });
      disclaimerTextY += 20;
    }
    
    // Support-Informationen
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1976d2')
       .text('📞 Support: support@contract-ai.de | 🌐 www.contract-ai.de', 60, disclaimerY + 160, { width: 475 })
       .text(`Dokument-ID: ${metadata.documentId || this.generateDocumentId()} | Generiert: ${new Date().toISOString()}`, 60, disclaimerY + 175, { width: 475 });
  }
  
  /**
   * Generiert eindeutige Dokument-ID
   */
  static generateDocumentId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `DOC-${timestamp}-${random}`.toUpperCase();
  }
}

module.exports = AdvancedPDFGenerator;