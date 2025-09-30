import { parseEml } from "@/lib/eml-parser";
import { ParserFactory } from "@/lib/parsers";
import * as fs from "fs";

async function testParsing() {
  try {
    // Check if EML file exists
    const emlPath =
      "C:\\rabidwoo-projects\\tki-inbox-insights\\src\\raw-email-source\\news@daily.therundown.ai.eml";

    if (!fs.existsSync(emlPath)) {
      console.log("❌ EML file not found at:", emlPath);
      return;
    }

    console.log("✅ EML file found");

    // Parse EML
    const emlContent = fs.readFileSync(emlPath, "utf-8");
    const parsedEmail = parseEml(emlContent);

    console.log("📧 Email metadata:");
    console.log("  From:", parsedEmail.from);
    console.log("  Subject:", parsedEmail.subject);
    console.log("  HTML length:", parsedEmail.html?.length || 0);

    // Get parser
    const parser = ParserFactory.getParser(parsedEmail.from || "");
    console.log("🔍 Parser found:", parser?.name || "None");

    if (parser && parsedEmail.html) {
      // Parse newsletter
      const emailMetadata = {
        id: "test-" + Date.now(),
        sender: parsedEmail.from || "",
        subject: parsedEmail.subject || "",
        date: new Date().toISOString(),
      };

      const result = parser.parse(parsedEmail.html, emailMetadata);

      console.log("📄 Parsing results:");
      console.log("  Sections found:", result.sections.length);
      console.log("  Links found:", result.links.length);

      result.sections.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.title} (${section.type})`);
        console.log(`     Content: ${section.content.substring(0, 100)}...`);
      });
    } else {
      console.log("❌ No parser or HTML content available");
    }
  } catch (error) {
    console.error("❌ Error testing parsing:", error);
  }
}

testParsing();
