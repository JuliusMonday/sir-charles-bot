import express from "express";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { setTimeout } from "timers/promises"; // For implementing a safe delay

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Configuration and Initialization ---

// ✅ Initialize Gemini client (latest SDK)
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ✅ Load your website data
let webContent = "";
try {
  // Use a more robust path resolution for safety
  const dataPath = new URL('./websiteData.txt', import.meta.url);
  webContent = fs.readFileSync(dataPath, "utf8");
  console.log("✅ Web content loaded successfully");
} catch (error) {
  console.error("❌ Could not load websiteData.txt. Please check file path and permissions:", error.message);
  // Exit or throw an error if essential data is missing
}

// NOTE: We don't need to split into chunks anymore because we use a single, efficient RAG call.
// The entire content is passed as a tool for the model to work with.

// ✅ System instruction and tool definition (The RAG Core)
const RAG_INSTRUCTION = `
You are a helpful and factual AI assistant for the Charles Osuji Foundation, created by JuTeLabs.

You MUST follow these rules:
1. **ONLY** answer using the information provided in the 'TEXT SOURCE' below.
2. Do **NOT** guess or add external information.
3. If the provided 'TEXT SOURCE' doesn't contain an answer, you MUST reply with the exact phrase:
   "I'm sorry, I don't have enough information about that topic, please browse through the website."

TEXT SOURCE:
---
${webContent}
---
`;

// --- Rate Limit Safe Main Route ---

// A simple retry mechanism using exponential backoff is highly recommended
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5000; // Start with a 5-second delay

// ✅ Main chat route
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // 🚀 Generate response from Gemini using the efficient RAG instruction
      // This is a single API call, making it safe for the 15 RPM limit.
      const result = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          { role: "user", parts: [{ text: RAG_INSTRUCTION }] }, // System instruction with all data
          { role: "user", parts: [{ text: `User question: ${message}` }] }, // User question
        ],
      });

      const reply =
        result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "Sorry, I couldn’t get a response.";

      // Success! Respond and break the loop.
      return res.json({ reply });

    } catch (error) {
      console.error("❌ Error on attempt", attempt + 1, ":", error.message);

      // --- Rate Limit (429) Handling ---
      if (error.status === 429 || error.message.includes("429")) {
        if (attempt < MAX_RETRIES - 1) {
          // Calculate exponential backoff delay
          const delay = BASE_DELAY_MS * (2 ** attempt);
          console.log(`⚠️ Rate limit hit. Retrying in ${delay / 1000} seconds...`);
          await setTimeout(delay);
        } else {
          // Max retries reached
          return res.status(429).json({ 
            reply: "The chatbot is currently very busy. Please try again in one minute." 
          });
        }
      } else {
        // Handle other non-429 errors
        return res.status(500).json({ 
            reply: "Sorry, an unexpected error occurred." 
        });
      }
    }
  }
});

// ✅ Dynamic port
const PORT = process.env.PORT || 5500;
app.listen(PORT, () =>
  console.log(`✅ Gemini Chatbot backend running on http://localhost:${PORT}`)
);