import {
  EmailMetadata,
  ExtractedLink,
  LinkCategory,
  LinkCategoryType,
  NewsletterParser,
  ParsedNewsletter,
  ParserType,
} from "@/types/newsletter-types";
import * as cheerio from "cheerio";
import { stripEmojis } from "../utils/email-utils";

export class DailyTheRundownAiParser implements NewsletterParser {
  name = ParserType.DAILY_THERUNDOWN_AI;
  version = "1.0.0";

  // Utility function to clean emojis and normalize text
  private cleanText(text: string): string {
    return stripEmojis(text);
  }

  public shouldSkipLink(url: string, text: string): boolean {
    const urlLower = url.toLowerCase();
    const textLower = text.toLowerCase();

    // Skip rating/feedback links (hardcoded patterns)
    const ratingPatterns = [
      /⭐+.*nailed it/i,
      /⭐+.*average/i,
      /⭐+.*fail/i,
      /nailed.it/i,
      /average/i,
      /fail/i,
    ];

    if (ratingPatterns.some((pattern) => pattern.test(textLower))) {
      return true;
    }

    // Skip social sharing and admin links
    const adminPatterns = [
      "click to share",
      "get in touch",
      "check out ours here",
      "unsubscribe",
      "manage preferences",
      "read online",
      "view in browser",
      "forward this email",
      "share this newsletter",
      "refer a friend",
    ];

    if (adminPatterns.some((pattern) => textLower.includes(pattern))) {
      return true;
    }

    // Skip beehiiv admin/tracking links that are clearly not content
    if (urlLower.includes("link.mail.beehiiv.com")) {
      const beehiivAdminPatterns = [
        "what-you-need",
        "nailed-it",
        "average",
        "fail",
        "get-in-touch",
        "check-out-ours-here",
        "share",
        "unsubscribe",
        "preferences",
      ];

      if (beehiivAdminPatterns.some((pattern) => urlLower.includes(pattern))) {
        return true;
      }
    }

    // Skip very short or generic standalone text that's likely UI elements
    if (
      textLower.length < 2 ||
      textLower === "here" ||
      textLower === "link" ||
      textLower === "click" ||
      /^[⭐️]+$/.test(text) // Use original text, handle star emoji variants
    ) {
      return true;
    }

    // Skip standalone generic words (but allow them in longer phrases)
    const standaloneGenericWords = ["read", "view", "more"];
    if (textLower.length <= 4 && standaloneGenericWords.includes(textLower)) {
      return true;
    }

    // Skip links that are just whitespace, special characters, or meaningless symbols
    const cleanedForCheck = this.cleanText(text);
    if (!cleanedForCheck || cleanedForCheck.trim().length === 0) {
      return true;
    }

    // Skip links with just numbers or single characters
    if (/^\d+$/.test(textLower) || textLower.length === 1) {
      return true;
    }

    return false;
  }

  canParse(fromAddress: string): boolean {
    return (
      fromAddress.includes("news@daily.therundown.ai") ||
      fromAddress.includes("daily.therundown.ai")
    );
  }

  parse(html: string, emailMetadata: EmailMetadata): ParsedNewsletter {
    const $ = cheerio.load(html);
    const links: ExtractedLink[] = [];

    // Extract links with section-based categorization
    this.extractLinksWithSections($, links);

    return {
      id: `parsed-${emailMetadata.id}-${Date.now()}`,
      email_id: emailMetadata.id,
      sender: emailMetadata.sender,
      subject: emailMetadata.subject,
      date: emailMetadata.date,
      parser_used: this.name,
      links,
      parsed_at: new Date(),
      version: this.version,
    };
  }

