const fetch = require('node-fetch');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { keywords, count = 6 } = req.body;
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'keywords array is required' });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Pexels API key not configured on server' });

  const clips = [];
  const maxPerKeyword = Math.ceil(count / keywords.length);

  for (const keyword of keywords.slice(0, 4)) {
    try {
      const response = await fetch(
        `https://api.pexels.com/videos/search?query=${encodeURIComponent(keyword)}&per_page=${maxPerKeyword + 1}&orientation=landscape&size=medium`,
        { headers: { Authorization: apiKey } }
      );

      if (!response.ok) {
        console.error('Pexels error for keyword:', keyword, response.status);
        continue;
      }

      const data = await response.json();
      const videos = data.videos || [];

      for (const video of videos.slice(0, maxPerKeyword)) {
        // Prefer HD (720p or 1080p), fallback to SD
        const hdFile = video.video_files.find(f =>
          (f.quality === 'hd' || f.quality === 'uhd') && f.width >= 1280
        );
        const sdFile = video.video_files.find(f => f.quality === 'sd' && f.width >= 640);
        const anyFile = video.video_files[0];
        const chosen = hdFile || sdFile || anyFile;

        if (chosen) {
          clips.push({
            id: video.id,
            url: chosen.link,
            width: chosen.width,
            height: chosen.height,
            quality: chosen.quality,
            duration: video.duration,
            keyword: keyword,
            thumbnail: video.image
          });
        }
      }
    } catch (err) {
      console.error('Fetch error for keyword:', keyword, err.message);
    }

    if (clips.length >= count) break;
  }

  if (clips.length === 0) {
    return res.status(404).json({ error: 'No video clips found. Try different keywords.' });
  }

  return res.status(200).json({ success: true, clips, total: clips.length });
};
