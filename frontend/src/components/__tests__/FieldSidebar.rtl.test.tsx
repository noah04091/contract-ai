// 🧪 FieldSidebar.rtl.test.tsx - React Testing Library tests

import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FieldSidebar from "../FieldSidebar";

const mockFields = [
  {
    _id: "field-a",
    type: "text" as const,
    page: 1,
    x: 10,
    y: 10,
    width: 100,
    height: 20,
    required: true,
    assigneeEmail: "test@example.com",
    label: "Name"
  },
  {
    _id: "field-b",
    type: "date" as const,
    page: 1,
    x: 10,
    y: 50,
    width: 100,
    height: 20,
    required: false,
    assigneeEmail: "test@example.com",
    label: "Date"
  },
  {
    _id: "field-c",
    type: "signature" as const,
    page: 2,
    x: 10,
    y: 100,
    width: 150,
    height: 50,
    required: true,
    assigneeEmail: "test@example.com",
    label: "Signature"
  }
];

describe("FieldSidebar", () => {
  const defaultProps = {
    fields: mockFields,
    fieldStates: {},
    activeFieldId: null,
    currentPage: 1,
    onJumpToField: jest.fn(),
    onNextField: jest.fn(),
    onFinish: jest.fn(),
    canFinish: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders sidebar with field list", () => {
    render(<FieldSidebar {...defaultProps} />);

    expect(screen.getByText(/Ihre Felder/i)).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Signature")).toBeInTheDocument();
  });

  test("shows correct progress (0/3 initially)", () => {
    render(<FieldSidebar {...defaultProps} />);

    // Progress indicator should show 0 completed
    expect(screen.getByText(/0.*\/ 3/)).toBeInTheDocument();
  });

  test("updates progress when field is completed", () => {
    const fieldStates = {
      "field-a": { status: "completed" as const, value: "John Doe" }
    };

    render(<FieldSidebar {...defaultProps} fieldStates={fieldStates} />);

    // Progress should now show 1/3
    expect(screen.getByText(/1.*\/ 3/)).toBeInTheDocument();
  });

  test("Finish button is disabled when required fields are incomplete", () => {
    render(<FieldSidebar {...defaultProps} canFinish={false} />);

    const finishButton = screen.getByRole("button", { name: /Fertigstellen/i });
    expect(finishButton).toBeDisabled();
  });

  test("Finish button is enabled when all required fields are complete", () => {
    const fieldStates = {
      "field-a": { status: "completed" as const, value: "John Doe" },
      "field-c": { status: "completed" as const, value: "data:image/png;base64,..." }
    };

    render(
      <FieldSidebar
        {...defaultProps}
        fieldStates={fieldStates}
        canFinish={true}
      />
    );

    const finishButton = screen.getByRole("button", { name: /Fertigstellen/i });
    expect(finishButton).not.toBeDisabled();
  });

  test("calls onJumpToField when field item is clicked", async () => {
    const onJumpToField = jest.fn();
    render(<FieldSidebar {...defaultProps} onJumpToField={onJumpToField} />);

    // Click on the first field
    const fieldItem = screen.getByText("Name").closest("div");
    if (fieldItem) {
      await userEvent.click(fieldItem);
      expect(onJumpToField).toHaveBeenCalledWith("field-a");
    }
  });

  test("calls onNextField when Next button is clicked", async () => {
    const onNextField = jest.fn();
    render(<FieldSidebar {...defaultProps} onNextField={onNextField} />);

    const nextButton = screen.getByRole("button", { name: /Weiter/i });
    await userEvent.click(nextButton);

    expect(onNextField).toHaveBeenCalledTimes(1);
  });

  test("calls onFinish when Finish button is clicked (if enabled)", async () => {
    const onFinish = jest.fn();
    const fieldStates = {
      "field-a": { status: "completed" as const, value: "John Doe" },
      "field-c": { status: "completed" as const, value: "data:image/png;base64,..." }
    };

    render(
      <FieldSidebar
        {...defaultProps}
        fieldStates={fieldStates}
        canFinish={true}
        onFinish={onFinish}
      />
    );

    const finishButton = screen.getByRole("button", { name: /Fertigstellen/i });
    await userEvent.click(finishButton);

    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test("highlights active field", () => {
    render(<FieldSidebar {...defaultProps} activeFieldId="field-b" />);

    // The active field should have a visual indicator
    // (Implementation depends on your CSS classes)
    const dateField = screen.getByText("Date").closest("div");
    expect(dateField).toHaveClass(/active/i);
  });

  test("groups fields by page", () => {
    render(<FieldSidebar {...defaultProps} />);

    // Should show "Seite 1" and "Seite 2" headings
    expect(screen.getByText(/Seite 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Seite 2/i)).toBeInTheDocument();
  });

  test("shows required indicator on required fields", () => {
    render(<FieldSidebar {...defaultProps} />);

    // Required fields should have an asterisk or indicator
    const nameField = screen.getByText("Name");
    expect(nameField.textContent).toContain("*");
  });

  test("handles empty field list", () => {
    render(<FieldSidebar {...defaultProps} fields={[]} />);

    // Should show empty state or no fields message
    expect(screen.queryByText("Name")).not.toBeInTheDocument();
  });
});
