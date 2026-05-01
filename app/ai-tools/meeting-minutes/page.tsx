import type { Metadata } from "next";
import Link from "next/link";
import { MeetingMinutes } from "@/components/tools/MeetingMinutes/MeetingMinutes";

export const metadata: Metadata = {
  title: "Meeting Minutes | Xalura Tech",
  description: "Convert raw meeting notes into structured minutes with decisions, action items, and key points.",
};

export default function MeetingMinutesPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📝 Meeting Minutes
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Convert raw conversation notes into structured minutes with decisions, action items table, and priority levels (Pro).
        </p>
      </div>
      <MeetingMinutes />
    </section>
  );
}
