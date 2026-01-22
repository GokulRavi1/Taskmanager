"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Define a minimal Task interface for the context to avoid circular dependency issues
// or duplication. Ideally imported from types.
interface Task {
    _id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    isCompleted: boolean;
    date?: string;
    category?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface TaskContextType {
    tasks: Task[];
    loading: boolean;
    refreshTasks: () => void;
}

const TaskContext = createContext<TaskContextType>({
    tasks: [],
    loading: false,
    refreshTasks: () => { },
});

export function TaskProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(0);

    const { user } = useAuth();

    const fetchTasks = useCallback(async () => {
        if (!user) return; // Don't fetch if not logged in

        setLoading(true);
        try {
            const res = await fetch('/api/tasks');
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchTasks();
        } else {
            setTasks([]); // Clear tasks on logout
        }
    }, [fetchTasks, lastUpdate, user]);

    const refreshTasks = useCallback(() => {
        setLastUpdate(Date.now());
    }, []);

    return (
        <TaskContext.Provider value={{ tasks, loading, refreshTasks }}>
            {children}
        </TaskContext.Provider>
    );
}

export const useTaskContext = () => useContext(TaskContext);
