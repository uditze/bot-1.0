// load_paragraphs.js
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { createClient } = require("@supabase/supabase-js");
const OpenAI = require("openai");
const dotenv = require("dotenv");

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractParagraphsFromPDF(filePath, sourceLabel) {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const rawText = pdfData.text;
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(p => p.length > 100 && p.length < 1500);
  return paragraphs.map(p => ({ text: p, source: sourceLabel }));
}

async function generateEmbeddingsAndUpload(paragraphs) {
  for (const paragraph of paragraphs) {
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: paragraph.text,
    });
    const [{ embedding }] = embeddingResponse.data;

    await supabase.from("paragraphs").insert({
      text: paragraph.text,
      source: paragraph.source,
      embedding,
    });
    console.log("Uploaded:", paragraph.text.slice(0, 60));
  }
}

(async () => {
  const p1 = await extractParagraphsFromPDF("./aviv cohen.pdf", "Aviv Cohen");
  const p2 = await extractParagraphsFromPDF("./adar cohen.pdf", "Aviv & Adar Cohen");
  const all = [...p1, ...p2];
  await generateEmbeddingsAndUpload(all);
})();
