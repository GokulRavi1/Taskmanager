import { NextRequest, NextResponse } from "next/server";
import { chatWithCoach, parseTaskFromNaturalLanguage, breakdownTask } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const { action, payload, history } = await req.json();

        let result;
        switch (action) {
            case "chat":
                result = await chatWithCoach(payload, history);
                break;
            case "parse":
                result = await parseTaskFromNaturalLanguage(payload);
                break;
            case "breakdown":
                result = await breakdownTask(payload);
                break;
            default:
                return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ result });
    } catch (error: unknown) {
        console.error("AI API Error:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal AI Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
