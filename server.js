import OpenAI from "openai";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// ✅ Your Walt Jr. Assistant ID
const ASSISTANT_ID = "asst_EJTN6YRMFIVVYoxKzOltCHRS";

// ✅ OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Health check route
app.get("/", (req, res) => {
  res.send("✅ Walt Jr. Assistant backend with PDF support is running!");
});

// ✅ Route: Normal chat (no PDF)
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message || "Hello";

  try {
    // 1️⃣ Create a thread for this chat
    const thread = await openai.beta.threads.create();

    // 2️⃣ Add the user's message
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    // 3️⃣ Run your Walt Jr. Assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // 4️⃣ Poll until the run completes
    let completedRun;
    while (true) {
      completedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (completedRun.status === "completed") break;
      if (completedRun.status === "failed") throw new Error("Run failed");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 5️⃣ Get Assistant's reply
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(msg => msg.role === "assistant");

    res.json({ reply: lastMessage.content[0].text.value });

  } catch (error) {
    console.error("❌ Chat error:", error);
    res.status(500).json({ error: "Assistant API call failed" });
  }
});

// ✅ Setup Multer for temp file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ dest: path.join(__dirname, "uploads/") });

// ✅ Route: PDF upload + file search
app.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    const pdfPath = req.file.path;

    // 1️⃣ Upload the PDF to OpenAI
    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(pdfPath),
      purpose: "assistants"
    });

    // 2️⃣ Create a new thread
    const thread = await openai.beta.threads.create();

    // 3️⃣ Ask the user’s question + attach PDF
    const userQuestion = req.body.question || "Summarize this PDF";

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userQuestion,
      attachments: [
        {
          file_id: uploadedFile.id,
          tools: [{ type: "file_search" }]
        }
      ]
    });

    // 4️⃣ Run your Walt Jr. Assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // 5️⃣ Poll until the run completes
    let completedRun;
    while (true) {
      completedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (completedRun.status === "completed") break;
      if (completedRun.status === "failed") throw new Error("Run failed");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 6️⃣ Get the Assistant’s reply
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(msg => msg.role === "assistant");

    // ✅ Delete temp file after upload
    fs.unlinkSync(pdfPath);

    res.json({ reply: lastMessage.content[0].text.value });

  } catch (err) {
    console.error("❌ PDF upload error:", err);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

app.listen(port, () => console.log(`✅ Walt Jr. backend running on port ${port}`));
