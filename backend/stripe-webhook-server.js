// 📁 backend/stripe-webhook-server.js

require('dotenv').config();

const http = require('http');
const { Buffer } = require('buffer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ObjectId } = require('mongodb');
const database = require('./config/database');
// EMAIL über Main Server API (funktioniert!)
const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    // PDF Attachments zu Base64 konvertieren für API Transport
    const processedAttachments = attachments.map(att => ({
      filename: att.filename,
      content: att.content instanceof Buffer ? att.content.toString('base64') : att.content,
      encoding: 'base64'
    }));

    const emailData = {
      to,
      subject,
      html,
      attachments: processedAttachments
    };

    const response = await fetch('https://api.contract-ai.de/api/internal/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'webhook-to-main-server'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    console.log(`✅ Email gesendet via Main Server API: ${subject} → ${to}`);
  } catch (error) {
    console.error(`❌ Email API Fehler:`, error.message);
    throw error;
  }
};
const { generateEmailTemplate } = require('./utils/emailTemplate');
const generateInvoicePdf = require('./utils/generateInvoicePdf');
// Importiere die neue Funktion
const generateInvoiceNumber = require('./utils/generateInvoiceNumber');
// ✨ White-Label PDF Export (Enterprise)
const { getCompanyLogo } = require('./utils/getCompanyLogo');

