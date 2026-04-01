// routes/aria.js
// Requires: npm install groq-sdk
// Requires: GROQ_API_KEY=gsk_... in your .env

const express = require('express');
const Groq = require('groq-sdk');

const router = express.Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/aria/chat', async (req, res) => {
  try {
    const { system, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'messages array is required' });
    }

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: system || '' },
        ...messages,
      ],
    });

    const content = response.choices[0]?.message?.content || '';

    res.json({ success: true, content });
  } catch (err) {
    console.error('Aria route error:', err);
    res.status(500).json({ success: false, message: err.message || 'Aria request failed' });
  }
});

module.exports = router;