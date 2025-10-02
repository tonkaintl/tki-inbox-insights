// Simple test script for the consolidated links API
async function testConsolidatedLinksAPI() {
  try {
    console.log("🧪 Testing Consolidated Links API\n");
    console.log("=".repeat(50));

    const response = await fetch("http://localhost:3000/api/links");

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log("✅ API Response received");
    console.log(`📊 Success: ${data.success}`);
    console.log(`🔗 Total Unique Links: ${data.totalUniqueLinks}`);
    console.log(`📰 Total Newsletters: ${data.totalNewsletters}`);

    if (data.links && data.links.length > 0) {
      console.log("\n📋 Top 5 Most Frequent Links:");
      data.links.slice(0, 5).forEach((link: any, index: number) => {
        console.log(`${index + 1}. "${link.text}" (${link.count}x)`);
        console.log(`   Category: ${link.category}`);
        console.log(`   URL: ${new URL(link.url).hostname}`);
        console.log();
      });

      // Group by category
      const categories = data.links.reduce((acc: any, link: any) => {
        acc[link.category] = (acc[link.category] || 0) + 1;
        return acc;
      }, {});

      console.log("📈 Categories:");
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} links`);
      });
    }

    console.log("\n🎉 Consolidated Links API test completed successfully!");
  } catch (error) {
    console.error("❌ Error testing API:", error);
  }
}

testConsolidatedLinksAPI();
