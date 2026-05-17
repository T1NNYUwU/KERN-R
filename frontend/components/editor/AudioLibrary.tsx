'use client'
import { useState } from 'react'
import { useEditorStore, makeClipId, MediaFile, Clip } from '../../lib/store'
import { Music, Loader2, Sparkles, MessageSquare } from 'lucide-react'

import { useAuth } from '../../contexts/AuthContext'
import { getBackendUrl } from '../../lib/types'

const VOICES = [
  { id: 'th-TH-NiwatNeural', name: 'Niwat (TH)', gender: 'Male' },
  { id: 'th-TH-PremwadeeNeural', name: 'Premwadee (TH)', gender: 'Female' },
  { id: 'en-US-GuyNeural', name: 'Guy (EN)', gender: 'Male' },
  { id: 'en-US-AriaNeural', name: 'Aria (EN)', gender: 'Female' },
]

export default function AudioLibrary() {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id)
  const [isGenerating, setIsGenerating] = useState(false)
  const { addMedia, tracks, addTrack, clips, addClip } = useEditorStore()

  const generateTTS = async () => {
    if (!text.trim() || !user) return
    setIsGenerating(true)
    try {
      const backendUrl = getBackendUrl()
      const res = await fetch(`${backendUrl}/api/videos/preview-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          engine: 'edge'
        })
      })
      const data = await res.json()
      
      if (data.url) {
        // Fetch the file to get duration and Blob for local use
        const audioRes = await fetch(data.url)
        const blob = await audioRes.blob()
        const file = new File([blob], `TTS_${Date.now()}.mp3`, { type: 'audio/mpeg' })
        
        // Get duration
        const audio = new Audio()
        audio.src = URL.createObjectURL(blob)
        await new Promise(r => audio.onloadedmetadata = r)
        const duration = audio.duration

        const id = crypto.randomUUID()
        const media: MediaFile = {
          id,
          name: `TTS: ${text.slice(0, 15)}...`,
          type: 'audio',
          file,
          url: data.url,
          duration
        }

        await addMedia(media, user.id)
        
        // Auto-add to timeline
        const track = tracks.find(t => t.type === 'audio')
        const trackId = track?.id || addTrack('audio')
        
        const trackClips = clips.filter(c => c.trackId === trackId)
        const nextStart = trackClips.length === 0 ? 0 : Math.max(...trackClips.map(c => c.startTime + c.duration))

        const clip: Clip = {
          id: makeClipId(),
          mediaId: id,
          name: media.name,
          type: 'audio',
          trackId,
          startTime: nextStart,
          duration,
          trimStart: 0,
          trimEnd: 0,
          volume: 1
        }
        addClip(clip)
        setText('')
      }
    } catch (e) {
      console.error('TTS Generation failed', e)
      alert('Failed to generate AI Voiceover')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 gap-6">
      <div className="flex items-center gap-2 text-indigo-400">
        <Sparkles className="w-4 h-4" />
        <h2 className="text-sm font-bold uppercase tracking-wider">AI Voiceover</h2>
      </div>

      <div className="flex flex-col gap-4 bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Select Voice</label>
          <div className="grid grid-cols-2 gap-2">
            {VOICES.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={`text-[10px] py-2 px-3 rounded-lg border transition-all text-left ${
                  selectedVoice === v.id 
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="font-bold">{v.name}</div>
                <div className="opacity-50">{v.gender}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Content</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type anything for AI to say..."
            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        <button
          onClick={generateTTS}
          disabled={isGenerating || !text.trim()}
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-xs transition-all ${
            isGenerating || !text.trim()
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4" />
              Create Voiceover
            </>
          )}
        </button>
      </div>

      <div className="mt-auto">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <Music className="w-4 h-4 text-indigo-400" />
          <p className="text-[10px] text-zinc-400 leading-snug">
            Generated audio will be automatically added to your library and timeline.
          </p>
        </div>
      </div>
    </div>
  )
}
