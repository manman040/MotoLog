import { Shell } from "@/components/layout/shell";
import { DataProvider } from "@/features/vehicles/data-provider";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (
    process.env.NEXT_PUBLIC_AUTH_BACKEND !== "firebase" &&
    supabaseConfigured
  ) {
    const demo = (await cookies()).get("motolog-demo")?.value === "1";
    if (!demo) {
      const {
        data: { user },
        error,
      } = await (await supabaseServer()).auth.getUser();
      if (error || !user) redirect("/login");
    }
  }
  return (
    <Shell>
      <DataProvider>{children}</DataProvider>
    </Shell>
  );
}
