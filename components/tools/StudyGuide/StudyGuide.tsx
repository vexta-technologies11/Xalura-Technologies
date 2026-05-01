"use client";

import { useState, useCallback } from "react";
import { SplitPanel } from "@/components/shared/SplitPanel";
import { TextArea } from "@/components/shared/TextArea";
import { SelectInput } from "@/components/shared/SelectInput";
import { Button } from "@/components/shared/Button";
import { OutputSkeleton } from "@/components/shared/LoadingSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { OutputActions } from "@/components/shared/OutputActions";
import { UsageLimitBar } from "@/components/shared/UsageLimitBar";
import { UpgradeModal } from "@/components/shared/UpgradeModal";
import { useUsageLimit } from "@/lib/hooks/useUsageLimit";
import { useUpgradeModal } from "@/lib/hooks/useUpgradeModal";
import {
  generateStudyGuide,
  generateFlashcards,
  generateQuiz,
  type StudyGuideOutput,
  type Flashcard,
  type QuizQuestion,
} from "@/lib/services/studyService";

type TabType = "guide" | "flashcards" | "quiz";

export function StudyGuide() {
  const { usage, incrementUsage } = useUsageLimit("study");
  const { isOpen: upgradeOpen, triggerSource, openUpgrade, closeUpgrade } = useUpgradeModal();

  const [inputText, setInputText] = useState("");
  const [sourceType, setSourceType] = useState<"lecture-notes" | "textbook" | "article" | "meeting-notes">("lecture-notes");
  const [complexity, setComplexity] = useState<"high-school" | "college" | "graduate" | "expert">("college");

  const [activeTab, setActiveTab] = useState<TabType>("guide");
  const [isGenerating, setIsGenerating] = useState(false);

  const [guide, setGuide] = useState<StudyGuideOutput | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeFlashcardIndex, setActiveFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (usage.isBlocked) {
      openUpgrade("Study Guide");
      return;
    }
    if (!inputText.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const [guideResult, flashcardResults, quizResults] = await Promise.all([
        generateStudyGuide({ text: inputText, sourceType, complexity }),
        generateFlashcards(inputText, 5),
        generateQuiz(inputText, 5),
      ]);
      setGuide(guideResult);
      setFlashcards(flashcardResults);
      setQuiz(quizResults);
      setActiveTab("guide");
      setActiveFlashcardIndex(0);
      setIsFlipped(false);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setScore(0);
      setQuizFinished(false);
      incrementUsage();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, sourceType, complexity, usage.isBlocked, openUpgrade, incrementUsage]);

  const handleNextFlashcard = () => {
    if (activeFlashcardIndex < flashcards.length - 1) {
      setActiveFlashcardIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevFlashcard = () => {
    if (activeFlashcardIndex > 0) {
      setActiveFlashcardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleMarkKnown = (id: string) => {
    setFlashcards((prev) =>
      prev.map((fc) => (fc.id === id ? { ...fc, known: true } : fc)),
    );
    handleNextFlashcard();
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    if (answer === quiz[currentQuestion].correctAnswer) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quiz.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <>
      <SplitPanel
        left={
          <div className="ai-tools__form">
            <UsageLimitBar used={usage.used} limit={usage.limit} label="Study sessions today" cooldownMs={usage.cooldownMs} cooldownLabel={usage.cooldownLabel} />

            <TextArea
              label="Paste your study material"
              placeholder="Paste lecture notes, textbook chapter, article, or meeting notes..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={8}
              showCount
            />

            <div className="ai-tools__field-row ai-tools__field-row--3">
              <SelectInput
                label="Source type"
                options={[
                  { value: "lecture-notes", label: "Lecture Notes" },
                  { value: "textbook", label: "Textbook" },
                  { value: "article", label: "Article" },
                  { value: "meeting-notes", label: "Meeting Notes" },
                ]}
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as "lecture-notes" | "textbook" | "article" | "meeting-notes")}
              />
              <SelectInput
                label="Complexity"
                options={[
                  { value: "high-school", label: "High School" },
                  { value: "college", label: "College" },
                  { value: "graduate", label: "Graduate" },
                  { value: "expert", label: "Expert" },
                ]}
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as "high-school" | "college" | "graduate" | "expert")}
              />
            </div>

            <div className="ai-tools__actions">
              <Button
                variant="primary"
                size="lg"
                isLoading={isGenerating}
                disabled={!inputText.trim() || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? "Generating..." : "Generate Study Material"}
              </Button>
              {error && <p className="ai-tools__err">{error}</p>}
            </div>
          </div>
        }
        right={
          <div className="ai-tools__out">
            {isGenerating ? (
              <OutputSkeleton />
            ) : guide ? (
              <>
                {/* Tabs */}
                <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px", marginBottom: "16px" }}>
                  {([
                    { id: "guide" as const, label: "Study Guide" },
                    { id: "flashcards" as const, label: "Flashcards" },
                    { id: "quiz" as const, label: "Quiz" },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      className="ai-tools__btn ai-tools__btn--ghost"
                      style={{
                        padding: "8px 16px",
                        fontSize: "0.85rem",
                        fontWeight: activeTab === tab.id ? 600 : 400,
                        borderBottom: activeTab === tab.id ? "2px solid #7c3aed" : "2px solid transparent",
                        borderRadius: 0,
                        background: "transparent",
                      }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "guide" && (
                  <>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 8px", color: "rgba(240,245,255,0.9)" }}>
                      Overview
                    </h3>
                    <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "rgba(200,210,230,0.8)", margin: "0 0 16px" }}>
                      {guide.overview}
                    </p>

                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "0 0 8px", color: "rgba(240,245,255,0.9)" }}>
                      Key Concepts
                    </h3>
                    {guide.concepts.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          borderRadius: "8px",
                          background: "rgba(0,0,0,0.15)",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "rgba(240,245,255,0.9)", marginBottom: "4px" }}>
                          {c.heading}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>
                          {c.explanation}
                        </div>
                      </div>
                    ))}

                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "16px 0 8px", color: "rgba(240,245,255,0.9)" }}>
                      Key Terms
                    </h3>
                    {guide.keyTerms.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: "8px",
                          padding: "8px 12px",
                          marginBottom: "4px",
                          borderRadius: "6px",
                          background: "rgba(0,0,0,0.1)",
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "#e8a838", minWidth: 120 }}>
                          {t.term}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "rgba(200,210,230,0.7)" }}>
                          {t.definition}
                        </span>
                      </div>
                    ))}

                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, margin: "16px 0 8px", color: "rgba(240,245,255,0.9)" }}>
                      Study Tips
                    </h3>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {guide.studyTips.map((tip, i) => (
                        <li
                          key={i}
                          style={{
                            padding: "6px 12px",
                            marginBottom: "4px",
                            fontSize: "0.85rem",
                            color: "rgba(200,210,230,0.7)",
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <span style={{ color: "#e8a838" }}>•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {activeTab === "flashcards" && flashcards.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {/* Flashcard */}
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      style={{
                        width: "100%",
                        maxWidth: 340,
                        minHeight: 220,
                        perspective: 1000,
                        cursor: "pointer",
                        marginBottom: "16px",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          minHeight: 220,
                          transformStyle: "preserve-3d",
                          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)",
                          transition: "transform 0.5s ease",
                        }}
                      >
                        {/* Front */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backfaceVisibility: "hidden",
                            padding: "32px 24px",
                            borderRadius: "16px",
                            background: "linear-gradient(135deg, #0d5550, #1a7a6a)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            minHeight: 220,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}>
                            Tap to reveal
                          </div>
                          <div style={{ fontSize: "1rem", fontWeight: 600, color: "rgba(255,255,255,0.95)", lineHeight: 1.5 }}>
                            {flashcards[activeFlashcardIndex].front}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: "16px" }}>
                            {activeFlashcardIndex + 1} / {flashcards.length}
                          </div>
                        </div>

                        {/* Back */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                            padding: "32px 24px",
                            borderRadius: "16px",
                            background: "linear-gradient(135deg, #1a3a5c, #0d5550)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            minHeight: 220,
                          }}
                        >
                          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}>
                            Answer
                          </div>
                          <div style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>
                            {flashcards[activeFlashcardIndex].back}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display: "flex", gap: "8px", width: "100%", maxWidth: 340 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={activeFlashcardIndex === 0}
                        onClick={handlePrevFlashcard}
                      >
                        ← Prev
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleMarkKnown(flashcards[activeFlashcardIndex].id)}
                        style={{ flex: 1 }}
                      >
                        Got it
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={activeFlashcardIndex >= flashcards.length - 1}
                        onClick={handleNextFlashcard}
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "quiz" && quiz.length > 0 && (
                  <>
                    {quizFinished ? (
                      <div style={{ textAlign: "center", padding: "24px" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>◈</div>
                        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "rgba(240,245,255,0.9)", margin: "0 0 8px" }}>
                          Quiz Complete!
                        </h3>
                        <div style={{ fontSize: "2rem", fontWeight: 700, color: "#10b981", marginBottom: "4px" }}>
                          {score} / {quiz.length}
                        </div>
                        <div style={{ fontSize: "0.88rem", color: "rgba(200,210,230,0.6)", marginBottom: "16px" }}>
                          {Math.round((score / quiz.length) * 100)}% correct
                        </div>
                        <Button
                          variant="primary"
                          onClick={() => {
                            setCurrentQuestion(0);
                            setSelectedAnswer(null);
                            setScore(0);
                            setQuizFinished(false);
                          }}
                        >
                          Retake Quiz
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.78rem",
                            color: "rgba(200,210,230,0.5)",
                            marginBottom: "8px",
                          }}
                        >
                          <span>
                            Question {currentQuestion + 1} of {quiz.length}
                          </span>
                          <span>Score: {score}</span>
                        </div>

                        <div
                          style={{
                            width: "100%",
                            height: "3px",
                            borderRadius: "2px",
                            background: "rgba(255,255,255,0.06)",
                            marginBottom: "16px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${((currentQuestion + 1) / quiz.length) * 100}%`,
                              height: "100%",
                              borderRadius: "2px",
                              background: "#7c3aed",
                              transition: "width 0.3s ease",
                            }}
                          />
                        </div>

                        <div
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            marginBottom: "16px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.7rem",
                              textTransform: "uppercase",
                              color: "rgba(200,210,230,0.4)",
                              marginBottom: "8px",
                            }}
                          >
                            {quiz[currentQuestion].type === "true-false"
                              ? "True / False"
                              : quiz[currentQuestion].type === "fill-blank"
                                ? "Fill in the blank"
                                : "Multiple Choice"}
                          </div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "rgba(240,245,255,0.95)", lineHeight: 1.5 }}>
                            {quiz[currentQuestion].question}
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                          {quiz[currentQuestion].options.map((option) => {
                            const isCorrect = option === quiz[currentQuestion].correctAnswer;
                            const isSelected = option === selectedAnswer;
                            const showResult = selectedAnswer !== null;

                            let bg = "rgba(0,0,0,0.15)";
                            let border = "rgba(255,255,255,0.05)";
                            if (showResult && isCorrect) {
                              bg = "rgba(16,185,129,0.15)";
                              border = "rgba(16,185,129,0.3)";
                            } else if (showResult && isSelected && !isCorrect) {
                              bg = "rgba(239,68,68,0.15)";
                              border = "rgba(239,68,68,0.3)";
                            } else if (isSelected) {
                              bg = "rgba(124,58,237,0.15)";
                              border = "rgba(124,58,237,0.3)";
                            }

                            return (
                              <button
                                key={option}
                                className="ai-tools__btn"
                                style={{
                                  padding: "12px 16px",
                                  fontSize: "0.88rem",
                                  textAlign: "left",
                                  justifyContent: "flex-start",
                                  background: bg,
                                  borderColor: border,
                                  cursor: showResult ? "default" : "pointer",
                                }}
                                disabled={showResult}
                                onClick={() => !showResult && handleAnswer(option)}
                              >
                                <span style={{ marginRight: "8px" }}>
                                  {showResult && isCorrect
                                    ? "•"
                                    : showResult && isSelected && !isCorrect
                                      ? "X"
                                      : "O"}
                                </span>
                                {option}
                              </button>
                            );
                          })}
                        </div>

                        {selectedAnswer && (
                          <div
                            style={{
                              padding: "12px",
                              borderRadius: "8px",
                              background: "rgba(0,0,0,0.15)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              marginBottom: "12px",
                              fontSize: "0.82rem",
                              color: "rgba(200,210,230,0.7)",
                              lineHeight: 1.5,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "rgba(240,245,255,0.9)" }}>Explanation: </span>
                            {quiz[currentQuestion].explanation}
                          </div>
                        )}

                        {selectedAnswer && (
                          <Button variant="primary" onClick={handleNextQuestion}>
                            {currentQuestion < quiz.length - 1 ? "Next Question →" : "See Results"}
                          </Button>
                        )}
                      </>
                    )}
                  </>
                )}

                <div style={{ height: 12 }} />
                <OutputActions
                  onCopy={() => {
                    const text = guide
                      ? `Study Guide\n\nOverview: ${guide.overview}\n\nKey Terms: ${guide.keyTerms.map((t) => `${t.term}: ${t.definition}`).join("\n")}`
                      : "";
                    return text;
                  }}
                  showExport={false}
                />
              </>
            ) : (
              <EmptyState
                icon="◈"
                title="Your study material will appear here"
                description="Paste your notes or text, choose your level, and generate study guides, flashcards, and quizzes."
              />
            )}
          </div>
        }
      />

      <UpgradeModal isOpen={upgradeOpen} onClose={closeUpgrade} triggerSource={triggerSource} />
    </>
  );
}
