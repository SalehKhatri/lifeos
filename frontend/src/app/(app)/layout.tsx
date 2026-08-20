"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronDown, Search, Settings, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
  // Below `md`, the horizontal nav row (wordmark + 4 links + ⌘K + user
  // name) has nowhere to go — there's no graceful shrink for a text nav
  // the way there is for, say, icon-only tabs, so it collapses into this
  // Sheet instead. Controlled state, same pattern as every other Sheet in
  // this app, not an uncontrolled SheetTrigger — consistent with the
  // "parent owns open state" convention used everywhere else.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
              pill (see frontend/DESIGN.md: reactive, not static). Hidden
              below `md` — collapses into the mobile Sheet below instead. */}
          <nav className="hidden items-center gap-1 md:flex">
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

          {/* Hidden below `md` alongside the nav above — same reasoning. */}
          <div className="hidden items-center gap-1 md:flex">
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

          {/* The `md:hidden` counterpart to everything above — one button
              opening the Sheet below, instead of trying to cram 4 links +
              ⌘K + a user name into a row that's already tight at desktop
              widths. */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            className={cn(
              "flex items-center rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden",
              FOCUS_RING,
            )}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-brand text-lg text-accent-cyan">LIFEOS</SheetTitle>
            <SheetDescription>{user?.name ?? user?.email}</SheetDescription>
          </SheetHeader>

          <nav className="flex flex-col gap-1 px-4">
            {NAV_LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 font-heading text-sm font-semibold tracking-widest uppercase transition-colors",
                    active
                      ? "bg-accent-cyan/10 text-accent-cyan"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    FOCUS_RING,
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-1 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                setPaletteOpen(true);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
                FOCUS_RING,
              )}
            >
              <Search className="size-4" />
              Search
            </button>
            <Link
              href="/settings"
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
                FOCUS_RING,
              )}
            >
              <Settings className="size-4" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                handleLogout();
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10",
                FOCUS_RING,
              )}
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
