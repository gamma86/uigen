import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function make(toolName: string, args: Record<string, unknown>, state = "result", result: unknown = "ok") {
  return { toolName, args, state, result };
}

test("shows 'Creating' for str_replace_editor create", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "create", path: "/src/Card.tsx" })} />);
  expect(screen.getByText("Creating Card.tsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor str_replace", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "str_replace", path: "/src/App.tsx" })} />);
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("shows 'Editing' for str_replace_editor insert", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "insert", path: "/src/App.tsx" })} />);
  expect(screen.getByText("Editing App.tsx")).toBeDefined();
});

test("shows 'Undoing edit' for str_replace_editor undo_edit", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "undo_edit", path: "/src/App.tsx" })} />);
  expect(screen.getByText("Undoing edit in App.tsx")).toBeDefined();
});

test("shows 'Viewing' for str_replace_editor view", () => {
  render(<ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "view", path: "/src/App.tsx" })} />);
  expect(screen.getByText("Viewing App.tsx")).toBeDefined();
});

test("shows 'Deleting' for file_manager delete", () => {
  render(<ToolInvocationBadge toolInvocation={make("file_manager", { command: "delete", path: "/src/old.tsx" })} />);
  expect(screen.getByText("Deleting old.tsx")).toBeDefined();
});

test("shows 'Renaming' for file_manager rename", () => {
  render(<ToolInvocationBadge toolInvocation={make("file_manager", { command: "rename", path: "/src/old.tsx" })} />);
  expect(screen.getByText("Renaming old.tsx")).toBeDefined();
});

test("falls back to tool name for unknown tool", () => {
  render(<ToolInvocationBadge toolInvocation={make("unknown_tool", {})} />);
  expect(screen.getByText("unknown_tool")).toBeDefined();
});

test("shows spinner when in progress", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "create", path: "/src/App.tsx" }, "call", undefined)} />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot when done", () => {
  const { container } = render(
    <ToolInvocationBadge toolInvocation={make("str_replace_editor", { command: "create", path: "/src/App.tsx" })} />
  );
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
