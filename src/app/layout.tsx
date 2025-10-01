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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
