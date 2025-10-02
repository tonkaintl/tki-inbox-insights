import { ResolvedUrl } from "../database/models";
import connectToDatabase from "../database/mongoose";

interface UrlResolutionResult {
  originalUrl: string;
  resolvedUrl: string;
  status: "resolved" | "failed" | "timeout" | "no_redirect";
  fromCache: boolean;
}

export class UrlResolverService {
  private static readonly MAX_REDIRECTS = 10;
  private static readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private static readonly RETRY_AFTER_HOURS = 24; // Retry failed URLs after 24 hours

  /**
   * Resolve a single URL, using cache if available
   */
  static async resolveUrl(originalUrl: string): Promise<UrlResolutionResult> {
    await connectToDatabase();

    // Check cache first
    const cached = await this.getCachedResolution(originalUrl);
    if (cached) {
      return {
        originalUrl,
        resolvedUrl: cached.resolved_url,
        status: cached.status,
        fromCache: true,
      };
    }

    // Resolve URL via HTTP
    const result = await this.performHttpResolution(originalUrl);

    // Cache the result
    await this.cacheResolution(originalUrl, result);

    return {
      originalUrl,
      resolvedUrl: result.resolvedUrl,
      status: result.status,
      fromCache: false,
    };
  }

  /**
   * Resolve multiple URLs efficiently with batching
   */
  static async resolveUrls(urls: string[]): Promise<UrlResolutionResult[]> {
    const uniqueUrls = [...new Set(urls)]; // Remove duplicates
    const results: UrlResolutionResult[] = [];

    // Process URLs in batches to avoid overwhelming external servers
    const batchSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      const batchPromises = batch.map((url) => this.resolveUrl(url));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          // Handle failed resolution
          results.push({
            originalUrl: batch[index],
            resolvedUrl: batch[index],
            status: "failed",
            fromCache: false,
          });
        }
      });

      // Small delay between batches to be respectful
      if (i + batchSize < uniqueUrls.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Check if we have a cached resolution for this URL
   */
  private static async getCachedResolution(originalUrl: string) {
    const cached = await ResolvedUrl.findOne({ original_url: originalUrl });

    if (!cached) return null;

    // If it's a failed resolution, check if we should retry
    if (cached.status === "failed" || cached.status === "timeout") {
      const hoursSinceLastAttempt =
        (Date.now() - cached.last_attempt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastAttempt < this.RETRY_AFTER_HOURS) {
        return cached; // Still within retry window, use cached result
      }

      // Time to retry, return null to trigger new resolution
      return null;
    }

    return cached;
  }

  /**
   * Perform HTTP resolution following redirects
   */
  private static async performHttpResolution(originalUrl: string): Promise<{
    resolvedUrl: string;
    status: "resolved" | "failed" | "timeout" | "no_redirect";
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.REQUEST_TIMEOUT
      );

      const response = await fetch(originalUrl, {
        method: "HEAD", // Use HEAD to avoid downloading content
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; TKI-Inbox-Insights/1.0)",
        },
      });

      clearTimeout(timeoutId);

      const finalUrl = response.url;

      // Check if URL actually changed (was redirected)
      if (finalUrl === originalUrl) {
        return {
          resolvedUrl: originalUrl,
          status: "no_redirect",
        };
      }

      return {
        resolvedUrl: finalUrl,
        status: "resolved",
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          resolvedUrl: originalUrl,
          status: "timeout",
        };
      }

      console.warn(`Failed to resolve URL ${originalUrl}:`, error);
      return {
        resolvedUrl: originalUrl,
        status: "failed",
      };
    }
  }

  /**
   * Cache the resolution result
   */
  private static async cacheResolution(
    originalUrl: string,
    result: { resolvedUrl: string; status: string }
  ) {
    try {
      await ResolvedUrl.findOneAndUpdate(
        { original_url: originalUrl },
        {
          $set: {
            resolved_url: result.resolvedUrl,
            status: result.status,
            last_attempt: new Date(),
          },
          $inc: { attempts: 1 },
        },
        {
          upsert: true,
          new: true,
        }
      );
    } catch (error) {
      console.warn(`Failed to cache URL resolution for ${originalUrl}:`, error);
    }
  }

  /**
   * Get resolution statistics
   */
  static async getStats() {
    await connectToDatabase();

    const stats = await ResolvedUrl.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await ResolvedUrl.countDocuments();

    return {
      total,
      byStatus: stats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Clean up old failed resolutions (older than 30 days)
   */
  static async cleanup() {
    await connectToDatabase();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await ResolvedUrl.deleteMany({
      status: { $in: ["failed", "timeout"] },
      last_attempt: { $lt: thirtyDaysAgo },
    });

    return result.deletedCount;
  }
}
