import { ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { UrlResolverService } from "@/lib/services/urlResolverService";
import { NextResponse } from "next/server";

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "invalid-url";
  }
}

interface LinkType {
  url: string;
  text: string;
  section: string;
  category: string;
}

interface EnhancedLink {
  url: string;
  text: string;
  section: string;
  domain: string;
  count: number;
  newsletters: string[];
  resolvedUrl?: string;
  isResolved: boolean;
  resolutionStatus?: string;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const resolve = url.searchParams.get("resolve") === "true";
    const domain = url.searchParams.get("domain");

    // Get all newsletters with their links
    const newsletters = await ParsedNewsletter.find({})
      .select("links subject email_id")
      .lean();

    // Create a Map to deduplicate by link text since URLs are all redirects
    const linkMap = new Map<string, EnhancedLink>();

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
            domain: extractDomain(link.url), // Will be updated with resolved domain later
            count: 1,
            newsletters: [newsletter.subject],
            isResolved: false,
            resolutionStatus: "not_attempted",
          });
        }
      });
    });

    // Convert Map to array and sort by count (most frequent first)
    let consolidatedLinks = Array.from(linkMap.values()).sort(
      (a, b) => b.count - a.count
    );

    // Filter by domain if specified
    if (domain && domain !== "all") {
      consolidatedLinks = consolidatedLinks.filter(
        (link) => link.domain === domain
      );
    }

    // Check for existing resolved URLs from database only (no HTTP requests)
    const urlsToCheck = consolidatedLinks.map((link) => link.url);
    const { ResolvedUrl } = await import("@/lib/database/models");
    const existingResolutions = await ResolvedUrl.find({
      original_url: { $in: urlsToCheck },
    });
    const resolutionMap = new Map(
      existingResolutions.map((r) => [r.original_url, r])
    );

    // Apply existing resolutions from database
    consolidatedLinks = consolidatedLinks.map((link) => {
      const existingResolution = resolutionMap.get(link.url);
      if (existingResolution) {
        return {
          ...link,
          resolvedUrl: existingResolution.resolved_url,
          domain: extractDomain(existingResolution.resolved_url), // Use resolved domain
          isResolved: existingResolution.status === "resolved",
          resolutionStatus: existingResolution.status,
        };
      }
      return link;
    });

    // If resolve=true, resolve additional URLs
    if (resolve) {
      const unresolvedUrls = consolidatedLinks
        .filter(
          (link) => !link.resolvedUrl || link.resolutionStatus === "failed"
        )
        .map((link) => link.url);

      if (unresolvedUrls.length > 0) {
        try {
          const newResolutions = await UrlResolverService.resolveUrls(
            unresolvedUrls
          );
          const newResolutionMap = new Map(
            newResolutions.map((r) => [r.originalUrl, r])
          );

          consolidatedLinks = consolidatedLinks.map((link) => {
            const newResolution = newResolutionMap.get(link.url);
            if (newResolution) {
              return {
                ...link,
                resolvedUrl: newResolution.resolvedUrl,
                domain: extractDomain(newResolution.resolvedUrl), // Use resolved domain
                isResolved: newResolution.status === "resolved",
                resolutionStatus: newResolution.status,
              };
            }
            return link;
          });
        } catch (error) {
          console.error("Error resolving URLs:", error);
        }
      }
    }

    // Group by domain for response
    const linksByDomain = consolidatedLinks.reduce((acc, link) => {
      if (!acc[link.domain]) {
        acc[link.domain] = [];
      }
      acc[link.domain].push(link);
      return acc;
    }, {} as Record<string, EnhancedLink[]>);

    const domains = Object.keys(linksByDomain).sort();

    const stats = {
      totalLinks: consolidatedLinks.length,
      totalOccurrences: consolidatedLinks.reduce(
        (sum, link) => sum + link.count,
        0
      ),
      domainCounts: domains.reduce((acc, domain) => {
        acc[domain] = linksByDomain[domain].length;
        return acc;
      }, {} as Record<string, number>),
      resolved: consolidatedLinks.filter((l) => l.isResolved).length,
      resolutionRequested: resolve,
    };

    return NextResponse.json({
      success: true,
      data: {
        linksByDomain,
        domains,
        stats,
      },
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
