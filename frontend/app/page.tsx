'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useEditorStore } from '../lib/store'
import {
  Download, Scissors, Trash2, Undo2, Redo2, Monitor,
  LayoutTemplate, Type, Music, FolderOpen, Layers,
  Sparkles, User, Play, Pause, SkipBack, ZoomIn, ZoomOut, Magnet
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import ConfirmModal from '../components/ui/ConfirmModal'

const MediaBin          = dynamic(() => import('../components/editor/MediaBin'),          { ssr: false })
const VideoPreview      = dynamic(() => import('../components/editor/VideoPreview'),      { ssr: false })
const Timeline          = dynamic(() => import('../components/editor/Timeline'),          { ssr: false })
const TextLibrary       = dynamic(() => import('../components/editor/TextLibrary'),       { ssr: false })
const AudioLibrary      = dynamic(() => import('../components/editor/AudioLibrary'),      { ssr: false })
const TransitionLibrary = dynamic(() => import('../components/editor/TransitionLibrary'), { ssr: false })
const Inspector         = dynamic(() => import('../components/editor/Inspector'),         { ssr: false })

/* ─── colour tokens (CapCut-like dark) ──────────────────────── */
const C = {
  bg:          '#0d0d0f',   // deepest background
  surface0:    '#111113',   // sidebar bg
  surface1:    '#17171a',   // panel bg
  surface2:    '#1e1e22',   // elevated card
  border:      'rgba(255,255,255,0.07)',
  borderBright:'rgba(255,255,255,0.13)',
  text:        '#e8e8eb',
  textMuted:   '#72727a',
  accent:      '#5b5cf6',   // indigo accent
  danger:      '#f87171',
}

export default function EditorPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  const { initStore, undo, redo, historyIndex, history } = useEditorStore()

  const [showSignOutModal,  setShowSignOutModal]  = useState(false)
  const [activeTab,         setActiveTab]         = useState('media')
  const [isExporting,       setIsExporting]       = useState(false)
  const [exportProgress,    setExportProgress]    = useState(0)
  const [finalVideoUrl,     setFinalVideoUrl]     = useState<string | null>(null)
  const [isBackendHealthy,  setIsBackendHealthy]  = useState(false)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  useEffect(() => { if (!loading && !user) router.push('/login') }, [user, loading, router])

  useEffect(() => {
    if (user?.id) initStore(user.id)
    const ping = async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:3005'}/api/videos/health`,
          { signal: AbortSignal.timeout(3000) })
        setIsBackendHealthy(r.ok)
      } catch { setIsBackendHealthy(false) }
    }
    ping(); const iv = setInterval(ping, 10000); return () => clearInterval(iv)
  }, [initStore, user?.id])

  const navItems = [
    { id: 'media',       icon: FolderOpen,     label: 'Media'       },
    { id: 'audio',       icon: Music,          label: 'Audio'       },
    { id: 'text',        icon: Type,           label: 'Text'        },
    { id: 'transitions', icon: Layers,         label: 'Transitions' },
    { id: 'elements',    icon: LayoutTemplate, label: 'Elements'    },
    { id: 'effects',     icon: Sparkles,       label: 'Effects'     },
  ]

  const handleExport = async () => {
    try {
      setIsExporting(true); setExportProgress(0)
      const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:3005'
      const { clips, mediaFiles } = useEditorStore.getState()
      const res = await fetch(`${base}/api/videos/render`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: crypto.randomUUID(), user_id: user?.id, clips,
          mediaFiles: mediaFiles.map(({ id, name, type, url, duration }) => ({ id, name, type, url, duration }))
        })
      })
      const { jobId } = await res.json()
      if (!jobId) throw new Error('no jobId')
      const poll = setInterval(async () => {
        const d = await (await fetch(`${base}/api/videos/status/${jobId}`)).json()
        setExportProgress(d.progress ?? 0)
        if (d.status === 'COMPLETED') {
          clearInterval(poll); setExportProgress(100); setFinalVideoUrl(d.final_video_url)
          const a = document.body.appendChild(document.createElement('a'))
          a.href = d.final_video_url; a.download = 'KERN-R-Export.mp4'; a.click()
          document.body.removeChild(a)
        } else if (d.status === 'FAILED') {
          clearInterval(poll); setIsExporting(false); toast.error('Export failed on server.')
        }
      }, 2000)
    } catch { toast.error('Export failed!'); setIsExporting(false) }
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden select-none"
      style={{ background: C.bg, color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ═══════ HEADER ═══════ */}
      <header style={{ height: 48, background: C.surface0, borderBottom: `1px solid ${C.borderBright}`, boxShadow: '0 1px 8px rgba(0,0,0,0.4)' }}
        className="shrink-0 flex items-center justify-between px-4 z-30">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 group cursor-pointer active:scale-95 transition-all">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_2px_12px_rgba(91,92,246,0.4)] border border-white/10 group-hover:border-indigo-500/50 transition-colors">
              <img src="/logo.png" className="w-full h-full object-cover" alt="KERN-R Logo" />
            </div>
            <div className="flex flex-col">
              <span style={{ fontWeight: 900, fontSize: 13, color: '#fff', letterSpacing: '0.15em', lineHeight: 1 }}>KERN-R</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Creative Studio</span>
            </div>
          </div>

          <div style={{ width: 1, height: 16, background: C.border, margin: '0 4px' }} />

          {/* Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
            background: isBackendHealthy ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${isBackendHealthy ? 'rgba(16,185,129,0.25)' : 'rgba(248,113,113,0.25)'}`,
            borderRadius: 99 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%',
              background: isBackendHealthy ? '#10b981' : '#f87171',
              boxShadow: isBackendHealthy ? '0 0 6px #10b981' : '0 0 6px #f87171' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: isBackendHealthy ? '#6ee7b7' : '#fca5a5', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {isBackendHealthy ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Export */}
        <button onClick={handleExport} disabled={isExporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: isExporting ? C.surface2 : 'linear-gradient(135deg, #6366f1 0%, #5b5cf6 100%)',
            color: '#fff', border: 'none',
            boxShadow: isExporting ? 'none' : '0 2px 12px rgba(91,92,246,0.45)',
            opacity: isExporting ? 0.7 : 1, transition: 'all 0.15s',
          }}>
          <Download size={14} />
          {isExporting ? `Exporting ${exportProgress}%…` : 'Export Video'}
        </button>
      </header>

      {/* ═══════ BODY ═══════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{ width: 80, background: C.surface0, borderRight: `1px solid ${C.borderBright}`, boxShadow: '2px 0 12px rgba(0,0,0,0.3)' }}
          className="shrink-0 flex flex-col items-center pt-3 pb-3 gap-0.5 z-20">

          {navItems.map(({ id, icon: Icon, label }) => {
            const active = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{
                  width: 64, padding: '10px 4px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                  background: active ? 'rgba(91,92,246,0.15)' : 'transparent',
                  color: active ? '#a5b4fc' : C.textMuted,
                  transition: 'all 0.15s',
                  outline: active ? '1px solid rgba(91,92,246,0.35)' : '1px solid transparent',
                }}>
                <Icon size={19} strokeWidth={active ? 2.2 : 1.6} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, letterSpacing: '0.02em' }}>{label}</span>
              </button>
            )
          })}

          {/* Profile button */}
          <button onClick={() => setShowSignOutModal(true)}
            style={{ marginTop: 'auto', width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${C.borderBright}`,
              overflow: 'hidden', cursor: 'pointer', background: C.surface2,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title={`Sign out (${user?.email})`}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={16} color={C.textMuted} />}
          </button>
        </aside>

        {/* ── MAIN WORKSPACE ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* TOP ROW: panels */}
          <div className="flex overflow-hidden" style={{ flex: '0 0 58%' }}>

            {/* Media Library */}
            <div style={{ width: 300, background: C.surface1, borderRight: `1px solid ${C.borderBright}`, display: 'flex', flexDirection: 'column', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{navItems.find(i => i.id === activeTab)?.label}</span>
                <span style={{ fontSize: 10, color: C.textMuted, padding: '2px 8px', background: C.surface2, borderRadius: 99, border: `1px solid ${C.border}` }}>Library</span>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 'media'       && <MediaBin />}
                {activeTab === 'text'        && <TextLibrary />}
                {activeTab === 'audio'       && <AudioLibrary />}
                {activeTab === 'transitions' && <TransitionLibrary />}
                {(activeTab === 'elements' || activeTab === 'effects') && (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: C.textMuted }}>
                    <Sparkles size={28} />
                    <span style={{ fontSize: 12 }}>Coming soon</span>
                  </div>
                )}
              </div>
            </div>

            {/* Video Preview */}
            <div className="relative flex-1 flex items-center justify-center" style={{ background: '#000', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)' }}>
              <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 99,
                background: 'rgba(0,0,0,0.7)', border: `1px solid rgba(255,255,255,0.1)`,
                backdropFilter: 'blur(8px)', fontSize: 11, color: '#aaa' }}>
                <Monitor size={11} />
                <span>Preview</span>
              </div>
              <VideoPreview />
            </div>

            {/* Inspector */}
            <div style={{ width: 280, background: C.surface1, borderLeft: `1px solid ${C.borderBright}`, display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 8px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '10px 16px 8px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Inspector</span>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <Inspector />
              </div>
            </div>
          </div>

          {/* BOTTOM: toolbar + timeline */}
          <div style={{ flex: '0 0 42%', background: C.bg, borderTop: `2px solid ${C.borderBright}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* ── TOOLBAR ── */}
            <div style={{ height: 52, background: C.surface1, borderBottom: `1px solid ${C.borderBright}`,
              display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>

              {/* Undo / Redo */}
              <Pill>
                <TBtn onClick={undo} disabled={!canUndo} tip="Undo  Ctrl+Z"><Undo2 size={14}/></TBtn>
                <TBtn onClick={redo} disabled={!canRedo} tip="Redo  Ctrl+Shift+Z"><Redo2 size={14}/></TBtn>
              </Pill>

              <Sep />

              {/* Edit */}
              <Pill>
                <TBtn
                  tip="Split clip (S)"
                  label="Split"
                  onClick={() => {
                    const s = useEditorStore.getState()
                    if (s.selectedClipId) s.splitClip(s.selectedClipId, s.currentTime)
                    else toast('Select a clip first', { icon: '✂️' })
                  }}>
                  <Scissors size={14}/>
                </TBtn>
                <TBtn
                  tip="Delete clip (Del)"
                  label="Delete"
                  danger
                  onClick={() => {
                    const s = useEditorStore.getState()
                    if (s.selectedClipId) s.removeClip(s.selectedClipId)
                    else toast('Select a clip first', { icon: '🗑️' })
                  }}>
                  <Trash2 size={14}/>
                </TBtn>
                
                <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                
                <TBtn
                  tip="Magnetic Timeline (Auto-Snap)"
                  onClick={() => alert("Magnetic Timeline is always ON for professional precision.")}>
                  <Magnet size={14} color="#3b82f6" />
                </TBtn>
              </Pill>

              {/* ─── PLAYBACK ─── center */}
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <TBtn tip="Go to start" onClick={() => useEditorStore.getState().setCurrentTime(0)}>
                  <SkipBack size={14}/>
                </TBtn>
                <TBtn tip="Back 5s" onClick={() => { const s = useEditorStore.getState(); s.setCurrentTime(Math.max(0, s.currentTime - 5)) }}>
                  <Undo2 size={14} style={{ transform: 'scaleX(-1)' }}/>
                </TBtn>

                {/* ● BIG Play */}
                <PlayBtn />

                <TBtn tip="Forward 5s" onClick={() => { const s = useEditorStore.getState(); s.setCurrentTime(s.currentTime + 5) }}>
                  <Redo2 size={14} style={{ transform: 'scaleX(-1)' }}/>
                </TBtn>

                {/* Timecode */}
                <div style={{ padding: '4px 12px', borderRadius: 6, background: C.surface2, border: `1px solid ${C.border}` }}>
                  <TimecodeDisplay />
                </div>
              </div>

              <Sep />

              {/* Zoom */}
              <Pill>
                <TBtn tip="Zoom out" onClick={() => { const s = useEditorStore.getState(); s.setZoom(Math.max(15, s.zoom - 20)) }}>
                  <ZoomOut size={14}/>
                </TBtn>
                <ZoomTrack />
                <TBtn tip="Zoom in"  onClick={() => { const s = useEditorStore.getState(); s.setZoom(Math.min(400, s.zoom + 20)) }}>
                  <ZoomIn size={14}/>
                </TBtn>
              </Pill>
            </div>

            {/* Timeline */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Timeline />
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {isExporting && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface2, border: `1px solid ${C.borderBright}`, borderRadius: 20, padding: 40,
            width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            {exportProgress === 100 && finalVideoUrl ? (
              <>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Download size={24} color="#10b981"/>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>Export Complete!</p>
                  <p style={{ fontSize: 12, color: C.textMuted }}>Your video is ready</p>
                </div>
                <a href={finalVideoUrl || undefined} download="KERN-R-Export.mp4"
                  style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: '#10b981',
                    color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center', textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                  Download Video
                </a>
                <button onClick={() => { setIsExporting(false); setFinalVideoUrl(null) }}
                  style={{ fontSize: 12, color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Close
                </button>
              </>
            ) : (
              <>
                <div style={{ position: 'relative', width: 88, height: 88 }}>
                  <svg viewBox="0 0 88 88" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="44" cy="44" r="38" stroke="rgba(255,255,255,0.06)" strokeWidth="7" fill="none"/>
                    <circle cx="44" cy="44" r="38" stroke={C.accent} strokeWidth="7" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 38}`}
                      strokeDashoffset={`${2 * Math.PI * 38 * (1 - exportProgress / 100)}`}
                      style={{ transition: 'stroke-dashoffset 0.4s ease' }}/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{exportProgress}%</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>Exporting…</p>
                  <p style={{ fontSize: 12, color: C.textMuted }}>Processing with FFmpeg, please wait</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showSignOutModal}
        title="Sign Out"
        message={`Sign out from ${user?.email}?`}
        confirmText="Sign Out"
        type="danger"
        onConfirm={() => { setShowSignOutModal(false); signOut(); toast.success('Signed out') }}
        onCancel={() => setShowSignOutModal(false)}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Small sub-components – keeps JSX above clean
═══════════════════════════════════════════════════════════════ */

/** Grouped pill container */
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2,
      background: '#111113', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 9, padding: 3 }}>
      {children}
    </div>
  )
}

/** Vertical separator */
function Sep() {
  return <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
}

/** Tool button */
function TBtn({ children, onClick, disabled, tip, label, danger }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean
  tip?: string; label?: string; danger?: boolean
}) {
  const [hover, setHover] = useState(false)
  const baseColor = danger ? '#f87171' : '#9ca3af'
  const hoverBg   = danger ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.09)'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tip}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: label ? '5px 10px' : '5px 7px',
        borderRadius: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        background: hover && !disabled ? hoverBg : 'transparent',
        color: disabled ? 'rgba(150,150,150,0.3)' : (hover ? (danger ? '#fca5a5' : '#e5e7eb') : baseColor),
        fontSize: 12, fontWeight: 500, transition: 'all 0.12s',
      }}>
      {children}
      {label && <span>{label}</span>}
    </button>
  )
}

/** Big play/pause button */
function PlayBtn() {
  const isPlaying = useEditorStore(s => s.isPlaying)
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => useEditorStore.getState().setIsPlaying(!isPlaying)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Play / Pause (Space)"
      style={{
        width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? '#d1d5db' : '#ffffff',
        boxShadow: hover ? '0 4px 16px rgba(255,255,255,0.2)' : '0 2px 8px rgba(255,255,255,0.12)',
        transition: 'all 0.12s',
        transform: hover ? 'scale(1.06)' : 'scale(1)',
      }}>
      {isPlaying
        ? <Pause  size={15} color="#111" fill="#111"/>
        : <Play   size={15} color="#111" fill="#111" style={{ marginLeft: 2 }}/>}
    </button>
  )
}

/** Timecode display */
function TimecodeDisplay() {
  const t  = useEditorStore(s => s.currentTime)
  const mm = String(Math.floor(t / 60)).padStart(2, '0')
  const ss = String(Math.floor(t % 60)).padStart(2, '0')
  const ms = String(Math.floor((t % 1) * 100)).padStart(2, '0')
  return (
    <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600,
      color: '#c4b5fd', letterSpacing: '0.08em' }}>
      {mm}:{ss}<span style={{ opacity: 0.5 }}>.{ms}</span>
    </span>
  )
}

/** Zoom progress bar */
function ZoomTrack() {
  const zoom = useEditorStore(s => s.zoom)
  const pct  = ((zoom - 15) / (400 - 15)) * 100
  return (
    <div style={{ width: 72, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', margin: '0 2px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: '#6366f1', borderRadius: 99, transition: 'width 0.1s' }} />
    </div>
  )
}
