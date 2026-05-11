'use client'
import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import GlobalSettings from '../../components/GlobalSettings'
import ClipCard from '../../components/ClipCard'
import PreviewPanel from '../../components/PreviewPanel'
import { ClipItem, VideoSettings, makeItem, defaultSettings, getBackendUrl } from '../../lib/types'

const BACKEND_URL = getBackendUrl()
type Status = 'IDLE' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export default function RankingPage() {
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

  const handleMusicUpload = async (idx: number, file: File) => {
    const fd = new FormData(); fd.append('file', file)
    try { const r = await axios.post(`${BACKEND_URL}/api/videos/upload-music`, fd); updateItem(idx, 'musicPath', r.data.musicPath) }
    catch { alert('Upload failed') }
  }

  const handleGenerate = async () => {
    setError(null); setFinalUrl(null); setProgress(0)
    try {
      const r = await axios.post(`${BACKEND_URL}/api/videos/generate`, {
        preset_mode: 'ranking',
        video_settings: { ...settings },
        items_payload: [...items].reverse().map(it => ({
          name: it.clipTitle, link: it.link, script: it.script,
          audioMode: it.audioMode, musicPath: it.musicPath,
          startTime: it.startTime, endTime: it.endTime,
          clipTitle: it.clipTitle, textAnimation: it.textAnimation,
          rankColor: it.rankColor,
          clipTitleStroke: it.clipTitleStroke,
          clipTitleStrokeColor: it.clipTitleStrokeColor,
          videoHeightPct: it.videoHeightPct,
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
      a.href = url; a.download = `${settings.headerText || 'video'}.mp4`
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove()
    } catch { window.open(finalUrl, '_blank') }
  }

  const onChangeSettings = useCallback((k: string, v: any) => setSettings(p => ({ ...p, [k]: v })), [])

  const isProcessing = status === 'PENDING' || status === 'PROCESSING'

  return (
    <div className="flex bg-[#09090f] text-zinc-100" style={{ height: '100vh', overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* ── LEFT: Scrollable settings ── */}
      <div style={{ width: '45%', height: 'calc(100vh - 350px)', overflowY: 'auto', flexShrink: 0, paddingBottom: '20px' }}>
        <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">

          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/12 border border-purple-500/20 text-purple-400 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Ranking Mode
            </div>
            <button onClick={() => window.location.href = '/'} className="text-xs text-zinc-500 hover:text-white transition">← Back to Modes</button>
          </div>

          {/* Global Settings */}
          <GlobalSettings settings={settings} onChange={onChangeSettings} />

          {/* Clips */}
          <div className="space-y-2.5">
            {items.filter(it => !(it as any).isSplitPart).map((item, idx) => {
              const rank = idx + 1  // rank 1 at top
              return (
              <ClipCard key={item.id} item={item} rank={rank}
                  isActive={activeIdx === idx}
                  onFocus={() => setActiveIdx(idx)}
                  onChange={(k, v) => updateItem(idx, k, v)}
                  onMusicUpload={f => handleMusicUpload(idx, f)}
                  onRemove={() => removeItem(idx)} />
              )
            })}

            {/* Add More */}
            <button onClick={addItem}
              className="w-full py-3 rounded-2xl border border-dashed border-white/12 text-zinc-600 hover:text-zinc-300 hover:border-white/25 text-sm transition flex items-center justify-center gap-2">
              <span className="text-base">＋</span> Add More Clip
            </button>
          </div>

          {/* Actions */}
          {status === 'IDLE' && (
            <button onClick={handleGenerate}
              className="w-full py-3.5 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm transition-all hover:scale-[1.01] shadow-lg shadow-purple-900/25">
              ▶ Generate Video · {items.length} clips
            </button>
          )}

          {isProcessing && (
            <div className="rounded-2xl border border-white/8 bg-zinc-950 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-lg animate-spin">⚙️</span>
                <div>
                  <p className="text-white text-sm font-medium">{status === 'PENDING' ? 'Queued...' : 'Rendering...'}</p>
                  <p className="text-zinc-600 text-xs">TTS → Download → FFmpeg → Upload</p>
                </div>
              </div>
              <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-right text-purple-400 text-xs font-mono">{progress}%</p>
            </div>
          )}

          {status === 'COMPLETED' && finalUrl && (
            <div className="rounded-2xl border border-green-500/20 bg-green-950/15 p-5 space-y-4">
              <p className="text-green-400 text-sm font-semibold text-center">✅ Done!</p>
              <div className="flex justify-center">
                <video src={finalUrl} controls className="rounded-xl border border-white/8 max-h-80" style={{ maxWidth: 260 }} />
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={handleDownload} className="px-6 py-2.5 bg-white text-black text-sm font-bold rounded-full hover:bg-zinc-100 transition">⬇️ Download</button>
                <button onClick={() => { setStatus('IDLE'); setJobId(null); setFinalUrl(null) }}
                  className="px-5 py-2.5 border border-white/12 text-zinc-400 text-sm rounded-full hover:text-white transition">New Video</button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-950/15 p-4 flex justify-between items-center">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
              <button onClick={() => { setError(null); setStatus('IDLE') }} className="text-zinc-600 hover:text-white text-sm">✕</button>
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>

      {/* ── RIGHT: Full-height preview (55%) ── */}
      <div style={{ width: '55%', flexShrink: 0, height: 'calc(100vh - 350px)', borderLeft: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <PreviewPanel 
          settings={settings} 
          items={items} 
          activeIdx={activeIdx} 
          onChange={onChangeSettings}
          onItemsChange={(newItems) => setItems(newItems)}
        />
      </div>

    </div>
  )
}
