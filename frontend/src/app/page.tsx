"use client";

// TEMPORARY design-system preview — not a real app page. Replaced in Phase 1
// with the real "/" → "/today" or "/login" redirect. Exists so the visual
// direction (frontend/DESIGN.md) can be reviewed live before building the
// actual pages on top of it.

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fadeInUp, scaleIn, staggerContainer } from "@/lib/motion";

const UP_NEXT = [
  { title: "Reply to client email", reason: "Due today • fits your available time", priority: "high" as const },
  { title: "Review PR #142", reason: "High priority", priority: "amber" as const },
  { title: "Water the plants", reason: "Ranked by priority and deadline", priority: "low" as const },
];

const PRIORITY_BADGE: Record<string, { variant: "cyan" | "amber" | "magenta" | "secondary"; label: string }> = {
  urgent: { variant: "magenta", label: "Urgent" },
  high: { variant: "amber", label: "High" },
  medium: { variant: "cyan", label: "Medium" },
  low: { variant: "secondary", label: "Low" },
  amber: { variant: "amber", label: "High" },
};

export default function DesignPreview() {
  return (
    <div className="hud-grid-bg min-h-screen">
      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-16">
        <header className="space-y-2">
          <p className="font-brand text-2xl tracking-wide text-accent-cyan">LIFEOS</p>
          <h1 className="font-heading text-2xl font-semibold">
            Blend theme: cyan primary, magenta/amber accents
          </h1>
          <p className="text-sm text-muted-foreground">
            Temporary showcase — see frontend/DESIGN.md for the full token/animation system.
          </p>
        </header>

        {/* Hero: mimics the Today page's top-task card */}
        <motion.div initial="hidden" animate="visible" variants={scaleIn}>
          <Card className="glow-cyan animate-pulse-glow border-accent-cyan/40">
            <CardHeader>
              <p className="font-heading text-xs font-semibold tracking-widest text-accent-cyan uppercase">
                Top recommended task
              </p>
              <CardTitle className="font-heading text-xl">
                Finish the LifeOS prioritization writeup
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Overdue by 1 day • fits your available time</p>
                <Badge variant="magenta">Urgent</Badge>
              </div>
              <Button>Mark complete</Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Up next — staggered entrance */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-3"
        >
          <h2 className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Up next
          </h2>
          {UP_NEXT.map((task) => (
            <motion.div key={task.title} variants={fadeInUp}>
              <Card>
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div className="space-y-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">{task.reason}</p>
                  </div>
                  <Badge variant={PRIORITY_BADGE[task.priority].variant}>
                    {PRIORITY_BADGE[task.priority].label}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <Separator />

        {/* Glass panel */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          <div className="glass-panel space-y-3 rounded-lg p-6">
            <p className="font-heading text-xs font-semibold tracking-widest text-accent-magenta uppercase">
              Glass panel
            </p>
            <p className="text-sm text-muted-foreground">
              Translucent + blurred background, opt-in via .glass-panel — reserved for a few
              deliberate HUD-style surfaces, not the default card background.
            </p>
          </div>
        </motion.div>

        {/* Buttons + badges reference */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-4">
          <h2 className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Components
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="cyan">Cyan</Badge>
            <Badge variant="amber">Amber</Badge>
            <Badge variant="magenta">Magenta</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
