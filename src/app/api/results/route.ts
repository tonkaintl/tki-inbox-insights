import { ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    // Get all newsletters, sorted by most recent
    const newsletters = await ParsedNewsletter.find({})
      .sort({ parsed_at: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      newsletters,
      count: newsletters.length,
    });
  } catch (error) {
    console.error("❌ Error fetching results:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        newsletters: [],
      },
      { status: 500 }
    );
  }
}
