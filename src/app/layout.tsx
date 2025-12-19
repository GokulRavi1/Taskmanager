import type { Metadata } from "next";
import { Inter } from "next/font/google"; // or Outfit if I want premium
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/Header";
import { AgentSidebar } from "@/components/AgentSidebar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pro Task Manager",
  description: "Track your daily productivity",
};

import { AuthProvider } from "@/context/AuthContext";
import { TaskProvider } from "@/context/TaskContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.className
      )}>
        <AuthProvider>
          <TaskProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex flex-col min-h-screen">
                <Header />
                <div className="flex flex-1">
                  <main className="flex-1 container py-6 max-w-7xl mx-auto px-4 md:px-6">
                    {children}
                  </main>
                  <AgentSidebar />
                </div>
              </div>
            </ThemeProvider>
          </TaskProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
