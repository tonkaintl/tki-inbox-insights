import { ParsedNewsletter } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    emailId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();

    const { emailId } = await params;

    // Find newsletter by email_id (snake_case field)
    const newsletter = await ParsedNewsletter.findOne({
      email_id: emailId,
    }).lean();

    if (!newsletter) {
      return NextResponse.json(
        {
          success: false,
          error: "Newsletter not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      newsletter,
    });
  } catch (error) {
    console.error("❌ Error fetching newsletter:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
