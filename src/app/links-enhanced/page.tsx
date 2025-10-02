"use client";

import { Box, Typography } from "@mui/joy";
import dynamic from "next/dynamic";

const CuratedLinksContent = dynamic(
  () => import("@/components/CuratedLinksContent"),
  {
    ssr: false,
    loading: () => (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography>Loading curated links...</Typography>
      </Box>
    ),
  }
);

export default function EnhancedLinksPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3 }}>
        🔗 Curated Links Management
      </Typography>
      <Typography level="body-lg" sx={{ mb: 4, color: "text.secondary" }}>
        Manage and curate newsletter links with review status, flagging, and
        notes.
      </Typography>
      <CuratedLinksContent />
    </Box>
  );
}
