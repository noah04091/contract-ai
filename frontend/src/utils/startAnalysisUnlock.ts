// Stufe 2 — Einmal-Freischaltung EINER Analyse.
// Startet den Stripe-Einmalkauf (mode:"payment") für genau diesen Vertrag und
// leitet zur Stripe-Checkout-Seite weiter. Nach Erfolg landet der User wieder bei
// /contracts?view=<id>&unlocked=1 (siehe success_url im Backend).
export async function startAnalysisUnlock(contractId?: string | null): Promise<void> {
  if (!contractId) {
    alert("Diese Analyse kann gerade nicht freigeschaltet werden (keine Vertrags-ID).");
    return;
  }
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("authToken");
    const res = await fetch(`/api/stripe/create-unlock-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ contractId }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data?.url) {
      window.location.href = data.url; // → Stripe Checkout
      return;
    }
    if (data?.alreadyUnlocked) {
      // Schon bezahlt → einfach neu laden, damit die volle Analyse erscheint
      window.location.reload();
      return;
    }
    if (res.status === 503) {
      // Einmal-Freischaltung (noch) nicht aktiviert → sanfter Fallback auf die Tarife
      window.location.href = "/pricing";
      return;
    }
    alert(data?.message || "Die Freischaltung ist derzeit nicht verfügbar. Bitte später erneut versuchen.");
  } catch (err) {
    console.error("[Unlock] Fehler beim Start der Freischaltung:", err);
    alert("Die Freischaltung konnte nicht gestartet werden. Bitte später erneut versuchen.");
  }
}
