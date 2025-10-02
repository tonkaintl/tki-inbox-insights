import { CuratedLink } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

// GET /api/curated-links - Get all curated links with filtering
export async function GET(request: Request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const domain = url.searchParams.get("domain");
    const reviewed = url.searchParams.get("reviewed");
    const flagged = url.searchParams.get("flagged");
    const category = url.searchParams.get("category");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const skip = parseInt(url.searchParams.get("skip") || "0");
    const sortBy = url.searchParams.get("sortBy") || "last_seen";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    // Build filter object
    const filter: Record<string, string | boolean> = {};
    if (domain && domain !== "all") filter.domain = domain;
    if (reviewed !== null && reviewed !== undefined)
      filter.reviewed = reviewed === "true";
    if (flagged !== null && flagged !== undefined)
      filter.flagged = flagged === "true";
    if (category && category !== "all") filter.category = category;

    // Execute query
    const links = await CuratedLink.find(filter)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count for pagination
    const totalCount = await CuratedLink.countDocuments(filter);

    // Get aggregation stats
    const stats = await CuratedLink.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          totalOccurrences: { $sum: "$count" },
          reviewedCount: { $sum: { $cond: ["$reviewed", 1, 0] } },
          flaggedCount: { $sum: { $cond: ["$flagged", 1, 0] } },
          uniqueDomains: { $addToSet: "$domain" },
        },
      },
    ]);

    const aggregatedStats = stats[0] || {
      totalLinks: 0,
      totalOccurrences: 0,
      reviewedCount: 0,
      flaggedCount: 0,
      uniqueDomains: [],
    };

    return NextResponse.json({
      success: true,
      data: {
        links,
        pagination: {
          total: totalCount,
          limit,
          skip,
          hasMore: skip + limit < totalCount,
        },
        stats: {
          ...aggregatedStats,
          uniqueDomainsCount: aggregatedStats.uniqueDomains.length,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching curated links:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST /api/curated-links - Create a new curated link
export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const {
      url,
      text,
      domain,
      resolved_url,
      category,
      section,
      count = 1,
      newsletters,
      reviewed = false,
      flagged = false,
      notes,
    } = body;

    // Validate required fields
    if (!url || !text || !domain || !category || !section || !newsletters) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: url, text, domain, category, section, newsletters",
        },
        { status: 400 }
      );
    }

    // Generate unique ID
    const id = `${Buffer.from(url + text)
      .toString("base64")
      .slice(0, 16)}-${Date.now()}`;

    const curatedLink = new CuratedLink({
      id,
      url,
      text,
      domain,
      resolved_url,
      category,
      section,
      count,
      newsletters: Array.isArray(newsletters) ? newsletters : [newsletters],
      reviewed,
      flagged,
      notes,
      first_seen: new Date(),
      last_seen: new Date(),
    });

    await curatedLink.save();

    return NextResponse.json({
      success: true,
      data: curatedLink,
    });
  } catch (error) {
    console.error("❌ Error creating curated link:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
