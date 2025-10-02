import { ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

interface LinkType {
  url: string;
  text: string;
  section: string;
  category: string;
}

interface ConsolidatedLink {
  url: string; // URL from first occurrence (all are redirects)
  text: string; // Primary key for deduplication
  section: string;
  category: string;
  count: number; // How many times this text appears
  newsletters: string[]; // Which newsletters contained this link text
}

export async function GET() {
  try {
    await connectToDatabase();

    // Get all newsletters with their links
    const newsletters = await ParsedNewsletter.find({})
      .select("links subject email_id")
      .lean();

    // Create a Map to deduplicate by link text since URLs are all redirects
    const linkMap = new Map<string, ConsolidatedLink>();

    newsletters.forEach((newsletter) => {
      newsletter.links.forEach((link: LinkType) => {
        if (linkMap.has(link.text)) {
          // Text already exists, increment count and add newsletter
          const existing = linkMap.get(link.text)!;
          existing.count += 1;
          if (!existing.newsletters.includes(newsletter.subject)) {
            existing.newsletters.push(newsletter.subject);
          }
        } else {
          // New text, create entry
          linkMap.set(link.text, {
            url: link.url,
            text: link.text,
            section: link.section,
            category: link.category,
            count: 1,
            newsletters: [newsletter.subject],
          });
        }
      });
    });

    // Convert Map to array and sort by count (most frequent first)
    const consolidatedLinks = Array.from(linkMap.values()).sort(
      (a, b) => b.count - a.count
    );

    return NextResponse.json({
      success: true,
      links: consolidatedLinks,
      totalUniqueLinks: consolidatedLinks.length,
      totalNewsletters: newsletters.length,
    });
  } catch (error) {
    console.error("❌ Error fetching consolidated links:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        links: [],
      },
      { status: 500 }
    );
  }
}
