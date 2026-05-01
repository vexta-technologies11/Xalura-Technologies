export interface MeetingMinutesParams {
  rawNotes: string;
  isPro: boolean;
}

export function buildMeetingMinutesPrompt(params: MeetingMinutesParams): string {
  const { rawNotes, isPro } = params;

  return `You are a meeting minutes assistant. Convert raw conversation notes into structured meeting minutes.

RAW NOTES:
${rawNotes.slice(0, 25000)}

${isPro ? "MODE: Pro (include action item table, decision log, agenda mapping)" : "MODE: Free (standard minutes with decisions and action items)"}

Return valid JSON only:
{
  "meetingTitle": "Meeting title inferred from content",
  "date": "Date if mentioned, otherwise today",
  "attendees": ["Name1", "Name2"],
  "summary": "1-2 paragraph meeting summary",
  "decisions": [
    {"id": "dec-1", "decision": "What was decided", "rationale": "Why", "decidedBy": "Who"}
  ],
  "actionItems": [
    {
      "id": "ai-1",
      "task": "What needs to be done",
      "owner": "Who is responsible",
      "dueDate": "Due date if mentioned",
      "status": "Pending | In Progress | Complete",
      ${isPro ? `"priority": "High | Medium | Low",` : ""}
      "notes": "Additional context"
    }
  ],
  ${isPro ? `"agendaMapping": [
    {"agendaItem": "Topic discussed", "minutesReference": "What was said/decided"}
  ],` : ""}
  "nextMeeting": "Date if mentioned",
  "keyPoints": ["Key takeaway 1", "Key takeaway 2"]
}`;
}
