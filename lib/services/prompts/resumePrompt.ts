import type { ResumeState } from "@/lib/services/resumeService";

export function buildResumePrompt(state: ResumeState): string {
  const experienceText = state.experience
    .map(
      (job) =>
        `${job.role} at ${job.company} (${job.startDate} - ${job.endDate})\n${job.bullets.map((b) => `  • ${b.text}`).join("\n")}`,
    )
    .join("\n\n");

  const educationText = state.education
    .map((e) => `${e.degree} in ${e.field}, ${e.school} (${e.year})`)
    .join("\n");

  const skillsText = state.skills
    .map((s) => `${s.name} (${s.category}, ${s.proficiency})`)
    .join(", ");

  const certsText = state.certifications
    .map((c) => `${c.name} - ${c.issuer} (${c.year})`)
    .join("\n");

  return `You are a professional resume writer and ATS optimization expert.

PERSONAL INFO:
Name: ${state.personal.fullName}
Title: ${state.personal.professionalTitle}
Email: ${state.personal.email} | Phone: ${state.personal.phone}
Location: ${state.personal.location}
LinkedIn: ${state.personal.linkedIn}
Portfolio: ${state.personal.portfolio}
Summary: ${state.personal.summary}

EXPERIENCE:
${experienceText || "None provided"}

EDUCATION:
${educationText || "None provided"}

SKILLS:
${skillsText || "None provided"}

CERTIFICATIONS:
${certsText || "None provided"}

TARGET JOB DESCRIPTION:
${state.jobDescription || "Not provided"}

Return valid JSON only:
{
  "sections": [
    "string (formatted resume section - use plain text, markdown-ish with ALL CAPS section headers)"
  ],
  "atsScore": number (0-100, based on keyword match with job description),
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"]
}`;
}

export function buildEnhanceBulletPrompt(bullet: string, role: string): string {
  return `You are a resume bullet point enhancer. Rewrite this bullet point to be more impactful using strong action verbs and measurable results.

ORIGINAL BULLET: "${bullet}"
ROLE: ${role}

Return valid JSON only:
{
  "enhanced": "string (rewritten bullet with metrics/impact)"
}`;
}

export function buildCoverLetterPrompt(state: ResumeState): string {
  const experience = state.experience.map((j) => `${j.role} at ${j.company}`).join(", ");

  return `You are a professional cover letter writer. Generate a compelling cover letter.

APPLICANT: ${state.personal.fullName}
TARGET ROLE: ${state.personal.professionalTitle}
EXPERIENCE: ${experience || "Relevant professional background"}
SUMMARY: ${state.personal.summary}
JOB DESCRIPTION: ${state.jobDescription || "Not provided"}

Return valid JSON only:
{
  "text": "string (complete cover letter with date, salutation, body paragraphs, closing, and signature)"
}`;
}
