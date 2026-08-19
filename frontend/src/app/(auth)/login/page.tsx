"use client";

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
import { useLogin } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";

const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    try {
      await login.mutateAsync(values);
      router.push("/today");
    } catch (err) {
      // API-level errors (wrong password, network failure) are a toast, not
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
          <CardTitle className="font-heading">Sign in</CardTitle>
          <CardDescription>Welcome back.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
            </FormField>
            <FormField label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
            </FormField>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-accent-cyan hover:underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
