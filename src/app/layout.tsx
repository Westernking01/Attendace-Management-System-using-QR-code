import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AttendQ - Federal Polytechnic Ado Ekiti",
  description:
    "QR code-based attendance tracking system for Federal Polytechnic Ado Ekiti. Manage students, lecturers, courses, and track attendance effortlessly.",
  keywords: [
    "attendance",
    "QR code",
    "school",
    "education",
    "tracking",
    "students",
    "lecturers",
  ],
  authors: [{ name: "Federal Polytechnic Ado Ekiti" }],
  icons: {
    icon: "/images/fpa-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
