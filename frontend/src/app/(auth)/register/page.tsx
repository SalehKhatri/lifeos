"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { AuthLayout } from "@/components/auth-layout";
import { useRegister } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";

const registerSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required").max(100),
});

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useRegister();
  // Detected once on mount, shown to the user (not editable here — see
  // frontend/DESIGN.md) but editable later on the Settings page.
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    try {
      await registerUser.mutateAsync({ ...values, timezone });
      router.push("/today");
    } catch (err) {
      // API-level errors (duplicate email, network failure) are a toast, not
      // an inline banner — field-level errors below stay inline, that's the
      // distinction (see frontend/DESIGN.md).
      toast.error(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <AuthLayout>
      <Card className="glow-cyan w-full max-w-sm border-accent-cyan/30">
        <CardHeader className="space-y-1 text-center">
          <p className="font-brand text-xl tracking-wide text-accent-cyan md:hidden">LIFEOS</p>
          <CardTitle className="font-heading">Create your account</CardTitle>
          <CardDescription>What should we work on right now?</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField label="Name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" autoComplete="name" {...register("name")} />
            </FormField>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
            </FormField>
            <FormField label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
            </FormField>
            <FormField
              label="Timezone"
              htmlFor="timezone"
              hint="Auto-detected — you can change this later in Settings."
            >
              <Input id="timezone" value={timezone} disabled readOnly />
            </FormField>
            <Button type="submit" className="w-full" disabled={registerUser.isPending}>
              {registerUser.isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-accent-cyan hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
