'use client'
import React, { useRef, memo, useState } from 'react'
import { ClipItem, getBackendUrl } from '../lib/types'
import Timeline from './Timeline'
import axios from 'axios'

const BACKEND_URL = getBackendUrl()
const ANIM_OPTIONS = [
  { key: 'fade', label: 'Fade In', icon: '✨' },
  { key: 'slide', label: 'Slide Up', icon: '⬆️' },
  { key: 'zoom', label: 'Zoom In', icon: '🔍' },
  { key: 'pop', label: 'Pop Out', icon: '💥' }
]

const ClipCard = ({ item, rank, isActive, onFocus, onChange, onMusicUpload, onRemove }: {
  item: ClipItem; rank: number; isActive: boolean; onFocus: () => void;
  onChange: (k: string, v: any) => void; onMusicUpload: (f: File) => void; onRemove: () => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  const handleUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const url = e.target.value.trim()
    onChange('link', url)
    if (!url) return
    fetchPreview(url)
  }

  const [isFetching, setIsFetching] = useState(false)

  const fetchPreview = async (url: string) => {
    try {
      setIsFetching(true)
      const r = await fetch(`${BACKEND_URL}/api/videos/preview?url=${encodeURIComponent(url)}`)
      const data = await r.json()
      if (!data.error) onChange('preview', data)
    } catch {
      // Error handling
    } finally {
      setIsFetching(false)
    }
  }

  return (
    <div 
      onClick={onFocus}
      className={`relative group rounded-3xl transition-all duration-500 overflow-hidden border mb-4 ${
        isActive 
          ? 'bg-zinc-900/80 border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/20' 
          : 'bg-zinc-900/30 border-white/5 hover:bg-zinc-900/50 hover:border-white/10'
      }`}
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-500 ${isActive ? 'bg-purple-500' : 'bg-zinc-800'}`} />

      <div className="p-6">
        {/* URL Link Input */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/5 flex items-center justify-center font-black text-white shadow-inner shrink-0">
            {rank}
          </div>
          <input 
            placeholder="Paste YouTube / TikTok Link (Press Enter to load)..."
            className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm font-medium focus:border-purple-500 outline-none transition-colors placeholder:text-zinc-600"
            defaultValue={item.link}
            onBlur={handleUrlBlur}
            onKeyDown={handleUrlKeyDown}
            disabled={isFetching}
          />
          {isFetching ? (
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
               <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        {/* Info Rows */}
        <div className="space-y-6">
          {/* Row 1: Title & Animation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-1">Clip Title</label>
              <input 
                placeholder="Enter Title..."
                className="w-full bg-zinc-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:border-purple-500/50 outline-none transition-all"
                value={item.clipTitle}
                onChange={e => onChange('clipTitle', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest pl-1">Animation</label>
              <div className="flex gap-1.5 h-[42px]">
                {ANIM_OPTIONS.map(opt => (
                  <button 
                    key={opt.key}
                    onClick={() => onChange('textAnimation', opt.key)}
                    title={opt.label}
                    className={`flex-1 rounded-xl text-lg border transition-all flex items-center justify-center ${
                      item.textAnimation === opt.key 
                        ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-lg shadow-purple-500/10' 
                        : 'bg-zinc-950/30 border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400'
                    }`}
                  >
                    {opt.icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Audio Source */}
          <div className="space-y-3">
             <div className="flex items-center justify-between pl-1">
               <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Audio Source</label>
               <span className="text-[9px] text-zinc-600 font-medium italic">Select sound priority</span>
             </div>
             
             <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner">
               {[
                 { key: 'clip', label: 'Original', icon: '🎤' },
                 { key: 'ai', label: 'AI Voice', icon: '🤖' },
                 { key: 'music', label: 'Music', icon: '🎵' }
               ].map(mode => (
                 <button
                   key={mode.key}
                   onClick={() => onChange('audioMode', mode.key)}
                   className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all duration-300 flex flex-col items-center gap-1.5 ${
                     item.audioMode === mode.key 
                      ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-[1.02]' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                   }`}
                 >
                   <span className="text-sm">{mode.icon}</span>
                   {mode.label}
                 </button>
               ))}
             </div>

             {item.audioMode === 'ai' && (
               <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500 p-5 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                 <div className="flex flex-wrap gap-4">
                   <div className="flex-1 min-w-[140px] space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-purple-400/60 ml-1">Engine</label>
                      <select 
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-purple-500 outline-none transition-all cursor-pointer"
                        value={item.ttsEngine || 'edge'}
                        onChange={e => onChange('ttsEngine', e.target.value)}
                      >
                        <option value="edge">Edge (Fast)</option>
                        <option value="kokoro">Kokoro (HD)</option>
                        <option value="piper">Piper (Offline)</option>
                      </select>
                   </div>
                   <div className="flex-1 min-w-[140px] space-y-1.5">
                      <label className="text-[9px] uppercase font-bold text-purple-400/60 ml-1">Voice</label>
                      <select 
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-purple-500 outline-none transition-all cursor-pointer"
                        value={item.voice || 'th-TH-NiwatNeural'}
                        onChange={e => onChange('voice', e.target.value)}
                      >
                        <option value="th-TH-NiwatNeural">Niwat (Male)</option>
                        <option value="th-TH-PremwadeeNeural">Prem (Female)</option>
                        <option value="en-US-JennyNeural">Jenny (EN)</option>
                      </select>
                   </div>
                   <div className="pt-[22px]">
                      <button 
                        onClick={async () => {
                          try {
                            const r = await axios.post(`${BACKEND_URL}/api/videos/preview-voice`, { text: item.script, voice: item.voice || 'th-TH-NiwatNeural', engine: item.ttsEngine || 'edge' });
                            new Audio(r.data.url).play();
                          } catch { alert('Preview failed') }
                        }}
                        className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 hover:bg-purple-600 hover:text-white transition-all shadow-lg"
                        title="Preview Voice"
                      >
                        🔊
                      </button>
                   </div>
                 </div>
                 <textarea 
                   placeholder="What should the AI say for this rank?"
                   className="w-full bg-zinc-950/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 focus:border-purple-500 focus:bg-zinc-900 outline-none transition-all min-h-[100px] leading-relaxed placeholder:text-zinc-600 resize-y"
                   value={item.script}
                   onChange={e => onChange('script', e.target.value)}
                 />
               </div>
             )}

             {item.audioMode === 'music' && (
               <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
                  <button 
                    onClick={() => fileRef.current?.click()}
                    className={`w-full py-6 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center gap-2 ${
                      item.musicPath 
                        ? 'border-green-500/40 bg-green-500/5 text-green-400' 
                        : 'border-white/5 bg-zinc-950/50 text-zinc-600 hover:border-purple-500/40 hover:text-purple-400'
                    }`}
                  >
                    <span className="text-2xl">{item.musicPath ? '🎵' : '➕'}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {item.musicPath ? item.musicPath.split('/').pop() : 'Upload Individual Music'}
                    </span>
                    {!item.musicPath && <span className="text-[8px] opacity-40 font-medium">Fallback: Global BGM / Silence</span>}
                  </button>
                  <input type="file" ref={fileRef} className="hidden" accept="audio/*" onChange={e => e.target.files?.[0] && onMusicUpload(e.target.files[0])} />
               </div>
             )}
          </div>

          {/* Row 3: Timeline (Full Width) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pl-1">
              <label className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Trimming Timeline</label>
              <span className="text-[9px] text-zinc-600 font-medium italic">Drag to trim video</span>
            </div>
            <div className="bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner">
              <Timeline 
                start={item.startTime} 
                end={item.endTime} 
                maxDuration={item.preview?.duration || 30}
                onChange={(s, e) => { onChange('startTime', s); onChange('endTime', e) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(ClipCard)
