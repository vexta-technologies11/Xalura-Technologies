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
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Partners</h1>
      <p style={{ color: "#52524f", marginBottom: 24, maxWidth: 640 }}>
        Partner logos live in <code>public/logos/</code>. Update names and order here; upload
        flows can be wired to Supabase Storage later.
      </p>
      <PartnerEditor initial={rows ?? []} />
    </div>
  );
}
