// 📁 backend/stripe-webhook-server.js

require('dotenv').config();

const http = require('http');
const { Buffer } = require('buffer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ObjectId } = require('mongodb');
const sendEmail = require('./utils/sendEmail');
const generateEmailTemplate = require('./utils/emailTemplate');
const generateInvoicePdf = require('./utils/generateInvoicePdf');
// Importiere die neue Funktion
const generateInvoiceNumber = require('./utils/generateInvoiceNumber');

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// Event Idempotency Repository
const eventsRepo = {
  async has(eventId) {
    const client = new MongoClient(MONGO_URI);
    try {
      await client.connect();
      const db = client.db("contract_ai");
      const result = await db.collection("stripe_events").findOne({ _id: eventId });
      return !!result;
    } finally {
      await client.close();
    }
  },
  async mark(eventId) {
    const client = new MongoClient(MONGO_URI);
    try {
      await client.connect();
      const db = client.db("contract_ai");
      await db.collection("stripe_events").updateOne(
        { _id: eventId },
        { $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    } finally {
      await client.close();
    }
  }
};

// Payment Email Anti-Duplicate Repository
const mailsRepo = {
  async hasInvoiceMail(invoiceId) {
    const client = new MongoClient(MONGO_URI);
    try {
      await client.connect();
      const db = client.db("contract_ai");
      const result = await db.collection("sent_payment_emails").findOne({ _id: invoiceId });
      return !!result;
    } finally {
      await client.close();
    }
  },
  async markInvoiceMail(invoiceId) {
    const client = new MongoClient(MONGO_URI);
    try {
      await client.connect();
      const db = client.db("contract_ai");
      await db.collection("sent_payment_emails").updateOne(
        { _id: invoiceId },
        { $setOnInsert: { sentAt: new Date() } },
        { upsert: true }
      );
    } finally {
      await client.close();
    }
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

      // Anti-Duplikat: nur einmal pro invoice.id
      if (await mailsRepo.hasInvoiceMail(invoice.id)) {
        console.log(`📧 Payment Email für Invoice ${invoice.id} bereits gesendet, überspringe`);
        return;
      }

      // Betrag und Datum extrahieren
      const amount = (invoice.amount_paid / 100).toFixed(2); // "0.00" Format
      const paidAt = invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000).toLocaleDateString("de-DE")
        : new Date().toLocaleDateString("de-DE");

      // Plan aus Invoice Line extrahieren
      const line = invoice.lines?.data?.[0];
      const plan = resolvePlanName(line);

      const customerEmail = invoice.customer_email;
      const isZero = (invoice.amount_paid || 0) === 0;

      // Policy: 0,00 € – keine Payment-Mail bei Gutscheinen
      const SEND_ZERO_EURO = false;
      if (isZero && !SEND_ZERO_EURO) {
        console.log(`💰 Invoice ${invoice.id} ist €0.00 (Gutschein), überspringe Payment Email`);
        await mailsRepo.markInvoiceMail(invoice.id);
        return;
      }

      // Payment Confirmation Email senden
      try {
        await sendEmail({
          to: customerEmail,
          subject: `💳 Zahlungsbestätigung - Vielen Dank für Ihren Einkauf!`,
          html: paymentTemplate({
            amount,
            date: paidAt,
            plan,
            accountUrl: "https://contract-ai.de/dashboard",
            invoicesUrl: "https://contract-ai.de/profile",
            zeroText: isZero ? "Gutschein angewendet – Gesamt 0,00 €" : null
          })
        });

        console.log(`💳 Payment Confirmation Email gesendet an ${customerEmail} für €${amount}`);
        await mailsRepo.markInvoiceMail(invoice.id);
      } catch (err) {
        console.error(`❌ Fehler beim Senden der Payment Email:`, err);
        // Nicht als versendet markieren, damit Retry möglich ist
      }

      return;
    }

    case "checkout.session.completed": {
      // Weiterhin die bestehende Welcome + Invoice Logik nutzen
      const client = new MongoClient(MONGO_URI);
      try {
        await client.connect();
        const db = client.db("contract_ai");
        const usersCollection = db.collection("users");
        const invoicesCollection = db.collection("invoices");

        await processStripeEvent(event, usersCollection, invoicesCollection);
      } finally {
        await client.close();
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

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;

    const priceMap = {
      // Neue monatliche und jährliche Price IDs
      [process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID]: "business",
      [process.env.STRIPE_BUSINESS_YEARLY_PRICE_ID]: "business",
      [process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID]: "premium",
      [process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID]: "premium",
      // Fallback zu alten IDs für Backwards Compatibility
      [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
      [process.env.STRIPE_PREMIUM_PRICE_ID]: "premium",
    };

    const plan = priceMap[priceId] || "unknown";
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
          isPremium: plan === "premium",
          isBusiness: plan === "business",
          subscriptionPlan: plan,
          stripeCustomerId,
          stripeSubscriptionId,
          premiumSince: new Date(),
          subscriptionStatus: "active",
        },
      }
    );

    console.log(`✅ User ${email || user.email} auf ${plan} aktualisiert`);

    // Willkommensmail nur beim checkout.session.completed Event senden
    if (eventType === "checkout.session.completed") {
      try {
        await sendEmail({
          to: email,
          subject: "✅ Dein Abo ist aktiv – Willkommen bei Contract AI!",
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
    const latestNumber = latestInvoice.length ? parseInt(latestInvoice[0].invoiceNumber?.split("-")[2]) || 0 : 0;
    
    // Generiere neue strukturierte Rechnungsnummer
    const invoiceNumber = generateInvoiceNumber(latestNumber);

    const amount = session.amount_total ? session.amount_total / 100 : 0;
    const invoiceDate = new Date().toLocaleDateString("de-DE");
    const customerName = user?.name || email;

    const pdfBuffer = await generateInvoicePdf({
      customerName,
      email,
      plan,
      amount,
      invoiceDate,
      invoiceNumber
    });

    await sendEmail({
      to: email,
      subject: "✅ Deine Abo-Rechnung bei Contract AI",
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
      subject: "❌ Dein Abo wurde gekündigt",
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
      subject: "⚠️ Zahlung fehlgeschlagen",
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
