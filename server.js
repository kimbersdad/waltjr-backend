import OpenAI from "openai";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

// ✅ Your existing Assistant ID
const ASSISTANT_ID = "asst_k7kxM8JbQtxoiBCcrpTrkgoh";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Simple health check
app.get("/", (req, res) => {
  res.send("✅ Walt Jr. Assistant backend is running!");
});

// ✅ Route to talk directly to your Assistant
app.post("/chat", async (req, res) => {
  const userMessage = req.body.message || "Hello";

  try {
    // 1️⃣ Create a new thread for this chat
    const thread = await openai.beta.threads.create();

    // 2️⃣ Add the user message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage,
    });

    // 3️⃣ Run the Assistant on this thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });

    // 4️⃣ Poll until the run completes
    let completedRun;
    while (true) {
      completedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      if (completedRun.status === "completed") break;
      if (completedRun.status === "failed") throw new Error("Run failed");
      await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1 sec
    }

    // 5️⃣ Retrieve the Assistant's reply
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data.find(msg => msg.role === "assistant");

    res.json({ reply: lastMessage.content[0].text.value });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Assistant API call failed" });
  }
});

app.listen(port, () => console.log(`✅ Backend running on port ${port}`));
