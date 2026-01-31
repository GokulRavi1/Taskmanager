"use client"

import { useState } from 'react';
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { WorkCompletionAnalytics } from "@/components/WorkCompletionAnalytics";
import { MonthlyProgressChart } from "@/components/MonthlyProgressChart";
import { cn } from '@/lib/utils';
import { BarChart3, CalendarCheck, CalendarDays } from 'lucide-react';

export default function AnalyticsPage() {
    const [activeTab, setActiveTab] = useState<'completion' | 'monthly' | 'patterns'>('completion');

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-border pb-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('completion')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                        activeTab === 'completion'
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <CalendarCheck className="w-4 h-4" />
                    Daily Progress
                </button>
                <button
                    onClick={() => setActiveTab('monthly')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                        activeTab === 'monthly'
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <CalendarDays className="w-4 h-4" />
                    Monthly Progress
                </button>
                <button
                    onClick={() => setActiveTab('patterns')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap",
                        activeTab === 'patterns'
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                    )}
                >
                    <BarChart3 className="w-4 h-4" />
                    Patterns & AI
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'completion' && <WorkCompletionAnalytics />}
            {activeTab === 'monthly' && <MonthlyProgressChart />}
            {activeTab === 'patterns' && <AnalyticsDashboard />}
        </div>
    );
}