  private categorizeLink(url: string, text: string): LinkCategoryType {
    const urlLower = url.toLowerCase();
    const textLower = text.toLowerCase();

    // Tutorial detection
    if (
      textLower.includes("tutorial") ||
      textLower.includes("guide") ||
      textLower.includes("how to")
    ) {
      return LinkCategory.TUTORIAL;
    }

    // Vendor/product detection
    if (
      urlLower.includes("amazon") ||
      urlLower.includes("shop") ||
      urlLower.includes("buy") ||
      textLower.includes("sponsor") ||
      textLower.includes("partner")
    ) {
      return LinkCategory.VENDOR;
    }

    // Community detection
    if (
      urlLower.includes("discord") ||
      urlLower.includes("reddit") ||
      urlLower.includes("twitter") ||
      urlLower.includes("linkedin") ||
      textLower.includes("community") ||
      textLower.includes("join")
    ) {
      return LinkCategory.COMMUNITY;
    }

    // Tool detection
    if (
      textLower.includes("tool") ||
      textLower.includes("app") ||
      textLower.includes("platform")
    ) {
      return LinkCategory.TOOL;
    }

    // Default to news
    return LinkCategory.NEWS;
  }

  private extractLinksWithSections(
    $: cheerio.CheerioAPI,
    links: ExtractedLink[]
  ) {
    const sectionMap = new Map<
      number,
      { section: string; category: LinkCategoryType }
    >();

    // First pass: Find section headers by detecting patterns
    $("*").each((index, el) => {
      const element = $(el);
      const text = element.text().trim();

      if (this.isSectionHeader(element, text)) {
        const sectionInfo = this.parseSectionHeader(text);
        sectionMap.set(index, sectionInfo);
      }
    });

    // Second pass: Extract links and associate with nearest preceding section
    $("a").each((_, el) => {
      const link = $(el);
      const href = link.attr("href");
      const text = link.text().trim();

      if (href && text && href.startsWith("http")) {
        // Skip links with no meaningful text content
        const cleanedText = this.cleanText(text);
        if (!cleanedText || cleanedText.trim().length === 0) {
          return; // Skip this link - no meaningful text
        }

        // Skip unwanted links before processing
        if (this.shouldSkipLink(href, text)) {
          return; // Skip this link
        }

        const cleanUrl = this.sanitizeUrl(href);

        // Find the most recent section header before this link
        const linkIndex = $("*").index(link);
        const nearestSection = this.findNearestSection(sectionMap, linkIndex);

        const linkCategory = this.categorizeLinkInContext(
          cleanUrl,
          text,
          nearestSection.category
        );

        links.push({
          url: cleanUrl,
          text: cleanedText, // Use the already cleaned text
          section: nearestSection.section,
          category: linkCategory,
        });
      }
    });
  }

  private isSectionHeader(
    element: ReturnType<cheerio.CheerioAPI>,
    text: string
  ): boolean {
    if (!text || text.length < 3) return false;

    // Check for styling that indicates headers (uppercase, bold, etc.)
    const isAllCaps = text === text.toUpperCase() && text.length < 50;
    const hasHeaderTags = element.is("h1, h2, h3, h4, h5, h6");
    const hasStrongOrBold =
      element.is("strong, b") || element.parent().is("strong, b");
    const isShortLine = text.length < 50 && !text.includes("http");

    // Look for common section patterns
    const sectionPatterns = [
      /^[A-Z\s]{3,30}$/, // All caps words like "AI INTEGRATION"
      /^\d+\.\s*[A-Z]/, // Numbered sections like "1. SECTION"
      /^[📊📈📉🔥⭐️🎯🚀].*[A-Z]/, // Emoji followed by caps
    ];

    const matchesPattern = sectionPatterns.some((pattern) =>
      pattern.test(text)
    );

    return (
      (isAllCaps && isShortLine) ||
      hasHeaderTags ||
      (hasStrongOrBold && isShortLine) ||
      matchesPattern
    );
  }

  private parseSectionHeader(text: string): {
    section: string;
    category: LinkCategoryType;
  } {
    const cleanText = text.trim().toLowerCase();
    let sectionName = cleanText
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure section name is never empty
    if (!sectionName || sectionName.length === 0) {
      sectionName = "content-section";
    }

    // Determine category based on section content
    let category: LinkCategoryType = LinkCategory.NEWS; // default

    if (
      cleanText.includes("integration") ||
      cleanText.includes("tool") ||
      cleanText.includes("app")
    ) {
      category = LinkCategory.TOOL;
    } else if (
      cleanText.includes("playbook") ||
      cleanText.includes("guide") ||
      cleanText.includes("tutorial")
    ) {
      category = LinkCategory.TUTORIAL;
    } else if (cleanText.includes("community") || cleanText.includes("job")) {
      category = LinkCategory.COMMUNITY;
    } else if (
      cleanText.includes("sponsor") ||
      cleanText.includes("partner") ||
      cleanText.includes("vendor")
    ) {
      category = LinkCategory.VENDOR;
    } else if (
      cleanText.includes("development") ||
      cleanText.includes("news") ||
      cleanText.includes("update")
    ) {
      category = LinkCategory.NEWS;
    }

    return { section: sectionName, category };
  }