// Event Idempotency Repository
const eventsRepo = {
  async has(eventId) {
    const db = await database.connect();
    const result = await db.collection("stripe_events").findOne({ _id: eventId });
    return !!result;
  },
  async mark(eventId) {
    const db = await database.connect();
    await db.collection("stripe_events").updateOne(
      { _id: eventId },
      { $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
};

// Payment Email Anti-Duplicate Repository
const mailsRepo = {
  async hasInvoiceMail(invoiceId) {
    const db = await database.connect();
    const result = await db.collection("sent_payment_emails").findOne({ _id: invoiceId });
    return !!result;
  },
  async markInvoiceMail(invoiceId) {
    const db = await database.connect();
    await db.collection("sent_payment_emails").updateOne(
      { _id: invoiceId },
      { $setOnInsert: { sentAt: new Date() } },
      { upsert: true }
    );
  }
};

// Helper: Plan Name von Stripe Invoice Line extrahieren
function resolvePlanName(line) {
  const desc = line?.description || ''; // z.B. "1 × Enterprise (at €29.00 / month)"
  if (desc.includes("Enterprise")) return "Enterprise";
  if (desc.includes("Business")) return "Business";
  if (desc.includes("Startup")) return "Startup";
  return "Business"; // Fallback
}

// Payment Email Template
function paymentTemplate({ amount, date, plan, accountUrl, invoicesUrl, zeroText }) {
  return generateEmailTemplate({
    title: "Zahlungsbestätigung - Vielen Dank!",
    body: `
      <p>✅ <strong>Vielen Dank! Ihr Einkauf war erfolgreich.</strong></p>
      <p>💰 €${amount} für Ihr <strong>${plan}-Abo</strong> wurde erfolgreich verarbeitet</p>
      <p>📅 Zahlung vom ${date}</p>
      ${zeroText ? `<p>🎁 ${zeroText}</p>` : ""}
      <p>📄 Ihre Rechnung erhalten Sie separat per E-Mail.</p>
      <p>📋 Alle Rechnungen finden Sie auch in Ihrem Profil unter „Rechnungen".</p>
    `,
    preheader: "Zahlungsbestätigung - Vielen Dank für Ihren Einkauf!",
    cta: {
      text: "Zum Dashboard",
      url: accountUrl
    }
  });
}

const server = http.createServer((req, res) => {
  // 🏥 Health Check Endpoint für Keep-Alive Pings (cron-job.org)
  if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/health' || req.url === '/')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'ok',
      service: 'stripe-webhook-server',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/stripe/webhook') {
    let body = [];

    req.on('data', (chunk) => body.push(chunk));

    req.on('end', async () => {
      try {
        const rawBody = Buffer.concat(body);

        console.log("⚡ Webhook empfangen:", {
          url: req.url,
          method: req.method,
          contentType: req.headers['content-type'],
          bodyLength: rawBody.length,
          signature: req.headers['stripe-signature'] ? 'vorhanden' : 'fehlt'
        });

        let event;
        try {
          event = stripe.webhooks.constructEvent(
            rawBody,
            req.headers['stripe-signature'],
            process.env.STRIPE_WEBHOOK_SECRET
          );
        } catch (err) {
          console.error(`❌ Webhook-Fehler: ${err.message}`);
          res.statusCode = 400;
          res.end(`Webhook Error: ${err.message}`);
          return;
        }

        console.log(`✅ Webhook validiert: ${event.type}`);

        // ACK-first: Sofort 200 senden, dann async verarbeiten
        res.statusCode = 200;
        res.end('Webhook Received');

        // Idempotenz + Fire-and-forget: Async processing ohne Blockierung
        setImmediate(async () => {
          try {
            // Event-Idempotenz: nur einmal verarbeiten
            const alreadyProcessed = await eventsRepo.has(event.id);
            if (alreadyProcessed) {
              console.log(`🔄 Event ${event.type} (${event.id}) bereits verarbeitet, überspringe`);
              return;
            }

            // Event als verarbeitet markieren
            await eventsRepo.mark(event.id);

            // Event verarbeiten
            await handleStripeEvent(event);
          } catch (err) {
            console.error(`❌ Fehler bei Event-Verarbeitung ${event.type}:`, err);
          }
        });

      } catch (err) {
        console.error('❌ Allgemeiner Fehler:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

// Neue Event Handler nach ChatGPT's Plan
async function handleStripeEvent(event) {
  console.log(`🔄 Verarbeite Event: ${event.type}`);

  switch (event.type) {
    case "invoice.paid": {
      const invoice = event.data.object; // Stripe Invoice
      const customerEmail = invoice.customer_email;
      const isZero = (invoice.amount_paid || 0) === 0;

      // Policy: 0,00 € – keine Payment-Mail/PDF bei Gutscheinen
      const SEND_ZERO_EURO = false;
      if (isZero && !SEND_ZERO_EURO) {
        console.log(`💰 Invoice ${invoice.id} ist €0.00 (Gutschein), überspringe`);
        await mailsRepo.markInvoiceMail(invoice.id);
        return;
      }

      // 1. Payment Confirmation Email (mit eigenem Duplikat-Check)
      if (!(await mailsRepo.hasInvoiceMail(invoice.id))) {
        const amount = (invoice.amount_paid / 100).toFixed(2);
        const paidAt = invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000).toLocaleDateString("de-DE")
          : new Date().toLocaleDateString("de-DE");
        const line = invoice.lines?.data?.[0];
        const plan = resolvePlanName(line);

        setImmediate(async () => {
          try {
            await sendEmail({
              to: customerEmail,
              subject: `Contract AI - Zahlungsbestaetigung`,
              html: paymentTemplate({
                amount,
                date: paidAt,
                plan,
                accountUrl: "https://contract-ai.de/dashboard",
                invoicesUrl: "https://contract-ai.de/profile",
                zeroText: null
              })
            });
            console.log(`💳 Payment Confirmation Email gesendet an ${customerEmail} für €${amount}`);
            await mailsRepo.markInvoiceMail(invoice.id);
          } catch (err) {
            console.error(`❌ Fehler beim Senden der Payment Email:`, err);
          }
        });
      }

      // 2. Custom Invoice PDF generieren (NUR für Renewals, nicht für Erstabschluss)
      // Beim Erstabschluss generiert checkout.session.completed bereits die PDF
      if (invoice.billing_reason === 'subscription_create') {
        console.log(`📄 Erstabschluss (subscription_create) - PDF wird von checkout.session.completed generiert, überspringe`);
        return;
      }

      setImmediate(async () => {
        try {
          const db = await database.connect();
          const invoicesCollection = db.collection("invoices");
          const usersCollection = db.collection("users");

          // Sicherheits-Duplikat-Check
          if (invoice.number) {
            const existingPdf = await invoicesCollection.findOne({
              stripeInvoiceNumber: invoice.number
            });
            if (existingPdf) {
              console.log(`📄 Custom PDF für ${invoice.number} existiert bereits, überspringe`);
              return;
            }
          }

          console.log(`📄 Generiere Custom Invoice PDF für: ${invoice.number || invoice.id}`);

          // User laden
          const user = await usersCollection.findOne({ stripeCustomerId: invoice.customer });
          if (!user) {
            console.warn(`⚠️ Kein User gefunden für Invoice PDF: ${invoice.customer}`);
            return;
          }

          // Subscription für Zeitraum und Zahlungsmethode
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription, {
            expand: ['default_payment_method']
          });

          // Stripe Customer für Adresse und Firmendaten
          const stripeCustomer = await stripe.customers.retrieve(invoice.customer);

          const customerAddress = stripeCustomer.address || null;
          const companyName = stripeCustomer.metadata?.company_name || null;
          const taxId = stripeCustomer.metadata?.tax_id || null;
          const customerName = stripeCustomer.name || user?.name || customerEmail;

          // Plan aus Price ID ermitteln
          const priceId = subscription.items.data[0]?.price?.id;
          const priceMap = {
            [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
            [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
            [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
            [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID]: "enterprise",
            [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID]: "enterprise",
            [process.env.STRIPE_ENTERPRISE_PRICE_ID]: "enterprise",
            [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "enterprise",
            [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "enterprise",
            [process.env.STRIPE_PREMIUM_PRICE_ID]: "enterprise",
          };
          const detectedPlan = priceMap[priceId] || "business";

          // Neue Rechnungsnummer generieren
          const latestInvoice = await invoicesCollection
            .find({})
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();
          const latestNumber = latestInvoice.length && latestInvoice[0].invoiceNumber && typeof latestInvoice[0].invoiceNumber === 'string'
            ? parseInt(latestInvoice[0].invoiceNumber.split("-")[2]) || 0
            : 0;
          const invoiceNumber = generateInvoiceNumber(latestNumber);

          const invoiceAmount = invoice.amount_paid / 100;
          const invoiceDate = new Date().toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' });

          // PDF generieren
          const pdfBuffer = await generateInvoicePdf({
            customerName,
            email: customerEmail,
            plan: detectedPlan,
            amount: invoiceAmount,
            invoiceDate,
            invoiceNumber,
            customerAddress,
            companyName,
            taxId,
            subscriptionId: invoice.subscription,
            periodStart: subscription.current_period_start,
            periodEnd: subscription.current_period_end,
            paymentMethod: subscription.default_payment_method?.type || 'card'
          });

          // Rechnung per Email senden
          await sendEmail({
            to: customerEmail,
            subject: "Contract AI - Deine Rechnung",
            html: generateEmailTemplate({
              title: "Deine Rechnung",
              body: `
                <p>Vielen Dank für deinen Kauf!</p>
                <p>Im Anhang findest du die Rechnung zu deinem ${detectedPlan}-Abo.</p>
              `,
              preheader: "Hier ist deine aktuelle Rechnung von Contract AI."
            }),
            attachments: [{
              filename: `Rechnung-${invoiceNumber}.pdf`,
              content: pdfBuffer,
            }]
          });

          // In MongoDB speichern
          await invoicesCollection.insertOne({
            invoiceNumber,
            stripeInvoiceNumber: invoice.number || null,
            customerEmail,
            customerName,
            plan: detectedPlan,
            amount: invoiceAmount,
            date: invoiceDate,
            file: pdfBuffer,
            createdAt: new Date()
          });

          console.log(`✅ Custom Invoice PDF generiert: ${invoiceNumber} (Stripe: ${invoice.number})`);

        } catch (err) {
          console.error(`❌ Fehler bei Invoice PDF (invoice.paid):`, err);
          // Kein Crash - Fallback: Kunde hat weiterhin Stripe's Standard-Rechnung
        }
      });

      return;
    }

    case "checkout.session.completed": {
      // Weiterhin die bestehende Welcome + Invoice Logik nutzen
      const db = await database.connect();
      const usersCollection = db.collection("users");
      const invoicesCollection = db.collection("invoices");

      await processStripeEvent(event, usersCollection, invoicesCollection);
      return;
    }

    // ============================================
    // 🔐 SUBSCRIPTION LIFECYCLE EVENTS
    // ============================================

    case "customer.subscription.updated": {
      // Wird ausgelöst bei: Plan-Wechsel, Kündigung zum Periodenende, Reaktivierung
      const subscription = event.data.object;
      const stripeCustomerId = subscription.customer;
      const status = subscription.status; // active, past_due, canceled, unpaid, etc.
      const cancelAtPeriodEnd = subscription.cancel_at_period_end;

      console.log(`🔄 Subscription Update:`, { stripeCustomerId, status, cancelAtPeriodEnd });

      const db = await database.connect();
      const usersCollection = db.collection("users");

      const user = await usersCollection.findOne({ stripeCustomerId });
      if (!user) {
        console.warn(`⚠️ Kein User gefunden für stripeCustomerId: ${stripeCustomerId}`);
        return;
      }

      // Plan aus aktueller Subscription ermitteln
      const priceId = subscription.items.data[0]?.price?.id;
      const priceMap = {
        [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
        [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
        [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID]: "enterprise",
        [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID]: "enterprise",
        // Legacy: "premium" Price IDs → enterprise (29€ Plan!)
        // WICHTIG: Premium war der alte Name für Enterprise (29€), nicht Business (19€)!
        [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "enterprise",
        [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "enterprise",
        [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
        [process.env.STRIPE_PREMIUM_PRICE_ID]: "enterprise",
      };
      const plan = priceMap[priceId] || user.subscriptionPlan || "free";

      // Update basierend auf Status
      const updateData = {
        subscriptionStatus: status,
        subscriptionPlan: plan,
        cancelAtPeriodEnd: cancelAtPeriodEnd || false,
      };

      // Wenn Subscription aktiv ist → Premium aktiv
      if (status === "active" || status === "trialing") {
        updateData.subscriptionActive = true;
        updateData.isPremium = plan === "business" || plan === "enterprise";
        updateData.isBusiness = plan === "business";
        updateData.isEnterprise = plan === "enterprise";
      }

      // Wenn Subscription nicht mehr aktiv → Downgrade auf Free
      if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") {
        updateData.subscriptionActive = false;
        updateData.subscriptionPlan = "free";
        updateData.isPremium = false;
        updateData.isBusiness = false;
        updateData.isEnterprise = false;
        updateData.canceledAt = new Date();
        console.log(`⚠️ User ${user.email} Abo deaktiviert (Status: ${status})`);
      }

      await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateData }
      );

      console.log(`✅ User ${user.email} Subscription aktualisiert:`, updateData);

      return;
    }

    case "customer.subscription.deleted": {
      // Wird ausgelöst wenn Subscription endgültig gelöscht wird
      const subscription = event.data.object;
      const stripeCustomerId = subscription.customer;

      console.log(`🗑️ Subscription gelöscht für Customer: ${stripeCustomerId}`);

      const db = await database.connect();
      const usersCollection = db.collection("users");

      const user = await usersCollection.findOne({ stripeCustomerId });
      if (!user) {
        console.warn(`⚠️ Kein User gefunden für stripeCustomerId: ${stripeCustomerId}`);
        return;
      }

      // Downgrade auf Free
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            subscriptionActive: false,
            subscriptionPlan: "free",
            subscriptionStatus: "canceled",
            isPremium: false,
            isBusiness: false,
            isEnterprise: false,
            canceledAt: new Date(),
            // Limits zurücksetzen auf Free-Level
            analysisLimit: 3,
            optimizationLimit: 0,
          }
        }
      );

      console.log(`✅ User ${user.email} auf Free downgraded (Subscription gelöscht)`);

      // Optional: Kündigungs-Email senden
      try {
        await sendEmail({
          to: user.email,
          subject: "Contract AI - Dein Abo wurde beendet",
          html: `
            <h2>Schade, dass du gehst!</h2>
            <p>Dein Contract AI Abo wurde beendet. Du kannst weiterhin die kostenlosen Features nutzen.</p>
            <p>Falls du es dir anders überlegst, kannst du jederzeit wieder upgraden:</p>
            <p><a href="https://contract-ai.de/pricing">Jetzt wieder upgraden</a></p>
          `
        });
      } catch (emailErr) {
        console.error(`❌ Kündigungs-Email Fehler:`, emailErr);
      }

      return;
    }

    case "invoice.payment_failed": {
      // Wird ausgelöst wenn Zahlung fehlschlägt
      const invoice = event.data.object;
      const stripeCustomerId = invoice.customer;
      const customerEmail = invoice.customer_email;
      const attemptCount = invoice.attempt_count || 1;

      console.log(`❌ Zahlung fehlgeschlagen für ${customerEmail} (Versuch ${attemptCount})`);

      const db = await database.connect();
      const usersCollection = db.collection("users");

      const user = await usersCollection.findOne({ stripeCustomerId });
      if (!user) {
        console.warn(`⚠️ Kein User gefunden für stripeCustomerId: ${stripeCustomerId}`);
        return;
      }

      // Bei erstem Fehlversuch: Warnung, Abo bleibt aktiv
      // Bei mehreren Fehlversuchen: Stripe setzt subscription auf past_due/unpaid
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            subscriptionStatus: "past_due",
            lastPaymentFailed: new Date(),
            paymentFailedCount: attemptCount,
          }
        }
      );

      // Zahlungserinnerung senden
      try {
        await sendEmail({
          to: customerEmail,
          subject: "Contract AI - Zahlung fehlgeschlagen",
          html: `
            <h2>Zahlungsproblem</h2>
            <p>Leider konnte deine letzte Zahlung für Contract AI nicht verarbeitet werden.</p>
            <p>Bitte aktualisiere deine Zahlungsmethode, um deinen Zugang zu behalten:</p>
            <p><a href="https://contract-ai.de/profile">Zahlungsmethode aktualisieren</a></p>
            <p>Falls du Fragen hast, kontaktiere uns unter support@contract-ai.de</p>
          `
        });
        console.log(`📧 Zahlungserinnerung gesendet an ${customerEmail}`);
      } catch (emailErr) {
        console.error(`❌ Zahlungserinnerung Email Fehler:`, emailErr);
      }

      return;
    }

    default:
      console.log(`ℹ️ Event ${event.type} nicht behandelt`);
      return;
  }
}

async function processStripeEvent(event, usersCollection, invoicesCollection) {
  const eventType = event.type;
  const session = event.data.object;

  console.log(`🔄 Verarbeite Event: ${eventType}`);

  if (eventType === "checkout.session.completed" || eventType === "invoice.paid") {
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;
    const email = session.customer_email || session.customer_details?.email || null;

    // 🆕 Checkout-Session komplett laden für custom_fields und billing_address
    let fullSession = null;
    if (eventType === "checkout.session.completed") {
      try {
        fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['customer_details']
        });
        console.log(`✅ Vollständige Checkout-Session geladen: ${session.id}`);
      } catch (err) {
        console.error(`❌ Fehler beim Laden der Session:`, err);
      }
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
      expand: ['default_payment_method']
    });
    const priceId = subscription.items.data[0]?.price?.id;

    const priceMap = {
      // Business Plan (monatlich + jährlich)
      [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
      [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
      [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
      // Enterprise Plan (monatlich + jährlich)
      [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_ENTERPRISE_PRICE_ID]: "enterprise",
      // ✅ KORRIGIERT: Legacy "premium" Price IDs → enterprise (29€ Plan!)
      // Premium war der alte Name für Enterprise (29€), nicht Business (19€)
      [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "enterprise",
      [process.env.STRIPE_PREMIUM_PRICE_ID]: "enterprise",
    };

    // Fallback auf "free" statt "unknown" für unbekannte Pläne
    const plan = priceMap[priceId] || "free";
    console.log(`📊 Abo-Daten:`, {
      plan,
      email,
      customerId: stripeCustomerId,
      priceId,
      mappedCorrectly: plan !== "unknown"
    });

    const user = await usersCollection.findOne(
      stripeCustomerId ? { stripeCustomerId } : { email }
    );

    if (!user) {
      console.warn(`⚠️ Kein User gefunden für:`, { stripeCustomerId, email });
      return;
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          subscriptionActive: true,
          // isPremium = hat bezahltes Abo (Business oder Enterprise)
          isPremium: plan === "business" || plan === "enterprise",
          isBusiness: plan === "business",
          isEnterprise: plan === "enterprise",
          subscriptionPlan: plan,
          stripeCustomerId,
          stripeSubscriptionId,
          premiumSince: new Date(),
          subscriptionStatus: "active",
          // Limits basierend auf Plan setzen
          analysisLimit: plan === "enterprise" ? Infinity : (plan === "business" ? 25 : 3),
          optimizationLimit: plan === "enterprise" ? Infinity : (plan === "business" ? 15 : 0),
        },
      }
    );

    console.log(`✅ User ${email || user.email} auf ${plan} aktualisiert`);

    // 🆕 Stripe Customer mit Checkout-Daten aktualisieren (nur bei checkout.session.completed)
    if (eventType === "checkout.session.completed" && fullSession) {
      try {
        const updateData = {
          name: fullSession.customer_details?.name || undefined,
          email: fullSession.customer_details?.email || email,
        };

        // Billing address hinzufügen falls vorhanden
        if (fullSession.customer_details?.address) {
          updateData.address = fullSession.customer_details.address;
        }

        // Custom fields in metadata speichern
        if (fullSession.custom_fields && fullSession.custom_fields.length > 0) {
          updateData.metadata = {};
          fullSession.custom_fields.forEach(field => {
            if (field.key === 'company_name' && field.text?.value) {
              updateData.metadata.company_name = field.text.value;
            }
            if (field.key === 'tax_id' && field.text?.value) {
              updateData.metadata.tax_id = field.text.value;
            }
          });
        }

        // Stripe Customer aktualisieren
        await stripe.customers.update(stripeCustomerId, updateData);

        console.log(`✅ Stripe Customer ${stripeCustomerId} mit Checkout-Daten aktualisiert:`, {
          name: updateData.name,
          address: updateData.address ? 'ja' : 'nein',
          company: updateData.metadata?.company_name || 'nicht angegeben',
          taxId: updateData.metadata?.tax_id || 'nicht angegeben'
        });
      } catch (err) {
        console.error(`❌ Fehler beim Update des Stripe Customers:`, err);
      }
    }

    // Willkommensmail nur beim checkout.session.completed Event senden
    if (eventType === "checkout.session.completed") {
      try {
        await sendEmail({
          to: email,
          subject: "Willkommen bei Contract AI",
          html: generateEmailTemplate({
            title: "Willkommen bei Contract AI!",
            body: `
              <p>Dein ${plan}-Abo wurde erfolgreich aktiviert.</p>
              <p>Du kannst ab sofort alle Premium-Funktionen nutzen.</p>
            `,
            preheader: "Dein Contract AI-Abo ist jetzt aktiv.",
            cta: {
              text: "Zum Dashboard",
              url: "https://contract-ai.de/dashboard"
            }
          })
        });
        console.log(`✅ Welcome-E-Mail gesendet an ${email}`);
      } catch (err) {
        console.log(`⚠️ Welcome-E-Mail fehlgeschlagen (fahre fort):`, err.message);
        // Handler läuft weiter - kein Crash für andere Events!
      }
    }

    // Letzte gespeicherte Rechnungsnummer aus der DB holen
    const latestInvoice = await invoicesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    
    // Extrahiere die Nummer aus der letzten Rechnungsnummer oder starte bei 0
    const latestNumber = latestInvoice.length && latestInvoice[0].invoiceNumber && typeof latestInvoice[0].invoiceNumber === 'string'
      ? parseInt(latestInvoice[0].invoiceNumber.split("-")[2]) || 0
      : 0;
    
    // Generiere neue strukturierte Rechnungsnummer
    const invoiceNumber = generateInvoiceNumber(latestNumber);

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const invoiceDate = new Date().toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' });
    const customerName = user?.name || email;

    // Stripe Invoice-Nummer holen (für Verknüpfung mit Custom-PDF)
    let stripeInvoiceNumber = null;
    try {
      if (subscription.latest_invoice) {
        const stripeInvoice = await stripe.invoices.retrieve(subscription.latest_invoice);
        stripeInvoiceNumber = stripeInvoice.number;
        console.log(`📄 Stripe Invoice Number: ${stripeInvoiceNumber}`);
      }
    } catch (err) {
      console.warn(`⚠️ Stripe Invoice Number nicht ermittelt:`, err.message);
    }

    // 🆕 Checkout-Daten für vollständige Rechnung extrahieren
    let customerAddress = null;
    let companyName = null;
    let taxId = null;

    if (fullSession) {
      // Adresse aus Customer Details
      customerAddress = fullSession.customer_details?.address || null;

      // Custom Fields auslesen
      if (fullSession.custom_fields) {
        fullSession.custom_fields.forEach(field => {
          if (field.key === 'company_name' && field.text?.value) {
            companyName = field.text.value;
          }
          if (field.key === 'tax_id' && field.text?.value) {
            taxId = field.text.value;
          }
        });
      }
    }

    // ✨ White-Label PDF Export (Enterprise): Company Logo holen
    let customLogoBase64 = null;
    try {
      const userPlan = user?.subscriptionPlan || 'free';
      const logoData = await getCompanyLogo(db, userId.toString(), userPlan);

      if (logoData.hasLogo && logoData.logoBase64) {
        customLogoBase64 = logoData.logoBase64;
        console.log(`✨ [White-Label] Custom Logo für Invoice geladen (Enterprise-User)`);
      } else if (logoData.isEnterprise) {
        console.log(`⚠️ [White-Label] Enterprise-User hat kein Logo hochgeladen`);
      }
    } catch (logoError) {
      console.warn(`⚠️ [White-Label] Fehler beim Logo-Laden (fahre mit Default fort):`, logoError.message);
      // Fahre mit Default-Logo fort
    }

    // Eigene vollständige PDF generieren mit allen Daten
    const pdfBuffer = await generateInvoicePdf({
      customerName,
      email,
      plan,
      amount,
      invoiceDate,
      invoiceNumber,
      customerAddress,
      companyName,
      taxId,
      subscriptionId: stripeSubscriptionId,
      customLogoBase64,  // ✨ White-Label Logo (Enterprise)
      periodStart: subscription.current_period_start,
      periodEnd: subscription.current_period_end,
      paymentMethod: subscription.default_payment_method?.type || 'card'
    });

    console.log(`✅ Vollständige Rechnung generiert mit:`, {
      name: customerName || 'nicht angegeben',
      address: customerAddress ? 'ja' : 'nein',
      company: companyName || 'nicht angegeben',
      taxId: taxId || 'nicht angegeben'
    });

    await sendEmail({
      to: email,
      subject: "Contract AI - Deine Rechnung",
      html: generateEmailTemplate({
        title: "Deine Rechnung",
        body: `
          <p>Vielen Dank für deinen Kauf!</p>
          <p>Im Anhang findest du die Rechnung zu deinem ${plan}-Abo.</p>
        `,
        preheader: "Hier ist deine aktuelle Rechnung von Contract AI."
      }),
      attachments: [
        {
          filename: `Rechnung-${invoiceNumber}.pdf`,
          content: pdfBuffer,
        }
      ]
    });

    await invoicesCollection.insertOne({
      invoiceNumber,
      stripeInvoiceNumber,  // Stripe's eigene Rechnungsnummer (z.B. D2A2BB9C-0093)
      customerEmail: email,
      customerName,
      plan,
      amount,
      date: invoiceDate,
      file: pdfBuffer,
      createdAt: new Date()
    });
  }

  // Kündigung und Fehlzahlung bleiben unverändert
  if (eventType === "customer.subscription.deleted") {
    const stripeCustomerId = session.customer;

    const user = await usersCollection.findOne({ stripeCustomerId });
    if (!user) {
      console.warn(`⚠️ Kein User zur Kündigung gefunden:`, { stripeCustomerId });
      return;
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          subscriptionActive: false,
          isPremium: false,
          isBusiness: false,
          subscriptionPlan: null,
          subscriptionStatus: "cancelled",
        },
      }
    );

    console.log(`❌ Abo von ${user.email} gekündigt`);

    await sendEmail({
      to: user.email,
      subject: "Contract AI - Abo-Status",
      html: generateEmailTemplate({
        title: "Abo gekündigt",
        body: `
          <p>Dein Abo wurde erfolgreich beendet.</p>
          <p>Du kannst die Funktionen noch bis zum Ende der Laufzeit nutzen.</p>
        `,
        preheader: "Dein Abo bei Contract AI wurde beendet."
      })
    });
  }

  if (eventType === "invoice.payment_failed") {
    const customerId = session.customer;
    const customer = await stripe.customers.retrieve(customerId);
    const email = customer.email;

    const user = await usersCollection.findOne({ stripeCustomerId: customerId });
    if (!user) {
      console.warn(`⚠️ Kein User zur Fehlzahlung gefunden:`, { customerId });
      return;
    }

    console.log(`⚠️ Zahlung fehlgeschlagen für ${email}`);

    await sendEmail({
      to: email,
      subject: "Contract AI - Zahlung pruefen",
      html: generateEmailTemplate({
        title: "Zahlung fehlgeschlagen",
        body: `
          <p>Deine letzte Abo-Zahlung konnte nicht verarbeitet werden.</p>
          <p>Bitte aktualisiere deine Zahlungsmethode in deinem Account.</p>
        `,
        preheader: "Deine letzte Zahlung bei Contract AI ist fehlgeschlagen."
      })
    });
  }
}

const PORT = process.env.PORT || process.env.WEBHOOK_PORT || 3333;
server.listen(PORT, () => {
  console.log(`🚀 Stripe Webhook-Server läuft auf Port ${PORT}`);
});
