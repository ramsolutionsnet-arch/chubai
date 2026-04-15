# CHub.AI — Deploy in 10 Minutes (No Coding)

## What You Need
- A free Vercel account → vercel.com
- A free Pexels API key → pexels.com/api
- A free Google Gemini API key → aistudio.google.com/app/apikey
- (Optional) Free Pixabay API key → pixabay.com/api/docs

---

## Step 1 — Get Your Free API Keys

### Pexels (Video Clips) — FREE
1. Go to: https://www.pexels.com/api/
2. Click "Get Started"
3. Sign up with email
4. Your API key will appear on the dashboard
5. Copy it — looks like: abc123xyz...

### Google Gemini (AI Script) — FREE
1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Select "Create API key in new project"
5. Copy it — starts with: AIzaSy...

### Pixabay (Background Music) — FREE (optional)
1. Go to: https://pixabay.com/api/docs/
2. Create a free account
3. Your API key is shown on that page

---

## Step 2 — Create Vercel Account

1. Go to: https://vercel.com
2. Click "Sign Up"
3. Sign up with GitHub, Google, or email — all free
4. You're in!

---

## Step 3 — Deploy CHub.AI

### Method A: Drag & Drop (Easiest)
1. Go to: https://vercel.com/new
2. Click "Browse" or drag this entire "chubai" folder onto the page
3. Vercel will detect it automatically
4. Click "Deploy"
5. Wait ~30 seconds → your site is live!

### Method B: GitHub (Recommended for updates)
1. Create a free GitHub account at github.com
2. Create a new repository called "chubai"
3. Upload all files from this folder to that repo
4. In Vercel → New Project → Import from GitHub
5. Select your chubai repo → Deploy

---

## Step 4 — Add Your API Keys (IMPORTANT)

This is where the magic happens. Your keys stay safe on Vercel's servers.

1. In Vercel, go to your project
2. Click "Settings" tab
3. Click "Environment Variables" in the left menu
4. Add these one by one:

| Name | Value |
|------|-------|
| GEMINI_API_KEY | Your Gemini key (AIzaSy...) |
| PEXELS_API_KEY | Your Pexels key |
| PIXABAY_API_KEY | Your Pixabay key (optional) |

5. Click "Save" after each one
6. Go to "Deployments" tab → Click the 3 dots → "Redeploy"

---

## Step 5 — Connect Your CHub.AI Domain

1. In Vercel project → Settings → Domains
2. Click "Add Domain"
3. Type: chub.ai (or whatever your domain is)
4. Vercel will show you DNS records to add
5. Go to your domain registrar / hosting control panel
6. Add the DNS records Vercel shows you
7. Wait 5–30 minutes for DNS to propagate
8. Your site is live at CHub.AI!

---

## How It Works (Technical)

```
User types prompt
    ↓
Browser calls /api/generate-script (Vercel Function)
    ↓
Vercel calls Gemini API (your key stays safe on server)
    ↓ (~3-5 seconds)
Browser calls /api/fetch-clips (Vercel Function)
    ↓
Vercel calls Pexels API (your key stays safe on server)
    ↓ (~5-8 seconds)
Browser calls /api/fetch-music (Vercel Function)
    ↓
Video clips load in browser + browser speaks narration
    ↓ (Total: ~15-25 seconds)
User sees video playing with AI voiceover ✓
```

---

## Speed Expectations

| Step | Time |
|------|------|
| Script generation | 3–6 seconds |
| Pexels clip fetch | 5–10 seconds |
| Video loading | 3–8 seconds |
| Voiceover start | Instant |
| **Total** | **~15–25 seconds** |

---

## Troubleshooting

**"Server offline" shows in the creator**
→ Your Vercel deployment failed. Check Vercel dashboard for build errors.

**"Missing env vars" warning**  
→ You haven't added API keys in Vercel → Settings → Environment Variables. Add them and redeploy.

**Video doesn't play**  
→ Browser autoplay policy. Click the video box once to start it.

**Voiceover not working**  
→ Check your browser allows audio. Try Chrome or Edge for best voice support.

**"No video clips found"**  
→ Your Pexels API key may be wrong. Double-check in Vercel env vars.

---

## File Structure

```
chubai/
├── vercel.json          ← Tells Vercel how to deploy
├── package.json         ← Node.js dependencies
├── api/
│   ├── health.js        ← Checks if all API keys are set
│   ├── generate-script.js  ← Calls Gemini AI to write script
│   ├── fetch-clips.js   ← Calls Pexels for video clips  
│   └── fetch-music.js   ← Calls Pixabay for music
└── public/
    ├── index.html       ← Main website page
    ├── css/
    │   └── style.css    ← All styling
    └── js/
        └── app.js       ← All frontend logic
```

---

Built with ❤ for CHub.AI
