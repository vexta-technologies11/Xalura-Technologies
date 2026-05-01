import { ToolCategoriesClient } from "./ToolCategoriesClient";

export const metadata = {
  title: "Tool Categories | Admin",
};

export default function ToolCategoriesPage() {
  return (
    <div>
      <h1 className="admin-page-title">Tool Categories</h1>
      <p className="admin-page-lead">
        Create categories, rename them, and assign tools to group them on the /ai-tools page.
      </p>
      <ToolCategoriesClient />
    </div>
  );
}
