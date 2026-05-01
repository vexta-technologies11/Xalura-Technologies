import type { Metadata } from "next";
import Link from "next/link";
import { MeetingAgenda } from "@/components/tools/MeetingAgenda/MeetingAgenda";

export const metadata: Metadata = {
  title: "Meeting Agenda Generator | Xalura Tech",
  description: "Generate structured meeting agendas with time allotments, attendee roles, and prep notes.",
};

export default function MeetingAgendaPage() {
  return (
    <section className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
      <Link className="ai-tools__back" href="/ai-tools">
        ← All everyday tools
      </Link>
      <div className="ai-tools-hero">
        <h1 className="h1 r" style={{ marginBottom: 8, fontSize: "clamp(1.5rem, 2.2vw, 1.85rem)" }}>
          📋 Meeting Agenda Generator
        </h1>
        <p className="body-text" style={{ marginTop: 0, maxWidth: 640, opacity: 0.9 }}>
          Create structured agendas with timed items, discussion points, attendee roles (Pro), and pre-meeting prep (Pro).
        </p>
      </div>
      <MeetingAgenda />
    </section>
  );
}
