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

// ✅ Split content into manageable chunks
const chunkSize = 1500; // characters per chunk
const chunks = [];
for (let i = 0; i < webContent.length; i += chunkSize) {
  chunks.push(webContent.slice(i, i + chunkSize));
}

// ✅ Simple helper to find the most relevant chunk
async function findRelevantChunk(question) {
  let bestChunk = chunks[0];
  let highestScore = 0;

  for (const chunk of chunks) {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Question: ${question}\n
Text: ${chunk}\n
Does this text contain information relevant to the question? Reply with only a number between 0 and 1.`,
            },
          ],
        },
      ],
    });

    const scoreText =
      response?.candidates?.[0]?.content?.parts?.[0]?.text || "0";
    const score = parseFloat(scoreText.trim());

    if (!isNaN(score) && score > highestScore) {
      highestScore = score;
      bestChunk = chunk;
    }
  }

  return bestChunk;
}

// ✅ Chat route
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });
  try {
     const relevantChunk = await findRelevantChunk(message);
    // ✅ Add a strong system instruction to limit Gemini’s scope
const systemInstruction = `
You are a helpful and factual assistant for the Charles Osuji Foundation trained by JuTeLabs.

⚠️ IMPORTANT:
Only answer questions using the information from the text below.
Do NOT guess or add anything not explicitly mentioned.
If unsure, respond: "I'm sorry, I don't have enough information about that topic, browse through the website."

Use clear, professional, and factual answers — avoid adding any external or speculative information.
TEXT SOURCE:
${relevantChunk}
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
