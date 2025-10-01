import { ParserFactory } from "@/lib/parsers";
import fs from "fs";
import path from "path";

async function testNewsletterParsing() {
  console.log("🧪 Testing Newsletter Parsing (HTML Direct)");

  // Read test data
  const htmlPath = path.join(process.cwd(), "test-data", "newsletter.html");
  const metadataPath = path.join(process.cwd(), "test-data", "metadata.json");

  if (!fs.existsSync(htmlPath)) {
    console.error("❌ Test HTML file not found:", htmlPath);
    return;
  }

  const html = fs.readFileSync(htmlPath, "utf8");
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

  console.log("📧 Email metadata:");
  console.log(`  From: ${metadata.from}`);
  console.log(`  Subject: ${metadata.subject}`);
  console.log(`  HTML length: ${html.length}`);

  // Get parser
  const parser = ParserFactory.getParser(metadata.from);
  if (!parser) {
    console.error("❌ No parser found for:", metadata.from);
    return;
  }

  console.log(`🔍 Parser found: ${parser.name}`);

  // Parse newsletter
  const emailMetadata = {
    id: "test-email-1",
    sender: metadata.from,
    subject: metadata.subject,
    date: metadata.date,
  };

  const result = parser.parse(html, emailMetadata);

  console.log("📄 Parsing results:");
  console.log(`  Sections found: ${result.sections.length}`);
  console.log(`  Links found: ${result.links.length}`);

  result.sections.forEach((section, index) => {
    console.log(`  ${index + 1}. ${section.title} (${section.type})`);
    console.log(`     Content: ${section.content.substring(0, 80)}...`);
  });

  // Final output: Show just the first section for easier reading
  console.log("\n" + "=".repeat(80));
  console.log("📋 FIRST Section from ParsedNewsletterSchema:");
  console.log("=".repeat(80));
  if (result.sections.length > 0) {
    console.log(JSON.stringify(result.sections[0], null, 2));
  } else {
    console.log("No sections found!");
  }
}

testNewsletterParsing().catch(console.error);
