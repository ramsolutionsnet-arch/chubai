// ─────────────────────────────────────────────────────────────────
//  CHub.AI — app.js
//  All API calls go to /api/* (Vercel serverless functions)
//  API keys are NEVER in this file — they live in Vercel env vars
// ─────────────────────────────────────────────────────────────────

let selectedStyle = 'Cinematic';
let isGenerating = false;
let videoClips = [];
let currentClipIdx = 0;
let videoEl;
let speechSynth = window.speechSynthesis;
let currentScript = null;
let logLines = [];

// ── INIT ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  videoEl = document.getElementById('output-video');
  initFadeIn();
  checkServerHealth();
  initCharCount();
  if (speechSynth) speechSynth.getVoices();
  if (speechSynth) speechSynth.onvoiceschanged = () => speechSynth.getVoices();
  window.addEventListener('scroll', onScroll);
});

// ── HEALTH CHECK ──────────────────────────────────────────────────
async function checkServerHealth() {
  const pill = document.getElementById('api-pill');
  const pillText = document.getElementById('api-pill-text');
  const ss = document.getElementById('server-status');
  const ssText = document.getElementById('ss-text');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    if (data.status === 'ready') {
      pill.className = 'api-pill ready';
      pillText.textContent = '✓ API Ready';
      ss.className = 'server-status ready';
      ssText.textContent = 'Server ready';
    } else {
      pill.className = 'api-pill error';
      pillText.textContent = '⚠ Keys Missing';
      ss.className = 'server-status error';
      ssText.textContent = 'Missing env vars';
      showToast('⚠ Some API keys are missing. Add them in Vercel → Settings → Environment Variables', 'error');
    }
  } catch (e) {
    pill.className = 'api-pill error';
    pillText.textContent = '✗ Offline';
    ss.className = 'server-status error';
    ssText.textContent = 'Server offline';
  }
}

// ── CHAR COUNT ────────────────────────────────────────────────────
function initCharCount() {
  const ta = document.getElementById('prompt');
  const cc = document.getElementById('char-count');
  const update = () => cc.textContent = ta.value.length;
  ta.addEventListener('input', update);
  update();
}

// ── STYLE SELECT ──────────────────────────────────────────────────
function selectStyle(el, name) {
  document.querySelectorAll('.style-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  selectedStyle = name;
}

// ── MAIN GENERATE FLOW ────────────────────────────────────────────
async function generateVideo() {
  if (isGenerating) return;

  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) { showToast('Please enter a prompt first', 'error'); return; }
  if (prompt.length < 10) { showToast('Please write a more detailed prompt', 'error'); return; }

  isGenerating = true;
  const btn = document.getElementById('gen-btn');
  const btnText = document.getElementById('gen-btn-text');
  btn.disabled = true;
  btnText.textContent = '⏳ Generating...';

  // Stop any playing speech/video
  if (speechSynth) speechSynth.cancel();
  if (videoEl) { videoEl.pause(); videoEl.style.display = 'none'; }

  // Reset UI
  resetProgress();
  show('progress-wrap', 'flex');
  hide('download-area');
  hide('script-box');
  resetVideoBox();
  logLines = [];

  const duration = parseInt(document.getElementById('duration').value) || 60;

  try {
    // ── STEP 1: Generate Script ────────────────────────────────
    setProgress(5, 'Writing AI script...', 'Calling Gemini AI...', 'active');

    const scriptRes = await fetch('/api/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style: selectedStyle, duration })
    });

    if (!scriptRes.ok) {
      const err = await scriptRes.json();
      throw new Error(err.error || 'Script generation failed (HTTP ' + scriptRes.status + ')');
    }

    const scriptData = await scriptRes.json();
    currentScript = scriptData.script;
    setProgress(28, 'Script ready ✓', `Script written: "${currentScript.title}" (${currentScript.narration.split(' ').length} words)`, 'done');

    // Show script preview
    document.getElementById('script-text').textContent = currentScript.narration;
    show('script-box', 'block');

    // ── STEP 2: Fetch Video Clips ──────────────────────────────
    setProgress(35, 'Fetching HD video clips...', `Searching Pexels for: ${currentScript.keywords.slice(0, 3).join(', ')}`, 'active');

    const clipsRes = await fetch('/api/fetch-clips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: currentScript.keywords, count: 8 })
    });

    if (!clipsRes.ok) {
      const err = await clipsRes.json();
      throw new Error(err.error || 'Video clip fetch failed');
    }

    const clipsData = await clipsRes.json();
    videoClips = clipsData.clips;
    setProgress(60, 'Clips ready ✓', `Found ${videoClips.length} HD clips from Pexels`, 'done');

    // ── STEP 3: Fetch Music ────────────────────────────────────
    setProgress(65, 'Loading background music...', 'Fetching royalty-free music track...', 'active');
    let musicUrl = null;
    try {
      const musicRes = await fetch('/api/fetch-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: selectedStyle })
      });
      const musicData = await musicRes.json();
      if (musicData.track?.url) musicUrl = musicData.track.url;
      setProgress(72, 'Music ready ✓', 'Background music loaded: ' + (musicData.track?.title || 'Ambient track'), 'done');
    } catch (e) {
      setProgress(72, 'Music skipped', 'Music fetch skipped (continuing without it)', 'done');
    }

    // ── STEP 4: Load First Video Clip ─────────────────────────
    setProgress(78, 'Loading video into player...', 'Loading first HD clip...', 'active');
    await loadVideoClip(videoClips[0].url);
    setProgress(88, 'Video loaded ✓', 'First clip loaded and ready', 'done');

    // ── STEP 5: Start Playback ─────────────────────────────────
    setProgress(93, 'Starting playback...', 'Starting video and voiceover...', 'active');
    await startPlayback(currentScript.narration, musicUrl);
    setProgress(100, '✓ Video ready!', 'Video is playing with AI voiceover!', 'done');

    showVideoReady();

  } catch (err) {
    console.error('Generation error:', err);
    setProgress(0, '✗ Error', err.message, 'error');
    showToast('Error: ' + err.message, 'error');
  }

  isGenerating = false;
  btn.disabled = false;
  btnText.textContent = '⚡ Generate Video';
}

