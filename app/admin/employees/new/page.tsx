import { EmployeeForm } from "@/components/admin/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div>
      <h1 className="admin-page-title">Add employee</h1>
      <p className="admin-page-lead" style={{ marginBottom: 20 }}>
        Leave fields blank if needed; upload a photo from your phone or add a URL after saving.
      </p>
      <EmployeeForm />
    </div>
  );
}
