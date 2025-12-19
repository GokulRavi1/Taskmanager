"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TaskForm, ITaskData } from '@/components/TaskForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { useSearchParams } from 'next/navigation';

import { useTaskContext } from '@/context/TaskContext';

export default function AddTaskPage() {
    const router = useRouter();
    const { refreshTasks } = useTaskContext();
    const searchParams = useSearchParams();
    const dateParam = searchParams.get('date');
    const [loading, setLoading] = useState(false);

    const initialData = dateParam ? {
        title: '',
        description: '',
        date: dateParam,
        startTime: '',
        endTime: '',
        notes: '',
        links: [],
        category: 'General'
    } : undefined;

    const handleCreateTask = async (taskData: ITaskData) => {
        setLoading(true);
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData),
            });

            if (res.ok) {
                refreshTasks(); // Update global context immediately
                router.push('/'); // Redirect to home
            } else {
                console.error("Failed to create task");
                alert("Failed to create task. Please try again.");
            }
        } catch (error) {
            console.error("Error creating task:", error);
            alert("Error creating task.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-6 md:p-12">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-muted rounded-full transition-colors group">
                        <ArrowLeft className="w-6 h-6 text-muted-foreground group-hover:text-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">New Work Item</h1>
                        <p className="text-muted-foreground">Create a new task to track your progress</p>
                    </div>
                </div>

                {/* Form Container */}
                <div className="glass-card p-8 rounded-2xl border border-border/50 shadow-xl bg-card/30 backdrop-blur-xl">
                    <TaskForm
                        initialData={initialData}
                        onSubmit={handleCreateTask}
                        onCancel={() => router.back()}
                        isSubmitting={loading}
                    />
                </div>
            </div>
        </div>
    );
}
