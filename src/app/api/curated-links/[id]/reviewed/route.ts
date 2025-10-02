import { CuratedLink } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

// PATCH /api/curated-links/[id]/reviewed - Toggle reviewed status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { reviewed } = body;

    if (typeof reviewed !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "reviewed field must be a boolean",
        },
        { status: 400 }
      );
    }

    const link = await CuratedLink.findOneAndUpdate(
      { id: params.id },
      { $set: { reviewed } },
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
      message: `Link marked as ${reviewed ? "reviewed" : "unreviewed"}`,
    });
  } catch (error) {
    console.error("❌ Error updating reviewed status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
