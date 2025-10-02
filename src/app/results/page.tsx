"use client";

import { ResultsContent } from "@/components/ResultsContent";
import { Box, Typography } from "@mui/joy";

export default function ResultsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3, textAlign: "center" }}>
        📊 Processing Results
      </Typography>

      <ResultsContent />
    </Box>
  );
}
