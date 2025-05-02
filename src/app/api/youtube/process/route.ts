import { NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ytdl from 'ytdl-core';

const execFileAsync = promisify(execFile);

// OpenAI pricing for GPT-4 (8k context) as of 2024-05
const GPT4_INPUT_COST_PER_1K = 0.03; // $0.03 per 1K input tokens
const GPT4_OUTPUT_COST_PER_1K = 0.06; // $0.06 per 1K output tokens

function extractKeyFromTitle(title: string): string | null {
  // Look for patterns like 'in E', 'in E major', 'key of E', etc.
  const keyRegex = /(?:in|key of|original key:?|\()\s*([A-G][#b]?)(?:\s*(major|minor|maj|min|m)?)/i;
  const match = title.match(keyRegex);
  if (match) {
    let key = match[1].toUpperCase();
    let type = match[2]?.toLowerCase();
    if (type) {
      if (type.startsWith('maj') || type === 'major') key += ' major';
      else if (type.startsWith('min') || type === 'minor' || type === 'm') key += ' minor';
    }
    return key;
  }
  return null;
}

export async function POST(request: Request) {
  const timings: Record<string, number> = {};
  const startAll = Date.now();
  try {
    const { videoId } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Prepare temp file path
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `audio-${Date.now()}.mp3`);

    // Use yt-dlp to download audio
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const startDownload = Date.now();
    await execFileAsync('yt-dlp', [
      '-f', 'bestaudio',
      '--extract-audio',
      '--audio-format', 'mp3',
      '-o', tempFilePath,
      youtubeUrl,
    ]);
    timings['audio_download_ms'] = Date.now() - startDownload;

    // Prepare form-data for Whisper
    const form = new FormData();
    form.append('file', fs.createReadStream(tempFilePath), {
      filename: 'audio.mp3',
      contentType: 'audio/mpeg',
    });
    form.append('model', 'whisper-1');

    // Call OpenAI Whisper API
    const startTranscribe = Date.now();
    const whisperRes = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        maxBodyLength: Infinity,
      }
    );
    timings['transcription_ms'] = Date.now() - startTranscribe;

    // Clean up temp file
    await fs.remove(tempFilePath);

    const transcription = whisperRes.data.text;

    // Get video info for title
    let videoTitle = '';
    try {
      const info = await ytdl.getInfo(videoId);
      videoTitle = info.videoDetails.title;
    } catch {
      videoTitle = '';
    }
    const detectedKey = videoTitle ? extractKeyFromTitle(videoTitle) : null;

    // Generate chord chart using GPT
    const startGpt = Date.now();
    const gptPrompt = detectedKey
      ? `Generate a chord chart for the song in the key of ${detectedKey} with these lyrics:\n\n${transcription}`
      : `Generate a chord chart for the song with these lyrics:\n\n${transcription}`;
    const gptRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a music expert. Given the lyrics of a song, generate a chord chart with lyrics. \nInclude chord symbols above the lyrics where they change. Use standard pop/rock guitar voicings.\nFormat the output in a clear, readable way with line breaks between sections.`,
          },
          {
            role: 'user',
            content: gptPrompt,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    timings['gpt_ms'] = Date.now() - startGpt;
    timings['total_ms'] = Date.now() - startAll;

    // Token usage and cost estimate
    const usage = gptRes.data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;
    const estimatedCost = ((promptTokens / 1000) * GPT4_INPUT_COST_PER_1K) + ((completionTokens / 1000) * GPT4_OUTPUT_COST_PER_1K);

    // Get OpenAI credit info
    let openaiCredits = null;
    try {
      const creditRes = await axios.get('https://api.openai.com/v1/dashboard/billing/credit_grants', {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      });
      openaiCredits = creditRes.data;
    } catch {
      openaiCredits = { error: 'Could not fetch OpenAI credits' };
    }

    return NextResponse.json({
      chordChart: gptRes.data.choices[0].message.content,
      dev: {
        timings,
        openai: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost,
          credits: openaiCredits,
        },
        whisper: {
          language: whisperRes.data.language,
          duration: whisperRes.data.duration,
        },
        model: gptRes.data.model,
      },
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
} 