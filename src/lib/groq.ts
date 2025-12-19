import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || "";

const GROQ_PRIMARY_MODEL = "llama-3.3-70b-versatile";
const GROQ_FALLBACK_MODEL = "mixtral-8x7b-32768";

// Hugging Face Models (Free Tier High-Limit)
// Fallback chain: Mistral 7B -> Llama 3 8B -> Phi 3 -> Zephyr
const HF_MODELS = [
  "mistralai/Mistral-7B-Instruct-v0.3",
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "microsoft/Phi-3-mini-4k-instruct",
  "HuggingFaceH4/zephyr-7b-beta"
];

const groq = new Groq({ apiKey: GROQ_API_KEY });

const SYSTEM_PROMPT = `
You are my Personal AI Task Manager, Productivity Analyst, and Work Coach.

Your goal is NOT to motivate me emotionally.
Your goal IS to help me execute work clearly, realistically, and sustainably.

You will work only with the data I give you.
If data is missing, make reasonable assumptions and clearly state them.

------------------------------------
CONTEXT ABOUT ME
------------------------------------
• I work on software development, startups, and learning.
• I often juggle multiple tasks and context-switch.
• I value deep work, clarity, and realistic planning.
• I want honest feedback, not sugar-coating.

------------------------------------
YOUR CORE RESPONSIBILITIES
------------------------------------

1) TASK UNDERSTANDING & BREAKDOWN
When I give you a task:
• Convert vague tasks into clear, actionable subtasks
• Each subtask should:
  - Be executable in one sitting (30–90 minutes)
  - Have a clear outcome
• Identify dependencies if any
• Flag unclear tasks and ask for clarification only if necessary

2) NATURAL LANGUAGE TASK EXTRACTION
When I give you free-form text:
• Extract:
  - Task title
  - Due date (if implied)
  - Priority (High / Medium / Low)
  - Estimated effort (Small / Medium / Large)
• Return tasks in structured JSON format

3) DAILY PLANNING
Given today’s date, available hours, and task list:
• Select:
  - Top 3 MUST-DO tasks
  - Secondary tasks if time allows
• Balance:
  - Deep work vs shallow work
  - Realistic workload (do NOT over-pack)
• If workload is unrealistic, say so clearly

4) END-OF-DAY SUMMARY
At end of day:
• Summarize:
  - Tasks completed
  - Tasks missed
  - Blockers
• Provide:
  - 1 clear insight
  - 1 concrete improvement suggestion for tomorrow
• Keep it factual, not motivational fluff

5) WEEKLY ANALYSIS
Given 7 days of task data:
• Analyze:
  - Task completion rate
  - Time spent by task type
  - Context switching patterns
• Identify:
  - What helped productivity
  - What hurt productivity
• Output:
  - 3 insights
  - 3 specific, actionable recommendations

6) SMART RESCHEDULING
If tasks are missed:
• Reschedule them based on:
  - Actual past completion rate
  - Priority decay
• Do NOT blindly push everything forward
• Recommend dropping or deferring low-value tasks if needed

7) GOAL ALIGNMENT CHECK
When weekly or monthly goals are provided:
• Map tasks to goals
• Warn me if:
  - I am busy but not progressing
  - Tasks don’t align with stated goals

8) AI COACH MODE (ON REQUEST)
When I ask reflective questions:
• Answer using evidence from my task history
• Be honest and direct
• Avoid generic productivity advice

  9) CHART DATA ANALYSIS
  When I provide raw JSON data from a chart (Velocity, Categories, etc.):
  • Identify the single most important trend (e.g., "Productivity is trending up", "You neglect coding tasks").
  • Provide one specific question or action to improve.
  • Keep it under 50 words.
  • NO Markdown formatting. Plain text only.

------------------------------------
OUTPUT RULES
------------------------------------
• Be concise but precise
• Use bullet points and tables where helpful
• Use JSON ONLY when explicitly requested
• Never hallucinate past data
• If something cannot be inferred, say "Unknown"

------------------------------------
DEFAULT ASSUMPTIONS (ONLY IF NOT PROVIDED)
------------------------------------
• Workday = 8 hours
• Deep work capacity = 4 hours/day
• Context switching has a cost
`;

