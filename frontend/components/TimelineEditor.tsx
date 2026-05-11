'use client'
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TimelineItem, Track } from '../lib/types'

interface TimelineEditorProps {
  tracks: Track[]
  onChange: (tracks: Track[]) => void
  totalDuration: number
  currentTime: number
  onSeek: (time: number) => void
  isPlaying: boolean
  onTogglePlay: () => void
  onSplit?: (targetId?: string) => void
  onDelete?: (trackId: string, itemId: string) => void
  onAddTrack?: (type: 'video' | 'audio') => void
  onEditItem?: (item: TimelineItem) => void
  onAddText?: () => void
  onAddSFX?: (sfx: any) => void
  onUploadSFX?: (file: File) => void
  onUploadOverlay?: (file: File, type: 'image' | 'video') => void
  masterVolume?: number
  onMasterVolumeChange?: (v: number) => void
}

type DragType = 'move' | 'resize-left' | 'resize-right' | 'volume' | 'playhead'

const LABEL_W = 160
const SNAP_PX = 8 // magnetic snap threshold in pixels

export default function TimelineEditor({
  tracks, onChange, totalDuration, currentTime, onSeek,
  isPlaying, onTogglePlay, onSplit, onDelete, onAddTrack,
  onEditItem, onAddText, onAddSFX, onUploadSFX, onUploadOverlay,
  masterVolume = 1, onMasterVolumeChange
}: TimelineEditorProps) {
  const [zoom, setZoom] = useState(50)
  const scrollRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  // Use ref instead of state for drag type — avoids re-attaching listeners
  const dragTypeRef = useRef<DragType | null>(null)
  const [isDraggingState, setIsDraggingState] = useState<DragType | null>(null) // only for re-render when needed
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const zoomRef = useRef(zoom)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  const tracksRef = useRef(tracks)
  useEffect(() => { tracksRef.current = tracks }, [tracks])

  const dragInfo = useRef<{
    itemId: string; trackId: string
    startX: number; startY: number
    startStartTime: number; startDuration: number; startVolume: number
    el: HTMLElement | null
    snapPoints: number[]
  } | null>(null)

  const onDeleteRef = useRef(onDelete)
  onDeleteRef.current = onDelete
  const stableDelete = useCallback((tId: string, iId: string) => {
    onDeleteRef.current?.(tId, iId)
  }, [])

  const stableMouseDown = useCallback((
    e: React.MouseEvent, trackId: string, item: TimelineItem,
    type: 'move' | 'resize-left' | 'resize-right' | 'volume' = 'move'
  ) => {
    e.stopPropagation()
    dragTypeRef.current = type
    setSelectedItemId(item.id)
    const el = e.currentTarget as HTMLElement
    
    // Pre-calculate snap points once at the start of drag
    const snapPoints: number[] = []
    for (const track of tracksRef.current) {
      for (const it of track.items) {
        if (it.id === item.id) continue
        snapPoints.push(it.startTime)
        snapPoints.push(it.startTime + it.duration)
      }
    }
    
    if (type === 'volume') {
      el.style.willChange = 'top'
    } else {
      el.style.willChange = 'transform'
    }
    dragInfo.current = {
      itemId: item.id, trackId,
      startX: e.clientX, startY: e.clientY,
      startStartTime: item.startTime,
      startDuration: item.duration,
      startVolume: item.volume ?? 1,
      el,
      snapPoints // Store for fast lookup in onMove
    }
  }, [])

  // Sync ruler ↔ tracks scroll
  useEffect(() => {
    const scroll = scrollRef.current
    const ruler = rulerRef.current
    if (!scroll || !ruler) return
    const onScroll = () => { ruler.scrollLeft = scroll.scrollLeft }
    scroll.addEventListener('scroll', onScroll)
    return () => scroll.removeEventListener('scroll', onScroll)
  }, [])

  // Global mouse handlers — attached ONCE, uses refs to avoid re-attaching
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const fmtTime = (s: number) => {
      const m = Math.floor(s / 60), ss = Math.floor(s % 60), ms = Math.floor((s % 1) * 100)
      return `${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(ms).padStart(2,'0')}`
    }

    const onMove = (e: MouseEvent) => {
      const type = dragTypeRef.current
      if (!type) return
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const z = zoomRef.current

        if (type === 'playhead') {
          if (!scrollRef.current) return
          const rect = scrollRef.current.getBoundingClientRect()
          const x = e.clientX - rect.left + scrollRef.current.scrollLeft - LABEL_W
          const time = Math.max(0, x / z)
          // Update tracks playhead DOM
          const playheadEl = document.getElementById('playhead-line')
          if (playheadEl) playheadEl.style.left = `${LABEL_W + time * z}px`
          // Update ruler indicator DOM
          const rulerTick = document.getElementById('ruler-playhead')
          if (rulerTick) rulerTick.style.left = `${time * z}px`
          // Update timecode DOM
          const timecodeEl = document.getElementById('timecode-display')
          if (timecodeEl) timecodeEl.innerText = fmtTime(time)
          // Also call onSeek so globalTime updates for split to work correctly
          onSeek(time)
          return
        }

        const info = dragInfo.current
        if (!info?.el) return
        const dx = (e.clientX - info.startX) / z
        const el = info.el
        const SNAP_PX = 15
        const snapS = info.snapPoints || []

        if (type === 'move') {
          let rawS = Math.max(0, info.startStartTime + dx)
          let finalS = rawS
          
          // Fast Snap Check
          let bestD = SNAP_PX / z
          for (const p of snapS) {
            // Check start edge
            const dS = Math.abs(rawS - p)
            if (dS < bestD) { bestD = dS; finalS = p }
            // Check end edge
            const dE = Math.abs((rawS + info.startDuration) - p)
            if (dE < bestD) { bestD = dE; finalS = p - info.startDuration }
          }
          
          const offsetPx = (finalS - info.startStartTime) * z
          el.style.transform = `translateX(${offsetPx}px)`
        } else if (type === 'resize-right') {
          let rawE = info.startStartTime + info.startDuration + dx
          let finalE = rawE
          let bestD = SNAP_PX / z
          for (const p of snapS) {
            const d = Math.abs(rawE - p)
            if (d < bestD) { bestD = d; finalE = p }
          }
          const newDur = Math.max(0.1, finalE - info.startStartTime)
          el.style.transform = `scaleX(${newDur / info.startDuration})`
          el.style.transformOrigin = 'left center'
        } else if (type === 'resize-left') {
          let rawS = Math.max(0, info.startStartTime + dx)
          let finalS = rawS
          let bestD = SNAP_PX / z
          for (const p of snapS) {
            const d = Math.abs(rawS - p)
            if (d < bestD) { bestD = d; finalS = p }
          }
          finalS = Math.min(finalS, info.startStartTime + info.startDuration - 0.1)
          const newDur = info.startStartTime + info.startDuration - finalS
          const offsetPx = (finalS - info.startStartTime) * z
          el.style.transform = `translateX(${offsetPx}px) scaleX(${newDur / info.startDuration})`
          el.style.transformOrigin = 'right center'
        } else if (type === 'volume') {
          const dy = info.startY - e.clientY
          const newVol = Math.max(0, Math.min(2, info.startVolume + dy / 50))
          const db = newVol === 0 ? '-∞' : (20 * Math.log10(newVol)).toFixed(1)
          el.style.top = `${Math.min(90, Math.max(10, 90 - newVol * 40))}%`
          const tooltipEl = document.getElementById('timeline-tooltip')
          if (tooltipEl) {
            tooltipEl.style.display = 'block'
            tooltipEl.style.transform = `translate(${e.clientX - 30}px,${e.clientY - 60}px)`
            const nodes = tooltipEl.childNodes
            if (nodes.length >= 2) (nodes[0] as HTMLElement).textContent = `${db} dB`
          }
        }
      })
    }

    const onUp = (e: MouseEvent) => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const type = dragTypeRef.current
      const info = dragInfo.current
      dragTypeRef.current = null
      setIsDraggingState(null)
      const tooltipEl = document.getElementById('timeline-tooltip')
      if (tooltipEl) tooltipEl.style.display = 'none'
      dragInfo.current = null
      if (!type) return

      if (type === 'playhead') {
        if (!scrollRef.current) return
        const rect = scrollRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left + scrollRef.current.scrollLeft - LABEL_W
        onSeek(Math.max(0, x / zoomRef.current))
        return
      }

      // From here on, it's a clip-related drag, so info must exist
      if (!info) return

      if (info.el) {
        info.el.style.willChange = ''
        info.el.style.transform = ''
        info.el.style.transformOrigin = ''
      }

      const z = zoomRef.current
      const dx = (e.clientX - info.startX) / z
      const dy = info.startY - e.clientY
      const snapS = info.snapPoints || []
      const SNAP_PX = 15

      const newTracks = tracksRef.current.map(t => {
        if (t.id !== info.trackId) return t
        return {
          ...t,
          items: t.items.map(it => {
            if (it.id !== info.itemId) return it
            if (type === 'move') {
              let rawS = Math.max(0, info.startStartTime + dx)
              let finalS = rawS
              let bestD = SNAP_PX / z
              for (const p of snapS) {
                const dS = Math.abs(rawS - p)
                if (dS < bestD) { bestD = dS; finalS = p }
                const dE = Math.abs((rawS + info.startDuration) - p)
                if (dE < bestD) { bestD = dE; finalS = p - info.startDuration }
              }
              return { ...it, startTime: Math.max(0, Math.round(finalS * 100) / 100) }
            }
            if (type === 'resize-right') {
              let rawE = info.startStartTime + info.startDuration + dx
              let finalE = rawE
              let bestD = SNAP_PX / z
              for (const p of snapS) {
                const d = Math.abs(rawE - p)
                if (d < bestD) { bestD = d; finalE = p }
              }
              return { ...it, duration: Math.max(0.1, Math.round((finalE - it.startTime) * 100) / 100) }
            }
            if (type === 'resize-left') {
              let rawS = Math.max(0, info.startStartTime + dx)
              let finalS = rawS
              let bestD = SNAP_PX / z
              for (const p of snapS) {
                const d = Math.abs(rawS - p)
                if (d < bestD) { bestD = d; finalS = p }
              }
              finalS = Math.min(finalS, info.startStartTime + info.startDuration - 0.1)
              const diff = it.startTime - finalS
              return { ...it, startTime: Math.max(0, Math.round(finalS * 100) / 100), duration: Math.max(0.1, Math.round((it.duration + diff) * 100) / 100) }
            }
            if (type === 'volume') {
              return { ...it, volume: Math.max(0, Math.min(2, Math.round((info.startVolume + dy / 50) * 100) / 100)) }
            }
            return it
          })
        }
      })
      onChange(newTracks)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onChange, onSeek]) // attach ONCE

  const totalW = Math.max(1200, totalDuration * zoom + 200)

  const seekFromRuler = (e: React.MouseEvent) => {
    if (!rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - LABEL_W
    onSeek(Math.max(0, x / zoom))
  }

  const tickInterval = zoom >= 100 ? 1 : zoom >= 40 ? 2 : zoom >= 20 ? 5 : 10
  const ticks = Array.from({ length: Math.ceil(totalDuration / tickInterval) + 1 }, (_, i) => i * tickInterval)

  // Format timecode mm:ss
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60)
    const ss = Math.floor(s % 60)
    const ms = Math.floor((s % 1) * 100)
    return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(2, '0')}`
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#181818] select-none overflow-hidden relative">

      {/* ── Toolbar (Filmora-style) ── */}
      <div className="flex items-center gap-2 px-3 h-10 border-b border-white/5 bg-[#111] shrink-0">
        {/* Transport controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSeek(0)}
            className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition text-xs"
            title="Back to start"
          >⏮</button>
          <button
            onClick={onTogglePlay}
            className="w-8 h-8 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="w-7 h-7 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition text-xs"
          >⏭</button>
        </div>

        {/* Timecode */}
        <div id="timecode-display" className="font-mono text-xs text-white bg-black/60 px-2 py-1 rounded border border-white/5 w-[100px] text-center">
          {fmtTime(currentTime)}
        </div>

        {/* Scissors */}
        <button
          onClick={() => onSplit?.(selectedItemId || undefined)}
          title="Split selected or all at playhead (S)"
          className={`w-7 h-7 rounded flex items-center justify-center text-xs transition border ${selectedItemId ? 'bg-red-600 hover:bg-red-500 text-white border-red-500' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-white/5'}`}
        >✂️</button>

        <div className="w-px h-5 bg-white/5 mx-1" />

        {/* Library Add buttons */}
        <div className="flex items-center gap-1">
          <button 
            onClick={onAddText}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 hover:text-white transition border border-white/5"
          >+ Text</button>
          
          <details className="relative group">
            <summary className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 hover:text-white transition border border-white/5 cursor-pointer list-none list-inside">
              + Media
            </summary>
            <div className="absolute top-full left-0 mt-1 w-36 bg-[#1c1c20] border border-white/10 rounded shadow-2xl z-50 py-1">
              <label className="block w-full text-left text-[11px] px-3 py-1.5 hover:bg-white/5 text-zinc-300 cursor-pointer">
                📷 Image
                <input type="file" className="hidden" accept="image/*" onChange={e => { e.target.files?.[0] && onUploadOverlay?.(e.target.files[0], 'image'); (e.target.closest('details') as any).open = false }} />
              </label>
              <label className="block w-full text-left text-[11px] px-3 py-1.5 hover:bg-white/5 text-zinc-300 cursor-pointer">
                🎥 Video
                <input type="file" className="hidden" accept="video/*" onChange={e => { e.target.files?.[0] && onUploadOverlay?.(e.target.files[0], 'video'); (e.target.closest('details') as any).open = false }} />
              </label>
              <label className="block w-full text-left text-[11px] px-3 py-1.5 hover:bg-white/5 text-zinc-300 cursor-pointer">
                🎵 Audio
                <input type="file" className="hidden" accept="audio/*" onChange={e => { e.target.files?.[0] && onUploadSFX?.(e.target.files[0]); (e.target.closest('details') as any).open = false }} />
              </label>
            </div>
          </details>
        </div>

        <div className="w-px h-5 bg-white/5 mx-1" />

        {/* Master Volume */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Vol</span>
          <button
            onClick={() => onMasterVolumeChange?.(masterVolume > 0 ? 0 : 1)}
            className="text-sm text-zinc-500 hover:text-white transition"
          >
            {masterVolume === 0 ? '🔇' : masterVolume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range" min="0" max="1" step="0.01"
            value={masterVolume}
            onChange={e => onMasterVolumeChange?.(parseFloat(e.target.value))}
            className="w-20 accent-purple-500 cursor-pointer"
          />
          <span className="text-[9px] text-zinc-500 w-8">{Math.round(masterVolume * 100)}%</span>
        </div>

        <div className="flex-1" />

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Zoom</span>
          <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center justify-center">−</button>
          <input
            type="range" min="10" max="300" value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-24 accent-purple-500 cursor-pointer"
          />
          <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="w-5 h-5 rounded bg-zinc-800 text-zinc-400 hover:text-white text-xs flex items-center justify-center">+</button>
        </div>
      </div>

      {/* ── Time Ruler ── */}
      <div
        ref={rulerRef}
        onMouseDown={e => { seekFromRuler(e); dragTypeRef.current = 'playhead'; setIsDraggingState('playhead') }}
        className="h-6 bg-[#0d0d0f] border-b border-white/5 flex shrink-0 overflow-hidden cursor-col-resize"
        style={{ userSelect: 'none' }}
      >
        <div className="shrink-0 bg-[#111] border-r border-white/5" style={{ width: LABEL_W }} />
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ width: totalW }}>
            {ticks.map(t => (
              <div
                key={t}
                className="absolute top-0 h-full"
                style={{ left: t * zoom, borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="text-[8px] font-mono text-zinc-600 pl-0.5 absolute bottom-0.5">
                  {t >= 60 ? `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}` : `${t}s`}
                </span>
              </div>
            ))}
            {/* Playhead tick on ruler - has its own id for DOM updates */}
            <div
              id="ruler-playhead"
              className="absolute top-0 h-full w-px bg-red-500/70 pointer-events-none"
              style={{ left: currentTime * zoom }}
            />
          </div>
        </div>
      </div>

      {/* ── Tracks Scroll Area ── */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        <div className="inline-block" style={{ minWidth: LABEL_W + totalW }}>

          {tracks.map(track => (
            <TrackRow
              key={track.id}
              track={track}
              zoom={zoom}
              totalW={totalW}
              labelW={LABEL_W}
              onDelete={stableDelete}
              onMouseDown={stableMouseDown}
              onDoubleClick={onEditItem}
              selectedItemId={selectedItemId}
              onMuteChange={(tId, muted) => {
                const newTracks = tracks.map(t =>
                  t.id !== tId ? t : {
                    ...t,
                    items: t.items.map(it => ({ ...it, volume: muted ? 0 : 1 }))
                  }
                )
                onChange(newTracks)
              }}
            />
          ))}

          {/* Add Track row */}
          <div className="flex h-8 border-b border-white/[0.04]">
            <div
              className="shrink-0 flex items-center px-3 bg-[#111] border-r border-white/5 relative"
              style={{ width: LABEL_W }}
            >
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600 hover:text-zinc-300 transition"
              >
                <span className="text-sm leading-none">+</span>
                Add Track
              </button>
              {showAddMenu && (
                <div className="absolute top-full left-0 mt-1 w-36 bg-[#1c1c20] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                  <button
                    onClick={() => { onAddTrack?.('video'); setShowAddMenu(false) }}
                    className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-white/5 text-zinc-300 flex items-center gap-2"
                  >🎬 Video Track</button>
                  <button
                    onClick={() => { onAddTrack?.('audio'); setShowAddMenu(false) }}
                    className="w-full text-left text-[11px] px-3 py-1.5 hover:bg-white/5 text-zinc-300 flex items-center gap-2"
                  >🎵 Audio Track</button>
                </div>
              )}
            </div>
            <div className="flex-1 bg-[#0e0e10]" />
          </div>

          {/* ── Playhead ── */}
          <div
            id="playhead-line"
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: LABEL_W + currentTime * zoom, width: 1, zIndex: 9999 }}
          >
            <div className="absolute inset-0 bg-red-500" />
            {/* Head triangle - draggable */}
            <div
              onMouseDown={e => { e.stopPropagation(); dragTypeRef.current = 'playhead'; setIsDraggingState('playhead') }}
              className="absolute -left-[9px] w-[19px] h-[19px] pointer-events-auto cursor-ew-resize"
              style={{ top: -19, clipPath: 'polygon(50% 0%,100% 40%,100% 100%,0% 100%,0% 40%)' }}
            >
              <div className="w-full h-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* dB Tooltip */}
      <div
        id="timeline-tooltip"
        className="fixed pointer-events-none z-[99999] top-0 left-0 bg-black/90 border border-red-500/30 text-white text-[11px] px-2 py-1 rounded shadow-xl text-center hidden"
      />
    </div>
  )
}

