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
let pendingEvents = [];

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
        res.statusCode = 200;
        res.end('Webhook Received');

        pendingEvents.push(event);
        processEvents().catch(err => console.error("Fehler bei Ereignisverarbeitung:", err));

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

async function processEvents() {
  if (pendingEvents.length === 0) return;

  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    const invoicesCollection = db.collection("invoices");

    console.log(`⚙️ Verarbeite ${pendingEvents.length} Stripe-Events...`);

    for (const event of [...pendingEvents]) {
      try {
        await processStripeEvent(event, usersCollection, invoicesCollection);
        pendingEvents = pendingEvents.filter(e => e.id !== event.id);
      } catch (err) {
        console.error(`❌ Fehler bei Verarbeitung von Event ${event.type}:`, err);
      }
    }

    await client.close();
  } catch (err) {
    console.error("❌ MongoDB-Verbindungsfehler:", err);
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

    // Payment Confirmation E-Mail nur beim invoice.paid Event senden
    if (eventType === "invoice.paid") {
      console.log(`💳 Verarbeite invoice.paid Event für ${email}`);
      try {
        // Bei invoice.paid ist session die Invoice - verwende total oder amount_paid
        const invoiceAmount = session.total || session.amount_paid || 0;
        const amount = (invoiceAmount / 100).toFixed(2);
        const paymentDate = new Date(session.created * 1000).toLocaleDateString("de-DE");

        await sendEmail({
          to: email,
          subject: `💳 Zahlung bestätigt - €${amount} für ${plan}-Abo`,
          html: generateEmailTemplate({
            title: "Zahlung erfolgreich!",
            body: `
              <p>✅ Deine Zahlung wurde erfolgreich verarbeitet.</p>
              <p>💰 Deine Zahlung vom ${paymentDate} über €${amount} für dein ${plan.charAt(0).toUpperCase() + plan.slice(1)}-Abo wurde erfolgreich verarbeitet.</p>
              <p>📄 Deine Rechnung erhältst du separat per E-Mail.</p>
              <p>📋 Alle Rechnungen findest du auch in deinem Account unter dem Profil.</p>
            `,
            preheader: "Deine Zahlung wurde erfolgreich verarbeitet.",
            cta: {
              text: "Zum Dashboard",
              url: "https://contract-ai.de/dashboard"
            }
          })
        });
        console.log(`💳 Payment Confirmation E-Mail gesendet an ${email}`);
      } catch (err) {
        console.error(`❌ Fehler beim Senden der Payment Confirmation E-Mail:`, err);
      }
    }

    // Willkommensmail nur beim checkout.session.completed Event senden
    if (eventType === "checkout.session.completed") {
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
