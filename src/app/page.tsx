'use client';

import { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, MusicalNoteIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { YouTubeSearchResult } from '@/lib/types';

function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Utility to decode HTML entities
function decodeHtmlEntities(str: string) {
  if (!str) return '';
  return str.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

function parseChordPro(text: string) {
  // Returns array of { chords: string[], lyric: string }
  return text.split('\n').map(line => {
    const parts: { chords: string[], lyric: string } = { chords: [], lyric: '' };
    let lyric = '';
    let chords: string[] = [];
    let match;
    const regex = /\[([^\]]+)\]/g;
    let lastIndex = 0;
    while ((match = regex.exec(line)) !== null) {
      lyric += line.slice(lastIndex, match.index);
      chords.push(match[1]);
      lastIndex = regex.lastIndex;
    }
    lyric += line.slice(lastIndex);
    parts.chords = chords;
    parts.lyric = lyric;
    return parts;
  });
}

function renderChordLyricsBlock(chart: string) {
  const lines = chart.split('\n');
  const blocks = [];
  let i = 0;
  // Chord line: only valid chord symbols, possibly separated by spaces
  const chordLineRegex = /^([A-G][#b]?m?(aj7|maj7|sus2|sus4|dim|aug|add9|7|6|9|11|13)?(\s+[A-G][#b]?m?(aj7|maj7|sus2|sus4|dim|aug|add9|7|6|9|11|13)?)*\s*)$/i;
  const sectionHeaderRegex = /^(verse|chorus|bridge|intro|outro|pre-chorus|interlude|solo|hook|refrain|coda|ending|tag|break)/i;
  while (i < lines.length) {
    const chordLine = lines[i].trim();
    // If this is a valid chord line and the next line is a lyric line
    if (
      chordLine &&
      chordLineRegex.test(chordLine) &&
      i + 1 < lines.length &&
      lines[i + 1].trim() &&
      !chordLineRegex.test(lines[i + 1].trim()) &&
      !sectionHeaderRegex.test(lines[i + 1].trim())
    ) {
      const chords = chordLine.split(/\s+/);
      const words = lines[i + 1].trim().split(/\s+/);
      blocks.push(
        <div key={i} className="mb-2">
          <div className="flex gap-2 min-h-[1.5em]">
            {chords.map((chord, idx) => (
              <span key={idx} className="font-bold text-blue-700 min-w-[2.5em] text-center">{chord}</span>
            ))}
          </div>
          <div className="flex gap-2 min-h-[1.5em]">
            {words.map((word, idx) => (
              <span key={idx} className="min-w-[2.5em] text-center">{word}</span>
            ))}
          </div>
        </div>
      );
      i += 2;
    } else if (sectionHeaderRegex.test(chordLine)) {
      blocks.push(
        <div key={i} className="mb-2">
          <span className="font-bold text-blue-700">{chordLine}</span>
        </div>
      );
      i++;
    } else {
      blocks.push(
        <div key={i} className="mb-2">
          <span>{chordLine || '\u00A0'}</span>
        </div>
      );
      i++;
    }
  }
  return blocks;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeSearchResult | null>(null);
  const [chordChart, setChordChart] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState<YouTubeSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [devInfo, setDevInfo] = useState<Record<string, any> | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'dev'>('chart');
  const [highlightedSuggestion, setHighlightedSuggestion] = useState<number>(-1);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [chartCache, setChartCache] = useState<Record<string, { chart: string; dev: any }>>({});

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Fetch suggestions as user types
  useEffect(() => {
    if (debouncedQuery.trim().length === 0 || suppressSuggestions) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    // Only fetch if not processing or loading
    if (!isProcessing && !isLoading) {
      fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: debouncedQuery }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.results && Array.isArray(data.results)) {
            setSuggestions(data.results);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    }
  }, [debouncedQuery, isProcessing, isLoading, suppressSuggestions]);

  // Hide suggestions on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation for suggestions
  useEffect(() => {
    if (!showSuggestions) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;
      if (e.key === 'ArrowDown') {
        setHighlightedSuggestion((prev) => (prev + 1) % suggestions.length);
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        setHighlightedSuggestion((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        e.preventDefault();
      } else if (e.key === 'Enter' && highlightedSuggestion >= 0) {
        setShowSuggestions(false);
        handleSuggestionClick(suggestions[highlightedSuggestion]);
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions, highlightedSuggestion]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setSelectedVideo(null);
    setChordChart(null);
    setShowModal(false);
    setShowSuggestions(false);
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search YouTube');
      }

      const data = await response.json();
      if (data.results && Array.isArray(data.results)) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setError('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error searching YouTube:', error);
      setError(error instanceof Error ? error.message : 'Failed to search YouTube');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: YouTubeSearchResult) => {
    setSearchQuery(suggestion.title);
    setShowSuggestions(false);
    setHighlightedSuggestion(-1);
    setSuppressSuggestions(true);
    if (inputRef.current) inputRef.current.blur();
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }, 0);
  };

  const handleVideoSelect = async (video: YouTubeSearchResult, useCache = false) => {
    setSelectedVideo(video);
    setChordChart(null);
    setIsProcessing(!useCache);
    setError(null);
    setShowModal(false);
    setDevInfo(null);
    setActiveTab('chart');

    if (useCache && chartCache[video.id]) {
      setChordChart(chartCache[video.id].chart);
      setDevInfo(chartCache[video.id].dev);
      setShowModal(true);
      return;
    }

    try {
      const response = await fetch('/api/youtube/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: video.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process video');
      }

      const data = await response.json();
      setChordChart(data.chordChart);
      setDevInfo(data.dev || null);
      setChartCache((prev) => ({ ...prev, [video.id]: { chart: data.chordChart, dev: data.dev } }));
      setShowModal(true);
    } catch (error) {
      console.error('Error processing video:', error);
      setError(error instanceof Error ? error.message : 'Failed to process video');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-black text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          GuitarGPT - YouTube Chord Chart Generator
        </h1>
        
        <form onSubmit={handleSearch} className="mb-8 relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  setSuppressSuggestions(false);
                }}
                placeholder="Search for a song on YouTube..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-900 text-white placeholder-gray-400"
                autoComplete="off"
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                disabled={isProcessing}
              />
              <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 bg-white text-black rounded shadow-lg z-20 max-h-64 overflow-auto border border-gray-200">
                  {suggestions.map((s, index) => (
                    <li
                      key={s.id}
                      className={`px-4 py-2 hover:bg-blue-100 cursor-pointer ${highlightedSuggestion === index ? 'bg-blue-100' : ''}`}
                      onMouseDown={() => handleSuggestionClick(s)}
                    >
                      <div className="flex items-center gap-2">
                        <img src={s.thumbnail} alt={s.title} className="w-10 h-7 object-cover rounded" />
                        <span className="truncate">{decodeHtmlEntities(s.title)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || isProcessing}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-4">
            {searchResults.map((video) => (
              <div
                key={video.id}
                className={`flex gap-4 p-4 border rounded-lg items-center bg-gray-900 ${selectedVideo?.id === video.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{ opacity: isProcessing ? 0.5 : 1, pointerEvents: isProcessing ? 'none' : 'auto' }}
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-32 h-24 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{decodeHtmlEntities(video.title)}</h3>
                  <p className="text-sm text-gray-400 truncate">{video.channelTitle}</p>
                </div>
                {chartCache[video.id] ? (
                  <button
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    onClick={() => handleVideoSelect(video, true)}
                    disabled={isProcessing}
                  >
                    <MusicalNoteIcon className="h-5 w-5" />
                    View Chart
                  </button>
                ) : (
                  <button
                    className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onClick={() => handleVideoSelect(video)}
                    disabled={isProcessing}
                  >
                    <MusicalNoteIcon className="h-5 w-5" />
                    Create Chart
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-80">
          <div className="mb-8 text-center">
            <div className="flex justify-center gap-4 mb-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <MusicalNoteIcon
                  key={i}
                  className={`h-16 w-16 text-blue-400 animate-bounce`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <h2 className="text-2xl font-bold mb-2">Processing...</h2>
            <p className="text-lg">This may take 30 seconds or more depending on song length and server load.</p>
          </div>
        </div>
      )}

      {/* Chord Chart Modal */}
      {showModal && chordChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="relative bg-white text-gray-900 rounded-lg shadow-2xl max-w-4xl w-full mx-4 p-8">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <XMarkIcon className="h-7 w-7" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <MusicalNoteIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-xl font-semibold">
                {selectedVideo ? `${selectedVideo.channelTitle} - ${decodeHtmlEntities(selectedVideo.title)}` : 'Chord Chart'}
              </h2>
            </div>
            {/* Tabs */}
            <div className="flex gap-4 mb-4 border-b">
              <button
                className={`px-4 py-2 font-semibold ${activeTab === 'chart' ? 'border-b-2 border-blue-500 text-blue-700' : 'text-gray-500'}`}
                onClick={() => setActiveTab('chart')}
              >
                Chord Chart
              </button>
              <button
                className={`px-4 py-2 font-semibold ${activeTab === 'dev' ? 'border-b-2 border-blue-500 text-blue-700' : 'text-gray-500'}`}
                onClick={() => setActiveTab('dev')}
              >
                Dev
              </button>
            </div>
            {/* Tab Content */}
            {activeTab === 'chart' && (
              <div className="bg-gray-100 text-gray-800 p-4 rounded shadow-inner max-h-[60vh] overflow-auto font-mono text-base">
                {renderChordLyricsBlock(chordChart)}
              </div>
            )}
            {activeTab === 'dev' && devInfo && (
              <div className="bg-gray-100 text-gray-800 p-4 rounded shadow-inner max-h-[60vh] overflow-auto text-sm">
                <h3 className="font-semibold mb-2">Diagnostics</h3>
                <div className="mb-2">
                  <span className="font-semibold">Timings (ms):</span>
                  <ul className="ml-4">
                    {Object.entries(devInfo.timings || {}).map(([k, v]) => (
                      <li key={k}>{k}: <span className="font-mono">{String(v)}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">OpenAI Usage:</span>
                  <ul className="ml-4">
                    <li>Prompt tokens: <span className="font-mono">{devInfo.openai?.promptTokens}</span></li>
                    <li>Completion tokens: <span className="font-mono">{devInfo.openai?.completionTokens}</span></li>
                    <li>Total tokens: <span className="font-mono">{devInfo.openai?.totalTokens}</span></li>
                    <li>Estimated cost: <span className="font-mono">${devInfo.openai?.estimatedCost?.toFixed(5)}</span></li>
                  </ul>
                </div>
                {devInfo.openai?.credits && !devInfo.openai?.credits.error && (
                  <div className="mb-2">
                    <span className="font-semibold">OpenAI Credits:</span>
                    <pre className="bg-gray-200 rounded p-2 overflow-x-auto">{JSON.stringify(devInfo.openai?.credits, null, 2)}</pre>
                  </div>
                )}
                <div className="mb-2">
                  <span className="font-semibold">Whisper:</span>
                  <ul className="ml-4">
                    <li>Language: <span className="font-mono">{devInfo.whisper?.language}</span></li>
                    <li>Duration: <span className="font-mono">{devInfo.whisper?.duration}</span></li>
                  </ul>
                </div>
                <div className="mb-2">
                  <span className="font-semibold">Model:</span> <span className="font-mono">{devInfo.model}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

