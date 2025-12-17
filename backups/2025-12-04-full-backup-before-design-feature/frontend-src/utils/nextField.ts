// 🎯 nextField.ts - Smart field navigation logic
// Prioritizes required fields, then sorts by page → y → x

export type Field = {
  _id: string;
  page: number;
  x: number;
  y: number;
  required: boolean;
};

export type FieldState = {
  status?: "completed" | "pending" | "invalid" | "active";
  value?: string;
  error?: string | null;
};

/**
 * Sort fields in reading order: page → y-coordinate → x-coordinate
 */
export function sortFields(fields: Field[]): Field[] {
  return [...fields].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });
}

/**
 * Get next incomplete field, prioritizing required fields
 * @param fields - All signature fields
 * @param states - Current field states
 * @returns Next field to complete, or null if all done
 */
export function getNextField(
  fields: Field[],
  states: Record<string, FieldState>
): Field | null {
  const sorted = sortFields(fields);

  // Priority 1: Find next incomplete required field
  const incompleteRequired = sorted.filter(
    f => f.required && states[f._id]?.status !== "completed"
  );

  if (incompleteRequired.length > 0) {
    return incompleteRequired[0];
  }

  // Priority 2: Find next incomplete optional field
  const incompleteOptional = sorted.find(
    f => !f.required && states[f._id]?.status !== "completed"
  );

  return incompleteOptional || null;
}

/**
 * Get previous field in sorted order
 */
export function getPreviousField(
  fields: Field[],
  currentFieldId: string
): Field | null {
  const sorted = sortFields(fields);
  const currentIndex = sorted.findIndex(f => f._id === currentFieldId);

  if (currentIndex <= 0) {
    return null;
  }

  return sorted[currentIndex - 1];
}

/**
 * Calculate completion progress
 */
export function calculateProgress(
  fields: Field[],
  states: Record<string, FieldState>
): {
  total: number;
  completed: number;
  requiredTotal: number;
  requiredCompleted: number;
  percentage: number;
} {
  const total = fields.length;
  const completed = fields.filter(
    f => states[f._id]?.status === "completed"
  ).length;

  const requiredFields = fields.filter(f => f.required);
  const requiredTotal = requiredFields.length;
  const requiredCompleted = requiredFields.filter(
    f => states[f._id]?.status === "completed"
  ).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    requiredTotal,
    requiredCompleted,
    percentage
  };
}
