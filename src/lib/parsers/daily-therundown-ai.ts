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

  canParse(fromAddress: string): boolean {
    return (
      fromAddress.includes("news@daily.therundown.ai") ||
      fromAddress.includes("daily.therundown.ai")
    );
  }

  parse(html: string, emailMetadata: EmailMetadata): ParsedNewsletter {
    const $ = cheerio.load(html);
    const links: ExtractedLink[] = [];

    // Extract all links and categorize them
    this.extractAllLinks($, links);

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

  private extractAllLinks($: cheerio.CheerioAPI, links: ExtractedLink[]) {
    $("a").each((_, el) => {
      const link = $(el);
      const href = link.attr("href");
      const text = link.text().trim();

      if (href && text && href.startsWith("http")) {
        links.push({
          url: href,
          text,
          section: this.guessSection(text, href),
          category: this.categorizeLink(href, text),
        });
      }
    });
  }

  private guessSection(text: string, url: string): string {
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
    return "latest-developments";
  }
}
