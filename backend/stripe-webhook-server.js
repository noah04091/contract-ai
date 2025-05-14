// 📁 backend/stripe-webhook-server.js

require('dotenv').config(); // ⬅️ MUSS als erstes kommen, damit STRIPE_SECRET_KEY geladen wird

const http = require('http');
const { Buffer } = require('buffer');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // ⬅️ Jetzt ist der Key verfügbar

// MongoDB-Setup
const { MongoClient, ObjectId } = require('mongodb');
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";

// Stripe-Events zur späteren Verarbeitung
let pendingEvents = [];

// Einfacher HTTP-Server nur für Stripe Webhooks
const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/stripe/webhook') {
    let body = [];
    
    req.on('data', (chunk) => {
      body.push(chunk);
    });
    
    req.on('end', async () => {
      try {
        // Der komplette Rohbody als Buffer
        const rawBody = Buffer.concat(body);
        
        console.log("⚡ Webhook empfangen:", {
          url: req.url,
          method: req.method,
          contentType: req.headers['content-type'],
          bodyLength: rawBody.length,
          signature: req.headers['stripe-signature'] ? 'vorhanden' : 'fehlt'
        });
        
        // Stripe Event konstruieren
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
        
        // Erfolg melden
        console.log(`✅ Webhook validiert: ${event.type}`);
        res.statusCode = 200;
        res.end('Webhook Received');
        
        // Event für spätere Verarbeitung speichern
        pendingEvents.push(event);
        processEvents().catch(err => console.error("Fehler bei Ereignisverarbeitung:", err));
        
      } catch (err) {
        console.error('❌ Allgemeiner Fehler:', err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
  } else {
    // Nur POST auf /stripe/webhook erlauben
    res.statusCode = 404;
    res.end('Not Found');
  }
});

// Verarbeitung der Events
async function processEvents() {
  if (pendingEvents.length === 0) return;
  
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    
    console.log(`⚙️ Verarbeite ${pendingEvents.length} Stripe-Events...`);
    
    for (const event of [...pendingEvents]) {
      try {
        await processStripeEvent(event, usersCollection);
        // Erfolgreiche Events entfernen
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

// Implementierung der Stripe Event Verarbeitung
async function processStripeEvent(event, usersCollection) {
  const eventType = event.type;
  const session = event.data.object;
  
  console.log(`🔄 Verarbeite Event: ${eventType}`);
  
  if (eventType === "checkout.session.completed" || eventType === "invoice.paid") {
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;
    const email = session.customer_email || session.customer_details?.email || null;

    // Abo-Details holen
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;

    const priceMap = {
      [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
      [process.env.STRIPE_PREMIUM_PRICE_ID]: "premium",
    };

    const plan = priceMap[priceId] || "unknown";
    console.log(`📊 Abo-Daten:`, { plan, email, customerId: stripeCustomerId });

    // User finden und aktualisieren
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
  }

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
  }
}

// Server auf dem Port 3333 starten (WICHTIG: Anderer Port als die Hauptapp)
const PORT = process.env.PORT || 3333; // Render gibt PORT automatisch vor
server.listen(PORT, () => {
  console.log(`🚀 Stripe Webhook-Server läuft auf Port ${PORT}`);
});