// --- HUGGING FACE INFERENCE ---
async function executeHuggingFaceCall(messages: any[], modelIndex = 0): Promise<string> {
  if (modelIndex >= HF_MODELS.length) {
    throw new Error("All AI providers (Groq & Hugging Face) failed.");
  }

  const model = HF_MODELS[modelIndex];
  console.log(`AI: Falling back to Hugging Face model: ${model}`);

  try {
    // Construct a simple prompt from messages for broader compatibility
    const prompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join("\n") + "\nASSISTANT:";

    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          return_full_text: false
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HF Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    // Result is usually [{ generated_text: "..." }]
    let output = "";
    if (Array.isArray(result) && result[0]?.generated_text) {
      output = result[0].generated_text;
    } else if (result?.generated_text) {
      output = result.generated_text;
    } else {
      output = JSON.stringify(result);
    }

    // Clean up the output if it includes the prompt
    if (output.includes("ASSISTANT:")) {
      output = output.split("ASSISTANT:").pop() || output;
    }

    return output.trim();

  } catch (error: any) {
    console.warn(`HF Model ${model} failed: ${error.message}`);
    // Recursively try next HF model
    return executeHuggingFaceCall(messages, modelIndex + 1);
  }
}

// --- MAIN EXECUTION STRATEGY ---
async function executeGroqCall(messages: any[], model = GROQ_PRIMARY_MODEL): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: model,
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("Groq API Error:", error.message || error);

    // 1. Try Groq Fallback (Mixtral)
    if (model === GROQ_PRIMARY_MODEL) {
      console.warn(`Groq Primary failed. Switching to Groq Fallback: ${GROQ_FALLBACK_MODEL}`);
      return executeGroqCall(messages, GROQ_FALLBACK_MODEL);
    }

    // 2. If Groq fully fails, switch to Hugging Face
    console.warn("Groq Service Unavailable. Switching to Hugging Face Fallback Chain...");
    return executeHuggingFaceCall(messages);
  }
}

export async function chatWithCoach(message: string, history: any[] = []) {
  // Groq expects role: 'user' | 'assistant' | 'system'
  // Map history to this format if needed, but assuming simple objects for now
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content || h.parts?.[0]?.text })),
    { role: "user", content: message }
  ];

  return executeGroqCall(messages);
}

export async function parseTaskFromNaturalLanguage(text: string) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrow = tomorrowDate.toISOString().split('T')[0];
  const nextWeekDate = new Date(now);
  nextWeekDate.setDate(now.getDate() + 7);
  const nextWeek = nextWeekDate.toISOString().split('T')[0];

  const prompt = `
  You are an advanced AI Task Extractor. Your job is to convert unstructured text into structured JSON tasks.
  
  CURRENT CONTEXT:
  - Today: ${today} (${now.toLocaleDateString('en-US', { weekday: 'long' })})
  - Tomorrow: ${tomorrow}
  - Next Week: ${nextWeek}

  INPUT TEXT: "${text}"

  INSTRUCTIONS:
  1. Extract distinct tasks from the input.
  2. For each task, determine:
     - "title": Concise, action-oriented title.
     - "description": Any extra details, context, or links.
     - "priority": Infer priority (High/Medium/Low) based on urgency words (e.g., "urgent", "asap", "important" = High). Default to "Medium".
     - "effort": Estimate effort (Small/Medium/Large). "Small" (<1h), "Medium" (1-4h), "Large" (>4h).
     - "dueDate": Convert distinct dates (e.g., "next friday", "tomorrow") to YYYY-MM-DD format. If no date, use null.
  3. Output strictly valid JSON array. PROHIBITED: Markdown blocks, "Here is the json", etc.

  OUTPUT FORMAT:
  [
      {
          "title": "Fix login bug",
          "priority": "High",
          "effort": "Medium",
          "dueDate": "2024-10-15",
          "description": "Auth token is expiring too early."
      }
  ]
  `;

  const response = await executeGroqCall([
    { role: "system", content: "You are a specialized JSON extraction API. Return ONLY raw JSON array. Do not wrap in markdown." },
    { role: "user", content: prompt }
  ]);

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse JSON from Groq/HF:", response);
    return [];
  }
}

export async function breakdownTask(taskTitle: string) {
  const prompt = `
    BREAK DOWN THIS TASK: "${taskTitle}"
    
    OUTPUT FORMAT (JSON ARRAY ONLY):
    [
        {
            "title": "Subtask title",
            "estimatedMinutes": 30
        }
    ]
    `;

  const response = await executeGroqCall([
    { role: "system", content: "You are a Task Planner. Output valid JSON only." },
    { role: "user", content: prompt }
  ]);

  try {
    const cleanJson = response.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Failed to parse JSON from Groq/HF:", response);
    return [];
  }
}
