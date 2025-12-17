// 🧪 nextField.test.ts - Unit tests for field navigation logic

import { getNextField, sortFields, calculateProgress, Field, FieldState } from "../nextField";

const f = (id: string, page: number, x: number, y: number, required: boolean): Field => ({
  _id: id,
  page,
  x,
  y,
  required
});

describe("sortFields", () => {
  test("sorts by page → y → x", () => {
    const fields = [
      f("a", 2, 10, 10, true),  // page 2
      f("b", 1, 50, 5, true),   // page 1, y=5, x=50
      f("c", 1, 10, 5, true),   // page 1, y=5, x=10
      f("d", 1, 20, 10, true)   // page 1, y=10, x=20
    ];

    const sorted = sortFields(fields);

    expect(sorted.map(field => field._id)).toEqual(["c", "b", "d", "a"]);
  });
});

describe("getNextField", () => {
  test("picks required field before optional", () => {
    const fields = [
      f("optional", 1, 10, 10, false),
      f("required", 1, 5, 5, true)
    ];
    const states: Record<string, FieldState> = {
      optional: { status: "pending" },
      required: { status: "pending" }
    };

    expect(getNextField(fields, states)?._id).toBe("required");
  });

  test("picks first incomplete required field", () => {
    const fields = [
      f("req1", 1, 10, 10, true),
      f("req2", 1, 20, 10, true),
      f("req3", 1, 30, 10, true)
    ];
    const states: Record<string, FieldState> = {
      req1: { status: "completed" },
      req2: { status: "pending" },
      req3: { status: "pending" }
    };

    expect(getNextField(fields, states)?._id).toBe("req2");
  });

  test("falls back to optional fields when required done", () => {
    const fields = [
      f("req", 1, 10, 10, true),
      f("opt1", 1, 20, 10, false),
      f("opt2", 1, 30, 10, false)
    ];
    const states: Record<string, FieldState> = {
      req: { status: "completed" },
      opt1: { status: "pending" },
      opt2: { status: "pending" }
    };

    expect(getNextField(fields, states)?._id).toBe("opt1");
  });

  test("returns null when all fields completed", () => {
    const fields = [
      f("a", 1, 10, 10, true),
      f("b", 1, 20, 10, false)
    ];
    const states: Record<string, FieldState> = {
      a: { status: "completed" },
      b: { status: "completed" }
    };

    expect(getNextField(fields, states)).toBeNull();
  });

  test("handles empty states (all fields incomplete)", () => {
    const fields = [
      f("b", 1, 20, 10, false),
      f("a", 1, 10, 10, true)
    ];
    const states: Record<string, FieldState> = {};

    // Should pick required field "a" first
    expect(getNextField(fields, states)?._id).toBe("a");
  });
});

describe("calculateProgress", () => {
  test("calculates progress correctly", () => {
    const fields = [
      f("req1", 1, 10, 10, true),
      f("req2", 1, 20, 10, true),
      f("opt1", 1, 30, 10, false),
      f("opt2", 1, 40, 10, false)
    ];
    const states: Record<string, FieldState> = {
      req1: { status: "completed" },
      req2: { status: "pending" },
      opt1: { status: "completed" },
      opt2: { status: "pending" }
    };

    const progress = calculateProgress(fields, states);

    expect(progress.total).toBe(4);
    expect(progress.completed).toBe(2);
    expect(progress.requiredTotal).toBe(2);
    expect(progress.requiredCompleted).toBe(1);
    expect(progress.percentage).toBe(50);
  });

  test("handles empty fields", () => {
    const progress = calculateProgress([], {});

    expect(progress.total).toBe(0);
    expect(progress.completed).toBe(0);
    expect(progress.percentage).toBe(0);
  });
});
