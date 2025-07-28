import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const upload = multer();

app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// 🧠 Basic chat route
app.post('/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const replyRes = await fetch('https://api.openai.com/v1/assistants/' + ASSISTANT_ID + '/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
      })
    });

    const replyData = await replyRes.json();

    if (replyData?.error) {
      console.error(replyData.error);
      return res.status(500).json({ reply: `⚠️ ${replyData.error.message}` });
    }

    const content = replyData?.choices?.[0]?.message?.content || '⚠️ No reply.';
    res.json({ reply: content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: '⚠️ Server error.' });
  }
});

// 📎 PDF Upload route
app.post('/upload-pdf', upload.single('file'), async (req, res) => {
  const pdfBuffer = req.file.buffer;
  const question = req.body.question || 'Summarize this file.';

  try {
    const parsed = await pdfParse(pdfBuffer);
    const prompt = `${question}\n\nFile content:\n${parsed.text}`;

    const replyRes = await fetch('https://api.openai.com/v1/assistants/' + ASSISTANT_ID + '/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      })
    });

    const replyData = await replyRes.json();

    if (replyData?.error) {
      console.error(replyData.error);
      return res.status(500).json({ reply: `⚠️ ${replyData.error.message}` });
    }

    const content = replyData?.choices?.[0]?.message?.content || '⚠️ No reply.';
    res.json({ reply: content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ reply: '⚠️ Server error during PDF handling.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
