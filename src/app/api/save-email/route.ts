import { getDatabase } from "@/lib/database/mongodb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const emailData = await request.json();

    // Connect to MongoDB
    const db = await getDatabase();
    const collection = db.collection("emails");

    // Add metadata to the email
    const emailDocument = {
      ...emailData,
      savedAt: new Date(),
      source: "microsoft-graph",
      processed: false, // Flag for later newsletter analysis
    };

    // Check if email already exists (avoid duplicates)
    const existingEmail = await collection.findOne({ id: emailData.id });

    if (existingEmail) {
      return NextResponse.json({
        success: false,
        message: "Email already exists in database",
        emailId: emailData.id,
      });
    }

    // Insert the email
    const result = await collection.insertOne(emailDocument);

    return NextResponse.json({
      success: true,
      message: "Email saved to MongoDB successfully!",
      insertedId: result.insertedId,
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
