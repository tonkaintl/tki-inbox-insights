"use client";

import { useMsal } from "@azure/msal-react";
import { Alert, Box, Button, Typography } from "@mui/joy";
import { useState } from "react";

interface ProcessResult {
  success: boolean;
  processed: number;
  saved: number;
  links: number;
  message?: string;
}

interface ProcessFolderButtonProps {
  folderId: string;
  folderName: string;
}

export default function ProcessFolderButton({
  folderId,
  folderName,
}: ProcessFolderButtonProps) {
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessFolder = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get access token
      const tokenRequest = {
        scopes: ["https://graph.microsoft.com/Mail.Read"],
        account: accounts[0],
      };

      const response = await instance.acquireTokenSilent(tokenRequest);
      const accessToken = response.accessToken;

      // Call our API to process the folder
      const apiResponse = await fetch("/api/process-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: folderId,
          folderName: folderName,
          limit: 10,
          accessToken: accessToken,
        }),
      });

      const data = await apiResponse.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || data.message);
      }
    } catch (err) {
      console.error("Error processing folder:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200 }}>
      <Typography level="h2" sx={{ mb: 2 }}>
        📁 Process {folderName} Folder
      </Typography>

      <Typography sx={{ mb: 3 }}>
        Click the button below to connect to your Office 365 {folderName} folder
        and analyze all daily rundown emails.
      </Typography>

      <Button
        onClick={handleProcessFolder}
        loading={loading}
        size="lg"
        sx={{ mb: 3 }}
        disabled={!accounts.length}
      >
        {loading ? "Processing..." : `🚀 Process ${folderName} Folder`}
      </Button>

      {!accounts.length && (
        <Alert color="warning" sx={{ mb: 3 }}>
          Please sign in to access your Office 365 emails.
        </Alert>
      )}

      {error && (
        <Alert color="danger" sx={{ mb: 3 }}>
          <Typography level="title-sm">Error:</Typography>
          <Typography>{error}</Typography>
        </Alert>
      )}

      {result && (
        <Alert color="success" sx={{ mb: 3 }}>
          <Typography level="title-sm">✅ Processing Complete!</Typography>
          <Typography>
            Successfully processed {result.processed} emails and saved{" "}
            {result.saved} newsletters with {result.links} links.
          </Typography>
          {result.message && (
            <Typography sx={{ mt: 1 }}>{result.message}</Typography>
          )}
          <Box sx={{ mt: 2 }}>
            <Button component="a" href="/results" variant="soft" size="sm">
              📊 View Processed Results
            </Button>
          </Box>
        </Alert>
      )}
    </Box>
  );
}
