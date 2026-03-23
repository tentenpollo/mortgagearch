import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MortgageArch — Broker Document Intake",
  description:
    "Secure mortgage document collection and review platform for brokers and borrowers.",
  keywords: ["mortgage", "broker", "document", "upload", "review"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
