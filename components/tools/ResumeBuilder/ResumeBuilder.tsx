"use client";

import { useState, useCallback } from "react";
import { SplitPanel } from "@/components/shared/SplitPanel";
import { TextInput } from "@/components/shared/TextInput";
import { TextArea } from "@/components/shared/TextArea";
import { Button } from "@/components/shared/Button";
import { UploadZone } from "@/components/shared/UploadZone";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { RevisionBadge } from "@/components/shared/RevisionBadge";
import { DiffViewer } from "@/components/shared/DiffViewer";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import {
  generateResume,
  enhanceBullet,
  generateCoverLetter,
  type ResumeState,
  type ResumeOutput,
  type JobEntry,
  type BulletEntry,
} from "@/lib/services/resumeService";

type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

const STEPS = [
  { id: 0, label: "Upload or Start" },
  { id: 1, label: "Personal Info" },
  { id: 2, label: "Experience" },
  { id: 3, label: "Education" },
  { id: 4, label: "Skills" },
  { id: 5, label: "Job Target" },
];

export function ResumeBuilder() {
  const { usage, incrementUsage } = useUsageLimit("resume");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  // Wizard
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [showUploadGate, setShowUploadGate] = useState(true);
  const [activeView, setActiveView] = useState<"resume" | "cover-letter">("resume");

  // Step 1 - Personal Info
  const [fullName, setFullName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [summary, setSummary] = useState("");

  // Step 2 - Experience
  const [jobs, setJobs] = useState<JobEntry[]>([
    {
      id: "job-1",
      company: "",
      role: "",
      startDate: "",
      endDate: "present",
      location: "",
      isRemote: false,
      bullets: [{ id: "b-1", text: "" }],
    },
  ]);
  const [enhancingBulletId, setEnhancingBulletId] = useState<string | null>(null);

  // Step 3 - Education
  const [education, setEducation] = useState([{ school: "", degree: "", field: "", year: "" }]);
  const [certifications, setCertifications] = useState([{ name: "", issuer: "", year: "" }]);

  // Step 4 - Skills
  const [skillsInput, setSkillsInput] = useState("");
  const [skillsList, setSkillsList] = useState<string[]>([]);

  // Step 5 - Job Target
  const [jobDescription, setJobDescription] = useState("");

  // Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState<ResumeOutput | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [atsScore, setAtsScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Diff
  const [showDiff, setShowDiff] = useState(false);

  const addJob = () => {
    setJobs((prev) => [
      ...prev,
      { id: `job-${Date.now()}`, company: "", role: "", startDate: "", endDate: "present", location: "", isRemote: false, bullets: [{ id: `b-${Date.now()}`, text: "" }] },
    ]);
  };

  const updateJob = (id: string, field: keyof JobEntry, value: string | boolean) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, [field]: value } : j)));
  };

  const addBullet = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, bullets: [...j.bullets, { id: `b-${Date.now()}`, text: "" }] }
          : j,
      ),
    );
  };

  const updateBullet = (jobId: string, bulletId: string, text: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, bullets: j.bullets.map((b) => (b.id === bulletId ? { ...b, text } : b)) }
          : j,
      ),
    );
  };

  const handleEnhanceBullet = async (jobId: string, bullet: BulletEntry) => {
    setEnhancingBulletId(bullet.id);
    try {
      const enhanced = await enhanceBullet(bullet.text, jobs.find((j) => j.id === jobId)?.role || "");
      updateBullet(jobId, bullet.id, enhanced);
    } catch {}
    setEnhancingBulletId(null);
  };

  const removeJob = (id: string) => {
    if (jobs.length > 1) setJobs((prev) => prev.filter((j) => j.id !== id));
  };

  const addSkill = () => {
    const skill = skillsInput.trim();
    if (skill && !skillsList.includes(skill)) {
      setSkillsList((prev) => [...prev, skill]);
      setSkillsInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkillsList((prev) => prev.filter((s) => s !== skill));
  };

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Resume Builder");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const state: ResumeState = {
        personal: {
          fullName,
          professionalTitle,
          email,
          phone,
          location,
          linkedIn,
          portfolio,
          summary,
        },
        experience: jobs,
        education: education.map((e) => ({
          school: e.school,
          degree: e.degree,
          field: e.field,
          year: e.year,
        })),
        certifications: certifications.filter((c) => c.name).map((c) => ({
          name: c.name,
          issuer: c.issuer,
          year: c.year,
          expiry: "",
        })),
        skills: skillsList.map((s) => ({
          name: s,
          category: "technical" as const,
          proficiency: "intermediate" as const,
        })),
        jobDescription,
      };

      const [resumeResult, letterResult] = await Promise.all([
        generateResume(state),
        generateCoverLetter(state),
      ]);

      setOutput(resumeResult);
      setAtsScore(resumeResult.atsScore);
      setCoverLetter(letterResult);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [fullName, professionalTitle, email, phone, location, linkedIn, portfolio, summary, jobs, education, certifications, skillsList, jobDescription, usage.isBlocked, openUpgrade, incrementUsage]);

  const atsColor = atsScore >= 80 ? "#10b981" : atsScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <>
      {/* Step 0 - Upload Gate */}
      {showUploadGate && (
        <div
          style={{
            marginBottom: "24px",
            padding: "24px",
            borderRadius: "12px",
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.08)",
            maxWidth: 600,
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 600, color: "rgba(240,245,255,0.9)" }}>
            How would you like to start?
          </h3>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <UploadZone
              acceptedTypes={[".pdf", ".docx", ".txt"]}
              maxSizeMB={5}
              onFileParsed={(result) => {
                setSummary(result.text.slice(0, 300));
                setShowUploadGate(false);
                setCurrentStep(1);
              }}
              onError={(err) => setError(err)}
              label="Upload your existing resume"
              sublabel="PDF, DOCX, or TXT"
              proRequired={false}
            />
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setShowUploadGate(false);
                setCurrentStep(1);
              }}
            >
              Start Fresh
            </Button>
          </div>
          {error && <p className="ai-tools__err" style={{ marginTop: "12px" }}>{error}</p>}
        </div>
      )}

      <SplitPanel
        left={
          <div>
            {/* Step indicators */}
            {!showUploadGate && (
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  marginBottom: "16px",
                  flexWrap: "wrap",
                }}
              >
                {STEPS.filter((s) => s.id > 0).map((step) => (
                  <button
                    key={step.id}
                    className="ai-tools__btn ai-tools__btn--ghost"
                    style={{
                      padding: "6px 14px",
                      fontSize: "0.78rem",
                      fontWeight: currentStep === step.id ? 600 : 400,
                      background: currentStep === step.id ? "rgba(124,58,237,0.2)" : "transparent",
                      borderColor:
                        currentStep === step.id
                          ? "rgba(124,58,237,0.4)"
                          : step.id < currentStep
                            ? "rgba(16,185,129,0.3)"
                            : "rgba(255,255,255,0.08)",
                      color:
                        step.id < currentStep
                          ? "#10b981"
                          : currentStep === step.id
                            ? "rgba(240,245,255,0.95)"
                            : "rgba(200,210,230,0.5)",
                    }}
                    onClick={() => setCurrentStep(step.id as WizardStep)}
                  >
                    {step.id < currentStep ? "•" : step.id}. {step.label}
                  </button>
                ))}
              </div>
            )}

            <UsageLimitBar used={usage.used} limit={usage.limit} label="Resumes today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            <div className="ai-tools__form" style={{ marginTop: 0 }}>
              {!showUploadGate && currentStep === 1 && (
                <>
                  <TextInput label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" />
                  <TextInput label="Professional title" value={professionalTitle} onChange={(e) => setProfessionalTitle(e.target.value)} placeholder="Senior Software Engineer" />
                  <div className="ai-tools__field-row">
                    <TextInput label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@email.com" />
                    <TextInput label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
                  </div>
                  <TextInput label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" />
                  <div className="ai-tools__field-row">
                    <TextInput label="LinkedIn URL (optional)" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} placeholder="linkedin.com/in/johndoe" />
                    <TextInput label="Portfolio (optional)" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="johndoe.com" />
                  </div>
                  <TextArea label="Professional summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="Experienced professional with..." />
                </>
              )}

              {!showUploadGate && currentStep === 2 && (
                <>
                  {jobs.map((job, i) => (
                    <div
                      key={job.id}
                      style={{
                        padding: "16px",
                        marginBottom: "12px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.15)",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.82rem", color: "rgba(240,245,255,0.8)" }}>
                          Job {i + 1}
                        </span>
                        {jobs.length > 1 && (
                          <button
                            className="ai-tools__btn ai-tools__btn--ghost"
                            style={{ padding: "2px 8px", fontSize: "0.72rem", color: "#ef4444" }}
                            onClick={() => removeJob(job.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="ai-tools__field-row">
                        <TextInput label="Company" value={job.company} onChange={(e) => updateJob(job.id, "company", e.target.value)} placeholder="Acme Corp" />
                        <TextInput label="Role" value={job.role} onChange={(e) => updateJob(job.id, "role", e.target.value)} placeholder="Software Engineer" />
                      </div>
                      <div className="ai-tools__field-row" style={{ gridTemplateColumns: "1fr 1fr 0.5fr" }}>
                        <TextInput label="Start" type="date" value={job.startDate} onChange={(e) => updateJob(job.id, "startDate", e.target.value)} />
                        <TextInput label="End" type="date" value={job.endDate === "present" ? "" : job.endDate} onChange={(e) => updateJob(job.id, "endDate", e.target.value)} placeholder="Present" />
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingTop: "22px" }}>
                          <input type="checkbox" id={`remote-${job.id}`} checked={job.isRemote} onChange={(e) => updateJob(job.id, "isRemote", e.target.checked)} style={{ accentColor: "#7c3aed" }} />
                          <label htmlFor={`remote-${job.id}`} style={{ fontSize: "0.78rem", color: "rgba(200,210,230,0.6)" }}>Remote</label>
                        </div>
                      </div>
                      <TextInput label="Location" value={job.location} onChange={(e) => updateJob(job.id, "location", e.target.value)} placeholder="City, State" />

                      <div style={{ marginTop: "8px" }}>
                        <label className="ai-tools__label">Achievements</label>
                        {job.bullets.map((bullet) => (
                          <div key={bullet.id} style={{ display: "flex", gap: "4px", marginBottom: "4px", alignItems: "center" }}>
                            <input
                              className="ai-tools__input"
                              style={{ flex: 1, minHeight: "34px", padding: "6px 8px", fontSize: "0.82rem" }}
                              value={bullet.text}
                              onChange={(e) => updateBullet(job.id, bullet.id, e.target.value)}
                              placeholder={`Achievement ${job.bullets.indexOf(bullet) + 1}`}
                            />
                            <button
                              className="ai-tools__btn ai-tools__btn--ghost"
                              style={{ padding: "4px 8px", fontSize: "0.7rem", whiteSpace: "nowrap" }}
                              disabled={enhancingBulletId === bullet.id || !bullet.text}
                              onClick={() => handleEnhanceBullet(job.id, bullet)}
                            >
                              {enhancingBulletId === bullet.id ? "..." : "Enhance"}
                            </button>
                          </div>
                        ))}
                        {job.bullets.length < 8 && (
                          <Button variant="ghost" size="sm" onClick={() => addBullet(job.id)}>
                            + Add achievement
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addJob}>
                    + Add another job
                  </Button>
                </>
              )}

              {!showUploadGate && currentStep === 3 && (
                <>
                  <label className="ai-tools__label" style={{ marginBottom: "8px" }}>Education</label>
                  {education.map((edu, i) => (
                    <div key={i} className="ai-tools__field-row" style={{ marginBottom: "8px", gridTemplateColumns: "1fr 1fr 1fr 0.5fr" }}>
                      <TextInput value={edu.school} onChange={(e) => { const u = [...education]; u[i].school = e.target.value; setEducation(u); }} placeholder="School" />
                      <TextInput value={edu.degree} onChange={(e) => { const u = [...education]; u[i].degree = e.target.value; setEducation(u); }} placeholder="Degree" />
                      <TextInput value={edu.field} onChange={(e) => { const u = [...education]; u[i].field = e.target.value; setEducation(u); }} placeholder="Field" />
                      <TextInput value={edu.year} onChange={(e) => { const u = [...education]; u[i].year = e.target.value; setEducation(u); }} placeholder="Year" />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setEducation((prev) => [...prev, { school: "", degree: "", field: "", year: "" }])}>
                    + Add education
                  </Button>

                  <div style={{ height: 16 }} />
                  <label className="ai-tools__label" style={{ marginBottom: "8px" }}>Certifications</label>
                  {certifications.map((cert, i) => (
                    <div key={i} className="ai-tools__field-row" style={{ marginBottom: "8px" }}>
                      <TextInput value={cert.name} onChange={(e) => { const u = [...certifications]; u[i].name = e.target.value; setCertifications(u); }} placeholder="Cert name" />
                      <TextInput value={cert.issuer} onChange={(e) => { const u = [...certifications]; u[i].issuer = e.target.value; setCertifications(u); }} placeholder="Issuer" />
                      <TextInput value={cert.year} onChange={(e) => { const u = [...certifications]; u[i].year = e.target.value; setCertifications(u); }} placeholder="Year" />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setCertifications((prev) => [...prev, { name: "", issuer: "", year: "" }])}>
                    + Add certification
                  </Button>
                </>
              )}

              {!showUploadGate && currentStep === 4 && (
                <>
                  <div className="ai-tools__field">
                    <label className="ai-tools__label">Skills</label>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                      <input
                        className="ai-tools__input"
                        style={{ flex: 1, minHeight: "38px", padding: "8px 10px" }}
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                        placeholder="Type a skill and press Enter"
                      />
                      <Button variant="ghost" size="sm" onClick={addSkill}>
                        Add
                      </Button>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {skillsList.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            background: "rgba(124,58,237,0.15)",
                            color: "#a78bfa",
                            border: "1px solid rgba(124,58,237,0.25)",
                          }}
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            style={{ background: "none", border: "none", color: "#a78bfa", cursor: "pointer", padding: 0, fontSize: "0.82rem", opacity: 0.6 }}
                          >
                            X
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!showUploadGate && currentStep === 5 && (
                <>
                  <TextArea
                    label="Paste target job description"
                    placeholder="Paste the full job description here for ATS matching and keyword optimization..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={8}
                    showCount
                    hint="The more detail, the better the match"
                  />
                  <div className="ai-tools__actions" style={{ marginTop: "12px" }}>
                    <Button
                      variant="primary"
                      size="lg"
                      isLoading={isGenerating}
                      disabled={!fullName || isGenerating}
                      onClick={handleGenerate}
                    >
                      {isGenerating ? "Building your resume..." : "Generate Resume"}
                    </Button>
                    {error && <p className="ai-tools__err">{error}</p>}
                  </div>
                </>
              )}

              {/* Step navigation */}
              {!showUploadGate && currentStep < 5 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1) as WizardStep)}
                  >
                    Next Step →
                  </Button>
                </div>
              )}
            </div>
          </div>
        }
        right={
          <div className="ai-tools__out">
            {isGenerating ? (
              <OutputSkeleton />
            ) : output ? (
              <>
                <div className="ai-tools__out-header">
                  <h3 className="ai-tools__out-title">
                    {activeView === "resume" ? "Resume Preview" : "Cover Letter"}
                  </h3>
                  <RevisionBadge
                    variant="optimized"
                    target={professionalTitle || "target role"}
                    showDiff={showDiff}
                    onToggleDiff={() => setShowDiff(!showDiff)}
                  />
                </div>

                {/* ATS Score Gauge */}
                {activeView === "resume" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                      marginBottom: "16px",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {/* Circular gauge */}
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          fill="none"
                          stroke={atsColor}
                          strokeWidth="4"
                          strokeDasharray={`${(atsScore / 100) * 176} 176`}
                          strokeLinecap="round"
                          transform="rotate(-90 32 32)"
                          style={{ transition: "stroke-dasharray 1s ease" }}
                        />
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          fontSize: "1.2rem",
                          fontWeight: 700,
                          color: atsColor,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {atsScore}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(200,210,230,0.5)", marginBottom: "2px" }}>
                        ATS Score
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "rgba(240,245,255,0.8)" }}>
                        {atsScore >= 80
                          ? "Excellent match! Your resume is well-optimized."
                          : atsScore >= 50
                            ? "Good match. Consider adding more keywords from the job description."
                            : "Low match. Add relevant keywords and experience."}
                      </div>
                    </div>
                  </div>
                )}

                {/* View toggle */}
                <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
                  <Button
                    variant={activeView === "resume" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveView("resume")}
                  >
                    Resume
                  </Button>
                  <Button
                    variant={activeView === "cover-letter" ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveView("cover-letter")}
                  >
                    Cover Letter
                  </Button>
                </div>

                {showDiff && (
                  <DiffViewer
                    original={`[Your original summary]\n${summary || "N/A"}`}
                    revised={`[Optimized summary]\n${summary || "N/A"}`}
                    isOpen={showDiff}
                    onClose={() => setShowDiff(false)}
                  />
                )}

                {activeView === "resume" && (
                  <div
                    style={{
                      background: "#f6f7fb",
                      color: "#111822",
                      padding: "24px",
                      borderRadius: "4px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                      fontSize: "0.85rem",
                      lineHeight: 1.6,
                    }}
                  >
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "4px", color: "#0a1628" }}>
                      {fullName || "Your Name"}
                    </div>
                    <div style={{ color: "#5a6578", marginBottom: "12px", fontSize: "0.9rem" }}>
                      {professionalTitle || "Professional Title"}
                    </div>
                    <div style={{ color: "#5a6578", fontSize: "0.78rem", marginBottom: "16px" }}>
                      {email} {phone && `| ${phone}`} {location && `| ${location}`}
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#1b2b4a", fontWeight: 700, borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "4px", marginBottom: "8px" }}>
                        Professional Summary
                      </div>
                      <div style={{ color: "#1c2433", fontSize: "0.82rem" }}>
                        {summary || "Experienced professional with a track record of delivering results."}
                      </div>
                    </div>

                    {jobs.some((j) => j.company) && (
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#1b2b4a", fontWeight: 700, borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "4px", marginBottom: "8px" }}>
                          Experience
                        </div>
                        {jobs.filter((j) => j.company).map((job) => (
                          <div key={job.id} style={{ marginBottom: "12px" }}>
                            <div style={{ fontWeight: 600 }}>{job.role} at {job.company}</div>
                            <div style={{ fontSize: "0.78rem", color: "#5a6578" }}>
                              {job.startDate} – {job.endDate === "present" ? "Present" : job.endDate}
                              {job.location ? ` | ${job.location}` : ""}
                            </div>
                            <ul style={{ margin: "4px 0 0", paddingLeft: "16px", fontSize: "0.82rem" }}>
                              {job.bullets.filter((b) => b.text).map((b) => (
                                <li key={b.id} style={{ marginBottom: "2px" }}>{b.text}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}

                    {skillsList.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "#1b2b4a", fontWeight: 700, borderBottom: "1px solid rgba(0,0,0,0.1)", paddingBottom: "4px", marginBottom: "8px" }}>
                          Skills
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {skillsList.map((skill) => (
                            <span
                              key={skill}
                              style={{
                                padding: "2px 10px",
                                borderRadius: "4px",
                                fontSize: "0.78rem",
                                background: "rgba(124,58,237,0.1)",
                                color: "#1e293b",
                                border: "1px solid rgba(0,0,0,0.1)",
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeView === "cover-letter" && coverLetter && (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.7,
                      fontSize: "0.9rem",
                      color: "rgba(240,245,255,0.94)",
                      padding: "16px",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    {coverLetter}
                  </div>
                )}

                <div style={{ height: 12 }} />
                <OutputActions
                  onCopy={() =>
                    activeView === "resume"
                      ? `${fullName || "Your Name"}\n${professionalTitle || ""}\n\n${summary || ""}`
                      : coverLetter || ""
                  }
                  showExport={false}
                />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your resume will appear here"
                description="Fill in your details step by step, add a job description for ATS matching, and generate your optimized resume."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
