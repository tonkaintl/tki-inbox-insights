"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  FormLabel,
  Link,
  Option,
  Select,
  Sheet,
  Switch,
  Table,
  Typography,
} from "@mui/joy";
import { useEffect, useState } from "react";

interface EnhancedLink {
  text: string;
  url: string;
  resolvedUrl?: string;
  domain: string;
  count: number;
  newsletters: string[];
  isResolved: boolean;
  resolutionStatus?: string;
}

interface ConsolidatedLinksData {
  linksByDomain: Record<string, EnhancedLink[]>;
  domains: string[];
  stats: {
    totalLinks: number;
    totalOccurrences: number;
    domainCounts: Record<string, number>;
    resolved: number;
    resolutionRequested: boolean;
  };
}

export default function ConsolidatedLinksContent() {
  const [data, setData] = useState<ConsolidatedLinksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [resolveUrls, setResolveUrls] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Initialize domain from URL params on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const domainParam = urlParams.get("domain");
    if (domainParam && domainParam !== "all") {
      setSelectedDomain(domainParam);
    }
  }, []);

  // Update URL when domain changes
  const updateUrlParams = (domain: string) => {
    const url = new URL(window.location.href);
    if (domain === "all") {
      url.searchParams.delete("domain");
    } else {
      url.searchParams.set("domain", domain);
    }
    window.history.replaceState({}, "", url.toString());
  };

  const fetchConsolidatedLinks = async (
    domain: string = "all",
    resolve: boolean = false
  ) => {
    try {
      // Cancel any existing request
      if (abortController) {
        abortController.abort();
      }

      const controller = new AbortController();
      setAbortController(controller);
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (domain !== "all") {
        params.set("domain", domain);
      }
      if (resolve) {
        params.set("resolve", "true");
      }

      const response = await fetch(`/api/links-enhanced?${params.toString()}`, {
        signal: controller.signal,
      });

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch links");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled - this is expected, don't show error
        return;
      }
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  useEffect(() => {
    fetchConsolidatedLinks(selectedDomain, resolveUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDomain, resolveUrls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const handleRefresh = () => {
    fetchConsolidatedLinks(selectedDomain, resolveUrls);
  };

  return (
    <Box>
      {/* Controls - Always visible */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box
          sx={{ display: "flex", gap: 3, alignItems: "end", flexWrap: "wrap" }}
        >
          <FormControl sx={{ minWidth: 200 }}>
            <FormLabel>Domain</FormLabel>
            <Select
              value={selectedDomain}
              onChange={(_, newDomain) => {
                const domain = newDomain as string;
                setSelectedDomain(domain);
                updateUrlParams(domain);
              }}
              disabled={loading}
            >
              <Option value="all">All Domains</Option>
              {data?.domains.map((domain) => (
                <Option key={domain} value={domain}>
                  {domain} ({data.stats.domainCounts[domain]})
                </Option>
              ))}
            </Select>
          </FormControl>

          <FormControl>
            <FormLabel>
              Resolve URLs{" "}
              {loading && resolveUrls && "(Loading - toggle to cancel)"}
            </FormLabel>
            <Switch
              checked={resolveUrls}
              onChange={(event) => {
                const newValue = event.target.checked;
                setResolveUrls(newValue);

                // If turning off during loading, cancel the request
                if (!newValue && loading && abortController) {
                  abortController.abort();
                  setLoading(false);
                  setAbortController(null);
                }
              }}
            />
          </FormControl>

          <Button
            onClick={handleRefresh}
            variant="outlined"
            size="md"
            disabled={loading}
            startDecorator={loading ? <CircularProgress size="sm" /> : "🔄"}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </Box>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card sx={{ mb: 3, p: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <CircularProgress size="lg" />
            <Typography level="body-lg">
              {resolveUrls
                ? "Resolving URLs..."
                : "Loading consolidated links..."}
            </Typography>
          </Box>
        </Card>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert color="danger" sx={{ mb: 3 }}>
          <Typography level="title-md" sx={{ mb: 1 }}>
            Error Loading Consolidated Links
          </Typography>
          <Typography level="body-sm" sx={{ mb: 2 }}>
            {error}
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button size="sm" onClick={handleRefresh}>
              Retry
            </Button>
            <Button size="sm" variant="soft" component="a" href="/results">
              ← Back to Results
            </Button>
          </Box>
        </Alert>
      )}

      {/* Content - Show when not loading and has data */}
      {!loading && data && (
        <>
          {/* Summary Stats */}

          {/* Summary Stats */}
          <Card sx={{ mb: 3, p: 3 }}>
            <Typography level="h4" sx={{ mb: 2 }}>
              📊 Summary
            </Typography>
            <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <Box>
                <Typography level="title-lg">
                  {data.stats.totalLinks}
                </Typography>
                <Typography level="body-sm">Unique Link Texts</Typography>
              </Box>
              <Box>
                <Typography level="title-lg">
                  {data.stats.totalOccurrences}
                </Typography>
                <Typography level="body-sm">Total Occurrences</Typography>
              </Box>
              <Box>
                <Typography level="title-lg">{data.domains.length}</Typography>
                <Typography level="body-sm">Unique Domains</Typography>
              </Box>
              <Box>
                <Typography level="title-lg">{data.stats.resolved}</Typography>
                <Typography level="body-sm">Resolved URLs</Typography>
              </Box>
            </Box>
          </Card>

          {/* Links by Domain */}
          {Object.entries(data.linksByDomain).map(([domain, links]) => (
            <Card key={domain} sx={{ mb: 3, p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Typography level="h3" sx={{ mr: 2 }}>
                  {domain}
                </Typography>
                <Chip size="sm" variant="outlined">
                  {links.length} links
                </Chip>
              </Box>

              <Sheet sx={{ overflow: "auto" }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Link Text</th>
                      <th>Count</th>
                      <th>URL</th>
                      <th>Resolved URL</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link, index) => (
                      <tr key={index}>
                        <td>
                          <Typography
                            level="body-sm"
                            sx={{ fontWeight: "bold" }}
                          >
                            {link.text.length > 60
                              ? `${link.text.substring(0, 60)}...`
                              : link.text}
                          </Typography>
                          {link.count > 1 && (
                            <Typography
                              level="body-xs"
                              sx={{ color: "text.secondary", mt: 0.5 }}
                            >
                              Found in {link.newsletters.length} newsletters
                            </Typography>
                          )}
                        </td>
                        <td>
                          <Chip
                            size="sm"
                            variant={link.count > 1 ? "solid" : "soft"}
                            color={link.count > 1 ? "primary" : "neutral"}
                          >
                            {link.count}x
                          </Chip>
                        </td>
                        <td>
                          <Link
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              maxWidth: "250px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Typography level="body-sm">
                              {new URL(link.url).hostname}
                            </Typography>
                            <Typography level="body-sm">↗</Typography>
                          </Link>
                        </td>
                        <td>
                          {link.resolvedUrl && link.resolvedUrl !== link.url ? (
                            <Link
                              href={link.resolvedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                maxWidth: "250px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <Typography level="body-sm">
                                {new URL(link.resolvedUrl).hostname}
                              </Typography>
                              <Typography level="body-sm">↗</Typography>
                            </Link>
                          ) : link.resolvedUrl === link.url ? (
                            <Typography level="body-xs" color="neutral">
                              Same as original
                            </Typography>
                          ) : (
                            <Typography level="body-xs" color="warning">
                              Not resolved
                            </Typography>
                          )}
                        </td>
                        <td>
                          {link.resolutionStatus && (
                            <Chip
                              size="sm"
                              color={
                                link.resolutionStatus === "resolved"
                                  ? "success"
                                  : link.resolutionStatus === "no_redirect"
                                  ? "neutral"
                                  : link.resolutionStatus === "failed"
                                  ? "danger"
                                  : "warning"
                              }
                              variant="soft"
                            >
                              {link.resolutionStatus.replace("_", " ")}
                            </Chip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Sheet>
            </Card>
          ))}
        </>
      )}
    </Box>
  );
}
