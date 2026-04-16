const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt, style, duration } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set in Vercel Environment Variables' });

    const wordCount = Math.floor((parseInt(duration) || 60) * 2.2);

    const systemPrompt = `You are an expert video scriptwriter. Write a ${style || 'Cinematic'} style video script.
Topic: "${prompt}"
Target duration: ${duration || 60} seconds (~${wordCount} words of narration)

Respond ONLY with a raw JSON object. No markdown, no code blocks, no extra text whatsoever.
Use this exact structure:
{"title":"Short catchy title max 8 words","narration":"Complete voiceover text approximately ${wordCount} words written naturally as if speaking","keywords":["keyword1","keyword2","keyword3","keyword4","keyword5"]}

Keywords must be simple English words for stock video search like: nature, technology, business, ocean, city, people, food, travel.`;

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://chubai-self.vercel.app',
          'X-Title': 'CHub.AI'
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [{ role: 'user', content: systemPrompt }],
          max_tokens: 1000,
          temperature: 0.7
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      return res.status(500).json({ error: 'OpenRouter API error: ' + (errData.error?.message || response.status) });
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || '';
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let script;
    try {
      script = JSON.parse(text);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { script = JSON.parse(match[0]); }
        catch (e2) { return res.status(500).json({ error: 'Failed to parse AI response', raw: text.substring(0, 200) }); }
      } else {
        script = {
          title: prompt.substring(0, 40),
          narration: `Welcome to this ${style} video about ${prompt}. This is an AI-generated video showcasing the best visuals and narration for your topic.`,
          keywords: prompt.split(' ').filter(w => w.length > 3).slice(0, 5)
        };
      }
    }

    return res.status(200).json({ success: true, script });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
