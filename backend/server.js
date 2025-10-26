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
    const result = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: message }],
        },
      ],
    });

    // console.log("🧠 Raw Gemini result:", JSON.stringify(result, null, 2));

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
