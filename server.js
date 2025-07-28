const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());
const upload = multer({ dest: 'uploads/' });

// OPENAI INIT
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ROUTES
app.get('/', (req, res) => {
  res.send('Walt Jr. backend is live');
});

// 🧠 CHAT WITH ASSISTANT
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const thread = await openai.beta.threads.create();

    const message = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: userMessage,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    res.json({ reply });
  } catch (err) {
    console.error('❌ /chat error:', err);
    res.status(500).json({ error: 'Chat failed', details: err.message });
  }
});

// 📎 PDF UPLOAD + QUESTION
app.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);
    const textContent = data.text;

    const question = req.body.question || 'Summarize this file';

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: `${question}\n\n${textContent}`,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    fs.unlinkSync(filePath); // Clean up temp file
    res.json({ reply });
  } catch (err) {
    console.error('❌ /upload-pdf error:', err);
    res.status(500).json({ error: 'PDF upload failed', details: err.message });
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`✅ Walt Jr. backend running on port ${PORT}`);
});
