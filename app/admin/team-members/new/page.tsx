import { TeamMemberForm } from "@/components/admin/TeamMemberForm";

export default function NewTeamMemberPage() {
  return (
    <div>
      <h1 className="admin-page-title">Add team member</h1>
      <TeamMemberForm />
    </div>
  );
}
