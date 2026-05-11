'use client'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import GlobalSettings from '../../components/GlobalSettings'
import ClipCard from '../../components/ClipCard'
import PreviewPanel from '../../components/PreviewPanel'
import { ClipItem, VideoSettings, makeItem, defaultSettings, getBackendUrl } from '../../lib/types'

const BACKEND_URL = getBackendUrl()
type Status = 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export default function SequencePage() {
  const [settings, setSettings] = useState<VideoSettings>(defaultSettings())
  const [items, setItems] = useState<ClipItem[]>([makeItem()])
  const [activeIdx, setActiveIdx] = useState(0)
  const [status, setStatus] = useState<Status>('IDLE')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Poll job
  useEffect(() => {
    if (!jobId || status === 'COMPLETED' || status === 'FAILED' || status === 'IDLE') return
    const iv = setInterval(async () => {
      try {
        const r = await axios.get(`${BACKEND_URL}/api/videos/status/${jobId}`)
        setProgress(r.data.progress || 0)
        if (r.data.status === 'COMPLETED') { setStatus('COMPLETED'); setFinalUrl(r.data.final_video_url); clearInterval(iv) }
        else if (r.data.status === 'FAILED') { setStatus('FAILED'); setError('การสร้างวิดีโอล้มเหลว'); clearInterval(iv) }
      } catch {}
    }, 2000)
    return () => clearInterval(iv)
  }, [jobId, status])

  const updateItem = useCallback((idx: number, key: string, value: any) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it)), [])

  const addItem = () => { setItems(p => [...p, makeItem()]); setActiveIdx(items.length) }
  const removeItem = (idx: number) => {
    if (items.length <= 1) return
    setItems(p => p.filter((_, i) => i !== idx))
    setActiveIdx(Math.max(0, activeIdx - 1))
  }

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const newItems = [...items]
    const target = dir === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= items.length) return
    ;[newItems[idx], newItems[target]] = [newItems[target], newItems[idx]]
    setItems(newItems)
    setActiveIdx(target)
  }

  const handleGenerate = async () => {
    setError(null); setFinalUrl(null); setProgress(0)
    try {
      const r = await axios.post(`${BACKEND_URL}/api/videos/generate`, {
        preset_mode: 'sequence',
        video_settings: { ...settings },
        items_payload: items.map(it => ({
          link: it.link, script: it.script,
          audioMode: it.audioMode, voice: it.voice, ttsEngine: it.ttsEngine,
          startTime: it.startTime, endTime: it.endTime,
          timelineItems: it.timelineItems
        })),
      })
      setJobId(r.data.job_id); setStatus('PENDING')
    } catch { setError('ส่งงานไม่ได้ ตรวจสอบ Backend') }
  }

  const handleDownload = async () => {
    if (!finalUrl) return
    try {
      const r = await fetch(finalUrl); const blob = await r.blob()
      const url = URL.createObjectURL(blob); const a = document.createElement('a')
      a.href = url; a.download = `sequence_video.mp4`
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove()
    } catch { window.open(finalUrl, '_blank') }
  }

  const isProcessing = status === 'PENDING' || status === 'PROCESSING'

  return (
    <div className="flex bg-[#09090f] text-zinc-100 h-screen overflow-hidden font-sans">
      
      {/* Left Panel: Clips List */}
      <div className="w-1/2 overflow-y-auto border-r border-white/5 custom-scrollbar">
        <div className="max-w-2xl mx-auto p-8 space-y-6">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tighter">🎬 Sequence Mode</h2>
              <p className="text-zinc-500 text-xs">Combine clips in order with transitions</p>
            </div>
            <button onClick={() => window.location.href = '/'} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition">← Back</button>
          </div>

          {/* Clips List */}
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={item.id} className="relative group">
                <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => moveItem(idx, 'up')} className="p-2 rounded-lg bg-zinc-900 border border-white/5 hover:border-purple-500 transition">⬆️</button>
                  <button onClick={() => moveItem(idx, 'down')} className="p-2 rounded-lg bg-zinc-900 border border-white/5 hover:border-purple-500 transition">⬇️</button>
                </div>
                <ClipCard 
                  item={item} 
                  rank={idx + 1}
                  isActive={activeIdx === idx}
                  onFocus={() => setActiveIdx(idx)}
                  onChange={(k, v) => updateItem(idx, k, v)}
                  onMusicUpload={() => {}}
                  onRemove={() => removeItem(idx)}
                />
              </div>
            ))}
            
            <button onClick={addItem} className="w-full py-4 rounded-3xl border-2 border-dashed border-white/5 text-zinc-600 hover:text-white hover:border-white/20 transition flex items-center justify-center gap-2">
              <span className="text-xl">＋</span> Add Next Clip
            </button>
          </div>

          {/* Action Bar */}
          <div className="pt-10 sticky bottom-0 bg-gradient-to-t from-[#09090f] via-[#09090f] to-transparent pb-8">
            {status === 'IDLE' && (
              <button onClick={handleGenerate} className="w-full py-4 rounded-3xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-2xl shadow-blue-600/20 transition-all hover:scale-[1.02]">
                ⚡ Render Sequence ({items.length} clips)
              </button>
            )}

            {isProcessing && (
               <div className="p-6 rounded-3xl bg-zinc-900/80 border border-white/10 backdrop-blur-xl">
                 <div className="flex items-center justify-between mb-3">
                   <span className="text-xs font-bold text-blue-400 uppercase tracking-widest animate-pulse">Rendering...</span>
                   <span className="text-xs font-mono">{progress}%</span>
                 </div>
                 <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progress}%` }}
                     className="h-full bg-blue-500"
                   />
                 </div>
               </div>
            )}

            {status === 'COMPLETED' && finalUrl && (
              <div className="space-y-4 p-6 rounded-3xl bg-green-500/10 border border-green-500/20">
                <p className="text-center text-green-400 text-sm font-bold">✅ Video Ready!</p>
                <div className="flex gap-2">
                  <button onClick={handleDownload} className="flex-1 py-3 rounded-2xl bg-white text-black font-bold text-sm">Download</button>
                  <button onClick={() => setStatus('IDLE')} className="flex-1 py-3 rounded-2xl bg-zinc-800 text-white font-bold text-sm">Create New</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="w-1/2 flex flex-col items-center justify-center p-12 bg-black/40">
        <PreviewPanel 
          settings={settings}
          items={items}
          activeIdx={activeIdx}
          onChange={(k, v) => setSettings(p => ({ ...p, [k]: v }))}
        />
      </div>

    </div>
  )
}
