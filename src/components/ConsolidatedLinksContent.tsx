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
  Tooltip,
  Typography,
} from "@mui/joy";
import { useEffect, useState } from "react";

interface EnhancedLink {
  text: string;
  url: string;
  resolvedUrl?: string;
  category: string;
  count: number;
  newsletters: string[];
  isResolved: boolean;
  resolutionStatus?: string;
}

interface ConsolidatedLinksData {
  linksByCategory: Record<string, EnhancedLink[]>;
  categories: string[];
  stats: {
    totalLinks: number;
    totalOccurrences: number;
    categoryCounts: Record<string, number>;
    resolved: number;
    resolutionRequested: boolean;
  };
}

export function ConsolidatedLinksContent() {
  const [data, setData] = useState<ConsolidatedLinksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [resolveUrls, setResolveUrls] = useState(false);

  const fetchConsolidatedLinks = async (
    category: string = "all",
    resolve: boolean = false
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (category !== "all") {
        params.set("category", category);
      }
      if (resolve) {
        params.set("resolve", "true");
      }

      const response = await fetch(`/api/links-enhanced?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch links");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsolidatedLinks(selectedCategory, resolveUrls);
  }, [selectedCategory, resolveUrls]);

  const handleRefresh = () => {
    fetchConsolidatedLinks(selectedCategory, resolveUrls);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress size="lg" />
        <Typography sx={{ ml: 2 }}>Loading consolidated links...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Alert color="danger" sx={{ mb: 3 }}>
        <Typography level="title-md" sx={{ mb: 1 }}>
          Error Loading Consolidated Links
        </Typography>
        <Typography level="body-sm" sx={{ mb: 2 }}>
          {error || "An unknown error occurred while loading the links."}
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
    );
  }

  return (
    <Box>
      {/* Controls */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box
          sx={{ display: "flex", gap: 3, alignItems: "end", flexWrap: "wrap" }}
        >
          <FormControl sx={{ minWidth: 200 }}>
            <FormLabel>Category</FormLabel>
            <Select
              value={selectedCategory}
              onChange={(_, value) => setSelectedCategory(value || "all")}
            >
              <Option value="all">All Categories</Option>
              {data.categories.map((category) => (
                <Option key={category} value={category}>
                  {category} ({data.stats.categoryCounts[category]})
                </Option>
              ))}
            </Select>
          </FormControl>

          <FormControl orientation="horizontal">
            <FormLabel>Resolve URLs</FormLabel>
            <Tooltip title="Resolve redirect URLs to see final destinations (slower)">
              <Switch
                checked={resolveUrls}
                onChange={(event) => setResolveUrls(event.target.checked)}
              />
            </Tooltip>
          </FormControl>

          <Button onClick={handleRefresh} variant="outlined">
            🔄 Refresh
          </Button>
        </Box>
      </Card>

      {/* Summary Stats */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Typography level="h3" sx={{ mb: 2 }}>
          📈 Summary
        </Typography>
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <Box>
            <Typography level="title-lg">{data.stats.totalLinks}</Typography>
            <Typography level="body-sm">Unique Link Texts</Typography>
          </Box>
          <Box>
            <Typography level="title-lg">
              {data.stats.totalOccurrences}
            </Typography>
            <Typography level="body-sm">Total Occurrences</Typography>
          </Box>
          <Box>
            <Typography level="title-lg">{data.categories.length}</Typography>
            <Typography level="body-sm">Link Categories</Typography>
          </Box>
          {resolveUrls && (
            <Box>
              <Typography level="title-lg">{data.stats.resolved}</Typography>
              <Typography level="body-sm">Resolved URLs</Typography>
            </Box>
          )}
        </Box>
      </Card>

      {/* Links by Category */}
      {Object.entries(data.linksByCategory).map(([category, links]) => (
        <Card key={category} sx={{ mb: 3, p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography level="h3" sx={{ mr: 2 }}>
              {category.toUpperCase()}
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
                  {resolveUrls && <th>Resolved URL</th>}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link, index) => (
                  <tr key={index}>
                    <td>
                      <Typography level="body-sm" sx={{ fontWeight: "bold" }}>
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
                    {resolveUrls && (
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
                        ) : (
                          <Typography level="body-xs" color="neutral">
                            Same as original
                          </Typography>
                        )}
                      </td>
                    )}
                    <td>
                      {resolveUrls && link.resolutionStatus && (
                        <Chip
                          size="sm"
                          color={
                            link.resolutionStatus === "resolved"
                              ? "success"
                              : link.resolutionStatus === "no_redirect"
                              ? "neutral"
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

      {data.stats.totalLinks === 0 && (
        <Alert color="warning">
          <Typography>No links found in any newsletters.</Typography>
        </Alert>
      )}
    </Box>
  );
}

export default ConsolidatedLinksContent;
