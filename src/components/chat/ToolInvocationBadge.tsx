"use client";

import { Loader2 } from "lucide-react";

interface ToolInvocation {
  toolName: string;
  state: string;
  result?: unknown;
  args: Record<string, unknown>;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  const filename = typeof args.path === "string"
    ? args.path.split("/").pop() ?? args.path
    : undefined;

  if (toolName === "str_replace_editor" && filename) {
    switch (args.command) {
      case "create": return `Creating ${filename}`;
      case "str_replace":
      case "insert": return `Editing ${filename}`;
      case "undo_edit": return `Undoing edit in ${filename}`;
      case "view": return `Viewing ${filename}`;
    }
  }

  if (toolName === "file_manager" && filename) {
    switch (args.command) {
      case "delete": return `Deleting ${filename}`;
      case "rename": return `Renaming ${filename}`;
    }
  }

  return toolName;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const { toolName, state, result, args } = toolInvocation;
  const label = getLabel(toolName, args);
  const isDone = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
