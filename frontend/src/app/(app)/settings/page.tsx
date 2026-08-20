"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser, useDeleteAccount, useUpdateProfile } from "@/features/auth/hooks";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const profileFormSchema = z.object({
  name: z.string().trim().max(100, "Name must be 100 characters or less"),
  timezone: z.string().min(1, "Timezone is required"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Same toast pattern as login/register (features/auth's own established
// convention — toasts live at the call site, not inside the auth hooks
// themselves, since those hooks are reused across pages that each want
// slightly different messaging), not the toast-inside-the-hook convention
// used by Tasks/Categories/Projects/Schedule.
function authErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong. Try again.";
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const deleteAccount = useDeleteAccount();

  const [timezoneOpen, setTimezoneOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: "", timezone: "UTC" },
  });

  // react-hook-form only applies defaultValues on first mount — re-seed once
  // the current user actually loads (useCurrentUser starts undefined).
  useEffect(() => {
    if (user) reset({ name: user.name ?? "", timezone: user.timezone });
  }, [user, reset]);

  // Intl.supportedValuesOf, not the backend's own isValidTimeZone approach
  // (see auth.validation.ts) — that's deliberately *not* a canonical list
  // (chosen to accept aliases Intl's "supported" list is missing). This is
  // the opposite job: populating a searchable pick-list, where a
  // comprehensive standard list is exactly right, and missing an obscure
  // alias just means someone won't find it by browsing (typing it directly
  // would still validate fine server-side, but this UI is pick-from-list
  // only, matching the plan's "timezone combobox").
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);

  async function onSubmitProfile(values: ProfileFormValues) {
    try {
      await updateProfile.mutateAsync({
        name: values.name.trim() ? values.name.trim() : undefined,
        timezone: values.timezone,
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(authErrorMessage(err));
    }
  }

  async function handleDeleteAccount() {
    try {
      await deleteAccount.mutateAsync(password);
      // Explicit push, not just relying on the (app) layout's guard effect
      // to notice the resulting 401 — same belt-and-suspenders pattern
      // useLogout already uses, and this page isn't itself mid-transition
      // the way a route change would be.
      router.push("/login");
    } catch (err) {
      // Deliberately doesn't close the dialog on failure (e.g. wrong
      // password) — only a successful delete navigates away. AlertDialog
      // here doesn't auto-close on its own; closing is driven entirely by
      // this component's own state, same as every other delete flow in
      // the app.
      toast.error(authErrorMessage(err));
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Settings</h1>

      <form
        onSubmit={handleSubmit(onSubmitProfile)}
        className="space-y-4 rounded-lg bg-card p-5 ring-1 ring-foreground/10"
      >
        <div className="space-y-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-wide uppercase">Profile</h2>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>

        <FormField label="Name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" placeholder="Your name" {...register("name")} />
        </FormField>

        <FormField
          label="Timezone"
          htmlFor="timezone"
          error={errors.timezone?.message}
          hint="Changing this only affects how times display and how “today” is calculated — it doesn't shift any existing task or project deadlines."
        >
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      id="timezone"
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    />
                  }
                >
                  <span className="truncate">{field.value}</span>
                  <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search timezone…" />
                    <CommandList>
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {timezones.map((tz) => (
                          <CommandItem
                            key={tz}
                            value={tz}
                            onSelect={() => {
                              field.onChange(tz);
                              setTimezoneOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                field.value === tz ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {tz}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          />
        </FormField>

        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5">
        <div className="space-y-0.5">
          <h2 className="font-heading text-sm font-semibold tracking-wide text-destructive uppercase">
            Danger Zone
          </h2>
          <p className="text-xs text-muted-foreground">
            Permanently deletes your account and everything in it — tasks, projects,
            categories, and schedule. This can&apos;t be undone.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete account
        </Button>
      </div>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setPassword("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and everything in it — tasks, projects,
              categories, and schedule. This can&apos;t be undone. Enter your password to
              confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            type="password"
            placeholder="Password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!password || deleteAccount.isPending}
              onClick={handleDeleteAccount}
            >
              {deleteAccount.isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
