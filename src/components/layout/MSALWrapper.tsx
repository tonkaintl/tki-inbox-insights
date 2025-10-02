"use client";

import { useMsal } from "@azure/msal-react";
import { Box, CircularProgress, Typography } from "@mui/joy";
import { useEffect, useState } from "react";

interface MSALWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function MSALWrapper({ children, fallback }: MSALWrapperProps) {
  const [isClient, setIsClient] = useState(false);
  const { instance } = useMsal();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render anything on server-side
  if (!isClient) {
    return (
      fallback || (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress size="lg" />
          <Typography sx={{ ml: 2 }}>Loading...</Typography>
        </Box>
      )
    );
  }

  // Check if MSAL instance is available
  if (!instance) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography color="danger">
          Authentication system not available. Please refresh the page.
        </Typography>
      </Box>
    );
  }

  return <>{children}</>;
}
