import { EmployeeForm } from "@/components/admin/EmployeeForm";

export default function NewEmployeePage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>Add Employee</h1>
      <EmployeeForm />
    </div>
  );
}
