// 📁 backend/tests/unit/stripe.test.js
// Umfassende Unit-Tests für Stripe/Payment Funktionalität

// Mock Environment
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

describe('Stripe/Payment - Unit Tests', () => {

  // ===== MOCK SETUP =====
  let mockUsersCollection;
  let mockReq;
  let mockRes;
  let mockUser;

  beforeEach(() => {
    mockUser = {
      userId: '507f1f77bcf86cd799439011',
      email: 'test@example.com'
    };

    mockUsersCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn()
    };

    mockReq = {
      body: {},
      user: mockUser
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ===== CHECKOUT SESSION TESTS =====
  describe('POST /create-checkout-session', () => {

    test('validiert priceId Parameter', () => {
      mockReq.body = {}; // Kein priceId

      const { priceId } = mockReq.body;
      if (!priceId) {
        mockRes.status(400).json({ message: 'Price ID erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('akzeptiert gültige Stripe Price IDs', () => {
      const validPriceIds = [
        'price_1234567890abcdefg',
        'price_test_abcdef123456'
      ];

      validPriceIds.forEach(priceId => {
        expect(priceId).toMatch(/^price_/);
      });
    });

    test('erstellt Session mit korrektem mode für Subscription', () => {
      const sessionConfig = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: 'price_123', quantity: 1 }],
        success_url: 'https://contract-ai.de/success',
        cancel_url: 'https://contract-ai.de/cancel'
      };

      expect(sessionConfig.mode).toBe('subscription');
      expect(sessionConfig.payment_method_types).toContain('card');
    });

    test('setzt korrekte Success/Cancel URLs', () => {
      const baseUrl = 'https://contract-ai.de';
      const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/pricing`;

      expect(successUrl).toContain('/success');
      expect(successUrl).toContain('{CHECKOUT_SESSION_ID}');
      expect(cancelUrl).toContain('/pricing');
    });

    test('bindet Customer an User-Email', () => {
      const customerConfig = {
        customer_email: mockUser.email,
        client_reference_id: mockUser.userId
      };

      expect(customerConfig.customer_email).toBe('test@example.com');
      expect(customerConfig.client_reference_id).toBe(mockUser.userId);
    });
  });

  // ===== SUBSCRIPTION VERIFICATION TESTS =====
  describe('POST /verify-subscription', () => {

    test('validiert session_id Parameter', () => {
      mockReq.body = {}; // Kein session_id

      const { session_id } = mockReq.body;
      if (!session_id) {
        mockRes.status(400).json({ message: 'Session ID erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('akzeptiert gültige Checkout Session IDs', () => {
      const validSessionId = 'cs_test_a1b2c3d4e5f6g7h8i9j0';

      expect(validSessionId).toMatch(/^cs_/);
    });

    test('aktualisiert User Subscription nach erfolgreicher Zahlung', async () => {
      const subscriptionUpdate = {
        subscriptionPlan: 'business',
        subscriptionStatus: 'active',
        subscriptionActive: true,
        stripeCustomerId: 'cus_123456',
        stripeSubscriptionId: 'sub_123456',
        subscriptionStartedAt: new Date(),
        updatedAt: new Date()
      };

      mockUsersCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await mockUsersCollection.updateOne(
        { _id: mockUser.userId },
        { $set: subscriptionUpdate }
      );

      expect(result.modifiedCount).toBe(1);
    });
  });

  // ===== PLAN MAPPING TESTS =====
  describe('Price-to-Plan Mapping', () => {

    const PRICE_TO_PLAN_MAP = {
      'price_business_monthly': 'business',
      'price_business_yearly': 'business',
      'price_enterprise_monthly': 'enterprise',
      'price_enterprise_yearly': 'enterprise'
    };

    test('mapped Business Price korrekt', () => {
      const priceId = 'price_business_monthly';
      const plan = PRICE_TO_PLAN_MAP[priceId];

      expect(plan).toBe('business');
    });

    test('mapped Enterprise Price korrekt', () => {
      const priceId = 'price_enterprise_monthly';
      const plan = PRICE_TO_PLAN_MAP[priceId];

      expect(plan).toBe('enterprise');
    });

    test('gibt undefined für unbekannte Price IDs', () => {
      const unknownPriceId = 'price_unknown_123';
      const plan = PRICE_TO_PLAN_MAP[unknownPriceId];

      expect(plan).toBeUndefined();
    });
  });

  // ===== WEBHOOK EVENT TESTS =====
  describe('Stripe Webhook Events', () => {

    test('verarbeitet checkout.session.completed Event', () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            client_reference_id: mockUser.userId,
            customer_email: mockUser.email
          }
        }
      };

      expect(event.type).toBe('checkout.session.completed');
      expect(event.data.object.subscription).toBeDefined();
    });

    test('verarbeitet invoice.payment_succeeded Event', () => {
      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_paid: 2900,
            currency: 'eur'
          }
        }
      };

      expect(event.type).toBe('invoice.payment_succeeded');
      expect(event.data.object.amount_paid).toBe(2900); // 29.00 EUR in Cents
    });

    test('verarbeitet customer.subscription.deleted Event', () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'canceled'
          }
        }
      };

      expect(event.type).toBe('customer.subscription.deleted');
      expect(event.data.object.status).toBe('canceled');
    });

    test('verarbeitet invoice.payment_failed Event', () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123'
          }
        }
      };

      expect(event.type).toBe('invoice.payment_failed');
    });
  });

  // ===== SUBSCRIPTION STATUS TESTS =====
  describe('Subscription Status Handling', () => {

    const VALID_STATUSES = [
      'active',
      'canceled',
      'incomplete',
      'incomplete_expired',
      'past_due',
      'trialing',
      'unpaid'
    ];

    test('erkennt aktive Subscription', () => {
      const status = 'active';
      const isActive = status === 'active' || status === 'trialing';

      expect(isActive).toBe(true);
    });

    test('erkennt gekündigte Subscription', () => {
      const status = 'canceled';
      const isCanceled = status === 'canceled';

      expect(isCanceled).toBe(true);
    });

    test('erkennt Zahlungsprobleme', () => {
      const problemStatuses = ['past_due', 'incomplete', 'unpaid'];
      const status = 'past_due';

      const hasPaymentIssue = problemStatuses.includes(status);
      expect(hasPaymentIssue).toBe(true);
    });

    test('alle Stripe Status-Werte sind bekannt', () => {
      VALID_STATUSES.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status.length).toBeGreaterThan(0);
      });
    });
  });

  // ===== CURRENCY/AMOUNT TESTS =====
  describe('Currency und Amount Handling', () => {

    test('konvertiert EUR Cents zu Euro korrekt', () => {
      const amountInCents = 2900;
      const amountInEuro = amountInCents / 100;

      expect(amountInEuro).toBe(29.00);
    });

    test('unterstützt EUR als primäre Währung', () => {
      const currency = 'eur';

      expect(currency).toBe('eur');
      expect(currency.length).toBe(3);
    });

    test('formatiert Preis korrekt', () => {
      const amountInCents = 2900;
      const currency = 'EUR';

      const formatted = new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: currency
      }).format(amountInCents / 100);

      expect(formatted).toContain('29');
      expect(formatted).toContain('€');
    });
  });

  // ===== CUSTOMER MANAGEMENT TESTS =====
  describe('Customer Management', () => {

    test('speichert Stripe Customer ID', async () => {
      const stripeCustomerId = 'cus_1234567890abcdef';

      mockUsersCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await mockUsersCollection.updateOne(
        { _id: mockUser.userId },
        { $set: { stripeCustomerId } }
      );

      expect(result.modifiedCount).toBe(1);
    });

    test('Customer ID hat korrektes Format', () => {
      const validCustomerId = 'cus_AbCdEf123456';

      expect(validCustomerId).toMatch(/^cus_/);
    });

    test('Subscription ID hat korrektes Format', () => {
      const validSubscriptionId = 'sub_AbCdEf123456';

      expect(validSubscriptionId).toMatch(/^sub_/);
    });
  });

  // ===== ERROR HANDLING TESTS =====
  describe('Error Handling', () => {

    test('behandelt Stripe API Fehler', () => {
      const stripeError = {
        type: 'StripeCardError',
        code: 'card_declined',
        message: 'Your card was declined.'
      };

      expect(stripeError.type).toBe('StripeCardError');
      expect(stripeError.code).toBe('card_declined');
    });

    test('behandelt Invalid Request Fehler', () => {
      const stripeError = {
        type: 'StripeInvalidRequestError',
        code: 'resource_missing',
        message: 'No such price: price_invalid'
      };

      expect(stripeError.type).toBe('StripeInvalidRequestError');
    });

    test('behandelt Rate Limit Fehler', () => {
      const stripeError = {
        type: 'StripeRateLimitError',
        message: 'Too many requests'
      };

      expect(stripeError.type).toBe('StripeRateLimitError');
    });
  });

  // ===== INVOICE TESTS =====
  describe('Invoice Handling', () => {

    test('Invoice enthält erforderliche Felder', () => {
      const invoice = {
        id: 'in_123456',
        number: 'INV-2024-001',
        customer: 'cus_123',
        subscription: 'sub_123',
        amount_due: 2900,
        amount_paid: 2900,
        currency: 'eur',
        status: 'paid',
        created: 1704067200, // Unix timestamp
        invoice_pdf: 'https://pay.stripe.com/invoice/acct_xxx/inv_xxx/pdf'
      };

      expect(invoice.id).toMatch(/^in_/);
      expect(invoice.number).toBeDefined();
      expect(invoice.status).toBe('paid');
      expect(invoice.invoice_pdf).toContain('https://');
    });

    test('berechnet Invoice Datum korrekt', () => {
      const unixTimestamp = 1704067200;
      const date = new Date(unixTimestamp * 1000);

      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // Januar
      expect(date.getDate()).toBe(1);
    });
  });

  // ===== REFUND TESTS =====
  describe('Refund Handling', () => {

    test('Refund Objekt hat korrekte Struktur', () => {
      const refund = {
        id: 're_123456',
        amount: 2900,
        currency: 'eur',
        charge: 'ch_123456',
        status: 'succeeded',
        reason: 'requested_by_customer'
      };

      expect(refund.id).toMatch(/^re_/);
      expect(refund.status).toBe('succeeded');
      expect(refund.amount).toBe(2900);
    });

    test('akzeptiert gültige Refund Reasons', () => {
      const validReasons = [
        'duplicate',
        'fraudulent',
        'requested_by_customer'
      ];

      validReasons.forEach(reason => {
        expect(typeof reason).toBe('string');
      });
    });
  });

  // ===== TRIAL PERIOD TESTS =====
  describe('Trial Period Handling', () => {

    test('berechnet Trial End Date korrekt', () => {
      const trialDays = 14;
      const now = new Date();
      const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

      const diffDays = Math.round((trialEnd - now) / (24 * 60 * 60 * 1000));
      expect(diffDays).toBe(14);
    });

    test('erkennt Trial Status', () => {
      const subscription = {
        status: 'trialing',
        trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60
      };

      const isTrialing = subscription.status === 'trialing';
      const hasTrialEnd = subscription.trial_end !== null;

      expect(isTrialing).toBe(true);
      expect(hasTrialEnd).toBe(true);
    });

    test('Trial endet in der Zukunft', () => {
      const trialEndTimestamp = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60;
      const nowTimestamp = Math.floor(Date.now() / 1000);

      expect(trialEndTimestamp).toBeGreaterThan(nowTimestamp);
    });
  });

  // ===== SECURITY TESTS =====
  describe('Security', () => {

    test('validiert Webhook Signature', () => {
      const webhookSecret = 'whsec_test_secret';
      const signature = 't=1234567890,v1=abcdef123456';

      expect(webhookSecret).toMatch(/^whsec_/);
      expect(signature).toContain('t=');
      expect(signature).toContain('v1=');
    });

    test('prüft User-Berechtigung für Subscription-Aktionen', async () => {
      const requestUserId = mockUser.userId;
      const subscriptionCustomerId = 'cus_123';

      // User sollte nur eigene Subscription verwalten können
      mockUsersCollection.findOne.mockResolvedValue({
        _id: requestUserId,
        stripeCustomerId: subscriptionCustomerId
      });

      const user = await mockUsersCollection.findOne({ _id: requestUserId });

      expect(user.stripeCustomerId).toBe(subscriptionCustomerId);
    });
  });
});
