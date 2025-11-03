// 📅 dateDE.ts - German date format validation (DD.MM.YYYY + ISO)
// Rejects invalid dates like 31.04. or 29.02.2023

/**
 * Parse and validate German date format (DD.MM.YYYY) or ISO format (YYYY-MM-DD)
 * @param input - Date string to parse
 * @returns Valid Date object or null if invalid
 */
export function parseDateDEorISO(input: string): Date | null {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  const germanRegex = /^\d{2}\.\d{2}\.\d{4}$/;

  // Try ISO format first (YYYY-MM-DD)
  if (isoRegex.test(input)) {
    const date = new Date(input + "T00:00:00Z");
    return isNaN(date.getTime()) ? null : date;
  }

  // Try German format (DD.MM.YYYY)
  if (germanRegex.test(input)) {
    const [dayStr, monthStr, yearStr] = input.split(".");
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    // Create date in UTC to avoid timezone issues
    const date = new Date(Date.UTC(year, month - 1, day));

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Re-validate exact day/month to reject dates like 31.04. (April has only 30 days)
    // JavaScript Date auto-corrects 31.04. to 01.05., so we check if values match
    const isValidDate =
      date.getUTCDate() === day &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCFullYear() === year;

    return isValidDate ? date : null;
  }

  return null;
}

/**
 * Format Date object to German format (DD.MM.YYYY)
 */
export function formatDateDE(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Get today's date in German format
 */
export function getTodayDE(): string {
  return formatDateDE(new Date());
}

/**
 * Validate if date string is in correct format and valid
 */
export function isValidDateString(input: string): boolean {
  return parseDateDEorISO(input) !== null;
}
