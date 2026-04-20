import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/admin/EmployeeForm";

export default async function EditEmployeePage({
  params,
}: {
  params: { id: string };
}) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  const { id } = params;
  const supabase = createClient();
  const { data } = await supabase.from("employees").select("*").eq("id", id).single();
  if (!data) notFound();

  return (
    <div>
      <h1 className="admin-page-title">Edit employee</h1>
      <p className="admin-page-lead" style={{ marginBottom: 20 }}>
        All fields are optional to clear; upload a JPEG or other photo, or paste a URL.
      </p>
      <EmployeeForm initial={data} />
    </div>
  );
}
