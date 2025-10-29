"use client";

import BroadcastItemsList from "@/components/BroadcastItemsList";
import ProcessBroadcastButton from "@/components/ProcessBroadcastButton";
import { Box, Divider, Typography } from "@mui/joy";

export default function BroadcastPage() {
  // You'll need to get the actual folder ID - this is a placeholder
  // You can get this from the EmailFolders component when user selects the Broadcasts folder
  const BROADCAST_FOLDER_ID =
    "AQMkADBjNjJjZTU5LWIxZDItNDFmZC04MmI5LTgyYTkzMWRjYWIwYgAuAAADjaD6Y54ilkK6Wdd9FGRmqwEACDyGf8uQckKAY9eP8o6XIgAD-UedjgAAAA==";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.surface" }}>
      <Box sx={{ maxWidth: 1200, mx: "auto", p: 4 }}>
        <Typography level="h1" sx={{ mb: 2 }}>
          📡 Tonka Broadcast Processing
        </Typography>

        <Typography level="body-lg" sx={{ mb: 4, color: "text.secondary" }}>
          Process and analyze Tonka International vehicle broadcast emails. This
          tool will extract vehicle specifications, pricing, and contact
          information from marketing emails.
        </Typography>

        <ProcessBroadcastButton
          folderId={BROADCAST_FOLDER_ID}
          folderName="Broadcasts"
        />

        <Divider sx={{ my: 4 }} />

        <BroadcastItemsList />
      </Box>
    </Box>
  );
}
