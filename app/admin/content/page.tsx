import { ContentEditor } from "@/components/admin/ContentEditor";

export default function ContentAdminPage() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Page Content</h1>
      <p style={{ color: "#52524f", marginBottom: 24, maxWidth: 560 }}>
        Edit public landing copy. Values are stored in the <code>page_content</code> table
        (JSON per section). Hero section below; extend the form as you add rows for other
        sections.
      </p>
      <ContentEditor />
    </div>
  );
}
