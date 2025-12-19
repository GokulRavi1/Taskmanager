"use client"

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { TaskForm, ITaskData } from '@/components/TaskForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initialData, setInitialData] = useState<ITaskData | undefined>(undefined);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        const fetchTask = async () => {
            try {
                const res = await fetch(`/api/tasks/${id}`);
                if (res.ok) {
                    const task = await res.json();
                    // Map API Task to ITaskData
                    setInitialData({
                        title: task.title,
                        description: task.description || "",
                        date: task.date ? format(new Date(task.date), 'yyyy-MM-dd') : "",
                        startTime: task.startTime || "",
                        endTime: task.endTime || "",
                        notes: task.notes || "",
                        links: task.links || [],
                        category: task.category || "General"
                    });
                } else {
                    console.error("Failed to fetch task");
                    alert("Task not found");
                    router.push('/');
                }
            } catch (error) {
                console.error("Error fetching task:", error);
            } finally {
                setFetching(false);
            }
        };

        if (id) {
            fetchTask();
        }
    }, [id, router]);

    const handleUpdateTask = async (taskData: ITaskData) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData),
            });

            if (res.ok) {
                router.push('/'); // Redirect to home
                router.refresh(); // Ensure data is fresh
            } else {
                console.error("Failed to update task");
                alert("Failed to update task. Please try again.");
            }
        } catch (error) {
            console.error("Error updating task:", error);
            alert("Error updating task.");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading task...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-muted rounded-full transition-colors group">
                        <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Edit Work Item</h1>
                        <p className="text-muted-foreground">Update the details of your task</p>
                    </div>
                </div>

                {/* Form Container */}
                <div className="glass-card p-8 rounded-2xl border border-border/50 shadow-xl bg-card/30 backdrop-blur-xl">
                    {initialData && (
                        <TaskForm
                            initialData={initialData}
                            onSubmit={handleUpdateTask}
                            onCancel={() => router.back()}
                            isSubmitting={loading}
                            mode="edit"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
