"use client"

import { useState, useRef, useEffect } from "react";
import {
    MessageSquare, X, Send, Loader2, Sparkles,
    Bot, ChevronRight, ChevronLeft, Target,
    Zap, Brain, Coffee, GraduationCap
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTaskContext } from "@/context/TaskContext";

export function AgentSidebar() {
    const { user } = useAuth();
    const { tasks, refreshTasks } = useTaskContext();
    const [isOpen, setIsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<'chat' | 'actions'>('chat');

    // Chat State
    const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
        { role: 'model', content: "Hi! I'm your AI Agent. How can I help you optimize your workflow today? You can also say 'Schedule [task] for [date/time]' to create tasks!" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user' as const, content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            // Detect scheduling intent
            const schedulingKeywords = /\b(schedule|create task|add task|remind me|book|plan|set up)\b/i;
            const isSchedulingRequest = schedulingKeywords.test(text);

            if (isSchedulingRequest) {
                // Call schedule-task endpoint
                const res = await fetch('/api/ai/schedule-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text }),
                });

                const data = await res.json();

                if (data.success) {
                    setMessages(prev => [...prev, { role: 'model', content: data.message }]);
                    refreshTasks(); // Update the task list immediately
                } else {
                    setMessages(prev => [...prev, { role: 'model', content: data.message || data.error || "Failed to schedule task." }]);
                }
            } else {
                // Regular chat flow
                const taskContext = JSON.stringify(tasks.slice(0, 20).map(t => ({
                    title: t.title,
                    status: t.isCompleted ? 'Done' : 'Pending',
                    priority: t.priority
                })));

                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'chat',
                        payload: `CONTEXT: ${taskContext}\n\nUSER REQUEST: ${text}`,
                        history: messages
                    }),
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setMessages(prev => [...prev, { role: 'model', content: data.result }]);
            }
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "I encountered an error. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const runAction = (prompt: string, tabSwitch = true) => {
        if (tabSwitch) setActiveTab('chat');
        handleSend(prompt);
    };

    if (!user) return null;

    return (
        <div className={cn(
            "fixed right-0 top-[65px] bottom-0 bg-card border-l border-border transition-all duration-300 shadow-xl z-30 flex flex-col",
            isOpen ? "w-[350px]" : "w-12"
        )}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -left-3 top-6 bg-primary text-primary-foreground p-1 rounded-full shadow-md hover:bg-primary/90 transition-colors"
            >
                {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Sidebar Content */}
            {isOpen ? (
                <>
                    {/* Header Tabs */}
                    <div className="flex items-center p-2 border-b border-border bg-muted/30">
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-colors",
                                activeTab === 'chat' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                            )}
                        >
                            <MessageSquare className="w-4 h-4" />
                            Chat
                        </button>
                        <button
                            onClick={() => setActiveTab('actions')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-medium transition-colors",
                                activeTab === 'actions' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:bg-background/50"
                            )}
                        >
                            <Zap className="w-4 h-4" />
                            Actions
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">

                        {/* CHAT TAB */}
                        {activeTab === 'chat' && (
                            <div className="flex flex-col h-full">
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                                            <div className={cn(
                                                "max-w-[90%] rounded-2xl px-4 py-2 text-sm shadow-sm",
                                                msg.role === 'user'
                                                    ? "bg-primary text-primary-foreground rounded-br-none"
                                                    : "bg-muted text-foreground rounded-bl-none prose prose-sm dark:prose-invert"
                                            )}>
                                                {msg.role === 'model' ? (
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                ) : (
                                                    msg.content
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Thinking...
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 border-t border-border bg-background">
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask AI..."
                                            className="flex-1 bg-muted px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <button type="submit" disabled={loading || !input.trim()} className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* ACTIONS TAB */}
                        {activeTab === 'actions' && (
                            <div className="p-4 space-y-4 overflow-y-auto h-full">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    Deep Analysis
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ActionButton
                                        icon={<Target className="w-4 h-4 text-blue-500" />}
                                        title="Prioritize My Day"
                                        desc="Identify top 3 distinct tasks"
                                        onClick={() => runAction("Look at my tasks and tell me the Top 3 things I MUST do today. Be ruthless.")}
                                    />
                                    <ActionButton
                                        icon={<Brain className="w-4 h-4 text-purple-500" />}
                                        title="Find Blockers"
                                        desc="Analyze what's stuck"
                                        onClick={() => runAction("Analyze my pending tasks. Why am I stuck? Identify potential blockers and how to clear them.")}
                                    />
                                </div>

                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
                                    Wellbeing & Growth
                                </h3>
                                <div className="grid grid-cols-1 gap-2">
                                    <ActionButton
                                        icon={<Coffee className="w-4 h-4 text-orange-500" />}
                                        title="Suggest a Break"
                                        desc="Recharge strategy"
                                        onClick={() => runAction("I'm feeling verified. Suggest a 15-minute scientific break routine to recharge my dopamine.")}
                                    />
                                    <ActionButton
                                        icon={<GraduationCap className="w-4 h-4 text-green-500" />}
                                        title="Learning Path"
                                        desc="Skills based on tasks"
                                        onClick={() => runAction("Based on my recent coding tasks, what 1 specific skill should I learn next to level up? Provide a resource.")}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center py-4 gap-4">
                    <button onClick={() => setIsOpen(true)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                        <Bot className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}

function ActionButton({ icon, title, desc, onClick }: { icon: any, title: string, desc: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left group"
        >
            <div className="p-2 bg-background rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div>
                <div className="font-medium text-sm text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
        </button>
    )
}
