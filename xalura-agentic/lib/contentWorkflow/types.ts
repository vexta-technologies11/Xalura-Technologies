/** Xalura Content Workflow — topic bank + rotation (PDF spec). */

export type ContentType = "article" | "course";

export type TopicBankEntry = {
  id: string;
  rank: number;
  keyword: string;
  subcategory: string;
  content_type: ContentType;
  final_score: number;
  supporting_keywords: string[];
  source_urls: string[];
  status: "unused" | "used" | "skipped";
  used_at: string | null;
};

export type TopicBankFile = {
  last_crawled_at: string | null;
  crawl_count: number;
  used_count: number;
  depleted: boolean;
  topics: TopicBankEntry[];
};

export type CooldownEntry = {
  topic: string;
  published_at: string;
  cooldown_days: number;
};

export type TopicRotationFile = {
  last_5_subcategories: string[];
  cooldown_topics: CooldownEntry[];
};

export type PublishedTopicEntry = {
  slug?: string;
  keyword: string;
  published_at: string;
  content_type?: ContentType;
  subcategory?: string;
};

export type PublishedTopicsFile = {
  topics: PublishedTopicEntry[];
};

export type DailyProductionFile = {
  date: string;
  articles: {
    target: number;
    completed: number;
    in_progress: number;
    published: string[];
    failed: string[];
  };
  course: {
    target: number;
    status: "pending" | "building" | "review" | "published" | "failed";
    modules_complete: number;
    modules_total: number;
    topic: string;
    published_at: string | null;
  };
};

export type TopicBankAuditFile = {
  audited_at: string;
  bank_crawl_count: number;
  topics_used: number;
  audit: TopicBankAuditGeminiShape | null;
};

export type TopicBankAuditGeminiShape = {
  top_performing_subcategories: string[];
  underperforming_subcategories: string[];
  patterns: string;
  next_crawl_recommendation: string;
};
