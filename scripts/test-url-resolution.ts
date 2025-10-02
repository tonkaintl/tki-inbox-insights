/**
 * Test script for URL Resolution Service
 * This script tests the URL resolution functionality with sample URLs
 */

import connectToDatabase from "../src/lib/database/mongoose";
import { UrlResolverService } from "../src/lib/services/urlResolverService";

const TEST_URLS = [
  "https://bit.ly/example", // Short URL
  "https://google.com", // Standard URL
  "https://example.com/redirect", // Potential redirect
  "https://non-existent-domain-123456.com", // Failed URL
];

async function testUrlResolution() {
  console.log("🔗 Testing URL Resolution Service\n");

  try {
    // Connect to database
    await connectToDatabase();
    console.log("✅ Connected to MongoDB\n");

    // Test single URL resolution
    console.log("📍 Testing single URL resolution:");
    const singleResult = await UrlResolverService.resolveUrl(
      "https://google.com"
    );
    console.log("Result:", singleResult);
    console.log();

    // Test batch URL resolution
    console.log("📍 Testing batch URL resolution:");
    const batchResults = await UrlResolverService.resolveUrls(TEST_URLS);
    console.log("Results:");
    batchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.originalUrl}`);
      console.log(`     → ${result.resolvedUrl}`);
      console.log(
        `     Status: ${result.status}, From Cache: ${result.fromCache}`
      );
    });
    console.log();

    // Test getting stats
    console.log("📍 Getting resolution statistics:");
    const stats = await UrlResolverService.getStats();
    console.log("Stats:", stats);
    console.log();

    // Test the same URLs again to check caching
    console.log("📍 Testing cache behavior (running same URLs again):");
    const cachedResults = await UrlResolverService.resolveUrls(
      TEST_URLS.slice(0, 2)
    );
    console.log("Cached Results:");
    cachedResults.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.originalUrl}`);
      console.log(`     → ${result.resolvedUrl}`);
      console.log(
        `     Status: ${result.status}, From Cache: ${result.fromCache}`
      );
    });

    console.log("\n✅ URL Resolution Service test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
if (require.main === module) {
  testUrlResolution()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}
