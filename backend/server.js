import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Initialize Gemini client (latest SDK)
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ✅ Load your web content
let webContent = "";
try {
  webContent = fs.readFileSync("./websiteData.txt", "utf8");
  console.log("✅ Web content loaded successfully");
} catch (error) {
  console.error("❌ Could not load websiteData.txt:", error.message);
}

// ✅ Chat route
app.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    // ✅ Add a strong system instruction to limit Gemini’s scope
const systemInstruction = `
You are a helpful and factual assistant for the Charles Osuji Foundation trained by JuTeLabs.

⚠️ IMPORTANT:
Only answer questions using the information from the text below.
Do NOT guess or add anything not explicitly mentioned.
If unsure, respond: "I'm sorry, I don't have enough information about that topic, browse through the website."

Use clear, professional, and factual answers — avoid adding any external or speculative information.
TEXT SOURCE:
${webContent}
`;


    // ✅ Send both the system instruction and user message
    const result = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: systemInstruction },
            { text: `User question: ${message}` },
          ],
        },
      ],
    });

    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn’t get a response.";

    res.json({ reply });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(5500, () =>
  console.log("✅ Gemini Chatbot backend running on http://localhost:5500")
);