  private findNearestSection(
    sectionMap: Map<number, { section: string; category: LinkCategoryType }>,
    linkIndex: number
  ): { section: string; category: LinkCategoryType } {
    let nearestSection = {
      section: "latest-developments",
      category: LinkCategory.NEWS as LinkCategoryType,
    };
    let nearestDistance = Infinity;

    for (const [sectionIndex, sectionInfo] of sectionMap.entries()) {
      if (sectionIndex < linkIndex) {
        const distance = linkIndex - sectionIndex;
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSection = sectionInfo;
        }
      }
    }

    // Final validation: ensure section is never empty
    if (!nearestSection.section || nearestSection.section.trim().length === 0) {
      nearestSection.section = "content-section";
    }

    return nearestSection;
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove tracking parameters
      const paramsToRemove = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "msclkid",
        "twclid",
        "ref",
        "source",
        "campaign_id",
        "ad_id",
        "beehiiv",
        "ss",
        "c",
        "u001", // Beehiiv specific tracking
      ];

      paramsToRemove.forEach((param) => {
        urlObj.searchParams.delete(param);
      });

      // For Beehiiv links, try to extract the actual destination URL
      if (
        urlObj.hostname.includes("beehiiv.com") ||
        urlObj.hostname.includes("link.mail.beehiiv.com")
      ) {
        // These are redirect links, keep as-is for now but cleaned of tracking
        // TODO: Could implement redirect resolution here
      }

      return urlObj.toString();
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  private categorizeLinkInContext(
    url: string,
    text: string,
    contextCategory: LinkCategoryType
  ): LinkCategoryType {
    const urlLower = url.toLowerCase();
    const textLower = text.toLowerCase();

    // Admin/email management links
    if (
      textLower.includes("unsubscribe") ||
      textLower.includes("manage preferences") ||
      textLower.includes("terms of service") ||
      textLower.includes("privacy policy") ||
      textLower.includes("read online") ||
      textLower.includes("sign up")
    ) {
      return LinkCategory.OTHER;
    }

    // Vendor/sponsor detection
    if (
      textLower.includes("sponsor") ||
      textLower.includes("advertise") ||
      textLower.includes("partner") ||
      urlLower.includes("amazon") ||
      urlLower.includes("shop") ||
      textLower.includes("get compliant") ||
      textLower.includes("start building")
    ) {
      return LinkCategory.VENDOR;
    }

    // Community links
    if (
      textLower.includes("community") ||
      textLower.includes("join") ||
      textLower.includes("university") ||
      urlLower.includes("discord") ||
      urlLower.includes("reddit")
    ) {
      return LinkCategory.COMMUNITY;
    }

    // Tutorial/guide detection
    if (
      textLower.includes("tutorial") ||
      textLower.includes("guide") ||
      textLower.includes("how to") ||
      textLower.includes("playbook") ||
      textLower.includes("build an")
    ) {
      return LinkCategory.TUTORIAL;
    }

    // Tool detection
    if (
      textLower.includes("tool") ||
      textLower.includes("app") ||
      textLower.includes("platform") ||
      textLower.includes(".io") ||
      textLower.includes("ai ") // AI tools
    ) {
      return LinkCategory.TOOL;
    }

    // Use context category if no specific match
    return contextCategory;
  }

  private determineSectionByContext(
    text: string,
    url: string,
    currentSection: string
  ): string {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes("job") ||
      lowerText.includes("hire") ||
      lowerText.includes("career")
    )
      return "community";

    if (
      lowerText.includes("quick") ||
      url.includes("twitter") ||
      url.includes("linkedin")
    )
      return "quick-hits";

    return currentSection;
  }
}
