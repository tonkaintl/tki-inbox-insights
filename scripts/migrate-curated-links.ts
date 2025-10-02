import {
  CuratedLink,
  ParsedNewsletter,
  ResolvedUrl,
} from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "invalid-url";
  }
}

// Migration script to populate curated_links from existing newsletter data
export async function migrateToCuratedLinks() {
  try {
    await connectToDatabase();

    console.log("🔄 Starting migration to curated_links...");

    // Check if migration has already been run
    const existingCount = await CuratedLink.countDocuments();
    if (existingCount > 0) {
      console.log(
        `⚠️  Migration already run - ${existingCount} curated links exist`
      );
      return {
        success: true,
        message: `Migration already completed - ${existingCount} curated links exist`,
        migrated: 0,
      };
    }

    // Get all newsletters with their links
    const newsletters = await ParsedNewsletter.find({})
      .select("links subject email_id")
      .lean();

    console.log(`📧 Found ${newsletters.length} newsletters to migrate`);

    // Get all resolved URLs for domain mapping
    const resolvedUrls = await ResolvedUrl.find({}).lean();
    const resolutionMap = new Map(resolvedUrls.map((r) => [r.original_url, r]));

    console.log(`🔗 Found ${resolvedUrls.length} resolved URLs`);

    // Create a Map to deduplicate by link text (same as current logic)
    const linkMap = new Map<
      string,
      {
        url: string;
        text: string;
        section: string;
        category: string;
        count: number;
        newsletters: string[];
        first_seen: Date;
        last_seen: Date;
        resolved_url?: string;
        domain: string;
      }
    >();

    // Process all newsletters
    for (const newsletter of newsletters) {
      for (const link of newsletter.links) {
        if (linkMap.has(link.text)) {
          // Text already exists, increment count and add newsletter
          const existing = linkMap.get(link.text)!;
          existing.count += 1;
          if (!existing.newsletters.includes(newsletter.subject)) {
            existing.newsletters.push(newsletter.subject);
          }
          // Update last_seen to the latest
          existing.last_seen = new Date();
        } else {
          // New text, create entry
          const resolvedInfo = resolutionMap.get(link.url);
          const resolvedUrl = resolvedInfo?.resolved_url;
          const domain = resolvedUrl
            ? extractDomain(resolvedUrl)
            : extractDomain(link.url);

          linkMap.set(link.text, {
            url: link.url,
            text: link.text,
            section: link.section,
            category: link.category,
            count: 1,
            newsletters: [newsletter.subject],
            first_seen: new Date(),
            last_seen: new Date(),
            resolved_url: resolvedUrl,
            domain,
          });
        }
      }
    }

    console.log(`🔄 Processed ${linkMap.size} unique links`);

    // Convert to curated links and save in batches
    const curatedLinks = Array.from(linkMap.values()).map((link, index) => ({
      id: `migrated-${index}-${Date.now()}`,
      url: link.url,
      text: link.text,
      domain: link.domain,
      resolved_url: link.resolved_url,
      category: link.category,
      section: link.section,
      count: link.count,
      newsletters: link.newsletters,
      reviewed: false, // Default to unreviewed
      flagged: false, // Default to unflagged
      notes: undefined, // No notes initially
      first_seen: link.first_seen,
      last_seen: link.last_seen,
    }));

    // Insert in batches of 100 to avoid memory issues
    const batchSize = 100;
    let migrated = 0;

    for (let i = 0; i < curatedLinks.length; i += batchSize) {
      const batch = curatedLinks.slice(i, i + batchSize);
      await CuratedLink.insertMany(batch);
      migrated += batch.length;
      console.log(`✅ Migrated ${migrated}/${curatedLinks.length} links`);
    }

    console.log(`🎉 Migration completed! Migrated ${migrated} curated links`);

    return {
      success: true,
      message: `Successfully migrated ${migrated} curated links`,
      migrated,
    };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// CLI script runner
if (require.main === module) {
  migrateToCuratedLinks()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
