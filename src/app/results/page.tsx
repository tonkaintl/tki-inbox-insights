import { ResultsContent } from "@/components/ResultsContent";
import { Box, CircularProgress, Typography } from "@mui/joy";
import { Suspense } from "react";

export default function ResultsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3, textAlign: "center" }}>
        📊 Processing Results
      </Typography>

      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size="lg" />
          </Box>
        }
      >
        <ResultsContent />
      </Suspense>
    </Box>
  );
}
