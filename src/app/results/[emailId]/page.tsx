import { NewsletterDetails } from "@/components/NewsletterDetails";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/joy";
import Link from "next/link";
import { Suspense } from "react";

interface PageProps {
  params: Promise<{
    emailId: string;
  }>;
}

export default async function NewsletterResultsPage({ params }: PageProps) {
  // Await params in Next.js 15+
  const { emailId } = await params;

  // Validate emailId parameter
  if (!emailId || emailId.trim() === "") {
    return (
      <Box sx={{ p: 3 }}>
        <Typography level="h1" sx={{ mb: 3, textAlign: "center" }}>
          📧 Newsletter Details
        </Typography>

        <Alert color="danger" sx={{ mb: 3 }}>
          <Typography level="title-md" sx={{ mb: 1 }}>
            Invalid Newsletter ID
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            The newsletter ID is missing or invalid. Please check the URL and
            try again.
          </Typography>
          <Link href="/results">
            <Button size="sm" variant="soft">
              ← Back to Results
            </Button>
          </Link>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography level="h1" sx={{ mb: 3, textAlign: "center" }}>
        📧 Newsletter Details
      </Typography>

      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size="lg" />
          </Box>
        }
      >
        <NewsletterDetails emailId={emailId} />
      </Suspense>
    </Box>
  );
}
