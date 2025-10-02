"use client";

import { Alert, Box, Button, Typography } from "@mui/joy";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MSALErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MSAL Error Boundary caught an error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            p: 3,
          }}
        >
          <Alert
            color="danger"
            variant="soft"
            sx={{ maxWidth: 600, textAlign: "center" }}
          >
            <Typography level="title-md" sx={{ mb: 1 }}>
              Authentication Error
            </Typography>
            <Typography level="body-sm" sx={{ mb: 2 }}>
              There was an issue loading the authentication system. This might
              be due to a network issue or browser security settings.
            </Typography>
            <Typography level="body-xs" sx={{ mb: 2, fontFamily: "monospace" }}>
              {this.state.error?.message}
            </Typography>
            <Button onClick={this.handleReload} size="sm">
              Reload Page
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}
