"use client"

import React from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { LogOut, User as UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";

export function Header() {
    const { user, logout } = useAuth();
    const pathname = usePathname();

    // Hide header content on auth pages for a cleaner look, or keep it minimal
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4 md:px-6 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2v20" /><path d="M2 12h20" /><path d="m4.93 4.93 14.14 14.14" /><path d="m19.07 4.93-14.14 14.14" /></svg>
                    </div>
                    <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">TaskFlow</span>
                </Link>

                {user && (
                    <nav className="hidden md:flex items-center gap-6 mx-6">
                        <Link href="/" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/" ? "text-foreground" : "text-muted-foreground")}>
                            Dashboard
                        </Link>
                        <Link href="/analytics" className={cn("text-sm font-medium transition-colors hover:text-primary", pathname === "/analytics" ? "text-foreground" : "text-muted-foreground")}>
                            Analytics
                        </Link>
                    </nav>
                )}

                <div className="flex items-center gap-4">
                    {user && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full border border-border/50">
                            <UserIcon className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Hi, {user.name}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <ThemeToggle />

                        {user && (
                            <button
                                onClick={logout}
                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
