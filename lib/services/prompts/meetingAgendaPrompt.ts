export interface MeetingAgendaParams {
  topic: string;
  durationMinutes: number;
  discussionPoints: string[];
  attendees?: string[];
  isPro: boolean;
}

export function buildMeetingAgendaPrompt(params: MeetingAgendaParams): string {
  const { topic, durationMinutes, discussionPoints, attendees, isPro } = params;

  return `You are a meeting agenda planner. Create a structured agenda.

MEETING TOPIC: "${topic}"
DURATION: ${durationMinutes} minutes
DISCUSSION POINTS: ${discussionPoints.map((p, i) => `\n  ${i + 1}. ${p}`).join("")}
${attendees && attendees.length > 0 ? `ATTENDEES: ${attendees.join(", ")}` : ""}
${isPro ? "MODE: Pro (include attendee roles, pre-meeting prep notes)" : "MODE: Free (standard agenda)"}

Return valid JSON only:
{
  "meetingTitle": "Generated meeting title",
  "totalDuration": ${durationMinutes},
  "items": [
    {
      "id": "ag-1",
      "title": "Item title",
      "duration": 10,
      "type": "opening | discussion | decision | closing",
      "description": "What this segment covers",
      ${isPro ? `"lead": "Attendee name who leads this",
      "role": "Presenter | Decision-maker | Contributor",
      "prepNotes": "What to prepare before the meeting",` : ""}
      "questionsToAnswer": ["Key question 1", "Key question 2"]
    }
  ],
  "totalItems": 5,
  "recommendedPrepTime": "5 min",
  "estimatedEndTime": "e.g., 10:50 AM based on duration",
  ${isPro ? `"preMeetingNotes": [
    {"attendee": "Name", "notes": "What they should review before"}
  ],` : ""}
  "nextSteps": "Who does what after the meeting"
}`;
}
