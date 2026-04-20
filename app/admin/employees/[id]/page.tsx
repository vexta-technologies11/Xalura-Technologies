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
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Edit Employee</h1>
      <EmployeeForm initial={data} />
    </div>
  );
}
