import { Email } from "@/lib/database/models";
import connectToDatabase from "@/lib/database/mongoose";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const emailData = await request.json();

    // Connect to MongoDB
    await connectToDatabase();

    // Check if email already exists (avoid duplicates)
    const existingEmail = await Email.findOne({ id: emailData.id });

    if (existingEmail) {
      return NextResponse.json({
        success: false,
        message: "Email already exists in database",
        emailId: emailData.id,
      });
    }

    // Create the email document with Mongoose (timestamps added automatically)
    const result = await Email.create({
      ...emailData,
      // processed field removed - not in schema, Mongoose handles timestamps
    });

    return NextResponse.json({
      success: true,
      message: "Email saved to MongoDB successfully!",
      insertedId: result._id,
      emailId: emailData.id,
    });
  } catch (error) {
    console.error("Error saving email:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save email to MongoDB",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
