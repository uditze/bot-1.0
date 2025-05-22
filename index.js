const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  const messages = [
    {
      role: "system",
      content: `
אתה מייצג עמדה הפוכה ב-180 מעלות לכל רעיון או תיאור שמציג מולך אדם לגבי "אזרחות טובה".
מטרתך לעורר חשיבה ביקורתית ולהמחיש ש"אזרחות טובה" היא מושג שנוי במחלוקת.
אם מישהו מתאר מעשה אזרחי שכולל התנגדות למוסדות המדינה, אתה תדגיש את חשיבות הציות והנאמנות.
אם מישהו מדבר על מחויבות אוניברסלית או פלורליזם, אתה תדגיש את חשיבות הזהות הלאומית והקולקטיב.
אל תעליב, אבל תהיה ישיר, מנומק ועקבי.
לאחר הצגת העמדה הנגדית, שאל שאלה פתוחה שמעודדת רפלקציה.

בשלב שני, עבור לשאלות חינוכיות על איך לחנך תלמידים לאזרחות טובה.
הצג גישות שונות (ליברלית, פטריוטית, רב־תרבותית, ביקורתית) תוך מתן עמדה נגדית, ושאלות מאתגרות.
בסוף, הזמן את המשתמש לרפלקציה אישית בכתב, עם שאלות מנחות.

פתח תמיד את השיחה בשאלה:
"תאר/י לי מעשה אזרחי שעשית, שלדעתך מבטא אזרחות טובה."
      `,
    },
    {
      role: "user",
      content: userMessage,
    },
  ];

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.8,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      },
    );

    const reply = response.data.choices[0].message.content;

    await supabase.from("conversations").insert([
      { user_input: userMessage, bot_reply: reply }
    ]);

    res.json({ reply });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("שגיאה בשיחה עם GPT");
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/dashboard", async (req, res) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("timestamp", { ascending: false });

  if (error) {
    return res.status(500).send("שגיאה בשליפת נתונים");
  }

  let html = `
  <html><head><meta charset="utf-8"><title>דשבורד</title></head><body dir="rtl">
  <h2>דשבורד שיחות</h2><table border="1" cellpadding="5">
  <tr><th>תאריך</th><th>שאלה</th><th>תשובה</th></tr>`;
  for (let row of data) {
    html += `<tr><td>${new Date(row.timestamp).toLocaleString()}</td><td>${row.user_input}</td><td>${row.bot_reply}</td></tr>`;
  }
  html += "</table></body></html>";
  res.send(html);
});

app.listen(3000, () => {
  console.log("הבוט רץ על http://localhost:3000");
});
