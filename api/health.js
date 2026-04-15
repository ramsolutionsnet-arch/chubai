module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const keys = {
    gemini: !!process.env.GEMINI_API_KEY,
    pexels: !!process.env.PEXELS_API_KEY,
    pixabay: !!process.env.PIXABAY_API_KEY
  };
  const allOk = keys.gemini && keys.pexels;
  res.status(200).json({
    status: allOk ? 'ready' : 'missing_keys',
    keys,
    message: allOk ? 'CHub.AI API is ready!' : 'Some API keys are missing in Vercel environment variables',
    version: '1.0.0'
  });
};
