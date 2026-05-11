'use client'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { ClipItem, VideoSettings, makeItem, defaultSettings, getBackendUrl } from '../../lib/types'
import ClipCard from '../../components/ClipCard'
import PreviewPanel from '../../components/PreviewPanel'

const BACKEND_URL = getBackendUrl()
type Status = 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export default function SplitScreenPage() {
  const [layout, setLayout] = useState<'2x1' | '2x1-V' | '2x2' | '3-Up'>('2x1')
  const [items, setItems] = useState<ClipItem[]>([makeItem(), makeItem()])
  const [activeIdx, setActiveIdx] = useState(0)
  const [status, setStatus] = useState<Status>('IDLE')
  const [progress, setProgress] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [finalUrl, setFinalUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let needed = 2
    if (layout === '2x1' || layout === '2x1-V') needed = 2
    else if (layout === '3-Up') needed = 3
    else if (layout === '2x2') needed = 4

    if (items.length < needed) {
      setItems(prev => [...prev.slice(0, needed), ...Array(needed - prev.length).fill(null).map(() => makeItem())].slice(0, needed))
    } else if (items.length > needed) {
      setItems(prev => prev.slice(0, needed))
    }
  }, [layout])

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

  const updateItem = (idx: number, key: string, value: any) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: value } : it))

  const handleGenerate = async () => {
    setError(null); setFinalUrl(null); setProgress(0)
    try {
      const r = await axios.post(`${BACKEND_URL}/api/videos/generate`, {
        preset_mode: 'split',
        video_settings: { layout },
        items_payload: items.map(it => ({
          link: it.link, startTime: it.startTime, endTime: it.endTime
        })),
      })
      setJobId(r.data.job_id); setStatus('PENDING')
    } catch { setError('ส่งงานไม่ได้ ตรวจสอบ Backend') }
  }

  return (
    <div className="flex bg-[#050508] text-white h-screen overflow-hidden">
      
      {/* Left: Slots Config */}
      <div className="w-1/2 overflow-y-auto border-r border-white/5 custom-scrollbar p-8">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tighter">📐 Split Screen</h2>
            <div className="flex bg-zinc-900 rounded-xl p-1 border border-white/10 gap-1 overflow-x-auto no-scrollbar">
              {['2x1', '2x1-V', '3-Up', '2x2'].map(lay => (
                <button 
                  key={lay}
                  onClick={() => setLayout(lay as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition whitespace-nowrap ${layout === lay ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  {lay}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {items.map((item, idx) => (
              <ClipCard 
                key={item.id}
                item={item}
                rank={idx + 1}
                isActive={activeIdx === idx}
                onFocus={() => setActiveIdx(idx)}
                onChange={(k, v) => updateItem(idx, k, v)}
                onMusicUpload={() => {}}
                onRemove={() => {}}
              />
            ))}
          </div>

          <div className="sticky bottom-0 bg-[#050508] pt-6 pb-8">
            {status === 'IDLE' ? (
              <button onClick={handleGenerate} className="w-full py-4 rounded-3xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-2xl shadow-purple-600/20 transition-all hover:scale-[1.02]">
                🚀 Render Split Screen
              </button>
            ) : status === 'PENDING' || status === 'PROCESSING' ? (
              <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-purple-400 font-bold animate-pulse">Rendering...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${progress}%` }} className="h-full bg-purple-500" />
                </div>
              </div>
            ) : status === 'COMPLETED' && finalUrl && (
               <div className="p-6 rounded-3xl bg-green-500/10 border border-green-500/20 text-center">
                 <p className="text-green-400 text-sm font-bold mb-4">✅ Success!</p>
                 <a href={finalUrl} target="_blank" className="inline-block px-8 py-3 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition">Download Video</a>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Visualization */}
      <div className="w-1/2 bg-black/60 flex items-center justify-center p-12">
        <div className="w-full max-w-lg aspect-video bg-zinc-900 rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative">
          <div className={`grid h-full w-full gap-1 p-1 ${
            layout === '2x1' ? 'grid-cols-2' : 
            layout === '2x1-V' ? 'grid-rows-2' : 
            layout === '3-Up' ? 'grid-cols-3' : 
            'grid-cols-2 grid-rows-2'
          }`}>
            {items.map((item, idx) => (
              <div key={idx} className={`relative bg-zinc-950 border border-white/5 rounded-xl flex items-center justify-center overflow-hidden group ${activeIdx === idx ? 'ring-2 ring-purple-500' : ''}`} onClick={() => setActiveIdx(idx)}>
                {item.preview ? (
                  <img src={item.preview.thumbnail} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <span className="text-[10px] text-zinc-700 font-black uppercase">Slot {idx + 1}</span>
                )}
                {activeIdx === idx && <div className="absolute inset-0 bg-purple-500/10" />}
              </div>
            ))}
          </div>
          <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-zinc-400">
            Layout: {layout}
          </div>
        </div>
      </div>

    </div>
  )
}
