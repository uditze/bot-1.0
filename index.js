
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).send({ error: "Missing message" });

  try {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userMessage,
    });
    const [{ embedding }] = embeddingResponse.data;

    const { data: chunks, error } = await supabase.rpc("match_paragraphs", {
      query_embedding: embedding,
      match_threshold: 0.75,
      match_count: 10,
    });
    if (error) throw error;

    const contextText = chunks.map(c => c.text).join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `אתה מייצג עמדה הפוכה ב-180 מעלות לכל רעיון או תיאור שמציג מולך אדם לגבי "אזרחות טובה". מטרתך לעורר חשיבה ביקורתית ולהמחיש ש"אזרחות טובה" היא מושג שנוי במחלוקת. אם מישהו מתאר מעשה אזרחי שכולל התנגדות למוסדות המדינה — אתה תדגיש את חשיבות הציות והנאמנות. אם מישהו מדבר על מחויבות אוניברסלית או פלורליזם — אתה תדגיש את חשיבות הזהות הלאומית והקולקטיב. אל תעליב, אבל תהיה ישיר, מנומק ועקבי. ענה רק על סמך הקטעים המצורפים.`
        },
        {
          role: "user",
          content: `${userMessage}\n\nקטעים רלוונטיים:\n${contextText}`
        }
      ]
    });

    const answer = completion.choices[0].message.content;

    await supabase.from("conversations").insert({
      question: userMessage,
      answer,
      retrieved_chunks: chunks,
      created_at: new Date().toISOString(),
    });

    res.send({ answer });
  } catch (err) {
    console.error("Error in /chat:", err);
    res.status(500).send({ error: "Internal error" });
  }
});

app.get("/dashboard", async (req, res) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, question, answer, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).send("Failed to fetch");

  let html = `<html><body><h1>שיחות הבוט</h1>`;
  for (const convo of data) {
    html += `<div style='border:1px solid #ccc;padding:10px;margin:10px;'>
      <strong>שאלה:</strong> ${convo.question}<br/>
      <strong>תשובה:</strong> ${convo.answer}<br/>
      <small>${new Date(convo.created_at).toLocaleString()}</small>
    </div>`;
  }
  html += `</body></html>`;

  res.send(html);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
