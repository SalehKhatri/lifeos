import { z } from "zod";

// Built into Node/V8 — no new date-library dependency needed to validate an IANA
// name. NOT `Intl.supportedValuesOf("timeZone")`: that returns whatever this
// Node's bundled ICU data considers "canonical" and can miss valid, widely-used
// aliases (e.g. it knows "Asia/Calcutta" but not "Asia/Kolkata" — exactly what a
// browser's Intl.DateTimeFormat().resolvedOptions().timeZone would report for an
// Indian user). Constructing a DateTimeFormat resolves aliases correctly and
// throws only on genuinely invalid input.
function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const timezoneSchema = z.string().refine(isValidTimeZone, { message: "Invalid IANA timezone" });

const nameSchema = z.string().trim().min(1, "Name cannot be empty").max(100);

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: nameSchema.optional(),
  timezone: timezoneSchema.optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

// Deleting an account is destructive and irreversible — require re-entering
// the password rather than trusting the session cookie alone.
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.timezone !== undefined, {
    message: "Provide at least one of: name, timezone",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
