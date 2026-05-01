import type { MeetingAgendaParams } from "./prompts/meetingAgendaPrompt";

export interface MeetingAgendaResult {
  meetingTitle: string;
  totalDuration: number;
  items: {
    id: string;
    title: string;
    duration: number;
    type: string;
    description: string;
    lead?: string;
    role?: string;
    prepNotes?: string;
    questionsToAnswer: string[];
  }[];
  totalItems: number;
  recommendedPrepTime: string;
  estimatedEndTime: string;
  preMeetingNotes?: { attendee: string; notes: string }[];
  nextSteps: string;
}

export async function generateMeetingAgenda(params: MeetingAgendaParams): Promise<MeetingAgendaResult> {
  const res = await fetch("/api/tools/meeting-agenda", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
