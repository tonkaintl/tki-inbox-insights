import ConsolidatedLinksContent from "@/components/ConsolidatedLinksContent";
import { Box, Typography } from "@mui/joy";

export default function ConsolidatedLinksPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3, textAlign: "center" }}>
        📎 Consolidated Link Content
      </Typography>
      <ConsolidatedLinksContent />
    </Box>
  );
}
