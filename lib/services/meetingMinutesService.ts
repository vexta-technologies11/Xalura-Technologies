import type { MeetingMinutesParams } from "./prompts/meetingMinutesPrompt";

export interface MeetingMinutesResult {
  meetingTitle: string;
  date: string;
  attendees: string[];
  summary: string;
  decisions: {
    id: string;
    decision: string;
    rationale: string;
    decidedBy: string;
  }[];
  actionItems: {
    id: string;
    task: string;
    owner: string;
    dueDate: string;
    status: string;
    priority?: string;
    notes: string;
  }[];
  agendaMapping?: {
    agendaItem: string;
    minutesReference: string;
  }[];
  nextMeeting: string;
  keyPoints: string[];
}

export async function generateMeetingMinutes(params: MeetingMinutesParams): Promise<MeetingMinutesResult> {
  const res = await fetch("/api/tools/meeting-minutes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}
