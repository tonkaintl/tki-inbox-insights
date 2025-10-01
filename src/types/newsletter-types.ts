// Universal schema for all parsed newsletters

// Link categories as external const enum
export const LinkCategory = {
  TUTORIAL: "tutorial",
  VENDOR: "vendor",
  NEWS: "news",
  COMMUNITY: "community",
  SPONSOR: "sponsor",
  PRODUCT: "product",
  TOOL: "tool",
  OTHER: "other",
} as const;

export type LinkCategoryType = (typeof LinkCategory)[keyof typeof LinkCategory];

// Parser types for different newsletter sources
export const ParserType = {
  DAILY_THERUNDOWN_AI: "daily-therundown-ai",
  MORNING_BREW: "morning-brew",
  TECHCRUNCH: "techcrunch",
  AI_BREAKFAST: "ai-breakfast",
  THE_BATCH: "the-batch",
} as const;

export type ParserTypeEnum = (typeof ParserType)[keyof typeof ParserType];

// Email address to parser mapping
export const PARSER_EMAIL_MAP: Record<string, ParserTypeEnum> = {
  "news@daily.therundown.ai": ParserType.DAILY_THERUNDOWN_AI,
  "crew@morningbrew.com": ParserType.MORNING_BREW,
  "newsletters@techcrunch.com": ParserType.TECHCRUNCH,
  "info@aibreakfast.beehiiv.com": ParserType.AI_BREAKFAST,
  "thebatch@deeplearning.ai": ParserType.THE_BATCH,
};

export interface ParsedNewsletter {
  // Metadata
  id: string;
  email_id: string; // Reference to original email in MongoDB
  sender: string;
  subject: string; // Clean subject (no emojis)
  date: string;
  parser_used: ParserTypeEnum; // Parser enum type

  // Parsed Content - focus on links (sections optional/minimal)
  sections?: NewsletterSection[]; // Optional, only if meaningful content
  links: ExtractedLink[];

  // Processing info
  parsed_at: Date;
  version: string; // Parser version for future updates
}

export interface NewsletterSection {
  // Flexible section type - each parser defines its own types
  type: string; // "header", "ai-developments", "quick-hits", etc.
  title?: string;
  content: string; // Clean text content (emojis stripped)
  items?: NewsletterItem[]; // For structured lists
  order: number;
  objectId?: string; // Groups related sections (title + body + links)
  // Allow parsers to add custom properties
  [key: string]: unknown;
}

export interface NewsletterItem {
  title: string;
  content: string;
  links: string[];
  // Allow parsers to add custom properties
  [key: string]: unknown;
}

export interface ExtractedLink {
  url: string;
  text: string; // Clean text (emojis stripped)
  section: string;
  category: LinkCategoryType;
  objectId?: string; // Groups with related sections
}

// Base parser interface that all newsletter parsers must implement
export interface NewsletterParser {
  name: string; // "daily-therundown-ai", "morning-brew", etc.
  version: string;

  canParse(fromAddress: string): boolean;
  parse(html: string, emailMetadata: EmailMetadata): ParsedNewsletter;
}

export interface EmailMetadata {
  id: string;
  sender: string;
  subject: string;
  date: string;
}

// Utility functions
export function getParserByEmail(emailAddress: string): ParserTypeEnum | null {
  const normalizedEmail = emailAddress.toLowerCase().trim();
  return PARSER_EMAIL_MAP[normalizedEmail] || null;
}

export function cleanSubject(subject: string): string {
  // Remove emojis and clean whitespace
  return subject
    .replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}
