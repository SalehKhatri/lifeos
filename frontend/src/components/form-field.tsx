"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TRANSITION_FAST } from "@/lib/motion";

// This shadcn CLI version ships no `form.tsx` (empty registry stub) — this is
// the reusable label+input+error pattern used across every form in the app
// instead, composed directly with react-hook-form's `register()`. The error
// message animates in/out (not just present/absent) and carries an icon —
// see frontend/DESIGN.md's microinteraction conventions.
interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, error, hint, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION_FAST}
            className="flex items-center gap-1.5 overflow-hidden text-sm text-destructive"
          >
            <CircleAlert className="size-3.5 shrink-0" />
            <span>{error}</span>
          </motion.p>
        ) : hint ? (
          <p key="hint" className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
