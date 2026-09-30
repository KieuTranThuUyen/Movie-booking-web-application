/**
 * Client gọi LLM OpenAI-compatible (OpenAI / Groq / Together / local…).
 * Không có API key → trả null để caller dùng fallback rule-based.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type LlmResult = {
  content: string;
  model: string;
  usedFallback: boolean;
};

function getConfig() {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.AI_API_KEY ||
    '';
  const baseUrl = (
    process.env.OPENAI_BASE_URL ||
    process.env.AI_BASE_URL ||
    'https://api.openai.com/v1'
  ).replace(/\/$/, '');
  const model =
    process.env.OPENAI_MODEL ||
    process.env.AI_MODEL ||
    'gpt-4o-mini';
  return { apiKey, baseUrl, model };
}

export function isAiConfigured(): boolean {
  return Boolean(getConfig().apiKey);
}

/**
 * Gọi chat completions. Timeout ~25s.
 * Trả null nếu lỗi / không cấu hình key.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts?: { temperature?: number; maxTokens?: number },
): Promise<LlmResult | null> {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts?.temperature ?? 0.4,
        max_tokens: opts?.maxTokens ?? 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[AI] LLM error', res.status, text.slice(0, 300));
      return null;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    return {
      content,
      model: data.model || model,
      usedFallback: false,
    };
  } catch (err) {
    console.error('[AI] LLM request failed', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Parse JSON từ response LLM (bỏ markdown code fence nếu có) */
export function extractJson<T = unknown>(text: string): T | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Thử tìm object/array đầu tiên trong text
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}
