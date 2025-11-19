import { BroadcastItem } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDatabase();

    // Fetch last 50 broadcast items, sorted by received_date descending (newest first)
    const items = await BroadcastItem.find({})
      .sort({ received_date: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error("Error fetching broadcast items:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
