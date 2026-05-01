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

export async function generateResume(state: ResumeState): Promise<ResumeOutput> {
  const res = await fetch("/api/tools/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: state }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  return JSON.parse(json.text);
}

export async function enhanceBullet(bullet: string, role: string): Promise<string> {
  const res = await fetch("/api/tools/enhance-bullet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { bullet, role } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Enhancement failed");
  const parsed = JSON.parse(json.text);
  return parsed.enhanced || parsed.text;
}

export async function generateCoverLetter(state: ResumeState): Promise<string> {
  const res = await fetch("/api/tools/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: state }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Generation failed");
  const parsed = JSON.parse(json.text);
  return parsed.text;
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

