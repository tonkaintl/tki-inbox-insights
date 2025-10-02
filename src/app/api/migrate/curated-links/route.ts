import { NextResponse } from "next/server";
import { migrateToCuratedLinks } from "../../../../../scripts/migrate-curated-links";

// POST /api/migrate/curated-links - Run migration to populate curated_links
export async function POST() {
  try {
    const result = await migrateToCuratedLinks();

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Migration API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Migration failed",
      },
      { status: 500 }
    );
  }
}
