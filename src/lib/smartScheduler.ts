import { IScheduleSlot } from '@/models/Schedule';

/**
 * Smart Scheduler - Hybrid approach for task scheduling
 * 1. Rule-based keyword matching (zero LLM cost)
 * 2. LLM fallback for ambiguous tasks (minimal tokens)
 */

export interface ScheduleMatch {
    slot: IScheduleSlot;
    matchedKeyword: string;
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Default schedule template based on user's provided schedule
 */
export const DEFAULT_SCHEDULE_SLOTS: IScheduleSlot[] = [
    {
        category: 'Marktiz',
        startTime: '10:00',
        endTime: '14:00',
        keywords: ['marktiz', 'startup', 'product', 'feature', 'deploy', 'backend', 'frontend', 'api'],
        description: 'Main startup work',
        priority: 10,
        daysOfWeek: [],
        color: '#6366f1', // Indigo
    },
    {
        category: 'Bug Bounty',
        startTime: '14:00',
        endTime: '16:00',
        keywords: ['bug bounty', 'bounty', 'security', 'vulnerability', 'pentest', 'hack', 'exploit', 'xss', 'sqli'],
        description: 'Bug bounty hunting',
        priority: 8,
        daysOfWeek: [],
        color: '#ef4444', // Red
    },
    {
        category: 'Gymlingoo',
        startTime: '16:00',
        endTime: '18:00',
        keywords: ['gym', 'workout', 'exercise', 'fitness', 'content', 'video', 'youtube', 'gymlingoo', 'recording'],
        description: 'Gym + Content Creation',
        priority: 7,
        daysOfWeek: [],
        color: '#22c55e', // Green
    },
    {
        category: 'Break',
        startTime: '18:00',
        endTime: '18:30',
        keywords: ['break', 'rest', 'food', 'lunch', 'dinner', 'snack'],
        description: 'Food/Rest',
        priority: 1,
        daysOfWeek: [],
        color: '#f59e0b', // Amber
    },
    {
        category: 'Marktiz',
        startTime: '18:30',
        endTime: '22:30',
        keywords: ['marktiz', 'startup', 'product', 'feature', 'deploy', 'backend', 'frontend', 'api'],
        description: 'Second session',
        priority: 10,
        daysOfWeek: [],
        color: '#6366f1', // Indigo
    },
    {
        category: 'Gymlingoo',
        startTime: '22:30',
        endTime: '00:30',
        keywords: ['gymlingoo', 'coding', 'app', 'mobile', 'flutter', 'react native'],
        description: 'Gymlingoo coding session',
        priority: 7,
        daysOfWeek: [],
        color: '#22c55e', // Green
    },
    {
        category: 'Bug Bounty',
        startTime: '00:30',
        endTime: '02:30',
        keywords: ['bug bounty', 'bounty', 'security', 'vulnerability', 'pentest', 'hack'],
        description: 'Bug bounty second session',
        priority: 8,
        daysOfWeek: [],
        color: '#ef4444', // Red
    },
    {
        category: 'Sleep',
        startTime: '02:30',
        endTime: '10:00',
        keywords: ['sleep', 'rest', 'nap'],
        description: 'Rest',
        priority: 0,
        daysOfWeek: [],
        color: '#64748b', // Slate
    },
];

/**
 * Find the best matching slot based on keywords in the task title/description
 * Uses longest keyword match for better specificity
 */
export function findSlotByKeywords(
    taskText: string,
    slots: IScheduleSlot[]
): ScheduleMatch | null {
    const normalizedText = taskText.toLowerCase();

    let bestMatch: ScheduleMatch | null = null;
    let longestMatchLength = 0;

    for (const slot of slots) {
        for (const keyword of slot.keywords) {
            const normalizedKeyword = keyword.toLowerCase();

            if (normalizedText.includes(normalizedKeyword)) {
                // Prefer longer keyword matches (more specific)
                // Also consider priority when match lengths are equal
                const shouldUpdate =
                    normalizedKeyword.length > longestMatchLength ||
                    (normalizedKeyword.length === longestMatchLength &&
                        slot.priority > (bestMatch?.slot.priority || 0));

                if (shouldUpdate) {
                    longestMatchLength = normalizedKeyword.length;
                    bestMatch = {
                        slot,
                        matchedKeyword: keyword,
                        confidence: normalizedKeyword.length >= 5 ? 'high' : 'medium',
                    };
                }
            }
        }
    }

    return bestMatch;
}

/**
 * Get all available categories from slots
 */
export function getCategories(slots: IScheduleSlot[]): string[] {
    const categories = new Set<string>();
    for (const slot of slots) {
        categories.add(slot.category);
    }
    return Array.from(categories);
}

/**
 * Get slots for a specific category
 */
export function getSlotsForCategory(
    category: string,
    slots: IScheduleSlot[]
): IScheduleSlot[] {
    return slots.filter(slot =>
        slot.category.toLowerCase() === category.toLowerCase()
    );
}

/**
 * Get the next available time slot for a category on a given date
 * Considers current time to find the next upcoming slot
 */
export function getNextAvailableSlot(
    category: string,
    slots: IScheduleSlot[],
    currentTime?: string // HH:MM format
): IScheduleSlot | null {
    const categorySlots = getSlotsForCategory(category, slots);

    if (categorySlots.length === 0) return null;

    if (!currentTime) {
        // Return the first slot for this category
        return categorySlots[0];
    }

    // Parse current time
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    // Find next slot after current time
    for (const slot of categorySlots) {
        const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMinute;

        if (slotMinutes > currentMinutes) {
            return slot;
        }
    }

    // If no slot found after current time, return first slot (for next day)
    return categorySlots[0];
}

/**
 * Build a minimal prompt for LLM classification
 * Designed for minimum token consumption (~50-100 tokens)
 */
export function buildClassificationPrompt(
    taskTitle: string,
    categories: string[]
): string {
    return `Classify this task into ONE category.
Task: "${taskTitle}"
Categories: ${categories.join(', ')}
Reply with ONLY the category name, nothing else.`;
}

/**
 * Parse LLM response to extract category
 */
export function parseClassificationResponse(
    response: string,
    validCategories: string[]
): string | null {
    const normalized = response.trim().toLowerCase();

    for (const category of validCategories) {
        if (normalized.includes(category.toLowerCase())) {
            return category;
        }
    }

    return null;
}

/**
 * Smart schedule assignment - main entry point
 */
export interface SmartScheduleResult {
    category: string;
    startTime: string;
    endTime: string;
    matchMethod: 'keyword' | 'llm' | 'manual';
    confidence: 'high' | 'medium' | 'low';
    matchedKeyword?: string;
}

export async function smartScheduleTask(
    taskTitle: string,
    taskDescription: string | undefined,
    slots: IScheduleSlot[],
    useLLMFallback: boolean,
    llmClassifier?: (prompt: string) => Promise<string>
): Promise<SmartScheduleResult | null> {
    // Combine title and description for matching
    const searchText = `${taskTitle} ${taskDescription || ''}`;

    // Step 1: Try keyword matching (zero LLM cost)
    const keywordMatch = findSlotByKeywords(searchText, slots);

    if (keywordMatch) {
        return {
            category: keywordMatch.slot.category,
            startTime: keywordMatch.slot.startTime,
            endTime: keywordMatch.slot.endTime,
            matchMethod: 'keyword',
            confidence: keywordMatch.confidence,
            matchedKeyword: keywordMatch.matchedKeyword,
        };
    }

    // Step 2: LLM fallback (if enabled)
    if (useLLMFallback && llmClassifier) {
        const categories = getCategories(slots);
        const prompt = buildClassificationPrompt(taskTitle, categories);

        try {
            const response = await llmClassifier(prompt);
            const category = parseClassificationResponse(response, categories);

            if (category) {
                const slot = getNextAvailableSlot(category, slots);
                if (slot) {
                    return {
                        category: slot.category,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        matchMethod: 'llm',
                        confidence: 'medium',
                    };
                }
            }
        } catch (error) {
            console.error('LLM classification failed:', error);
        }
    }

    // No match found
    return null;
}

/**
 * Get schedule slot for a specific time of day
 */
export function getSlotForTime(
    time: string, // HH:MM format
    slots: IScheduleSlot[],
    dayOfWeek?: number // 0-6, Sunday = 0
): IScheduleSlot | null {
    const [hour, minute] = time.split(':').map(Number);
    const timeInMinutes = hour * 60 + minute;

    for (const slot of slots) {
        // Check day of week if specified
        if (dayOfWeek !== undefined && slot.daysOfWeek.length > 0) {
            if (!slot.daysOfWeek.includes(dayOfWeek)) {
                continue;
            }
        }

        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        let startInMinutes = startHour * 60 + startMinute;
        let endInMinutes = endHour * 60 + endMinute;

        // Handle overnight slots (e.g., 22:30 - 00:30)
        if (endInMinutes < startInMinutes) {
            // Slot crosses midnight
            if (timeInMinutes >= startInMinutes || timeInMinutes < endInMinutes) {
                return slot;
            }
        } else {
            if (timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes) {
                return slot;
            }
        }
    }

    return null;
}
