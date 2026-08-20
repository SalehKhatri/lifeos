"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  ListChecks,
  FolderKanban,
  CalendarClock,
  Settings,
  LogOut,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useLogout } from "@/features/auth/hooks";

// Global "master control" palette — Cmd/Ctrl+K from anywhere in the
// authenticated app. Deliberately brought into scope 2026-08-19 (was
// MVP_SPEC.md's "Out of Scope: keyboard shortcuts, command palette" line —
// see docs/PROGRESS.md Decisions Log). Extend the COMMANDS array below as new
// pages land — e.g. Phase 2 adds a "New Task" entry, no other changes needed.
//
// Controlled (open/onOpenChange lifted to the layout) so the nav's visible
// "⌘K" hint button and the keyboard shortcut share one source of truth.
interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaletteCommand {
  label: string;
  icon: LucideIcon;
  group: "Navigate" | "Actions" | "Session";
  action: (router: ReturnType<typeof useRouter>, logout: () => Promise<void>) => void;
}

const COMMANDS: PaletteCommand[] = [
  { label: "Today", icon: Target, group: "Navigate", action: (router) => router.push("/today") },
  {
    label: "Tasks",
    icon: ListChecks,
    group: "Navigate",
    action: (router) => router.push("/tasks"),
  },
  {
    label: "Projects",
    icon: FolderKanban,
    group: "Navigate",
    action: (router) => router.push("/projects"),
  },
  {
    label: "Schedule",
    icon: CalendarClock,
    group: "Navigate",
    action: (router) => router.push("/schedule"),
  },
  {
    label: "Settings",
    icon: Settings,
    group: "Navigate",
    action: (router) => router.push("/settings"),
  },
  {
    label: "New Task",
    icon: Plus,
    group: "Actions",
    // Bridges into the /tasks page's local sheet state via a query param —
    // the palette lives in the (app) layout, above any given page, so it
    // has no direct handle on that state. See app/(app)/tasks/page.tsx.
    action: (router) => router.push("/tasks?new=1"),
  },
  {
    label: "Log out",
    icon: LogOut,
    group: "Session",
    action: (_router, logout) => void logout(),
  },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const logout = useLogout();

  async function doLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  function run(command: PaletteCommand) {
    onOpenChange(false);
    command.action(router, doLogout);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // A modifier-key combo, not a bare letter — safe to fire globally
      // without worrying about hijacking normal typing in a form field.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }

      // Bare digit 1-9 while the palette is open jumps straight to that
      // command, no arrow-down + Enter needed. Digits, not mnemonic letters:
      // the search input is focused by default, so a bare letter would just
      // get typed as a query character instead of firing — and single-letter
      // combos with Cmd/Ctrl (⌘T, ⌘S, ⌘W...) collide with shortcuts the
      // browser itself already claims. preventDefault stops the digit from
      // landing in the input, so it never conflicts with typing a search
      // query — a deliberate tradeoff, since this palette is navigation, not
      // free-text/numeric search.
      if (open && /^[1-9]$/.test(e.key)) {
        const index = Number(e.key) - 1;
        const command = COMMANDS[index];
        if (command) {
          e.preventDefault();
          run(command);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const groups = useMemo(() => {
    const withIndex = COMMANDS.map((command, index) => ({ command, shortcut: index + 1 }));
    return {
      Navigate: withIndex.filter((c) => c.command.group === "Navigate"),
      Actions: withIndex.filter((c) => c.command.group === "Actions"),
      Session: withIndex.filter((c) => c.command.group === "Session"),
    };
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} className="sm:max-w-lg">
      {/* CommandDialog doesn't wrap children in the Command root itself —
          that's what provides cmdk's context (the "store" CommandInput reads
          via subscribe); omitting it throws at runtime, not just a type
          error. Caller's responsibility per this shadcn version. */}
      <Command>
        <CommandInput placeholder="Jump to a page, or search for a command…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {groups.Navigate.map(({ command, shortcut }) => (
              <CommandItem key={command.label} onSelect={() => run(command)}>
                <command.icon />
                {command.label}
                <CommandShortcut>{shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            {groups.Actions.map(({ command, shortcut }) => (
              <CommandItem key={command.label} onSelect={() => run(command)}>
                <command.icon />
                {command.label}
                <CommandShortcut>{shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Session">
            {groups.Session.map(({ command, shortcut }) => (
              <CommandItem key={command.label} onSelect={() => run(command)}>
                <command.icon />
                {command.label}
                <CommandShortcut>{shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
        {/* -mx-1 -mb-1 bleeds to the dialog's edges, counteracting Command's
            own p-1 — otherwise this reads as inset/floating, not a status bar. */}
        <div className="-mx-1 -mb-1 flex items-center gap-3 rounded-b-xl border-t border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>1-9 Jump</span>
          <span className="ml-auto">ESC Close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
