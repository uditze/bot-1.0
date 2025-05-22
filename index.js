const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
        temperature: 0.8, // אפשר לשנות לפי הצורך
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      },
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("שגיאה בשיחה עם GPT");
  }
});

const path = require("path");

// שורה חדשה שמאפשרת לשרת קבצים סטטיים מהתיקייה הנוכחית
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`הבוט רץ על פורט ${PORT}`);
});
