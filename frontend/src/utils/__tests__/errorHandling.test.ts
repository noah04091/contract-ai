// 🧪 errorHandling.test.ts - Tests für Error Handling Utilities

import {
  getErrorMessage,
  isNetworkError,
  isTimeoutError,
  isAuthError,
  isNotFoundError,
  isRetryableError,
  formatErrorForDisplay,
  createApiError
} from "../errorHandling";

describe("errorHandling", () => {
  describe("getErrorMessage()", () => {
    test("extrahiert Nachricht aus Error-Instanz", () => {
      const error = new Error("Test error message");
      expect(getErrorMessage(error)).toBe("Test error message");
    });

    test("gibt String-Fehler direkt zurück", () => {
      expect(getErrorMessage("String error")).toBe("String error");
    });

    test("extrahiert message aus Objekt", () => {
      const error = { message: "Object error message" };
      expect(getErrorMessage(error)).toBe("Object error message");
    });

    test("gibt Fallback für unbekannte Fehler zurück", () => {
      expect(getErrorMessage(null)).toBe("Ein unerwarteter Fehler ist aufgetreten");
      expect(getErrorMessage(undefined)).toBe("Ein unerwarteter Fehler ist aufgetreten");
      expect(getErrorMessage(123)).toBe("Ein unerwarteter Fehler ist aufgetreten");
    });
  });

  describe("isNetworkError()", () => {
    test("erkennt fetch-Fehler", () => {
      const error = new Error("Failed to fetch");
      expect(isNetworkError(error)).toBe(true);
    });

    test("erkennt network-Fehler", () => {
      const error = new Error("Network request failed");
      expect(isNetworkError(error)).toBe(true);
    });

    test("erkennt offline-Fehler", () => {
      const error = new Error("You are offline");
      expect(isNetworkError(error)).toBe(true);
    });

    test("erkennt Verbindungsfehler (deutsch)", () => {
      const error = new Error("Keine Verbindung zum Server");
      expect(isNetworkError(error)).toBe(true);
    });

    test("gibt false für andere Fehler zurück", () => {
      const error = new Error("Something went wrong");
      expect(isNetworkError(error)).toBe(false);
    });

    test("gibt false für Nicht-Error zurück", () => {
      expect(isNetworkError("string error")).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe("isTimeoutError()", () => {
    test("erkennt timeout-Fehler", () => {
      const error = new Error("Request timeout");
      expect(isTimeoutError(error)).toBe(true);
    });

    test("erkennt Zeitüberschreitung (deutsch)", () => {
      const error = new Error("Zeitüberschreitung bei der Anfrage");
      expect(isTimeoutError(error)).toBe(true);
    });

    test("gibt false für andere Fehler zurück", () => {
      const error = new Error("Server error");
      expect(isTimeoutError(error)).toBe(false);
    });
  });

  describe("isAuthError()", () => {
    test("erkennt 401-Status", () => {
      const error = { status: 401, message: "Unauthorized" };
      expect(isAuthError(error)).toBe(true);
    });

    test("erkennt 403-Status", () => {
      const error = { status: 403, message: "Forbidden" };
      expect(isAuthError(error)).toBe(true);
    });

    test("erkennt unauthorized-Nachricht", () => {
      const error = new Error("Unauthorized access");
      expect(isAuthError(error)).toBe(true);
    });

    test("erkennt 'nicht berechtigt' (deutsch)", () => {
      const error = new Error("Sie sind nicht berechtigt");
      expect(isAuthError(error)).toBe(true);
    });

    test("gibt false für andere Status-Codes zurück", () => {
      const error = { status: 500, message: "Server error" };
      expect(isAuthError(error)).toBe(false);
    });
  });

  describe("isNotFoundError()", () => {
    test("erkennt 404-Status", () => {
      const error = { status: 404, message: "Not found" };
      expect(isNotFoundError(error)).toBe(true);
    });

    test("erkennt 'not found'-Nachricht", () => {
      const error = new Error("Resource not found");
      expect(isNotFoundError(error)).toBe(true);
    });

    test("erkennt 'nicht gefunden' (deutsch)", () => {
      const error = new Error("Vertrag nicht gefunden");
      expect(isNotFoundError(error)).toBe(true);
    });

    test("gibt false für andere Fehler zurück", () => {
      const error = { status: 500, message: "Server error" };
      expect(isNotFoundError(error)).toBe(false);
    });
  });

  describe("isRetryableError()", () => {
    test("gibt true für Netzwerk-Fehler zurück", () => {
      const error = new Error("Failed to fetch");
      expect(isRetryableError(error)).toBe(true);
    });

    test("gibt true für Timeout-Fehler zurück", () => {
      const error = new Error("Request timeout");
      expect(isRetryableError(error)).toBe(true);
    });

    test("gibt true für 500-Fehler zurück", () => {
      const error = { status: 500, message: "Internal server error" };
      expect(isRetryableError(error)).toBe(true);
    });

    test("gibt true für 503-Fehler zurück", () => {
      const error = { status: 503, message: "Service unavailable" };
      expect(isRetryableError(error)).toBe(true);
    });

    test("gibt false für 400-Fehler zurück", () => {
      const error = { status: 400, message: "Bad request" };
      expect(isRetryableError(error)).toBe(false);
    });

    test("gibt false für 404-Fehler zurück", () => {
      const error = { status: 404, message: "Not found" };
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe("formatErrorForDisplay()", () => {
    test("formatiert Netzwerk-Fehler korrekt", () => {
      const error = new Error("Failed to fetch");
      const result = formatErrorForDisplay(error);

      expect(result.title).toBe("Verbindungsfehler");
      expect(result.canRetry).toBe(true);
    });

    test("formatiert Timeout-Fehler korrekt", () => {
      const error = new Error("Request timeout");
      const result = formatErrorForDisplay(error);

      expect(result.title).toBe("Zeitüberschreitung");
      expect(result.canRetry).toBe(true);
    });

    test("formatiert Auth-Fehler korrekt", () => {
      const error = { status: 401, message: "Unauthorized" };
      const result = formatErrorForDisplay(error);

      expect(result.title).toBe("Authentifizierung fehlgeschlagen");
      expect(result.canRetry).toBe(false);
    });

    test("formatiert Not-Found-Fehler korrekt", () => {
      const error = { status: 404, message: "Not found" };
      const result = formatErrorForDisplay(error);

      expect(result.title).toBe("Nicht gefunden");
      expect(result.canRetry).toBe(false);
    });

    test("formatiert Server-Fehler als wiederholbar", () => {
      const error = { status: 500, message: "Internal server error" };
      const result = formatErrorForDisplay(error);

      expect(result.title).toBe("Server-Fehler");
      expect(result.canRetry).toBe(true);
    });

    test("verwendet benutzerfreundliche Fehlermeldung wenn passend", () => {
      const error = new Error("Ihre Sitzung ist abgelaufen");
      const result = formatErrorForDisplay(error);

      expect(result.message).toBe("Ihre Sitzung ist abgelaufen");
    });
  });

  describe("createApiError()", () => {
    test("erstellt Error mit Status-Code", () => {
      const error = createApiError(404, "Vertrag nicht gefunden");

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Vertrag nicht gefunden");
      expect(error.status).toBe(404);
    });

    test("erstellt Error mit zusätzlichen Daten", () => {
      const data = { field: "email", reason: "invalid" };
      const error = createApiError(400, "Validation failed", data);

      expect(error.status).toBe(400);
      expect(error.data).toEqual(data);
    });

    test("Error ohne data hat undefined data", () => {
      const error = createApiError(500, "Server error");
      expect(error.data).toBeUndefined();
    });
  });
});
