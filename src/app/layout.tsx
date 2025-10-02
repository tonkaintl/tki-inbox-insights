import { MSALErrorBoundary } from "@/components/layout/MSALErrorBoundary";
import { Providers } from "@/components/layout/Providers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TKI Inbox Insights",
  description: "Smart newsletter processing for Office 365",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MSALErrorBoundary>
          <Providers>{children}</Providers>
        </MSALErrorBoundary>
      </body>
    </html>
  );
}
