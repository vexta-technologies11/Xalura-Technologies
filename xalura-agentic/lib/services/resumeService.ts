export interface PersonalInfo {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  portfolio: string;
  summary: string;
}

export interface BulletEntry {
  id: string;
  text: string;
}

export interface JobEntry {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string | "present";
  location: string;
  isRemote: boolean;
  bullets: BulletEntry[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  field: string;
  year: string;
}

export interface CertEntry {
  name: string;
  issuer: string;
  year: string;
  expiry: string;
}

export interface SkillEntry {
  name: string;
  category: "technical" | "soft" | "language" | "tools";
  proficiency: "beginner" | "intermediate" | "expert";
}

export interface ResumeState {
  personal: PersonalInfo;
  experience: JobEntry[];
  education: EducationEntry[];
  certifications: CertEntry[];
  skills: SkillEntry[];
  jobDescription: string;
}

export interface ResumeOutput {
  sections: string[];
  atsScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface ATSResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchRate: number;
}

const ACTION_VERBS = [
  "Spearheaded", "Optimized", "Engineered", "Orchestrated", "Transformed",
  "Accelerated", "Championed", "Delivered", "Scaled", "Architected",
];

export async function generateResume(state: ResumeState): Promise<ResumeOutput> {
  // STUB — REPLACE IN PHASE 4 with: POST /api/tools/resume-builder
  await new Promise((r) => setTimeout(r, 2000));

  const sections = [
    `${state.personal.fullName || "Your Name"}\n${state.personal.professionalTitle || "Professional"}`,
    `Email: ${state.personal.email || "email@example.com"} | Phone: ${state.personal.phone || "(555) 123-4567"}`,
    `\nPROFESSIONAL SUMMARY\n${state.personal.summary || "Experienced professional with a track record of delivering results."}`,
  ];

  if (state.experience.length > 0) {
    sections.push("\nEXPERIENCE");
    for (const job of state.experience) {
      sections.push(
        `${job.role} at ${job.company} (${job.startDate} – ${job.endDate === "present" ? "Present" : job.endDate})`,
      );
      for (const bullet of job.bullets) {
        sections.push(`• ${bullet.text}`);
      }
    }
  }

  const jdWords = state.jobDescription.toLowerCase().split(/\s+/);
  const matched = ["leadership", "strategy", "analysis", "development", "management"].filter(
    (k) => jdWords.includes(k),
  );
  const missing = ["innovation", "scalability", "optimization"].filter((k) => !jdWords.includes(k));

  return {
    sections,
    atsScore: Math.min(95, 50 + Math.floor(Math.random() * 40)),
    matchedKeywords: matched,
    missingKeywords: missing,
  };
}

export async function enhanceBullet(bullet: string, role: string): Promise<string> {
  // STUB — REPLACE IN PHASE 4
  await new Promise((r) => setTimeout(r, 800));
  const verb = ACTION_VERBS[Math.floor(Math.random() * ACTION_VERBS.length)];
  return `${verb} initiatives that resulted in measurable improvements, including a ${Math.floor(Math.random() * 50 + 15)}% increase in efficiency across ${role}-related operations.`;
}

export async function generateCoverLetter(state: ResumeState): Promise<string> {
  // STUB — REPLACE IN PHASE 4
  await new Promise((r) => setTimeout(r, 1500));
  return `Dear Hiring Manager,\n\nI am writing to express my strong interest in the ${state.personal.professionalTitle || "position"} role. With my background in ${state.experience.map((j) => j.role).join(", ") || "relevant experience"}, I am confident in my ability to contribute to your team.\n\nThroughout my career, I have demonstrated a commitment to excellence and a passion for driving results. I am excited about the opportunity to bring my skills to your organization.\n\nThank you for your consideration.\n\nBest regards,\n${state.personal.fullName || "Your Name"}`;
}

export function scoreATS(resume: ResumeOutput, jd: string): ATSResult {
  // Client-side keyword matching — no API needed
  const keywords = [
    "leadership", "strategy", "analysis", "development", "management",
    "innovation", "team", "results", "communication", "technical",
  ];
  const jdLower = jd.toLowerCase();
  const matched = keywords.filter((k) => jdLower.includes(k));
  const missing = keywords.filter((k) => !jdLower.includes(k));
  const score = Math.round((matched.length / keywords.length) * 100);

  return { score, matchedKeywords: matched, missingKeywords: missing, matchRate: score };
}
