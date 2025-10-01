import {
  EmailMetadata,
  ExtractedLink,
  LinkCategory,
  LinkCategoryType,
  NewsletterParser,
  NewsletterSection,
  ParsedNewsletter,
} from "@/types/newsletter-types";
import * as cheerio from "cheerio";
import { stripEmojis } from "../utils/email-utils";

export class DailyTheRundownAiParser implements NewsletterParser {
  name = "daily-therundown-ai";
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
    const sections: NewsletterSection[] = [];
    const links: ExtractedLink[] = [];
    let sectionOrder = 0;

    // First, try to extract basic document structure
    this.parseTopNav($, sections, links, sectionOrder++);

    // Then try specific newsletter sections if they exist
    this.parseHeader($, sections, links, sectionOrder++);
    this.parseIntro($, sections, links, sectionOrder++);
    this.parseLatestDevelopments($, sections, links, sectionOrder++);
    this.parseQuickHits($, sections, links, sectionOrder++);
    this.parseCommunity($, sections, links, sectionOrder++);
    this.parseFooter($, sections, links, sectionOrder++);

    return {
      id: `parsed-${emailMetadata.id}-${Date.now()}`,
      emailId: emailMetadata.id,
      sender: emailMetadata.sender,
      subject: emailMetadata.subject,
      date: emailMetadata.date,
      parserUsed: this.name,
      sections,
      links,
      parsedAt: new Date(),
      version: this.version,
    };
  }

  private parseTopNav(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Extract all links from the document first
    $("a").each((_, el) => {
      const link = $(el);
      const href = link.attr("href");
      const text = link.text().trim();

      if (href && text && href.startsWith("http")) {
        links.push({
          url: href,
          text,
          section: "document",
          category: this.categorizeLink(href, text),
        });
      }
    });

    // Look for the newsletter overview/description starting with "Good morning"
    console.log("🔍 Looking for newsletter overview...");
    const greeting = $('p:contains("Good morning")').first();

    if (greeting.length > 0) {
      console.log('✅ Found "Good morning" paragraph');
      let overviewContent = this.cleanText(greeting.text());
      console.log(
        "📝 Starting content:",
        overviewContent.substring(0, 100) + "..."
      );

      // Walk through subsequent elements until we hit the first <ul>
      let currentElement = greeting.next();
      let elementCount = 0;

      while (currentElement.length > 0 && elementCount < 10) {
        // Stop if we hit a <ul> element
        if (currentElement.is("ul")) {
          console.log("🛑 Found <ul>, stopping overview extraction");
          break;
        }

        // If it's a paragraph, add its content
        if (currentElement.is("p")) {
          const paragraphText = this.cleanText(currentElement.text());
          if (paragraphText && paragraphText.length > 10) {
            overviewContent += "\n\n" + paragraphText;
            console.log(
              "📄 Added paragraph:",
              paragraphText.substring(0, 60) + "..."
            );
          }
        }

        currentElement = currentElement.next();
        elementCount++;
      }

      if (overviewContent) {
        console.log(
          "✅ Newsletter overview extracted, length:",
          overviewContent.length
        );
        sections.push({
          type: "newsletter-overview",
          title: "Newsletter Overview",
          content: overviewContent,
          order,
        });
      }
    } else {
      console.log('❌ No "Good morning" paragraph found');
    }
  }

  private parseHeader(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Look for header/branding section
    const header = $("header, .header, .masthead").first();

    if (header.length > 0) {
      sections.push({
        type: "header",
        title: "Header",
        content: header.text().trim(),
        order,
      });
    }
  }

  private parseIntro(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Look for "In today's AI rundown:" section
    const rundownIndicator = $('p:contains("today\'s AI rundown:")').first();

    if (rundownIndicator.length > 0) {
      let rundownContent = rundownIndicator.text().trim();

      // Look for the bullet list that follows
      const nextElement = rundownIndicator.parent().next();
      const bulletList = nextElement.find("ul").first();

      if (bulletList.length > 0) {
        const bulletItems: string[] = [];
        bulletList.find("li").each((_, li) => {
          const itemText = $(li).text().trim();
          if (itemText) {
            bulletItems.push("• " + itemText);
          }
        });

        if (bulletItems.length > 0) {
          rundownContent += "\n\n" + bulletItems.join("\n");
        }
      }

      sections.push({
        type: "rundown-topics",
        title: "Today's AI Rundown",
        content: rundownContent,
        order,
      });
    }
  }

  private parseLatestDevelopments(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Look for "LATEST DEVELOPMENTS" section in black background table
    const developmentsHeader = $(
      'td[bgcolor="#000000"] span:contains("LATEST DEVELOPMENTS"), td[style*="background-color:#000000"] span:contains("LATEST DEVELOPMENTS")'
    );

    if (developmentsHeader.length > 0) {
      const articles: string[] = [];
      console.log("Found LATEST DEVELOPMENTS header");

      // Navigate from the black header table to find following content
      const headerTableRow = developmentsHeader.closest("tr");
      let nextRow = headerTableRow.next("tr");

      // Look through the next several table rows for article content
      let rowCount = 0;
      while (nextRow.length > 0 && rowCount < 15) {
        // Look for article headings (h3, h4, h6) in this row
        const headings = nextRow.find("h3, h4, h6");

        headings.each((_, heading) => {
          const headingText = this.cleanText($(heading).text());
          console.log("Found heading:", headingText.substring(0, 50));

          // Check if this looks like a main article heading
          if (
            headingText &&
            (headingText.includes("AI & HOLLYWOOD") ||
              headingText.includes("APPLE") ||
              headingText.includes("AI TRAINING") ||
              headingText.includes("actress") ||
              headingText.includes("Siri") ||
              headingText.includes("ChatGPT") ||
              headingText.match(/^[A-Z][A-Z\s&]+$/) || // All caps categories
              headingText.length > 20) // Longer descriptive titles
          ) {
            let articleContent = headingText + "\n\n";

            // Find the article content in the same table cell
            const contentParent = $(heading).closest("td");

            // Get subsequent paragraphs
            contentParent.find("p").each((_, p) => {
              const pText = this.cleanText($(p).text());
              if (
                pText &&
                (pText.startsWith("The Rundown:") ||
                  pText.startsWith("The details:") ||
                  pText.startsWith("Why it matters:") ||
                  pText.startsWith("What it means:") ||
                  pText.length > 50) // Include longer descriptive paragraphs
              ) {
                articleContent += pText + "\n\n";
              }
            });

            if (articleContent.length > headingText.length + 10) {
              articles.push(this.cleanText(articleContent));
              console.log("Added article:", headingText);
            }
          }
        });

        nextRow = nextRow.next("tr");
        rowCount++;

        // Stop if we hit another section header
        if (
          nextRow.find(
            'span:contains("QUICK HITS"), span:contains("COMMUNITY")'
          ).length > 0
        ) {
          break;
        }
      }

      if (articles.length > 0) {
        sections.push({
          type: "latest-developments",
          title: "Latest Developments",
          content: articles.join("\n\n---\n\n"),
          order,
        });
      }
    }
  }

  private parseQuickHits(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Look for "QUICK HITS" section in black background table exactly like the HTML structure
    const quickHitsHeader = $(
      'td[bgcolor="#000000"] span:contains("QUICK HITS"), td[style*="background-color:#000000"] span:contains("QUICK HITS")'
    );

    if (quickHitsHeader.length > 0) {
      const quickItems: string[] = [];
      console.log("Found QUICK HITS header");

      // Navigate from the black header table to find following content
      // Go up to the parent table row, then find next table rows
      const headerTableRow = quickHitsHeader.closest("tr");
      let nextRow = headerTableRow.next("tr");

      // Look through the next several table rows for content
      let rowCount = 0;
      while (nextRow.length > 0 && rowCount < 10) {
        // Look for content in white background tables or regular paragraphs
        nextRow.find("p").each((_, p) => {
          const text = this.cleanText($(p).text());
          if (text && text.length > 10 && text.length < 500) {
            // Check if it looks like a news item (contains company names, key terms)
            if (
              text.includes("DeepSeek") ||
              text.includes("OpenAI") ||
              text.includes("Anthropic") ||
              text.includes("California") ||
              text.includes("Lovable") ||
              text.includes("Microsoft") ||
              text.includes("Google") ||
              text.match(/^[A-Z][a-z]+ [A-Z]/) ||
              text.match(/\b(AI|ML|LLM|GPT)\b/i) ||
              text.length > 30 // Include longer descriptive content
            ) {
              quickItems.push(text);
              console.log("Found quick hit:", text.substring(0, 50) + "...");
            }
          }
        });

        nextRow = nextRow.next("tr");
        rowCount++;

        // Stop if we hit another section header
        if (
          nextRow.find(
            'span:contains("COMMUNITY"), span:contains("LATEST DEVELOPMENTS")'
          ).length > 0
        ) {
          break;
        }
      }

      if (quickItems.length > 0) {
        sections.push({
          type: "quick-hits",
          title: "Quick Hits",
          content: quickItems.join("\n\n"),
          order,
        });
      }
    }
  }

  private parseCommunity(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Look for "COMMUNITY" section
    const communityHeader = $(
      'span:contains("COMMUNITY"), p:contains("COMMUNITY")'
    ).first();

    if (communityHeader.length > 0) {
      let communityContent = "";

      // Look for community workflows section
      const workflowsHeader = $(
        'h3:contains("Community AI workflows")'
      ).first();
      if (workflowsHeader.length > 0) {
        let workflowContent = workflowsHeader.text() + "\n\n";

        // Get the workflow description and user example
        workflowsHeader
          .parent()
          .find("p")
          .each((_, p) => {
            const text = $(p).text().trim();
            if (text && text.length > 20) {
              workflowContent += text + "\n\n";
            }
          });

        communityContent += workflowContent;
      }

      // Look for newsletter highlights section
      const highlightsHeader = $('h3:contains("Highlights")').first();
      if (highlightsHeader.length > 0) {
        let highlightsContent = highlightsHeader.text() + "\n\n";

        // Get the highlights list
        highlightsHeader
          .parent()
          .find("li")
          .each((_, li) => {
            const text = $(li).text().trim();
            if (text) {
              highlightsContent += "• " + text + "\n";
            }
          });

        if (communityContent) communityContent += "\n---\n\n";
        communityContent += highlightsContent;
      }

      if (communityContent) {
        sections.push({
          type: "community",
          title: "Community",
          content: communityContent.trim(),
          order,
        });
      }
    }
  }

  private parseFooter(
    $: cheerio.CheerioAPI,
    sections: NewsletterSection[],
    links: ExtractedLink[],
    order: number
  ) {
    // Look for footer
    const footer = $("footer, .footer, .unsubscribe").first();

    if (footer.length > 0) {
      sections.push({
        type: "footer",
        title: "Footer",
        content: footer.text().trim(),
        order,
      });

      this.extractLinksFromSection($, footer, "footer", links);
    }
  }

  private extractLinksFromSection(
    $: cheerio.CheerioAPI,
    section: ReturnType<typeof $>,
    sectionName: string,
    links: ExtractedLink[]
  ) {
    section.find("a").each((_, el) => {
      const link = $(el);
      const href = link.attr("href");
      const text = link.text().trim();

      if (href && text) {
        links.push({
          url: href,
          text,
          section: sectionName,
          category: this.categorizeLink(href, text),
        });
      }
    });
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
}
