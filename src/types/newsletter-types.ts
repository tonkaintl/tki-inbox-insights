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

export interface ParsedNewsletter {
  // Metadata
  id: string;
  emailId: string; // Reference to original email in MongoDB
  sender: string;
  subject: string;
  date: string;
  parserUsed: string; // "daily-therundown-ai", "morning-brew", etc.

  // Parsed Content - flexible structure
  sections: NewsletterSection[];
  links: ExtractedLink[];

  // Processing info
  parsedAt: Date;
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
