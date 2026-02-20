import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptPal - Voice to AI Prompts",
  description: "Convert your voice to text and transform it into AI-ready prompts for ChatGPT, Claude, Gemini, and more.",
  keywords: ["voice transcription", "speech to text", "AI prompts", "prompt enhancement", "ChatGPT", "Claude"],
  authors: [{ name: "PromptPal" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "PromptPal - Voice to AI Prompts",
    description: "Convert your voice to text and transform it into AI-ready prompts",
    url: "https://chat.z.ai",
    siteName: "PromptPal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptPal - Voice to AI Prompts",
    description: "Convert your voice to text and transform it into AI-ready prompts",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
