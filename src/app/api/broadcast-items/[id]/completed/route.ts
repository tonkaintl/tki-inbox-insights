import { BroadcastItem } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    const { id } = await params;
    const { completed } = await request.json();

    // Update the completed status
    const updatedItem = await BroadcastItem.findByIdAndUpdate(
      id,
      { completed },
      { new: true }
    );

    if (!updatedItem) {
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedItem,
    });
  } catch (error) {
    console.error("Error updating completed status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
