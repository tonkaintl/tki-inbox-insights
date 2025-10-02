import { ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { UrlResolverService } from "@/lib/services/urlResolverService";
import { NextResponse } from "next/server";

// Enhanced link data structure
interface EnhancedLink {
  text: string;
  url: string;
  resolvedUrl?: string;
  category: string;
  count: number;
  newsletters: string[];
  isResolved: boolean;
  resolutionStatus?: string;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const resolve = url.searchParams.get("resolve") === "true";
    const category = url.searchParams.get("category");

    console.log(
      `Fetching consolidated links (resolve: ${resolve}, category: ${category})`
    );

    // Build match condition for category filter
    const matchCondition: Record<string, string> = {};
    if (category && category !== "all") {
      matchCondition["links.category"] = category;
    }

    // Get all links with aggregation
    const results = await ParsedNewsletter.aggregate([
      { $unwind: "$links" },
      ...(Object.keys(matchCondition).length > 0
        ? [{ $match: matchCondition }]
        : []),
      {
        $group: {
          _id: "$links.text", // Group by link text instead of URL
          urls: { $addToSet: "$links.url" }, // Collect unique URLs for this text
          category: { $first: "$links.category" },
          newsletters: { $addToSet: "$subject" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    console.log(`Found ${results.length} unique links`);

    // Convert to enhanced links format
    let enhancedLinks: EnhancedLink[] = results.map((result) => ({
      text: result._id,
      url: result.urls[0], // Use first URL as primary
      category: result.category,
      count: result.count,
      newsletters: result.newsletters,
      isResolved: false,
      resolutionStatus: "pending",
    }));

    // Resolve URLs if requested
    if (resolve) {
      console.log("Resolving URLs...");
      const urlsToResolve = enhancedLinks.map((link) => link.url);

      try {
        const resolutions = await UrlResolverService.resolveUrls(urlsToResolve);

        // Map resolved URLs back to links
        const resolutionMap = new Map(
          resolutions.map((r) => [r.originalUrl, r])
        );

        enhancedLinks = enhancedLinks.map((link) => {
          const resolution = resolutionMap.get(link.url);
          if (resolution) {
            return {
              ...link,
              resolvedUrl: resolution.resolvedUrl,
              isResolved: resolution.status === "resolved",
              resolutionStatus: resolution.status,
            };
          }
          return link;
        });

        console.log(`Resolved ${resolutions.length} URLs`);
      } catch (error) {
        console.error("Error resolving URLs:", error);
        // Continue without resolution if there's an error
      }
    }

    // Group by category for response
    const linksByCategory = enhancedLinks.reduce((acc, link) => {
      if (!acc[link.category]) {
        acc[link.category] = [];
      }
      acc[link.category].push(link);
      return acc;
    }, {} as Record<string, EnhancedLink[]>);

    // Get available categories for filtering
    const categories = Object.keys(linksByCategory).sort();

    // Calculate stats
    const stats = {
      totalLinks: enhancedLinks.length,
      totalOccurrences: enhancedLinks.reduce(
        (sum, link) => sum + link.count,
        0
      ),
      categoryCounts: categories.reduce((acc, cat) => {
        acc[cat] = linksByCategory[cat].length;
        return acc;
      }, {} as Record<string, number>),
      resolved: resolve ? enhancedLinks.filter((l) => l.isResolved).length : 0,
      resolutionRequested: resolve,
    };

    return NextResponse.json({
      success: true,
      data: {
        linksByCategory,
        categories,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching consolidated links:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch consolidated links" },
      { status: 500 }
    );
  }
}
