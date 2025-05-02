# 🎸 guitarGPT

**guitarGPT** is a modern web app that lets you search for any YouTube song, transcribe its lyrics, and generate a guitar chord chart with AI. Powered by OpenAI Whisper and GPT-4, it provides a seamless workflow for musicians and songwriters.

---

## 🚀 Features
- **YouTube Search with Autocomplete:** Find songs with instant, debounced suggestions and keyboard navigation.
- **One-Click Chord Chart Generation:** Select a video and generate a chord chart with lyrics and chords above the lyrics (ChordPro style).
- **AI-Powered Transcription:** Uses OpenAI Whisper to transcribe lyrics from YouTube audio.
- **AI Chord Chart Creation:** Uses GPT-4 to generate readable chord charts from lyrics and metadata.
- **Developer Diagnostics:** View token usage, cost estimates, timings, and OpenAI credit info in a Dev tab.
- **Modern UI:** Responsive, dark-themed, and user-friendly.

---

## 🛠️ Tech Stack
- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (Node.js), yt-dlp (via child process), OpenAI API, Whisper
- **Other:** Axios, form-data, fs-extra

---

## ⚡ Getting Started

### 1. Clone the repo
```sh
git clone https://github.com/yourusername/guitarGPT.git
cd guitarGPT
```

### 2. Install dependencies
```sh
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root:
```
YOUTUBE_API_KEY=your_youtube_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

- Get a YouTube Data API key from the [Google Cloud Console](https://console.cloud.google.com/).
- Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/).

### 4. Install yt-dlp and ffmpeg
- **macOS (Homebrew):**
  ```sh
  brew install yt-dlp ffmpeg
  ```
- **Or with pip:**
  ```sh
  pip install -U yt-dlp
  ```

### 5. Run the app
```sh
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📝 Usage
1. **Search for a song** using the input box. Use arrow keys and Enter for fast selection.
2. **Click "Create Chart"** on a result to generate a chord chart.
3. **View the chart** in a modal, with chords above lyrics.
4. **Check the Dev tab** for token usage, cost, timings, and more.

---

## 🧑‍💻 Developer Notes
- All AI and YouTube API keys are required for full functionality.
- The app uses yt-dlp and ffmpeg for robust YouTube audio extraction.
- The Dev tab in the modal provides detailed diagnostics for each request.

---

## 📦 Folder Structure
```
guitarGPT/
├── public/
│   └── guitar-emoji.png (favicon)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── youtube/
│   │   │       ├── search/route.ts
│   │   │       └── process/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       └── types.ts
├── .env.local
├── package.json
└── README.md
```

---

## 🙏 Credits
- [OpenAI](https://openai.com/) for Whisper and GPT-4
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) for YouTube audio extraction
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Heroicons](https://heroicons.com/) for icons
- [Twemoji](https://twemoji.twitter.com/) for the guitar emoji favicon

---

## 📄 License
MIT
