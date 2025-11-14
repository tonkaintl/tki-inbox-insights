"use client";

import { useMsal } from "@azure/msal-react";
import { Alert, Box, Button, Input, Typography } from "@mui/joy";
import { useState } from "react";

interface BroadcastResult {
  success: boolean;
  count: number;
  skipped: number;
  subjects: Array<{
    subject: string;
    from: string;
    date: string;
  }>;
  message?: string;
}

interface ProcessBroadcastButtonProps {
  folderId: string;
  folderName: string;
  onProcessComplete?: () => void;
}

export default function ProcessBroadcastButton({
  folderId,
  folderName,
  onProcessComplete,
}: ProcessBroadcastButtonProps) {
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcessBroadcast = async () => {
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

      // Call our API to process the broadcast folder
      const apiResponse = await fetch("/api/process-broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId: folderId,
          folderName: folderName,
          accessToken: accessToken,
          batchSize: batchSize,
        }),
      });

      const data = await apiResponse.json();

      if (data.success) {
        setResult(data.data);
        // Refresh the list after successful processing
        if (onProcessComplete) {
          onProcessComplete();
        }
      } else {
        setError(data.error || data.message);
      }
    } catch (err) {
      console.error("Error processing broadcast folder:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200 }}>
      <Typography level="h2" sx={{ mb: 2 }}>
        📡 Process Broadcast Folder
      </Typography>

      <Typography sx={{ mb: 3 }}>
        Process Tonka broadcast emails and extract vehicle information (price,
        location, images). Use the batch size to control how many emails to
        process at once.
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "flex-end" }}>
        <Box sx={{ flex: "0 0 150px" }}>
          <Typography level="body-sm" sx={{ mb: 1 }}>
            Batch Size
          </Typography>
          <Input
            type="number"
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            slotProps={{
              input: {
                min: 1,
                max: 100,
              },
            }}
            disabled={loading}
          />
        </Box>

        <Button
          onClick={handleProcessBroadcast}
          loading={loading}
          size="lg"
          disabled={!accounts.length}
        >
          {loading ? "Processing..." : `📡 Process Last ${batchSize} Emails`}
        </Button>
      </Box>

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
          <Typography level="title-sm">
            ✅ Broadcast Processing Complete!
          </Typography>
          <Typography>
            Processed {result.count} new emails, skipped {result.skipped}{" "}
            already processed.
          </Typography>
          {result.message && (
            <Typography sx={{ mt: 1, fontSize: "sm" }}>
              {result.message}
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
}
