import { NextResponse } from 'next/server';
import axios from 'axios';
import { YouTubeApiResponse } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }

    const response = await axios.get<YouTubeApiResponse>(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: 'snippet',
          maxResults: 10,
          q: query,
          type: 'video',
          key: process.env.YOUTUBE_API_KEY,
        },
      }
    );

    const results = response.data.items.map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube' },
      { status: 500 }
    );
  }
} 