// ── LOAD VIDEO CLIP ───────────────────────────────────────────────
function loadVideoClip(url) {
  return new Promise((resolve, reject) => {
    videoEl.src = url;
    videoEl.muted = true; // required for autoplay policy
    videoEl.playsInline = true;
    videoEl.loop = false;
    videoEl.crossOrigin = 'anonymous';

    // Auto-advance to next clip
    videoEl.onended = () => {
      currentClipIdx = (currentClipIdx + 1) % videoClips.length;
      videoEl.src = videoClips[currentClipIdx].url;
      videoEl.load();
      videoEl.play().catch(() => {});
    };

    const done = () => resolve();
    videoEl.oncanplay = done;
    videoEl.onerror = () => reject(new Error('Video clip failed to load. Check your Pexels API key.'));
    setTimeout(done, 6000); // 6s timeout fallback
    videoEl.load();
  });
}

// ── START PLAYBACK ────────────────────────────────────────────────
async function startPlayback(narration, musicUrl) {
  // Show video
  videoEl.style.display = 'block';
  document.getElementById('vid-idle').style.display = 'none';
  document.getElementById('play-overlay').style.display = 'block';

  // Play video (muted to satisfy browser autoplay policy)
  try { await videoEl.play(); } catch (e) {
    addLog('Click the video to start playback (browser autoplay policy)', 'done');
  }

  // Play background music at low volume
  let audioEl = null;
  if (musicUrl) {
    try {
      audioEl = new Audio(musicUrl);
      audioEl.volume = 0.15;
      audioEl.loop = true;
      audioEl.play().catch(() => {});
    } catch (e) { /* music optional */ }
  }

  // Speak narration
  if (speechSynth && narration) {
    speechSynth.cancel();
    const lang = document.getElementById('voice-lang').value;
    const utter = new SpeechSynthesisUtterance(narration);
    utter.lang = lang;
    utter.rate = 0.92;
    utter.pitch = 1.0;
    utter.volume = 1.0;

    // Find best voice for the selected language
    const voices = speechSynth.getVoices();
    const match = voices.find(v => v.lang === lang)
      || voices.find(v => v.lang.startsWith(lang.split('-')[0]))
      || voices.find(v => v.default);
    if (match) utter.voice = match;

    utter.onend = () => {
      if (audioEl) { audioEl.pause(); }
      addLog('Narration complete ✓', 'done');
    };

    utter.onerror = (e) => addLog('Voice error: ' + e.error, 'error');

    // Small delay to ensure video started
    await new Promise(r => setTimeout(r, 500));
    speechSynth.speak(utter);

    // Wait for narration to complete (or timeout)
    await new Promise(resolve => {
      utter.onend = () => { if (audioEl) audioEl.pause(); resolve(); };
      setTimeout(resolve, (narration.split(' ').length / 2.2) * 1000 + 5000);
    });
  }
}

