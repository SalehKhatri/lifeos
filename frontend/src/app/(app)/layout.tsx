"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronDown, Search, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";
import { TRANSITION_BASE } from "@/lib/motion";
import { useCurrentUser, useLogout } from "@/features/auth/hooks";

const NAV_LINKS = [
  { href: "/today", label: "Today" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects", label: "Projects" },
  { href: "/schedule", label: "Schedule" },
];

// Shared focus-visible treatment for every keyboard-reachable nav control —
// matches the cyan glow used on form fields (see frontend/DESIGN.md).
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:shadow-glow-cyan";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const logout = useLogout();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // useCurrentUser() *is* the auth state (see features/auth/hooks.ts) — a
  // 401 here means "not logged in," redirect. No separate auth Context.
  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  if (isLoading || isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  return (
    <div className="hud-grid-bg min-h-screen">
      <header className="glass-panel sticky top-0 z-10 border-b border-accent-cyan/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/today"
            className={cn(
              "font-brand rounded-md text-lg tracking-wide text-accent-cyan transition-[filter] hover:brightness-125",
              FOCUS_RING,
            )}
          >
            LIFEOS
          </Link>

          {/* Text-only nav, no icons — a shared glowing underline slides
              between items via Motion's layoutId instead of a filled hover
              pill (see frontend/DESIGN.md: reactive, not static). */}
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "group/nav-link relative rounded-md px-3 py-1.5 font-heading text-xs font-semibold tracking-widest uppercase transition-colors",
                    active
                      ? "text-accent-cyan"
                      : "text-muted-foreground hover:text-foreground",
                    FOCUS_RING,
                  )}
                >
                  {link.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-active-indicator"
                      transition={TRANSITION_BASE}
                      className="shadow-glow-cyan absolute inset-x-2 -bottom-px h-px bg-accent-cyan"
                    />
                  ) : (
                    <span className="absolute inset-x-2 -bottom-px h-px scale-x-0 bg-border transition-transform group-hover/nav-link:scale-x-100" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            {/* Discoverable fallback for the ⌘K shortcut — not everyone
                remembers a hotkey exists, so it's also just a button. No
                border/box — every other nav control is borderless text/icon,
                so a bordered pill here reads as a bolted-on widget rather
                than part of the same HUD language (see frontend/DESIGN.md). */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                FOCUS_RING,
              )}
            >
              <Search className="size-3.5" />
              <kbd className="font-mono text-xs">⌘K</kbd>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  FOCUS_RING,
                )}
              >
                <span className="font-heading max-w-32 truncate">
                  {user?.name ?? user?.email}
                </span>
                <ChevronDown className="size-3.5 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Base UI requires Label/Item to live inside a Group —
                    unlike Radix, where Label works standalone. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    {user?.name ?? user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 size-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 size-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
