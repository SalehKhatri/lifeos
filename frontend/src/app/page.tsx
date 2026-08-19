import { redirect } from "next/navigation";

// "/" always redirects to "/today" — the (app) layout's useCurrentUser()
// guard handles the further redirect to "/login" if not authenticated.
export default function RootPage() {
  redirect("/today");
}
