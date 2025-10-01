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

    // FAST: Just extract all links and categorize them
    this.extractAllLinks($, links);

    // FAST: Create minimal sections for organization
    this.createMinimalSections(sections);

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
    console.log("🔍 Looking for LATEST DEVELOPMENTS section...");

    // Look for "LATEST DEVELOPMENTS" text anywhere in the document
    const developmentsText = $(':contains("LATEST DEVELOPMENTS")')
      .filter((_, el) => {
        const text = $(el).text();
        return text.includes("LATEST DEVELOPMENTS") && text.trim().length < 100;
      })
      .first();

    if (developmentsText.length > 0) {
      console.log("✅ Found LATEST DEVELOPMENTS section");
      const articles: string[] = [];

      // Get all text content and split by major sections
      const fullText = $("body").text() || $.root().text();

      // Find the start of LATEST DEVELOPMENTS section
      const latestDevsStart = fullText.indexOf("LATEST DEVELOPMENTS");
      if (latestDevsStart === -1) return;

      // Find the end (next major section)
      const quickHitsStart = fullText.indexOf("QUICK HITS", latestDevsStart);
      const communityStart = fullText.indexOf("COMMUNITY", latestDevsStart);
      const sectionEnd = Math.min(
        quickHitsStart === -1 ? Infinity : quickHitsStart,
        communityStart === -1 ? Infinity : communityStart
      );

      const sectionText = fullText.substring(
        latestDevsStart,
        sectionEnd === Infinity ? undefined : sectionEnd
      );

      console.log("📝 Section text length:", sectionText.length);

      // Parse individual articles by looking for patterns like:
      // "OPENAI" or "ANTHROPIC" followed by "🤑" and article content
      const articlePattern =
        /([A-Z]{2,}(?:\s+[A-Z&]{2,})*)\s*🤑\s*([^\n]+)\s*The Rundown:\s*([^]*?)(?=(?:[A-Z]{2,}(?:\s+[A-Z&]{2,})*)\s*🤑|$)/g;
      let match;

      while ((match = articlePattern.exec(sectionText)) !== null) {
        const [, category, headline, content] = match;

        if (category && headline && content) {
          const cleanCategory = category.trim();
          const cleanHeadline = headline.trim();
          const cleanContent = content.trim();

          // Further parse the content for "The details:" and "Why it matters:"
          const detailsMatch = cleanContent.match(
            /The details:\s*([^]*?)(?:Why it matters:|$)/
          );
          const whyItMattersMatch = cleanContent.match(
            /Why it matters:\s*([^]*?)$/
          );

          let articleText = `${cleanCategory}\n🤑 ${cleanHeadline}\n\nThe Rundown: ${cleanContent
            .split("The details:")[0]
            .trim()}`;

          if (detailsMatch && detailsMatch[1]) {
            articleText += `\n\nThe details: ${detailsMatch[1].trim()}`;
          }

          if (whyItMattersMatch && whyItMattersMatch[1]) {
            articleText += `\n\nWhy it matters: ${whyItMattersMatch[1].trim()}`;
          }

          articles.push(articleText);
          console.log(
            "✅ Parsed article:",
            cleanCategory,
            cleanHeadline.substring(0, 30) + "..."
          );
        }
      }

      // Fallback: if pattern matching fails, try to extract by looking for capital letter categories
      if (articles.length === 0) {
        console.log("🔄 Trying fallback extraction method...");
        const lines = sectionText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        let currentArticle = "";
        let inArticle = false;

        for (const line of lines) {
          // Check if this is a category line (all caps, short)
          if (line.match(/^[A-Z]{2,}(?:\s+[A-Z&]{2,})*$/) && line.length < 30) {
            if (currentArticle) {
              articles.push(currentArticle.trim());
            }
            currentArticle = line + "\n";
            inArticle = true;
          } else if (
            inArticle &&
            (line.includes("🤑") ||
              line.includes("The Rundown:") ||
              line.includes("The details:") ||
              line.includes("Why it matters:"))
          ) {
            currentArticle += line + "\n";
          } else if (inArticle && line.length > 20) {
            currentArticle += line + "\n";
          }
        }

        if (currentArticle) {
          articles.push(currentArticle.trim());
        }
      }

      if (articles.length > 0) {
        console.log(
          `✅ Extracted ${articles.length} articles from Latest Developments`
        );
        sections.push({
          type: "latest-developments",
          title: "Latest Developments",
          content: articles.join("\n\n---\n\n"),
          order,
        });
      } else {
        console.log("❌ No articles found in Latest Developments section");
      }
    } else {
      console.log("❌ LATEST DEVELOPMENTS section not found");
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

  private createMinimalSections(sections: NewsletterSection[]) {
    sections.push(
      {
        type: "latest-developments",
        title: "Latest Developments",
        content: "News and developments",
        order: 0,
      },
      {
        type: "quick-hits",
        title: "Quick Hits",
        content: "Brief updates",
        order: 1,
      },
      {
        type: "community",
        title: "Community",
        content: "Community content",
        order: 2,
      }
    );
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
