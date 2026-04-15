const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { style = 'cinematic' } = req.body;
  const apiKey = process.env.PIXABAY_API_KEY;

  // Map video styles to Pixabay music genres
  const genreMap = {
    'Cinematic': 'cinematic',
    'Corporate': 'corporate',
    'Social Media': 'electronic',
    'Explainer': 'ambient',
    'Documentary': 'ambient',
    'Minimalist': 'ambient'
  };

  const genre = genreMap[style] || 'ambient';

  // If no Pixabay key, return a curated list of free CDN music
  // These are actual free-to-use audio tracks from public domain
  const fallbackTracks = {
    cinematic: [
      { title: 'Cinematic Ambient', url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d1718ab41b.mp3' },
      { title: 'Epic Background', url: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e14f9.mp3' }
    ],
    corporate: [
      { title: 'Corporate Motivation', url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f49b51b.mp3' }
    ],
    ambient: [
      { title: 'Soft Ambient', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3' }
    ],
    electronic: [
      { title: 'Upbeat Electronic', url: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b4ba45f.mp3' }
    ]
  };

  if (!apiKey) {
    const tracks = fallbackTracks[genre] || fallbackTracks['ambient'];
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    return res.status(200).json({ success: true, track, source: 'fallback' });
  }

  try {
    const response = await fetch(
      `https://pixabay.com/api/music/?key=${apiKey}&genre=${genre}&per_page=5`,
    );

    if (!response.ok) {
      const tracks = fallbackTracks[genre] || fallbackTracks['ambient'];
      const track = tracks[0];
      return res.status(200).json({ success: true, track, source: 'fallback' });
    }

    const data = await response.json();
    const hits = data.hits || [];

    if (hits.length === 0) {
      const tracks = fallbackTracks[genre] || fallbackTracks['ambient'];
      return res.status(200).json({ success: true, track: tracks[0], source: 'fallback' });
    }

    const picked = hits[Math.floor(Math.random() * Math.min(hits.length, 3))];
    return res.status(200).json({
      success: true,
      track: { title: picked.title || 'Background Music', url: picked.audio || picked.previewURL },
      source: 'pixabay'
    });
  } catch (err) {
    const tracks = fallbackTracks[genre] || fallbackTracks['ambient'];
    return res.status(200).json({ success: true, track: tracks[0], source: 'fallback' });
  }
};
