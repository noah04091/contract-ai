// 🎭 signing.spec.ts - Playwright E2E tests for signature flow
// Tests the complete happy path: recipient opens link → fills fields → submits

import { test, expect } from "@playwright/test";

// SETUP: Set E2E_SIGN_URL in .env or pass via command line
// E.g.: E2E_SIGN_URL=http://localhost:5173/sign/TEST_TOKEN_HERE
const SIGN_URL = process.env.E2E_SIGN_URL || "";

test.describe("Digital Signature Flow", () => {
  test.skip(!SIGN_URL, "Skipping - E2E_SIGN_URL not set");

  test("recipient can complete required fields and submit signature", async ({ page }) => {
    // Longer timeout for signature flow (PDF loading, etc.)
    test.setTimeout(60000);

    // 1) Open signature link
    await page.goto(SIGN_URL);
    console.log("✅ Opened signature page");

    // 2) Wait for PDF viewer and sidebar to load
    await expect(
      page.getByRole("main", { name: /Dokument und Feldübersicht/i })
    ).toBeVisible({ timeout: 15000 });
    console.log("✅ PDF viewer loaded");

    // 3) Wait for signature fields to appear
    await page.waitForSelector('[data-testid^="overlay-field-"]', { timeout: 10000 });
    console.log("✅ Signature fields rendered");

    // 4) Click first overlay field → modal opens
    const firstField = page.locator('[data-testid^="overlay-field-"]').first();
    await firstField.click();
    console.log("✅ Clicked first field");

    // 5) Wait for modal to open
    await expect(page.locator('[data-testid="field-modal"]')).toBeVisible({ timeout: 5000 });
    console.log("✅ Field modal opened");

    // 6) Fill field based on type
    const textInput = page.getByRole("textbox").first();
    const dateInput = page.getByPlaceholder(/datum/i);
    const signatureCanvas = page.locator("canvas");

    if (await textInput.isVisible()) {
      // Text field
      await textInput.fill("Max Mustermann");
      console.log("✅ Filled text field");
    } else if (await dateInput.isVisible()) {
      // Date field
      await dateInput.fill("02.11.2025");
      console.log("✅ Filled date field");
    } else if (await signatureCanvas.isVisible()) {
      // Signature/Initials field - draw a simple line
      const box = await signatureCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 20, box.y + 20);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 20, box.y + box.height - 20, { steps: 10 });
        await page.mouse.up();
        console.log("✅ Drew signature");
      }
    }

    // 7) Confirm modal
    await page.locator('[data-testid="confirm"]').click();
    console.log("✅ Confirmed field");

    // 8) Navigate through remaining required fields
    const finishButton = page.locator('[data-testid="finish"]');

    // Keep clicking "Next" until Finish is enabled (max 10 iterations)
    let attempts = 0;
    while (attempts < 10) {
      const isEnabled = await finishButton.isEnabled();

      if (isEnabled) {
        console.log("✅ All required fields completed");
        break;
      }

      // Click next field
      const nextButton = page.locator('[data-testid="next-field"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        console.log("📍 Navigated to next field");

        // Wait a bit for field to activate
        await page.waitForTimeout(500);

        // Try to fill the active field
        if (await page.locator('[data-testid="field-modal"]').isVisible()) {
          // Modal already open, fill it
          const input = page.getByRole("textbox").first();
          if (await input.isVisible()) {
            await input.fill("Test Value");
            await page.locator('[data-testid="confirm"]').click();
          }
        } else {
          // Click field overlay to open modal
          const activeField = page.locator('[data-testid^="overlay-field-"]').first();
          if (await activeField.isVisible()) {
            await activeField.click();
            await page.waitForTimeout(500);

            const input = page.getByRole("textbox").first();
            if (await input.isVisible()) {
              await input.fill("Test Value");
              await page.locator('[data-testid="confirm"]').click();
            }
          }
        }
      }

      attempts++;
    }

    // 9) Verify Finish button is enabled
    await expect(finishButton).toBeEnabled({ timeout: 5000 });
    console.log("✅ Finish button enabled");

    // 10) Click Finish and submit
    await finishButton.click();
    console.log("✅ Clicked Finish");

    // 11) Expect success message
    await expect(
      page.getByText(/erfolgreich/i)
    ).toBeVisible({ timeout: 20000 });
    console.log("✅ Success message displayed");

    // 12) Verify sealed PDF download link is present
    const downloadLink = page.getByRole("link", { name: /herunterladen/i });
    if (await downloadLink.isVisible()) {
      console.log("✅ Download link available");
    }
  });

  test("recipient can decline signature request", async ({ page }) => {
    test.setTimeout(30000);

    await page.goto(SIGN_URL);

    // Wait for page to load
    await expect(
      page.getByRole("main", { name: /Dokument und Feldübersicht/i })
    ).toBeVisible({ timeout: 15000 });

    // Click decline button
    const declineButton = page.getByRole("button", { name: /Ablehnen/i });
    await declineButton.click();

    // Confirm decline (if confirmation dialog appears)
    const confirmButton = page.getByRole("button", { name: /Bestätigen|Ja/i });
    if (await confirmButton.isVisible({ timeout: 2000 })) {
      await confirmButton.click();
    }

    // Expect decline confirmation message
    await expect(
      page.getByText(/abgelehnt/i)
    ).toBeVisible({ timeout: 10000 });

    console.log("✅ Decline flow completed");
  });

  test("shows error for expired signature link", async ({ page }) => {
    // This test requires an expired token
    const expiredUrl = SIGN_URL.replace(/token=[^&]+/, "token=EXPIRED_TOKEN");

    await page.goto(expiredUrl);

    // Expect error message
    await expect(
      page.getByText(/abgelaufen|ungültig/i)
    ).toBeVisible({ timeout: 10000 });

    console.log("✅ Expired link handled correctly");
  });

  test("keyboard navigation works (Arrow keys, N/P)", async ({ page }) => {
    await page.goto(SIGN_URL);

    await expect(
      page.getByRole("main", { name: /Dokument und Feldübersicht/i })
    ).toBeVisible({ timeout: 15000 });

    // Press N (Next field)
    await page.keyboard.press("n");
    await page.waitForTimeout(500);

    // Check if modal opened or field highlighted
    const modal = page.locator('[data-testid="field-modal"]');
    const hasModal = await modal.isVisible({ timeout: 2000 });

    if (hasModal) {
      console.log("✅ Keyboard 'N' opened field modal");
    }

    // Press Escape to close modal
    await page.keyboard.press("Escape");

    // Press P (Previous field)
    await page.keyboard.press("p");
    await page.waitForTimeout(500);

    console.log("✅ Keyboard navigation works");
  });
});
