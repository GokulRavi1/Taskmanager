"use client"

import { useRef, useState, useEffect } from "react";
import { MessageSquare, X, Send, Loader2, Minimize2, Maximize2, Sparkles, AlertCircle, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface Message {
    role: 'user' | 'model';
    content: string;
}

export function AICoach() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    if (!user) return null;

    const handlePlanDay = async () => {
        setLoading(true);
        try {
            // Fetch today's tasks to give context to the AI
            const today = new Date().toISOString().split('T')[0];
            const res = await fetch(`/api/tasks?date=${today}`);
            const tasks = await res.json();

            interface ITask {
                title: string;
                description?: string;
                priority?: string;
                notes?: string;
                isCompleted: boolean;
            }

            const taskContext = Array.isArray(tasks) && tasks.length > 0
                ? JSON.stringify(tasks.map((t: ITask) => ({
                    title: t.title,
                    description: t.description,
                    priority: t.priority || 'Medium',
                    notes: t.notes,
                    status: t.isCompleted ? 'Done' : 'Pending'
                })))
                : "No tasks found for today.";

            const prompt = `Here is my task list for today (${today}):\n${taskContext}\n\nPlease analyze these tasks and create a realistic daily plan, highlighting the top 3 priorities.`;

            setMessages(prev => [...prev, { role: 'user', content: "Plan my day based on my actual tasks." }]);

            const aiRes = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: prompt,
                    history: []
                }),
            });

            const data = await aiRes.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'model', content: data.result }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I couldn't retrieve your tasks to plan the day. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            // Simplify history for the API to just role/parts if needed, 
            // but for now passing full message objects as history context
            // Google Gemini SDK expects { role: 'user' | 'model', parts: [{ text: string }] }
            // We map it here or in the backend. Let's send raw and let backend handle mapping if needed.
            // Actually, for simple chat usage, just sending text is often enough, but context matters.

            const historyForApi = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }));

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: userMsg,
                    history: historyForApi
                }),
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'model', content: data.result }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I'm having trouble connecting right now. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleWeeklyAnalysis = async () => {
        setLoading(true);
        try {
            // Fetch tasks for the last 7 days
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 7);

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            const res = await fetch(`/api/tasks?start=${startStr}&end=${endStr}`);
            const tasks = await res.json();

            // Calculate simple stats to help the AI
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((t: any) => t.isCompleted).length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // Optimize context: Limit to last 50 tasks to save tokens
            const recentTasks = tasks.slice(0, 50);

            const taskContext = Array.isArray(recentTasks) && recentTasks.length > 0
                ? JSON.stringify(recentTasks.map((t: any) => ({
                    title: t.title,
                    status: t.isCompleted ? 'Done' : 'Pending',
                    date: t.date,
                    category: t.category
                })))
                : "No tasks found for this week.";

            const prompt = `
WEEKLY PRODUCTIVITY ANALYSIS REQUEST
Period: ${startStr} to ${endStr}

QUANTITATIVE DATA:
- Total Tasks: ${totalTasks}
- Completed: ${completedTasks}
- Completion Rate: ${completionRate}%

TASK LOG:
${taskContext}

INSTRUCTIONS:
Please provide a detailed, structured weekly review in Markdown format.
1. **Summary**: A brief 2-sentence summary of my performance.
2. **Highlights**: Bullet points of what I accomplished (if any).
3. **Analysis**: meaningful insights about my work patterns.
4. **Actionable Feedback**: 2 specific things I can do better next week.

IMPORTANT:
- Use bolding for emphasis.
- If there are NO tasks, provide a "Clean Slate" motivation and 3 tips to get started next week.
- Keep the tone professional but encouraging.
`;

            setMessages(prev => [...prev, { role: 'user', content: "Analyze my weekly productivity." }]);

            const aiRes = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'chat',
                    payload: prompt,
                    history: []
                }),
            });

            const data = await aiRes.json();
            if (data.error) throw new Error(data.error);

            setMessages(prev => [...prev, { role: 'model', content: data.result }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I couldn't retrieve your weekly data. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Trigger Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={cn(
                    "fixed bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-xl hover:scale-105 transition-all z-50",
                    isOpen && "hidden"
                )}
            >
                <Bot className="w-6 h-6" />
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-[380px] h-[600px] flex flex-col glass-card border border-border/50 rounded-2xl shadow-2xl z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-border/50 bg-primary/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">AI Coach</h3>
                                <p className="text-xs text-muted-foreground">Productivity & Planning</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-muted/50 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2 p-4">
                                <Bot className="w-12 h-12 opacity-20" />
                                <p className="text-sm">Hi {user.name}! I'm here to help you plan your day, breakdown tasks, or analyze your productivity.</p>
                                <div className="flex flex-wrap gap-2 justify-center mt-4">
                                    <button
                                        onClick={handlePlanDay}
                                        className="text-xs border border-border/50 px-3 py-1.5 rounded-full hover:bg-primary/5 transition-colors"
                                    >
                                        Plan my day
                                    </button>
                                    <button
                                        onClick={handleWeeklyAnalysis}
                                        className="text-xs border border-border/50 px-3 py-1.5 rounded-full hover:bg-primary/5 transition-colors"
                                    >
                                        Weekly Analysis
                                    </button>
                                </div>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "flex w-full",
                                    msg.role === 'user' ? "justify-end" : "justify-start"
                                )}
                            >
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                                        msg.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-muted text-foreground rounded-bl-none"
                                    )}
                                >
                                    <div className={cn(
                                        "prose prose-sm max-w-none dark:prose-invert",
                                        "prose-headings:mb-2 prose-headings:mt-2 prose-p:mb-2 prose-p:mt-0",
                                        "prose-li:my-0 prose-ul:my-2 prose-ol:my-2",
                                        msg.role === 'user' ? "text-primary-foreground" : "text-foreground"
                                    )}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-2 text-sm flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-border/50 bg-background/50 backdrop-blur-sm">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex items-center gap-2"
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask me anything..."
                                className="flex-1 bg-muted/50 border-0 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary/50 outline-none placeholder:text-muted-foreground/50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || loading}
                                className="p-2.5 bg-primary text-primary-foreground rounded-xl disabled:opacity-50 hover:opacity-90 transition-opacity"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
