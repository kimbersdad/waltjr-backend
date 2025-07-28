import express from "express";
import cors from "cors";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";

const app = express();
const port = process.env.PORT || 3000;

// Load your OpenAI API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

// Basic health check
app.get("/", (req, res) => {
  res.send("✅ Walt Jr. backend is live!");
});

// Main chat endpoint
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message || "Hello";

  try {
    const thread = await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Poll until complete
    let runStatus;
    while (true) {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (runStatus.status === "completed") break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    res.json({ reply });
  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Walt Jr. is running on port ${port}`);
});
import multer from "multer";
import fs from "fs";
import pdfParse from "pdf-parse";
import Tesseract from "tesseract.js";

// File upload config
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  let extractedText = "";

  try {
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(dataBuffer);
      extractedText = parsed.text.trim();

      // Fallback to OCR if PDF has no readable text
      if (!extractedText) {
        extractedText = await Tesseract.recognize(filePath, 'eng').then(res => res.data.text);
      }
    } else {
      // For image files
      extractedText = await Tesseract.recognize(filePath, 'eng').then(res => res.data.text);
    }

    if (!extractedText) throw new Error("No text could be extracted from the file.");

    // Send to Walt Jr.
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Here's the content of a file:\n\n${extractedText}`,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let status;
    while (true) {
      status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (status.status === "completed") break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    res.json({ reply });
    fs.unlinkSync(filePath); // cleanup

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to process uploaded file." });
  }
});
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), async (req, res) => {
  const filePath = req.file.path;
  let extractedText = "";

  try {
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const parsed = await pdfParse(dataBuffer);
      extractedText = parsed.text.trim();

      if (!extractedText) {
        extractedText = await Tesseract.recognize(filePath, 'eng').then(res => res.data.text);
      }
    } else {
      extractedText = await Tesseract.recognize(filePath, 'eng').then(res => res.data.text);
    }

    if (!extractedText) throw new Error("No text found.");

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Here is a file I uploaded:\n\n${extractedText}`,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let status;
    while (true) {
      status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (status.status === "completed") break;
      await new Promise((r) => setTimeout(r, 1000));
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    res.json({ reply });
    fs.unlinkSync(filePath); // clean up temp file

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Failed to process uploaded file." });
  }
});
