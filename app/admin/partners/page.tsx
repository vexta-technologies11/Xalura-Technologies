import { createClient } from "@/lib/supabase/server";
import { PartnerEditor } from "@/components/admin/PartnerEditor";

export default async function PartnersAdminPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("partners")
    .select("*")
    .order("display_order");

  return (
    <div>
      <h1 className="admin-page-title">Partners</h1>
      <p className="admin-page-lead">
        Partner logos usually live under <code>public/logos/</code>. Edit names, paths, and order
        here; blank fields can be saved.
      </p>
      <PartnerEditor initial={rows ?? []} />
    </div>
  );
}
