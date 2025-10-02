import { CuratedLink } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

// PATCH /api/curated-links/[id]/notes - Update notes
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { notes } = body;

    if (notes !== undefined && typeof notes !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "notes field must be a string or undefined",
        },
        { status: 400 }
      );
    }

    const updateData: { notes?: string } = {};
    if (notes === "" || notes === null) {
      updateData.notes = undefined; // Remove notes field
    } else {
      updateData.notes = notes;
    }

    const link = await CuratedLink.findOneAndUpdate(
      { id: params.id },
      { $set: updateData },
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
      message: notes ? "Notes updated" : "Notes cleared",
    });
  } catch (error) {
    console.error("❌ Error updating notes:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
