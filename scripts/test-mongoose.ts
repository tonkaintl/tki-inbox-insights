import connectToDatabase from "@/lib/database/mongoose";
import { Email, ParsedNewsletter } from "@/lib/database/models";

async function testMongooseConnection() {
  try {
    console.log("🔌 Testing Mongoose connection...");
    
    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to database");

    // Test Email model
    const emailCount = await Email.countDocuments();
    console.log(`📧 Found ${emailCount} emails in database`);

    // Test ParsedNewsletter model  
    const parsedCount = await ParsedNewsletter.countDocuments();
    console.log(`📰 Found ${parsedCount} parsed newsletters in database`);

    // Show some validation info
    console.log("\n📋 Schema validation info:");
    console.log("Email fields:", Object.keys(Email.schema.paths));
    console.log("ParsedNewsletter has sections field:", "sections" in ParsedNewsletter.schema.paths);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testMongooseConnection();