// ── VIDEO CONTROLS ────────────────────────────────────────────────
function togglePlay() {
  if (!videoEl || videoEl.style.display === 'none') return;
  if (videoEl.paused) {
    videoEl.play();
    if (speechSynth?.paused) speechSynth.resume();
  } else {
    videoEl.pause();
    if (speechSynth?.speaking) speechSynth.pause();
  }
}

function showVideoReady() {
  show('download-area', 'flex');
  document.getElementById('download-area').style.flexDirection = 'column';
  showToast('✓ Video ready! Click Download to save.', 'success');
}

function resetVideoBox() {
  currentClipIdx = 0;
  videoEl.style.display = 'none';
  document.getElementById('play-overlay').style.display = 'none';
  document.getElementById('vid-idle').style.display = 'flex';
  document.getElementById('vid-idle').style.flexDirection = 'column';
  document.getElementById('vid-idle').style.alignItems = 'center';
  document.getElementById('idle-text').textContent = 'Your video will appear here';
}

// ── DOWNLOAD ──────────────────────────────────────────────────────
async function downloadCurrentClip() {
  if (!videoEl || !videoEl.src) { showToast('Generate a video first', 'error'); return; }
  const btn = document.querySelector('.dl-btn');
  btn.textContent = '⏳ Preparing...';

  try {
    const response = await fetch(videoEl.src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chubai-' + (currentScript?.title || 'video').replace(/\s+/g, '-').toLowerCase() + '-' + Date.now() + '.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Download started!', 'success');
  } catch (e) {
    // Fallback: open in new tab
    window.open(videoEl.src, '_blank');
    showToast('Opened in new tab — right-click → Save video', '');
  }
  btn.textContent = '↓ Download Current Clip (MP4)';
}

function replayWithVoice() {
  if (!currentScript) { showToast('Generate a video first', 'error'); return; }
  if (speechSynth) speechSynth.cancel();
  videoEl.currentTime = 0;
  currentClipIdx = 0;
  videoEl.src = videoClips[0]?.url || videoEl.src;
  startPlayback(currentScript.narration, null);
}

function newVideo() {
  if (speechSynth) speechSynth.cancel();
  if (videoEl) videoEl.pause();
  resetVideoBox();
  resetProgress();
  hide('progress-wrap');
  hide('download-area');
  hide('script-box');
  logLines = [];
  document.getElementById('prompt').focus();
  document.getElementById('prompt').select();
  showToast('Ready for a new video!', 'success');
}

// ── PROGRESS HELPERS ──────────────────────────────────────────────
function resetProgress() {
  logLines = [];
  document.getElementById('progress-log').innerHTML = '';
  document.getElementById('prog-fill').style.width = '0%';
  document.getElementById('pct-text').textContent = '0%';
  document.getElementById('stage-text').textContent = 'Starting...';
}

function setProgress(pct, stage, logMsg, logState = 'done') {
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('pct-text').textContent = pct + '%';
  document.getElementById('stage-text').textContent = stage;
  if (logMsg) addLog(logMsg, logState);
}

function addLog(msg, state = 'done') {
  // Mark previous active as done
  logLines = logLines.map(l => l.state === 'active' ? { ...l, state: 'done' } : l);
  logLines.push({ msg, state });
  const container = document.getElementById('progress-log');
  container.innerHTML = logLines.map(l =>
    `<div class="log-line"><div class="log-dot ${l.state}"></div><span>${l.msg}</span></div>`
  ).join('');
  container.scrollTop = container.scrollHeight;
}

// ── UI HELPERS ────────────────────────────────────────────────────
function show(id, display = 'block') {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
}
function hide(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 4000);
}

// ── SCROLL ────────────────────────────────────────────────────────
function onScroll() {
  document.getElementById('navbar').style.background =
    window.scrollY > 60 ? 'rgba(5,5,10,0.97)' : 'rgba(5,5,10,0.85)';
}

// ── FADE IN ───────────────────────────────────────────────────────
function initFadeIn() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) setTimeout(() => e.target.classList.add('v'), i * 55);
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fi').forEach(el => obs.observe(el));
}