// ── TrackRow ──────────────────────────────────────────────────────────────────

// Pre-compute deterministic waveform data per seed (doesn't change on re-render)
function genWaveform(seed: number, bars: number): number[] {
  const data: number[] = []
  let v = seed % 100
  for (let i = 0; i < bars; i++) {
    v = (v * 1664525 + 1013904223) & 0x7fffffff
    const base = (v % 60) + 20 // 20–80%
    data.push(base)
  }
  return data
}

const TRACK_H = 64

const TrackRow = React.memo(({ track, zoom, totalW, labelW, onDelete, onMouseDown, onDoubleClick, selectedItemId, onMuteChange }: {
  track: Track; zoom: number; totalW: number; labelW: number
  onDelete: (tId: string, iId: string) => void
  onMouseDown: (e: React.MouseEvent, tId: string, item: TimelineItem, type?: any) => void
  onDoubleClick?: (item: TimelineItem) => void
  selectedItemId: string | null
  onMuteChange?: (trackId: string, muted: boolean) => void
}) => {
  const [muted, setMuted] = useState(false)

  const isVideo = track.type === 'video'
  const isAudio = track.type === 'audio'

  const col = isVideo
    ? { bg: '#1a3050', border: '#2d6ab4', wave: '#4da6ff', vol: '#3ddc84', label: '#0f1e30' }
    : isAudio
    ? { bg: '#14302a', border: '#29a854', wave: '#3ddc84', vol: '#ffda44', label: '#0a1e18' }
    : { bg: '#281540', border: '#7c3aed', wave: '#a78bfa', vol: '#a78bfa', label: '#16082a' }

  const toggleMute = () => {
    const newMuted = !muted
    setMuted(newMuted)
    onMuteChange?.(track.id, newMuted)
  }

  return (
    <div className="flex border-b border-white/[0.06]" style={{ height: TRACK_H }}>

      {/* ── Label (Filmora style) ── */}
      <div
        className="shrink-0 flex flex-col justify-center px-3 gap-1.5 border-r border-white/5 sticky left-0 z-20"
        style={{ width: labelW, background: col.label }}
      >
        <span className="text-[10px] font-bold text-zinc-200 uppercase tracking-widest truncate">{track.name}</span>
        <div className="flex items-center gap-1.5">
          {/* Mute only */}
          <button
            onClick={toggleMute}
            title={muted ? 'Unmute' : 'Mute'}
            className={`w-5 h-5 rounded flex items-center justify-center text-[11px] transition border ${
              muted ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400' : 'border-white/5 bg-white/5 text-zinc-500 hover:text-white'
            }`}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {/* Eye (video tracks) */}
          {isVideo && (
            <button className="w-5 h-5 rounded flex items-center justify-center text-[11px] border border-white/5 bg-white/5 text-zinc-500 hover:text-white transition">
              👁
            </button>
          )}
        </div>
      </div>

      {/* ── Clips area ── */}
      <div
        className="relative flex-1"
        style={{ background: '#0e0e10', minWidth: totalW, height: TRACK_H }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent ${zoom * 2}px)`,
          }}
        />

        {track.items.map(item => {
          const vol = item.volume ?? 1
          // Volume line position: center = 0dB (vol=1), up = boost, down = cut
          // Range: 0–200% maps to 90%–10% from bottom
          const volLinePct = Math.min(90, Math.max(10, 90 - (vol * 40)))
          const db = vol === 0 ? '-∞' : (20 * Math.log10(vol)).toFixed(1)
          const isAV = item.type === 'video' || item.type === 'audio' || item.type === 'sfx'
          const blockW = Math.max(4, item.duration * zoom)

          // Waveform: fixed-density bars (not stretched with zoom)
          const BAR_SPACING = 4 // px per bar, fixed
          const numBars = Math.ceil(blockW / BAR_SPACING)
          const seed = item.id.charCodeAt(0) + item.id.charCodeAt(1)
          const waveData = genWaveform(seed, numBars)

          const isSelected = item.id === selectedItemId

          return (
            <div
              key={item.id}
              onMouseDown={e => onMouseDown(e, track.id, item, 'move')}
              onDoubleClick={() => onDoubleClick?.(item)}
              className="absolute group/clip cursor-move rounded-sm overflow-hidden transition-all"
              style={{
                top: 2, bottom: 2,
                left: item.startTime * zoom,
                width: blockW,
                background: col.bg,
                border: isSelected ? '1px solid white' : `1px solid ${col.border}40`,
                opacity: muted ? 0.35 : 1,
                boxShadow: isSelected 
                  ? `0 0 12px rgba(255,255,255,0.4), inset 0 0 0 1px white` 
                  : `inset 0 0 0 1px ${col.border}20`,
                zIndex: isSelected ? 50 : 10,
              }}
            >
              {/* ── Waveform (fixed density, not stretched) ── */}
              {isAV && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <svg
                    width={blockW}
                    height="100%"
                    viewBox={`0 0 ${blockW} 60`}
                    preserveAspectRatio="none"
                    style={{ position: 'absolute', inset: 0 }}
                  >
                    {waveData.map((h, i) => {
                      const x = i * BAR_SPACING + BAR_SPACING / 2
                      const barH = (h / 100) * 44
                      return (
                        <rect
                          key={i}
                          x={x - 0.7}
                          y={30 - barH / 2}
                          width={1.4}
                          height={barH}
                          fill={col.wave}
                          opacity={0.35}
                          rx="0.5"
                        />
                      )
                    })}
                  </svg>
                </div>
              )}

              {/* Clip label */}
              <div className="relative z-10 px-2 pt-1 text-[9px] font-bold text-white/75 truncate">
                {item.name}
              </div>

              {/* ── Volume line (draggable, Filmora green line) ── */}
              {isAV && (
                <div
                  onMouseDown={e => { e.stopPropagation(); onMouseDown(e, track.id, item, 'volume') }}
                  className="absolute left-0 right-0 z-20 cursor-ns-resize group/vol"
                  style={{ top: `${volLinePct}%`, height: 12, transform: 'translateY(-50%)' }}
                >
                  <div
                    className="volume-line absolute inset-x-0 top-[5px] h-[2px] group-hover/vol:h-[3px] transition-all"
                    style={{
                      background: col.vol,
                      boxShadow: `0 0 4px ${col.vol}80`,
                    }}
                  />
                  {/* Tooltip */}
                  <div className="absolute top-full mt-1 left-4 bg-[#111] border border-white/10 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover/vol:opacity-100 pointer-events-none shadow-xl z-50">
                    {db} dB
                  </div>
                </div>
              )}

              {/* Resize handles */}
              <div
                onMouseDown={e => onMouseDown(e, track.id, item, 'resize-left')}
                className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-30 hover:bg-white/15 rounded-l"
              />
              <div
                onMouseDown={e => onMouseDown(e, track.id, item, 'resize-right')}
                className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-30 hover:bg-white/15 rounded-r"
              />

              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); onDelete(track.id, item.id) }}
                className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600/80 hover:bg-red-500 rounded text-white text-[8px] flex items-center justify-center opacity-0 group-hover/clip:opacity-100 z-40 transition"
              >✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
})
TrackRow.displayName = 'TrackRow'
