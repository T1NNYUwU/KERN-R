'use client'
import { useRef, useCallback, useEffect, useState } from 'react'
import { useEditorStore, Clip, makeClipId } from '../../lib/store'
import { 
  Play, Pause, MousePointer2, Scissors, 
  Trash2, Undo2, Redo2, ZoomOut, ZoomIn, 
  Volume2, VolumeX, Eye, EyeOff, Plus,
  SplitSquareHorizontal, Magnet
} from 'lucide-react'
import Waveform from './Waveform'

// ── Constants ─────────────────────────────────────────────────────────────────
const LABEL_W = 64

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s: number) {
  if (!isFinite(s)) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtTimeFull(s: number) {
  if (!isFinite(s)) return '00:00:00:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const f = Math.floor((s % 1) * 30) // 30fps simulation
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(f).padStart(2,'0')}`
}

const SNAP_THRESHOLD_PX = 10

function trackBg(type: string) {
  if (type === 'video' || type === 'image') return { track: '#1e1e24', clip: '#4a42b1', border: '#ffffff', wave: '#5945d8' }
  if (type === 'audio')                     return { track: '#1e1e24', clip: '#0c877f', border: '#ffffff', wave: '#1ca097' }
  if (type === 'text')                      return { track: '#1e1e24', clip: '#b14242', border: '#ffffff', wave: '#d85945' }
  return                                    { track: '#1e1e24', clip: '#666666', border: '#ffffff', wave: '#888888' }
}

// ── ClipBlock (self-contained drag/resize) ────────────────────────────────────
interface ClipBlockProps {
  clip: Clip
  zoom: number
  trackH: number
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onClickTime?: (clientX: number) => void
}

function ClipBlock({ clip, zoom, trackH, isSelected, onSelect, onDelete, onContextMenu, onClickTime }: ClipBlockProps) {
  const media = useEditorStore(s => s.mediaFiles.find(m => m.id === clip.mediaId))
  const col = trackBg(clip.type)
  const left = clip.startTime * zoom
  const width = Math.max(8, clip.duration * zoom)

  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const drag = useRef<{
    type: 'move' | 'left' | 'right'
    startX: number
    origStart: number
    origDur: number
    origTrim: number
  } | null>(null)

  const startDrag = useCallback((e: React.MouseEvent, type: 'move' | 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()
    onSelect()
    drag.current = {
      type, startX: e.clientX,
      origStart: clip.startTime,
      origDur: clip.duration,
      origTrim: clip.trimStart,
    }
  }, [clip.startTime, clip.duration, clip.trimStart, onSelect])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current
      if (!d) return
      const dx = (e.clientX - d.startX) / zoomRef.current
      const { updateClip, moveClip, clips, currentTime: playheadTime } = useEditorStore.getState()

      if (d.type === 'move') {
        let newStart = d.origStart + dx
        const snapped = findSnapPoint(newStart, clips, playheadTime, zoomRef.current, clip.id)
        if (snapped !== null) newStart = snapped
        moveClip(clip.id, Math.max(0, newStart))
      } else if (d.type === 'left') {
        let newStart = d.origStart + dx
        const snapped = findSnapPoint(newStart, clips, playheadTime, zoomRef.current, clip.id)
        if (snapped !== null) {
          const delta = snapped - d.origStart
          updateClip(clip.id, {
            startTime: snapped,
            duration: d.origDur - delta,
            trimStart: d.origTrim + delta,
          })
        } else {
          const delta = Math.max(-d.origTrim, Math.min(dx, d.origDur - 0.1))
          updateClip(clip.id, {
            startTime: d.origStart + delta,
            duration: d.origDur - delta,
            trimStart: d.origTrim + delta,
          })
        }
      } else {
        let newEnd = d.origStart + d.origDur + dx
        const snapped = findSnapPoint(newEnd, clips, playheadTime, zoomRef.current, clip.id)
        if (snapped !== null) {
          updateClip(clip.id, { duration: Math.max(0.1, snapped - d.origStart) })
        } else {
          updateClip(clip.id, { duration: Math.max(0.1, d.origDur + dx) })
        }
      }
    }
    const onUp = () => { drag.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [clip.id])

  return (
    <div
      className={`absolute top-[2px] bottom-[2px] rounded-md overflow-hidden group/clip select-none transition-shadow ${isSelected ? 'z-20' : 'z-10'}`}
      style={{
        left,
        width,
        background: col.clip,
        boxShadow: isSelected ? `0 0 0 1.5px ${col.border}` : 'inset 0 0 0 1px rgba(255,255,255,0.05)',
        cursor: 'grab',
      }}
      onMouseDown={e => { 
        if (e.button !== 2) {
          startDrag(e, 'move')
          if (onClickTime) onClickTime(e.clientX)
        }
      }}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onContextMenu={onContextMenu}
    >
      {/* Video Thumbnails Background */}
      {(clip.type === 'video' || clip.type === 'image') && media?.thumbnail && (
        <div 
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage: `url(${media.thumbnail})`,
            backgroundSize: 'auto 100%',
            backgroundRepeat: 'repeat-x',
          }}
        />
      )}

      {/* Waveform for audio and video (if has audio) */}
      {(clip.type === 'audio' || (clip.type === 'video' && (clip.volume ?? 1) > -90)) && media && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center px-1">
          <Waveform 
            media={media} 
            color={col.wave} 
            width={width} 
            height={trackH - 4} 
            trimStart={clip.trimStart} 
            duration={clip.duration}
          />
        </div>
      )}

      {/* Clip label */}
      <div className="relative z-10 px-2 pt-1 flex items-center justify-between">
        <span className="text-[11px] font-medium text-white truncate drop-shadow-md">{clip.name}</span>
      </div>

      {/* Resize handles */}
      {isSelected && (
        <>
          <div
            className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize z-30 flex items-center justify-start group-hover:bg-white/20 transition-colors"
            onMouseDown={e => startDrag(e, 'left')}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-1.5 h-full bg-white rounded-l-sm" />
          </div>
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-30 flex items-center justify-end group-hover:bg-white/20 transition-colors"
            onMouseDown={e => startDrag(e, 'right')}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-1.5 h-full bg-white rounded-r-sm" />
          </div>
        </>
      )}
    </div>
  )
}

// ── Main Timeline ─────────────────────────────────────────────────────────────
export default function Timeline() {
  const {
    tracks, clips, mediaFiles,
    zoom, setZoom,
    currentTime, setCurrentTime, isPlaying, setIsPlaying,
    selectedClipId, setSelectedClipId,
    removeClip, splitClip, addClip, addTrack,
    totalDuration, undo, redo,
  } = useEditorStore()

  const rulerAreaRef = useRef<HTMLDivElement>(null)
  const isDraggingPlayhead = useRef(false)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, clip: Clip } | null>(null)

  // ── Auto-scroll logic ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || isDraggingPlayhead.current || !rulerAreaRef.current) return
    
    const container = rulerAreaRef.current
    const playheadAbsoluteX = LABEL_W + (currentTime * zoom)
    const scrollLeft = container.scrollLeft
    const viewportW = container.clientWidth

    // If playhead goes beyond the right edge, or is dragged past the left edge, scroll to center it
    if (playheadAbsoluteX > scrollLeft + viewportW - 50 || playheadAbsoluteX < scrollLeft + LABEL_W) {
       container.scrollLeft = playheadAbsoluteX - (viewportW / 2)
    }
  }, [currentTime, isPlaying, zoom])

  // Close context menu when clicking outside
  useEffect(() => {
    const fn = () => setContextMenu(null)
    window.addEventListener('click', fn)
    return () => window.removeEventListener('click', fn)
  }, [])

  // ── Smart Split Logic ───────────────────────────────────────────────────────
  const handleSmartSplit = useCallback(() => {
    const s = useEditorStore.getState()
    const t = s.currentTime
    let targetId = s.selectedClipId

    // Check if selected clip is valid and intersecting
    const selectedClip = s.clips.find(c => c.id === targetId)
    const isSelectedIntersecting = selectedClip && t > selectedClip.startTime + 0.05 && t < selectedClip.startTime + selectedClip.duration - 0.05

    if (!isSelectedIntersecting) {
      // Find all clips intersecting the playhead
      const intersectingClips = s.clips.filter(c => t > c.startTime + 0.05 && t < c.startTime + c.duration - 0.05)
      if (intersectingClips.length > 0) {
        // Prioritize video tracks (main track) over audio
        const videoTracks = s.tracks.filter(tr => tr.type === 'video').map(tr => tr.id)
        const videoClip = intersectingClips.find(c => videoTracks.includes(c.trackId))
        
        if (videoClip) {
          targetId = videoClip.id
        } else {
          // Fallback to the topmost intersecting clip
          targetId = intersectingClips[intersectingClips.length - 1].id
        }
      } else {
        targetId = null
      }
    }

    if (targetId) {
      s.splitClip(targetId, t)
    }
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement).tagName
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return
      
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(!isPlaying) }
      if ((e.key === 's' || e.key === 'S') || (e.key === 'b' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        handleSmartSplit()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) removeClip(selectedClipId)
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) e.shiftKey ? redo() : undo()
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [selectedClipId, currentTime, isPlaying, handleSmartSplit, removeClip, setIsPlaying, undo, redo])

  // ── Wheel-zoom ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = rulerAreaRef.current
    if (!el) return
    const fn = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) { 
        e.preventDefault()
        setZoom(zoom + (e.deltaY < 0 ? 8 : -8)) 
      } else {
        if (e.deltaY !== 0 && e.deltaX === 0) {
          e.preventDefault()
          el.scrollLeft += e.deltaY
        }
      }
    }
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [zoom, setZoom])

  const zoomRef = useRef(zoom)
  const durRef  = useRef(totalDuration)
  zoomRef.current = zoom
  durRef.current  = totalDuration

  // ── Playhead logic ──────────────────────────────────────────────────────────
  const getTimeFromEvent = useCallback((clientX: number) => {
    const el = rulerAreaRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const x = clientX - rect.left + el.scrollLeft - LABEL_W
    return Math.max(0, Math.min(durRef.current, x / zoomRef.current))
  }, [])

  const onRulerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingPlayhead.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setCurrentTime(getTimeFromEvent(e.clientX))
  }, [getTimeFromEvent, setCurrentTime])

  const onRulerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingPlayhead.current) return
    setCurrentTime(getTimeFromEvent(e.clientX))
  }, [getTimeFromEvent, setCurrentTime])

  const onRulerPointerUp = useCallback(() => {
    isDraggingPlayhead.current = false
  }, [])

  // ── Drop from MediaBin ───────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    const mediaId = e.dataTransfer.getData('mediaId')
    if (!mediaId) return
    const { mediaFiles: mf, addClip: add } = useEditorStore.getState()
    const media = mf.find(m => m.id === mediaId)
    if (!media) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const scrollLeft = rulerAreaRef.current?.scrollLeft ?? 0
    const x = e.clientX - rect.left + scrollLeft
    const dropTime = Math.max(0, x / zoomRef.current)
    add({ id: makeClipId(), mediaId, name: media.name.replace(/\.[^.]+$/, ''),
      type: media.type, trackId, startTime: dropTime, duration: media.duration,
      trimStart: 0, trimEnd: 0, volume: 1 })
  }, [])

  // ── Layout calculations ─────────────────────────────────────────────────────
  const visibleDur = totalDuration + 30
  const totalW = Math.max(1200, visibleDur * zoom)
  const tickStep = zoom >= 100 ? 1 : zoom >= 50 ? 2 : zoom >= 25 ? 5 : zoom >= 12 ? 10 : 30
  const ticks: number[] = []
  for (let t = 0; t <= visibleDur + tickStep; t += tickStep) ticks.push(t)

  const playheadPx = LABEL_W + currentTime * zoom

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#121215] select-none relative z-10 overflow-hidden text-sm">

      {/* ── Timeline Toolbar (CapCut Online Style) ───────────────────────────────── */}
      <div className="h-11 shrink-0 bg-[#16161a] border-b border-[#25252b] flex items-center px-4 justify-between select-none relative">
        
        {/* Left: Tools */}
        <div className="flex items-center gap-5 text-[#909099]">
          <div className="flex items-center gap-4">
            <button className="hover:text-white transition-colors"><Undo2 className="w-[18px] h-[18px]" onClick={undo} /></button>
            <button className="hover:text-white transition-colors"><Redo2 className="w-[18px] h-[18px]" onClick={redo} /></button>
          </div>
          <div className="w-px h-3.5 bg-[#3a3a42]"></div>
          <div className="flex items-center gap-4">
            <button onClick={handleSmartSplit} className={`hover:text-white transition-colors`} title="Split (Ctrl+B)">
              <SplitSquareHorizontal className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => selectedClipId && removeClip(selectedClipId)} className={`hover:text-white transition-colors ${!selectedClipId && 'opacity-40 cursor-not-allowed'}`} title="Delete (Del)">
              <Trash2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-4 absolute left-1/2 -translate-x-1/2">
          <button onClick={() => setIsPlaying(!isPlaying)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white transition-colors">
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <div className="font-mono text-[13px] font-medium text-white tracking-widest flex items-center">
            {fmtTimeFull(currentTime)} <span className="text-[#606068] mx-1">/</span> <span className="text-[#909099]">{fmtTimeFull(totalDuration)}</span>
          </div>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-5 text-[#909099]">
          <button 
            onClick={() => {
               // Future: implement magnetic logic in store
               alert("Magnetic Timeline is currently set to 'Manual' for maximum flexibility. Snap-to-grid is always active.")
            }}
            className="hover:text-white transition-colors flex items-center gap-1.5" 
            title="Magnetic Timeline (Auto-Snap)"
          >
            <Magnet className="w-4 h-4 text-[#3b82f6]" />
          </button>
          <div className="w-px h-3.5 bg-[#3a3a42]"></div>
          <div className="flex items-center gap-2.5">
            <button onClick={() => setZoom(zoom - 10)} className="hover:text-white transition-colors"><ZoomOut className="w-[18px] h-[18px]" /></button>
            <input type="range" min={15} max={400} value={zoom} onChange={e => setZoom(Number(e.target.value))} 
              className="w-24 h-1 bg-[#25252b] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
            <button onClick={() => setZoom(zoom + 10)} className="hover:text-white transition-colors"><ZoomIn className="w-[18px] h-[18px]" /></button>
          </div>
        </div>
      </div>

      {/* ── Scrollable ruler + tracks area ──────────────────────────────────── */}
      <div
        ref={rulerAreaRef}
        className="flex-1 overflow-auto relative custom-scrollbar bg-[#121215]"
        style={{ cursor: 'default' }}
      >
        <div style={{ minWidth: LABEL_W + totalW, position: 'relative' }}>

          {/* ── Ruler row (sticky top) ─────────────────────────────────────── */}
          <div
            className="sticky top-0 z-50 flex items-end"
            style={{ height: 26, background: '#16161a', borderBottom: '1px solid #25252b' }}
            onPointerDown={onRulerPointerDown}
            onPointerMove={onRulerPointerMove}
            onPointerUp={onRulerPointerUp}
          >
            {/* Corner */}
            <div className="shrink-0 sticky left-0 z-50 h-full" style={{ width: LABEL_W, background: '#16161a', borderRight: '1px solid #25252b' }} />

            {/* Ticks */}
            <div className="flex-1 relative h-full" style={{ cursor: 'text' }}>
              {ticks.map(t => (
                <div key={`tick-${t}`} className="absolute bottom-0 h-full flex flex-col justify-end" style={{ left: t * zoom }}>
                  <span style={{ position: 'absolute', bottom: 6, left: 4, fontSize: 10, color: '#8a8a93', userSelect: 'none' }}>
                    {fmtTime(t)}
                  </span>
                  <div style={{ width: 1, height: 5, background: '#3a3a42' }} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Track rows ────────────────────────────────────────────────── */}
          <div className="flex flex-col py-2 gap-1">
            {tracks.map(track => {
              const trackClips = clips.filter(c => c.trackId === track.id)
              return (
                <div key={track.id} className="flex group/track" style={{ height: track.height }}>

                  {/* Narrow Label Header */}
                  <div className="shrink-0 sticky left-0 z-30 flex items-center justify-center bg-[#16161a] border-r border-[#25252b] relative group/header"
                    style={{ width: LABEL_W }}>
                    
                    <button
                      onClick={() => useEditorStore.getState().updateTrack(track.id, { muted: !track.muted })}
                      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${track.muted ? 'text-[#606068]' : 'text-[#c1c1c8] hover:text-white hover:bg-white/5'}`}
                      title={track.muted ? "Unmute Track" : "Mute Track"}
                    >
                      {track.type === 'video' || track.type === 'image' || track.type === 'text' 
                        ? (track.muted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />)
                        : (track.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />)
                      }
                    </button>

                    <button 
                      onClick={() => {
                        const s = useEditorStore.getState()
                        s.removeTrack(track.id)
                        trackClips.forEach(c => s.removeClip(c.id))
                      }}
                      className="absolute right-0.5 top-0.5 w-5 h-5 rounded flex items-center justify-center bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover/header:opacity-100 transition-opacity"
                      title="Delete Track"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Clip Canvas */}
                  <div
                    className="relative flex-1 bg-[#1a1a1f] rounded-r-md mx-1"
                    style={{ minWidth: totalW }}
                    onDrop={e => onDrop(e, track.id)}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => setSelectedClipId(null)}
                  >
                    {/* Subtle grid */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent ${tickStep * zoom - 1}px, rgba(255,255,255,0.02) ${tickStep * zoom - 1}px, rgba(255,255,255,0.02) ${tickStep * zoom}px)`
                    }} />

                    {trackClips.map(clip => (
                      <ClipBlock
                        key={clip.id} clip={clip} zoom={zoom} trackH={track.height}
                        isSelected={clip.id === selectedClipId}
                        onSelect={() => setSelectedClipId(clip.id)}
                        onClickTime={(clientX) => setCurrentTime(getTimeFromEvent(clientX))}
                        onDelete={() => removeClip(clip.id)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setContextMenu({ x: e.clientX, y: e.clientY, clip })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Add Track row */}
            <div className="flex mt-2" style={{ height: 40 }}>
              <div className="shrink-0 sticky left-0 z-30 flex items-center justify-center gap-1 bg-[#16161a] border-r border-[#25252b]"
                style={{ width: LABEL_W }}>
              </div>
              <div className="flex-1 flex items-center px-4 gap-2">
                <button onClick={() => addTrack('video')} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white text-[11px] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Track
                </button>
              </div>
            </div>
          </div>

          {/* ── Playhead ─────────────────────────────────────────────────── */}
          <PlayheadOverlay
            playheadPx={playheadPx}
            rulerAreaRef={rulerAreaRef}
            zoom={zoom}
            totalDuration={totalDuration}
            setCurrentTime={setCurrentTime}
          />
        </div>
      </div>

      {/* ── Context Menu ────────────────────────────────────────────────────── */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-[#16161a] border border-[#25252b] rounded-md shadow-2xl py-1 w-48 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.clip.type === 'video' && (
            <button 
              className="w-full text-left px-4 py-2 text-[#c1c1c8] hover:bg-[#25252b] hover:text-white flex items-center gap-2 transition-colors"
              onClick={() => {
                const store = useEditorStore.getState()
                // 1. Mute original video (-100 dB)
                store.updateClip(contextMenu.clip.id, { volume: -100 })
                
                // 2. Insert new audio track directly below the video track
                const videoTrackIndex = store.tracks.findIndex(t => t.id === contextMenu.clip.trackId)
                const newTrackId = `track-${Date.now()}`
                const newTracks = [...store.tracks]
                newTracks.splice(videoTrackIndex + 1, 0, { 
                  id: newTrackId, 
                  name: 'Audio Track',
                  type: 'audio', 
                  muted: false, 
                  locked: false,
                  height: 60 
                })
                useEditorStore.setState({ tracks: newTracks })

                // 3. Create audio clip
                store.addClip({
                  ...contextMenu.clip,
                  id: makeClipId(),
                  type: 'audio',
                  trackId: newTrackId,
                  volume: 0 // Default 0 dB
                })
                setContextMenu(null)
              }}
            >
              <Volume2 className="w-4 h-4" /> แยกเสียง (Separate Audio)
            </button>
          )}
          <button 
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
            onClick={() => {
              removeClip(contextMenu.clip.id)
              setContextMenu(null)
            }}
          >
            <Trash2 className="w-4 h-4" /> ลบ (Delete)
          </button>
        </div>
      )}
    </div>
  )
}

// ── Playhead overlay ─────────────────────────────────────────────────
function PlayheadOverlay({ playheadPx, rulerAreaRef, zoom, totalDuration, setCurrentTime }: {
  playheadPx: number
  rulerAreaRef: React.RefObject<HTMLDivElement | null>
  zoom: number
  totalDuration: number
  setCurrentTime: (t: number) => void
}) {
  const dragging = useRef(false)
  const zRef = useRef(zoom)
  const dRef = useRef(totalDuration)
  const setCT = useRef(setCurrentTime)
  zRef.current = zoom
  dRef.current = totalDuration
  setCT.current = setCurrentTime

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const el = rulerAreaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left + el.scrollLeft - LABEL_W
    const { clips } = useEditorStore.getState()
    let time = x / zRef.current
    const snapped = findSnapPoint(time, clips, -1, zRef.current)
    if (snapped !== null) time = snapped
    setCT.current(Math.max(0, Math.min(dRef.current, time)))
  }
  const onPointerUp = () => { dragging.current = false }

  return (
    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: playheadPx, width: 1, zIndex: 100 }}>
      {/* Playhead Line */}
      <div className="absolute inset-0 bg-white w-[1px]" />
      
      {/* Playhead Handle (CapCut teardrop style) */}
      <div
        className="absolute pointer-events-auto flex justify-center drop-shadow-md"
        style={{ top: 0, left: -6.5, width: 14, height: 20, cursor: 'ew-resize' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <svg width="14" height="20" viewBox="0 0 14 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 20L0.5 11.5V2C0.5 0.895431 1.39543 0 2.5 0H11.5C12.6046 0 13.5 0.895431 13.5 2V11.5L7 20Z" fill="white"/>
        </svg>
      </div>
    </div>
  )
}

function findSnapPoint(time: number, clips: Clip[], playheadTime: number, zoom: number, excludeClipId?: string): number | null {
  const threshold = SNAP_THRESHOLD_PX / zoom
  let bestDist = threshold
  let bestSnap = null

  if (playheadTime >= 0) {
    const dist = Math.abs(time - playheadTime)
    if (dist < bestDist) {
      bestDist = dist
      bestSnap = playheadTime
    }
  }

  for (const c of clips) {
    if (c.id === excludeClipId) continue
    
    const distStart = Math.abs(time - c.startTime)
    if (distStart < bestDist) {
      bestDist = distStart
      bestSnap = c.startTime
    }

    const distEnd = Math.abs(time - (c.startTime + c.duration))
    if (distEnd < bestDist) {
      bestDist = distEnd
      bestSnap = c.startTime + c.duration
    }
  }

  return bestSnap
}
