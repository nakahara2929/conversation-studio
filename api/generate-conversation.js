function buildPrompt(payload) {
  const work = payload?.work ?? {};
  const event = payload?.event ?? {};
  const conversation = payload?.conversation ?? {};

  return [
    "あなたはゲーム・ノベル・漫画・動画企画向けの会話文を作る日本語ライターです。",
    "返答は会話本文のみを返してください。説明、見出し、箇条書き、注釈は不要です。",
    "セリフ形式は自然な日本語で、必要なら地の文を最小限含めてよいです。",
    "短すぎず長すぎず、4行から10行程度の会話にしてください。",
    "",
    `作品名: ${work.name || ""}`,
    `作品概要: ${work.summary || ""}`,
    `作品メモ: ${work.memo || ""}`,
    `イベント名: ${event.name || ""}`,
    `イベントの進行状況: ${event.status || ""}`,
    `会話タイトル: ${conversation.title || ""}`,
    `タイミング: ${conversation.timing || ""}`,
    `登場キャラの参考: ${conversation.characters || ""}`,
    `現在の本文: ${conversation.body || ""}`,
    `会話バックアップ: ${conversation.backup || ""}`,
    "",
    "上記を踏まえて、会話本文だけを生成してください。",
  ].join("\n");
}

async function generateWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
        },
      }),
    },
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Gemini API の呼び出しに失敗しました。");
  }

  const body = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!body) {
    throw new Error("Gemini から本文を取得できませんでした。");
  }

  return { provider: "gemini", body };
}

async function generateWithOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI API の呼び出しに失敗しました。");
  }

  const body =
    data?.output_text?.trim() ||
    data?.output
      ?.flatMap((item) => item.content || [])
      ?.map((item) => item.text || "")
      ?.join("")
      ?.trim();

  if (!body) {
    throw new Error("OpenAI から本文を取得できませんでした。");
  }

  return { provider: "openai", body };
}

function cleanBody(text) {
  return text
    .replace(/^```[\w-]*\n?/u, "")
    .replace(/\n?```$/u, "")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST のみ対応しています。" });
    return;
  }

  try {
    const prompt = buildPrompt(req.body);

    let result;
    if (process.env.GEMINI_API_KEY) {
      result = await generateWithGemini(prompt);
    } else if (process.env.OPENAI_API_KEY) {
      result = await generateWithOpenAI(prompt);
    } else {
      throw new Error("AI APIキーが未設定です。GEMINI_API_KEY または OPENAI_API_KEY を設定してください。");
    }

    res.status(200).json({
      provider: result.provider,
      body: cleanBody(result.body),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "AI生成に失敗しました。",
    });
  }
}
