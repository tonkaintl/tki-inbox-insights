import { getDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Connect to MongoDB
    const db = await getDatabase();

    // Create a temporary collection
    const collection = db.collection("temp-emails");

    // Insert a test email document
    const testEmail = {
      id: "test-email-" + Date.now(),
      subject: "Test Newsletter - MongoDB Connection",
      from: {
        name: "Test Sender",
        address: "test@example.com",
      },
      receivedDateTime: new Date().toISOString(),
      bodyPreview:
        "This is a test email to verify MongoDB connection is working...",
      folder: "Test Folder",
      isRead: false,
      createdAt: new Date(),
      source: "test-data",
    };

    const result = await collection.insertOne(testEmail);

    // Get count of documents in collection
    const count = await collection.countDocuments();

    return NextResponse.json({
      success: true,
      message: "MongoDB connection successful!",
      insertedId: result.insertedId,
      totalDocuments: count,
      testEmail: testEmail,
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to MongoDB",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Connect to MongoDB
    const db = await getDatabase();

    // Drop the temporary collection
    const collection = db.collection("temp-emails");
    await collection.drop();

    return NextResponse.json({
      success: true,
      message: "Temporary collection deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting collection:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete collection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
