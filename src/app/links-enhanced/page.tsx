import ConsolidatedLinksContent from "@/components/ConsolidatedLinksContent";
import { Box, Typography } from "@mui/joy";

export default function EnhancedLinksPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        🔗 Enhanced Links Analysis
      </Typography>
      <Typography level="body-lg" sx={{ mb: 4, color: "text.secondary" }}>
        View all newsletter links with advanced filtering, URL resolution, and
        analytics.
      </Typography>
      <ConsolidatedLinksContent />
    </Box>
  );
}
