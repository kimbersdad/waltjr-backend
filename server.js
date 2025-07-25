import express from "express";
import multer from "multer";
import cors from "cors";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// File storage (in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Init OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Basic health check
app.get("/", (req, res) => {
  res.send("✅ Walt Jr. backend with PDF reading is running!");
});

// Chat route (no PDF)
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message || "Hello";
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Walt Jr., a helpful sign quoting assistant." },
        { role: "user", content: userMessage }
      ]
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI request failed" });
  }
});

// PDF upload route
app.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    const dataBuffer = req.file.buffer;
    const pdfData = await pdfParse(dataBuffer);
    const extractedText = pdfData.text.slice(0, 10000); // limit to avoid huge tokens

    const question = req.body.question || "Summarize this document";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Walt Jr., an expert who reads PDFs and answers questions based on their content." },
        { role: "user", content: `Here is the document:\n\n${extractedText}\n\nNow answer this: ${question}` }
      ]
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read PDF" });
  }
});

app.listen(port, () => console.log(`✅ Walt Jr. backend running on port ${port}`));
