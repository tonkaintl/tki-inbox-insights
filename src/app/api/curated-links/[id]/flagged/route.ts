import { CuratedLink } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

// PATCH /api/curated-links/[id]/flagged - Toggle flagged status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { flagged } = body;

    if (typeof flagged !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "flagged field must be a boolean",
        },
        { status: 400 }
      );
    }

    const link = await CuratedLink.findOneAndUpdate(
      { id: params.id },
      { $set: { flagged } },
      { new: true, runValidators: true }
    ).lean();

    if (!link) {
      return NextResponse.json(
        {
          success: false,
          error: "Curated link not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: link,
      message: `Link ${flagged ? "flagged" : "unflagged"}`,
    });
  } catch (error) {
    console.error("❌ Error updating flagged status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
