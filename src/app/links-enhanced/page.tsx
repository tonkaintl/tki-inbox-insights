"use client";

import { Box, Typography } from "@mui/joy";
import dynamic from "next/dynamic";

const ConsolidatedLinksContent = dynamic(
  () => import("@/components/ConsolidatedLinksContent"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography>Loading enhanced links...</Typography>
      </Box>
    ),
  }
);

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
