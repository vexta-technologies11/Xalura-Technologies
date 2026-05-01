export type SourceType = "lecture-notes" | "textbook" | "article" | "meeting-notes";
export type ComplexityLevel = "high-school" | "college" | "graduate" | "expert";

export interface StudyGuideOutput {
  overview: string;
  concepts: { heading: string; explanation: string }[];
  keyTerms: { term: string; definition: string }[];
  studyTips: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  known: boolean;
}

export interface QuizQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "fill-blank";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface StudyParams {
  text: string;
  sourceType: SourceType;
  complexity: ComplexityLevel;
}

export async function generateStudyGuide(params: StudyParams): Promise<StudyGuideOutput> {
  // STUB — REPLACE IN PHASE 4 with: POST /api/tools/study-generator
  await new Promise((r) => setTimeout(r, 1500));

  return {
    overview: `This study guide covers the key concepts from your ${params.sourceType.replace("-", " ")}. The material focuses on fundamental principles that build upon each other, starting with core definitions and progressing to more complex applications. Understanding these concepts will provide a solid foundation for further study and practical application.`,
    concepts: [
      {
        heading: "Core Principles",
        explanation: "The fundamental ideas that form the basis of this subject. These principles guide all subsequent learning and application.",
      },
      {
        heading: "Key Theories",
        explanation: "Major theoretical frameworks that explain how and why things work the way they do in this field.",
      },
      {
        heading: "Practical Applications",
        explanation: "Real-world scenarios where these concepts are applied. Understanding applications helps solidify theoretical knowledge.",
      },
      {
        heading: "Critical Analysis",
        explanation: "Evaluating the strengths and limitations of different approaches within this subject area.",
      },
    ],
    keyTerms: [
      { term: "Fundamental Concept", definition: "The basic building block that supports more advanced understanding" },
      { term: "Theoretical Framework", definition: "A structured set of ideas that explain observations and guide research" },
      { term: "Empirical Evidence", definition: "Information acquired through observation and experimentation" },
      { term: "Critical Thinking", definition: "The objective analysis of facts to form a judgment" },
      { term: "Synthesis", definition: "Combining different ideas to form a coherent whole" },
    ],
    studyTips: [
      "Review this guide in 25-minute focused sessions with 5-minute breaks",
      "Test yourself on key terms before moving to complex concepts",
      "Create mind maps connecting related concepts together",
      "Explain each concept out loud as if teaching someone else",
      "Practice with the flashcards until you can answer without hesitation",
    ],
  };
}

export async function generateFlashcards(text: string, count: number): Promise<Flashcard[]> {
  // STUB — REPLACE IN PHASE 4
  await new Promise((r) => setTimeout(r, 1200));

  const Qs = [
    { front: "What is the main concept?", back: "The central idea that everything else builds upon" },
    { front: "Why is this important?", back: "It provides the foundation for understanding more complex topics" },
    { front: "How does this apply?", back: "Real-world applications include problem-solving and decision-making" },
    { front: "What are the key components?", back: "The essential elements that make up the whole system" },
    { front: "What is the relationship between X and Y?", back: "They are interconnected and influence each other in meaningful ways" },
  ];

  return Array.from({ length: Math.min(count, Qs.length) }, (_, i) => ({
    id: `fc-${i}`,
    front: Qs[i].front,
    back: Qs[i].back,
    known: false,
  }));
}

export async function generateQuiz(text: string, questionCount: number): Promise<QuizQuestion[]> {
  // STUB — REPLACE IN PHASE 4
  await new Promise((r) => setTimeout(r, 1500));

  const questions: QuizQuestion[] = [
    {
      id: "q-1",
      type: "multiple-choice",
      question: "What is the most important first step in understanding this topic?",
      options: ["Memorize all terms", "Understand core principles", "Skip to advanced topics", "Ignore the basics"],
      correctAnswer: "Understand core principles",
      explanation: "Building on a solid foundation of core principles enables deeper understanding.",
    },
    {
      id: "q-2",
      type: "true-false",
      question: "Critical thinking involves accepting information without question.",
      options: ["True", "False"],
      correctAnswer: "False",
      explanation: "Critical thinking requires objective analysis and evaluation of information.",
    },
    {
      id: "q-3",
      type: "multiple-choice",
      question: "Which approach is most effective for long-term retention?",
      options: ["Cramming", "Spaced repetition", "Passive reading", "Highlighting"],
      correctAnswer: "Spaced repetition",
      explanation: "Spaced repetition leverages the spacing effect for optimal memory retention.",
    },
    {
      id: "q-4",
      type: "fill-blank",
      question: "The process of combining different ideas to form a coherent whole is called ________.",
      options: ["Analysis", "Synthesis", "Evaluation", "Application"],
      correctAnswer: "Synthesis",
      explanation: "Synthesis is the combination of ideas to form a connected and coherent whole.",
    },
    {
      id: "q-5",
      type: "multiple-choice",
      question: "What does 'empirical evidence' refer to?",
      options: [
        "Information from textbooks",
        "Evidence from observation and experimentation",
        "Personal opinions",
        "Theoretical assumptions",
      ],
      correctAnswer: "Evidence from observation and experimentation",
      explanation: "Empirical evidence is acquired through direct observation or experimentation.",
    },
  ];

  return questions.slice(0, Math.min(questionCount, questions.length));
}
