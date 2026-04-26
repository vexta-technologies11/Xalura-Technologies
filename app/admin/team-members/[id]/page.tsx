import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamMemberForm } from "@/components/admin/TeamMemberForm";
import type { TeamMemberRow } from "@/types/team";

type Props = { params: { id: string } };

export default async function EditTeamMemberPage({ params }: Props) {
  const supabase = createClient();
  const { data, error } = await supabase.from("team_members").select("*").eq("id", params.id).maybeSingle();
  if (error || !data) notFound();
  return (
    <div>
      <h1 className="admin-page-title">Edit team member</h1>
      <TeamMemberForm initial={data as TeamMemberRow} />
    </div>
  );
}
