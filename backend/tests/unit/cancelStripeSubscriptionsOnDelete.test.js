// Tests für utils/cancelStripeSubscriptionsOnDelete.js
// Kernzusagen: (1) beendet active/trialing zum Periodenende, (2) beendet past_due/unpaid
// sofort, (3) fasst ohne stripeCustomerId nichts an, (4) wirft NIEMALS — die Kontolöschung
// darf an Stripe nicht scheitern.

const { cancelStripeSubscriptionsOnDelete } = require("../../utils/cancelStripeSubscriptionsOnDelete");

function fakeStripe(subsData) {
  const calls = { list: [], update: [], cancel: [] };
  return {
    calls,
    subscriptions: {
      list: async (params) => { calls.list.push(params); return { data: subsData }; },
      update: async (id, params) => { calls.update.push({ id, params }); return { id }; },
      cancel: async (id) => { calls.cancel.push(id); return { id, status: "canceled" }; },
    },
  };
}

describe("cancelStripeSubscriptionsOnDelete", () => {
  test("ohne stripeCustomerId: kein Stripe-Kontakt, kein Fehler", async () => {
    const stripe = fakeStripe([]);
    const result = await cancelStripeSubscriptionsOnDelete({ email: "free@test.de" }, { stripe });
    expect(result.attempted).toBe(false);
    expect(result.errors).toEqual([]);
    expect(stripe.calls.list).toHaveLength(0);
  });

  test("aktives Abo wird zum Periodenende beendet (keine Erstattung, kein Sofort-Cancel)", async () => {
    const stripe = fakeStripe([{ id: "sub_a", status: "active", cancel_at_period_end: false }]);
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(result.attempted).toBe(true);
    expect(stripe.calls.update).toEqual([{ id: "sub_a", params: { cancel_at_period_end: true } }]);
    expect(stripe.calls.cancel).toHaveLength(0);
    expect(result.endOfPeriod).toEqual(["sub_a"]);
    expect(result.errors).toEqual([]);
  });

  test("bereits auslaufendes Abo wird nicht erneut angefasst (idempotent)", async () => {
    const stripe = fakeStripe([{ id: "sub_b", status: "active", cancel_at_period_end: true }]);
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(stripe.calls.update).toHaveLength(0);
    expect(result.endOfPeriod).toEqual(["sub_b"]);
  });

  test("past_due wird sofort beendet (keine weiteren Einzugsversuche)", async () => {
    const stripe = fakeStripe([{ id: "sub_c", status: "past_due", cancel_at_period_end: false }]);
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(stripe.calls.cancel).toEqual(["sub_c"]);
    expect(result.canceledNow).toEqual(["sub_c"]);
  });

  test("bereits gekündigte/unvollständige Abos bleiben unberührt", async () => {
    const stripe = fakeStripe([
      { id: "sub_d", status: "canceled", cancel_at_period_end: false },
      { id: "sub_e", status: "incomplete_expired", cancel_at_period_end: false },
    ]);
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(stripe.calls.update).toHaveLength(0);
    expect(stripe.calls.cancel).toHaveLength(0);
    expect(result.endOfPeriod).toEqual([]);
    expect(result.canceledNow).toEqual([]);
  });

  test("mehrere Abos: jedes nach seinem Status behandelt", async () => {
    const stripe = fakeStripe([
      { id: "sub_f", status: "active", cancel_at_period_end: false },
      { id: "sub_g", status: "unpaid", cancel_at_period_end: false },
    ]);
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(result.endOfPeriod).toEqual(["sub_f"]);
    expect(result.canceledNow).toEqual(["sub_g"]);
  });

  test("Stripe-Listing-Fehler: wirft nicht, Fehler im Ergebnis", async () => {
    const stripe = fakeStripe([]);
    stripe.subscriptions.list = async () => { throw new Error("Stripe down"); };
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(result.errors).toEqual(["Stripe down"]);
  });

  test("Fehler bei EINEM Abo stoppt die übrigen nicht", async () => {
    const stripe = fakeStripe([
      { id: "sub_h", status: "active", cancel_at_period_end: false },
      { id: "sub_i", status: "active", cancel_at_period_end: false },
    ]);
    const origUpdate = stripe.subscriptions.update;
    stripe.subscriptions.update = async (id, params) => {
      if (id === "sub_h") throw new Error("kaputt");
      return origUpdate(id, params);
    };
    const result = await cancelStripeSubscriptionsOnDelete(
      { email: "kunde@test.de", stripeCustomerId: "cus_1" }, { stripe }
    );
    expect(result.errors).toEqual(["sub_h: kaputt"]);
    expect(result.endOfPeriod).toEqual(["sub_i"]);
  });

  test("null/undefined User: wirft nicht", async () => {
    const result = await cancelStripeSubscriptionsOnDelete(null, { stripe: fakeStripe([]) });
    expect(result.attempted).toBe(false);
    expect(result.errors).toEqual([]);
  });
});
