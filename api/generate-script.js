const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, style, duration } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured on server' });

  const wordCount = Math.floor((parseInt(duration) || 60) * 2.2);
  const styleGuide = {
    'Cinematic': 'dramatic, high-end, emotional, cinematic storytelling with vivid imagery',
    'Corporate': 'professional, clean, authoritative, business-focused tone',
    'Social Media': 'punchy, energetic, trendy, fast-paced with hooks in the first 3 seconds',
    'Explainer': 'clear, educational, step-by-step, simple language for any audience',
    'Documentary': 'factual, informative, compelling narrative with real-world context',
    'Minimalist': 'calm, elegant, simple, lets the product speak for itself'
  };

  const styleDesc = styleGuide[style] || styleGuide['Cinematic'];

  const systemPrompt = `You are an expert video scriptwriter. Write a ${style} style video script.
Style tone: ${styleDesc}
Topic: "${prompt}"
Target duration: ${duration || 60} seconds (~${wordCount} words of narration)

Respond ONLY with a raw JSON object — no markdown, no code blocks, no explanation.
Use this exact structure:
{
  "title": "Short catchy video title (max 8 words)",
  "narration": "Complete voiceover narration text. Write naturally as if speaking. ${wordCount} words approximately.",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "scenes": [
    {"description": "Scene 1 visual description", "keyword": "search term for stock footage", "duration": 10},
    {"description": "Scene 2 visual description", "keyword": "search term for stock footage", "duration": 10},
    {"description": "Scene 3 visual description", "keyword": "search term for stock footage", "duration": 10}
  ]
}

Keywords and scene keywords should be simple English words suitable for stock video search (e.g. "technology", "business meeting", "nature landscape").`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1200, topP: 0.9 }
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      return res.status(500).json({ error: 'Gemini error: ' + (errData.error?.message || response.status) });
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown fences
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let script;
    try {
      script = JSON.parse(text);
    } catch (e) {
      // Attempt to extract JSON from the text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { script = JSON.parse(match[0]); }
        catch (e2) { return res.status(500).json({ error: 'Could not parse Gemini response as JSON', raw: text }); }
      } else {
        return res.status(500).json({ error: 'No JSON found in Gemini response', raw: text });
      }
    }

    return res.status(200).json({ success: true, script });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
