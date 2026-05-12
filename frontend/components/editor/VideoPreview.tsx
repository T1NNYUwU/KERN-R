'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import { useEditorStore } from '../../lib/store'

function fmtTime(s: number) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60), ms = Math.floor((s % 1) * 100)
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(2,'0')}`
}

function toLinearVolume(db: number) {
  // Convert dB to linear volume (0 to 1)
  // 0 dB = 1.0
  // -60 dB = 0.001
  if (db <= -60) return 0
  return Math.min(1, Math.pow(10, db / 20))
}

// ── Text Overlay with drag + resize handles ───────────────────────────────────
function TextOverlay({ clip }: { clip: ReturnType<typeof useEditorStore.getState>['clips'][0] }) {
  const updateClip = useEditorStore(s => s.updateClip)
  const selectedId = useEditorStore(s => s.selectedClipId)
  const setSelected = useEditorStore(s => s.setSelectedClipId)
  const isSelected = selectedId === clip.id

  const containerRef = useRef<HTMLDivElement>(null)

  const getFontStyle = (): React.CSSProperties => ({
    color: clip.textColor ?? '#ffffff',
    fontSize: `${clip.textSize ?? 32}px`,
    fontFamily: clip.textFontFamily ?? clip.textFont ?? 'Inter',
    fontWeight: clip.textBold ? 'bold' : 'normal',
    fontStyle: clip.textItalic ? 'italic' : 'normal',
    textShadow: clip.textShadow
      ? '0 2px 4px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.5)'
      : 'none',
    WebkitTextStroke: clip.textStroke
      ? `${clip.textStroke}px ${clip.textStrokeColor ?? '#000'}`
      : undefined,
    backgroundColor: clip.textBg || undefined,
    padding: clip.textBg ? '4px 8px' : undefined,
    borderRadius: clip.textBg ? '4px' : undefined,
    whiteSpace: 'pre-wrap',
    textAlign: 'center',
    userSelect: 'none',
    pointerEvents: 'none',
  })

  // Drag to move
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.resize) return
    e.stopPropagation()
    setSelected(clip.id)
    const canvas = containerRef.current?.parentElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const origX = clip.textX ?? 50
    const origY = clip.textY ?? 50

    const onMove = (mv: MouseEvent) => {
      const dx = ((mv.clientX - startX) / rect.width) * 100
      const dy = ((mv.clientY - startY) / rect.height) * 100
      updateClip(clip.id, { textX: origX + dx, textY: origY + dy })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Resize handles (CapCut style: 4 corners + right/left edges)
  const HANDLES = [
    { id: 'ne', top: -5, right: -5,   cursor: 'ne-resize' },
    { id: 'se', bottom: -5, right: -5, cursor: 'se-resize' },
    { id: 'sw', bottom: -5, left: -5,  cursor: 'sw-resize' },
    { id: 'nw', top: -5, left: -5,    cursor: 'nw-resize' },
    { id: 'e',  top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize', isEdge: true },
    { id: 'w',  top: '50%', left: -5,  transform: 'translateY(-50%)', cursor: 'w-resize', isEdge: true },
  ] as const

  const onResizeMouseDown = (e: React.MouseEvent, handleId: string) => {
    e.stopPropagation()
    setSelected(clip.id)
    const canvas = containerRef.current?.parentElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const startX = e.clientX
    const origSize = clip.textSize ?? 32
    const scaleDir = handleId.includes('e') ? 1 : handleId.includes('w') ? -1 : 0
    const scaleVDir = handleId.includes('s') ? 1 : handleId.includes('n') ? -1 : 0

    const onMove = (mv: MouseEvent) => {
      const dx = (mv.clientX - startX) / rect.width * 100
      const dy = (mv.clientY - startX) / rect.height * 100
      const delta = scaleDir !== 0 ? dx * scaleDir : dy * scaleVDir
      const newSize = Math.max(8, Math.round(origSize + delta * 0.8))
      updateClip(clip.id, { textSize: newSize })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={containerRef}
      className={`absolute z-30 cursor-move transition-[border-color] ${
        clip.textAnimation === 'fade' ? 'animate-text-fade' :
        clip.textAnimation === 'slide-up' ? 'animate-text-slide-up' :
        clip.textAnimation === 'pop' ? 'animate-text-pop' : ''
      }`}
      style={{
        left: `${clip.textX ?? 50}%`,
        top: `${clip.textY ?? 50}%`,
        transform: 'translate(-50%, -50%)',
        border: isSelected ? '1px solid #ffffff' : '1px solid transparent',
        padding: 4,
      }}
      onClick={e => { e.stopPropagation(); setSelected(clip.id) }}
      onMouseDown={onMouseDown}
    >
      {/* Rotate Handle (Top) */}
      {isSelected && (
        <div className="absolute left-1/2 -top-8 w-px h-8 bg-white/50 -translate-x-1/2 flex justify-center">
          <div className="w-5 h-5 bg-white rounded-full absolute -top-5 flex items-center justify-center cursor-pointer shadow-md text-black">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          </div>
        </div>
      )}

      {/* Text content */}
      <div style={getFontStyle()}>{clip.text}</div>

      {/* Resize handles — only when selected */}
      {isSelected && HANDLES.map(h => (
        <div
          key={h.id}
          data-resize={h.id}
          onMouseDown={e => onResizeMouseDown(e, h.id)}
          style={{
            position: 'absolute',
            width: (h as any).isEdge ? 4 : 10, 
            height: (h as any).isEdge ? 12 : 10,
            background: '#ffffff',
            borderRadius: (h as any).isEdge ? 2 : '50%',
            cursor: h.cursor,
            zIndex: 50,
            top: (h as any).top,
            left: (h as any).left,
            right: (h as any).right,
            bottom: (h as any).bottom,
            transform: (h as any).transform,
            pointerEvents: 'all',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)'
          }}
        />
      ))}
    </div>
  )
}

// Cache for MediaElementSourceNode to prevent "already connected" error
const sourceNodesCache = new WeakMap<HTMLMediaElement | HTMLAudioElement, MediaElementAudioSourceNode>()

// ── Background Audio Player ──────────────────────────────────────────────────
function AudioClipPlayer({ clip, isPlaying, currentTime }: { clip: ReturnType<typeof useEditorStore.getState>['clips'][0], isPlaying: boolean, currentTime: number }) {
  const media = useEditorStore(s => s.mediaFiles.find(m => m.id === clip.mediaId))
  const audioRef = useRef<HTMLAudioElement>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  useEffect(() => {
    if (!audioRef.current) return
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const ctx = new AudioContextClass()
    try {
      let source = sourceNodesCache.get(audioRef.current)
      if (!source) {
        source = ctx.createMediaElementSource(audioRef.current)
        sourceNodesCache.set(audioRef.current, source)
      }
      const gain = ctx.createGain()
      source.connect(gain)
      gain.connect(ctx.destination)
      gainNodeRef.current = gain
    } catch (e) {
      console.warn('Web Audio API setup failed for audio clip:', e)
    }
    
    return () => {
      // Don't close context here if we want to reuse it, 
      // but closing is safer for memory in dynamic clips
      ctx.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!audioRef.current || !media?.url) return
    audioRef.current.src = media.url
    audioRef.current.volume = toLinearVolume(clip.volume ?? 0)
    audioRef.current.currentTime = clip.trimStart + (currentTime - clip.startTime)
    if (isPlaying) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.url, clip.id])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.pow(10, (clip.volume ?? 0) / 20)
    } else if (audioRef.current) {
      audioRef.current.volume = toLinearVolume(clip.volume ?? 0)
    }
  }, [clip.volume])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      // resync before playing
      const target = clip.trimStart + (currentTime - clip.startTime)
      if (Math.abs(audioRef.current.currentTime - target) > 0.1) {
        audioRef.current.currentTime = target
      }
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  useEffect(() => {
    if (!audioRef.current || !isPlaying) return
    const target = clip.trimStart + (currentTime - clip.startTime)
    if (Math.abs(audioRef.current.currentTime - target) > 0.25) {
      audioRef.current.currentTime = target
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, isPlaying])

  return <audio ref={audioRef} style={{ display: 'none' }} />
}

// ── Main VideoPreview ─────────────────────────────────────────────────────────
export default function VideoPreview() {
  const { clips, mediaFiles, currentTime, setCurrentTime,
    isPlaying, setIsPlaying, totalDuration } = useEditorStore()

  const [isBuffering, setIsBuffering] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const rafRef   = useRef<number>(0)
  const stateRef = useRef({ currentTime: 0, isPlaying: false, totalDuration: 30, wallStart: 0, editorStart: 0 })
  stateRef.current.currentTime   = currentTime
  stateRef.current.isPlaying     = isPlaying
  stateRef.current.totalDuration = totalDuration

  // Active video clip at current playhead
  const activeClip  = clips.filter(c => c.type === 'video').find(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration)
  const activeMedia = activeClip ? mediaFiles.find(m => m.id === activeClip.mediaId) : undefined

  const activeClipRef  = useRef(activeClip)
  const activeMediaRef = useRef(activeMedia)
  activeClipRef.current  = activeClip
  activeMediaRef.current = activeMedia

  const loadedUrl = useRef('')

  const loadVideo = useCallback((url: string, seekTo: number) => {
    const v = videoRef.current
    if (!v) return
    loadedUrl.current = url
    v.pause()
    v.src = url
    v.currentTime = Math.max(0, seekTo)
    if (stateRef.current.isPlaying) {
      v.play().catch(e => console.warn('Autoplay prevented:', e))
    }
  }, [])

  useEffect(() => {
    const url = activeMedia?.url ?? ''
    if (url === loadedUrl.current) return
    if (!url) {
      loadedUrl.current = ''
      const v = videoRef.current
      if (v) { v.pause(); v.src = '' }
      return
    }
    const seekTo = (activeClip?.trimStart ?? 0) + (currentTime - (activeClip?.startTime ?? 0))
    loadVideo(url, seekTo)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMedia?.url])

  useEffect(() => {
    if (isPlaying) {
      // Sync video continuously if it drifts while playing
      const v = videoRef.current
      if (!v || !activeClip || !activeMedia) return
      const target = activeClip.trimStart + (currentTime - activeClip.startTime)
      if (Math.abs(v.currentTime - target) > 0.25) {
        v.currentTime = Math.max(0, target)
      }
      return
    }
    
    // Sync while paused
    const v = videoRef.current
    if (!v || !activeClip || !activeMedia) return
    const target = activeClip.trimStart + (currentTime - activeClip.startTime)
    if (Math.abs(v.currentTime - target) > 0.1) {
      v.currentTime = Math.max(0, target)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, isPlaying])

  // Apply volume using Web Audio API for main video
  const videoGainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    if (!videoRef.current) return
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return
    
    const ctx = new AudioContextClass()
    try {
      let source = sourceNodesCache.get(videoRef.current)
      if (!source) {
        source = ctx.createMediaElementSource(videoRef.current)
        sourceNodesCache.set(videoRef.current, source)
      }
      const gain = ctx.createGain()
      source.connect(gain)
      gain.connect(ctx.destination)
      videoGainRef.current = gain
    } catch (e) {
      console.warn('Web Audio API setup failed for video:', e)
    }

    return () => {
      ctx.close().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const track = activeClip ? useEditorStore.getState().tracks.find(t => t.id === activeClip.trackId) : null
    const isMuted = track?.muted ?? false
    const db = isMuted ? -100 : (activeClip?.volume ?? 0)

    if (videoGainRef.current) {
      videoGainRef.current.gain.value = Math.pow(10, db / 20)
    } else if (videoRef.current) {
      videoRef.current.volume = toLinearVolume(db)
    }
  }, [activeClip?.volume, activeClip?.trackId, activeClip?.id])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    if (!isPlaying) {
      videoRef.current?.pause()
      return
    }
    stateRef.current.wallStart   = performance.now()
    stateRef.current.editorStart = currentTime

    if (activeMedia && videoRef.current) videoRef.current.play().catch(() => {})

    const tick = (now: number) => {
      // Check for buffering (readyState < 3: HAVE_FUTURE_DATA)
      let buf = false
      if (activeMedia && videoRef.current) {
        if (videoRef.current.readyState < 3) buf = true
      }
      setIsBuffering(prev => {
        if (prev !== buf) return buf
        return prev
      })

      if (buf) {
        // Shift wallStart forward to prevent jumping ahead when buffering finishes
        stateRef.current.wallStart = now
      } else {
        const elapsed  = (now - stateRef.current.wallStart) / 1000
        const nextTime = Math.max(0, stateRef.current.editorStart + elapsed) // Clamp to 0

        if (nextTime >= stateRef.current.totalDuration) {
          setCurrentTime(stateRef.current.totalDuration)
          setIsPlaying(false)
          videoRef.current?.pause()
          return
        }
        setCurrentTime(nextTime)
      }
      
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  // Seek bar
  const seekDragging = useRef(false)
  const seekBar = useRef<HTMLDivElement>(null)

  const calcSeek = (clientX: number) => {
    const rect = seekBar.current?.getBoundingClientRect()
    if (!rect) return
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const t = pct * stateRef.current.totalDuration
    setCurrentTime(t)
    stateRef.current.wallStart   = performance.now()
    stateRef.current.editorStart = t
  }

  useEffect(() => {
    const move = (e: MouseEvent) => { if (seekDragging.current) calcSeek(e.clientX) }
    const up   = ()              => { seekDragging.current = false }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0
  const toggle   = () => {
    if (!isPlaying && currentTime >= totalDuration - 0.1 && totalDuration > 0) {
      setCurrentTime(0)
    }
    setIsPlaying(!isPlaying)
  }

  // Compute video CSS transform from clip properties
  const getVideoStyle = (): React.CSSProperties => {
    if (!activeClip) return { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'none' }
    const scaleX  = (activeClip.scaleX  ?? 100) / 100
    const scaleY  = (activeClip.scaleY  ?? 100) / 100
    const posX    = activeClip.posX ?? 0
    const posY    = activeClip.posY ?? 0
    const rotate  = activeClip.rotate ?? 0
    const opacity = (activeClip.opacity ?? 100) / 100
    return {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
      display: 'block',
      transform: `translate(${posX}%, ${posY}%) scale(${scaleX}, ${scaleY}) rotate(${rotate}deg)`,
      opacity,
      transition: 'transform 0.05s, opacity 0.05s',
    }
  }

  // Active text overlays
  const activeTextClips = clips.filter(c =>
    c.type === 'text' && currentTime >= c.startTime && currentTime < c.startTime + c.duration
  )

  // Active audio clips (including video clips on audio tracks, and audio clips)
  const activeAudioClips = clips.filter(c => 
    c.type === 'audio' && currentTime >= c.startTime && currentTime < c.startTime + c.duration
  )

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#121215' }}>

      {/* Render Background Audio Players */}
      {activeAudioClips.map(clip => {
        const track = useEditorStore.getState().tracks.find(t => t.id === clip.trackId)
        if (track?.muted) return null
        return <AudioClipPlayer key={clip.id} clip={clip} isPlaying={isPlaying && !isBuffering} currentTime={currentTime} />
      })}

      {/* Canvas */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
        style={{ background: '#0a0a0d' }}
        onClick={() => useEditorStore.getState().setSelectedClipId(null)}
      >
        {/* Checkered bg */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'repeating-conic-gradient(#888 0% 25%, transparent 0% 50%)',
          backgroundSize: '20px 20px'
        }} />

        {/* Video element */}
        <video
          ref={videoRef}
          playsInline
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          className="relative z-10"
          style={getVideoStyle()}
        />

        {/* Empty state */}
        {!activeMedia && (
          <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none">
            <div style={{ width:52, height:52, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg style={{ width:24, height:24, color:'#3f3f46' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p style={{ fontSize:11, color:'#3f3f46' }}>Import media → Add to timeline</p>
          </div>
        )}

        {/* Text overlays */}
        {activeTextClips.map(clip => (
          <TextOverlay key={clip.id} clip={clip} />
        ))}

        {/* Hover play/pause */}
        <div className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer group" onClick={e => { e.stopPropagation(); toggle() }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(6px)', border:'1px solid rgba(255,255,255,0.12)' }}>
            {isPlaying
              ? <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              : <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }
          </div>
        </div>
      </div>

      {/* Controls (CapCut Style - Removed bottom timeline bar, player handles it above timeline or inside player) */}
      <div className="shrink-0 flex items-center justify-between px-4 h-10"
        style={{ background:'#121215', borderTop:'1px solid #25252b' }}>

        <div className="flex items-center gap-2">
           {/* Player resolution indicator etc can go here */}
           <span className="text-[12px] text-[#8a8a93]">16:9</span>
        </div>

        <div className="flex items-center gap-4 text-[#8a8a93]">
          <span className="text-[12px]">{fmtTime(currentTime)} / {fmtTime(totalDuration)}</span>
        </div>
      </div>
    </div>
  )
}
