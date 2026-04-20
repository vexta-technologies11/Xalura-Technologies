import { HomepageEditor } from "@/components/admin/HomepageEditor";

export default function ContentAdminPage() {
  return (
    <div>
      <h1 className="admin-page-title">Homepage</h1>
      <p className="admin-page-lead">
        Edit every public section of the landing page. Use the tabs to switch layers.{" "}
        <strong>Save all</strong> writes to the <code>page_content</code> table.{" "}
        <strong>Cancel</strong> discards edits since last load or save. <strong>Exit</strong> returns to
        the dashboard (you will be warned if there are unsaved changes). Blank fields are saved as empty.
      </p>
      <HomepageEditor />
    </div>
  );
}
