import { CuratedLink } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

// GET /api/curated-links/[id] - Get a specific curated link
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const link = await CuratedLink.findOne({ id }).lean();

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
    });
  } catch (error) {
    console.error("❌ Error fetching curated link:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/curated-links/[id] - Update a specific curated link
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const body = await request.json();
    const updates = { ...body };

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates._id;
    delete updates.created_at;
    delete updates.first_seen;

    // Update last_seen if content is being modified
    if (
      Object.keys(updates).some((key) =>
        ["text", "url", "newsletters"].includes(key)
      )
    ) {
      updates.last_seen = new Date();
    }

    const link = await CuratedLink.findOneAndUpdate(
      { id },
      { $set: updates },
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
    });
  } catch (error) {
    console.error("❌ Error updating curated link:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/curated-links/[id] - Delete a specific curated link
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const link = await CuratedLink.findOneAndDelete({ id }).lean();

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
      message: "Curated link deleted successfully",
      data: link,
    });
  } catch (error) {
    console.error("❌ Error deleting curated link:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
