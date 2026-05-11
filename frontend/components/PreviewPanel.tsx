'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { ClipItem, VideoSettings, getBackendUrl, TimelineItem, Track } from '../lib/types'
import TimelineEditor from './TimelineEditor'
import { SFX_LIBRARY } from '../lib/sfx-library'
import axios from 'axios'

const BACKEND_URL = getBackendUrl()

const PreviewPanel = ({ settings, items, activeIdx: _externalActiveIdx, onChange, onItemsChange }: {
  settings: VideoSettings; items: ClipItem[]; activeIdx: number
  onChange: (k: string, v: any) => void
  onItemsChange?: (items: ClipItem[]) => void
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [scale, setScale] = useState(0.2)
  const [globalTime, setGlobalTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [masterVolume, setMasterVolume] = useState(1)
  const [currentSrc, setCurrentSrc] = useState('')  // track src separately to avoid re-mount
  const activeRangeRef = useRef<typeof activeRange>(null)
  const globalTimeRef = useRef(0)
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null)
  const dragInfo = useRef<{
    type: string; id?: string; el: HTMLElement | null; initialX: number; initialY: number; startX: number; startY: number
  } | null>(null)

  const globalTimeline = settings.globalTimeline || []
  const clampVolume = (v: number) => Math.max(0, Math.min(1, v))

  // Calculate global clip ranges
  const clipRanges = useMemo(() => {
    let t = 0
    return items.map((it, idx) => {
      const dur = Math.max(0.1, it.endTime - it.startTime)
      const start = it.timelineStart ?? t
      const range = { idx, start: start, end: start + dur, localStart: it.startTime, item: it }
      t = start + dur
      return range
    })
  }, [items])

  const totalVideoDuration = Math.max(30, ...clipRanges.map(r => r.end), ...globalTimeline.map(t => t.startTime + t.duration))
  const activeRange = clipRanges.find(r => globalTime >= r.start && globalTime < r.end) || null
  const currentRenderItem = activeRange?.item

  // Keep refs in sync
  useEffect(() => { activeRangeRef.current = activeRange }, [activeRange])
  useEffect(() => { globalTimeRef.current = globalTime }, [globalTime])

  // Switch video src when clip changes
  useEffect(() => {
    const url = currentRenderItem?.preview?.videoUrl || ''
    if (url !== currentSrc) {
      setCurrentSrc(url)
      if (videoRef.current) {
        const wasPlaying = isPlaying
        videoRef.current.pause()
        videoRef.current.src = url
        if (url && activeRange && wasPlaying) {
          videoRef.current.currentTime = activeRange.localStart + (globalTime - activeRange.start)
          videoRef.current.play().catch(() => {})
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRenderItem?.id])

  // Resize handler
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return
      const availableW = containerRef.current.clientWidth - 40
      const availableH = containerRef.current.clientHeight - 40 
      const s = Math.min(availableW / 1080, availableH / 1920)
      if (s > 0) setScale(s)
    }
    updateScale()
    const timer = setTimeout(updateScale, 300)
    window.addEventListener('resize', updateScale)
    return () => { window.removeEventListener('resize', updateScale); clearTimeout(timer) }
  }, [])

  // Sync playback loop — rAF checks video.currentTime against trimmed clip end
  useEffect(() => {
    let req: number
    const loop = () => {
      const video = videoRef.current
      const range = activeRangeRef.current

      if (isPlaying && video && range) {
        const localTime = video.currentTime
        const localClipEnd = range.localStart + (range.end - range.start)
        if (localTime >= localClipEnd - 0.05) {
          // End of this clip — move to next
          const nextIdx = range.idx + 1
          if (nextIdx < clipRanges.length) {
            const nextRange = clipRanges[nextIdx]
            setGlobalTime(nextRange.start)
            // src change will be handled by the useEffect above
          } else {
            video.pause()
            setIsPlaying(false)
            setGlobalTime(0)
          }
        } else {
          setGlobalTime(range.start + (localTime - range.localStart))
        }
      } else if (isPlaying && !activeRangeRef.current) {
        // Gap — advance time manually
        globalTimeRef.current += 1 / 60
        setGlobalTime(globalTimeRef.current)
        if (globalTimeRef.current >= totalVideoDuration) {
          setIsPlaying(false)
          setGlobalTime(0)
        }
      }

      req = requestAnimationFrame(loop)
    }
    req = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(req)
  }, [isPlaying, clipRanges, totalVideoDuration])

  // Throttled state update for UI performance, but ref updates instantly
  const lastUpdateRef = useRef(0)
  const handleSeek = (time: number) => {
    globalTimeRef.current = time
    const now = Date.now()
    
    // Update video immediately for visual feedback
    const newRange = clipRanges.find(r => time >= r.start && time < r.end) || null
    if (newRange && videoRef.current) {
      const targetLocal = newRange.localStart + (time - newRange.start)
      if (newRange.item.preview?.videoUrl !== currentSrc) {
        setCurrentSrc(newRange.item.preview?.videoUrl || '')
        videoRef.current.src = newRange.item.preview?.videoUrl || ''
        videoRef.current.currentTime = targetLocal
        if (isPlaying) videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.currentTime = targetLocal
      }
    } else if (videoRef.current) {
      videoRef.current.pause()
    }

    // Only update React state if enough time has passed (16ms = 60fps)
    if (now - lastUpdateRef.current > 16) {
      setGlobalTime(time)
      lastUpdateRef.current = now
    }
  }

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current?.pause()
      setIsPlaying(false)
    } else {
      if (videoRef.current && currentSrc) {
        if (activeRange) {
          videoRef.current.currentTime = activeRange.localStart + (globalTime - activeRange.start)
        }
        videoRef.current.play().catch(() => {})
      }
      setIsPlaying(true)
    }
  }

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent, type: string, id?: string) => {
    e.preventDefault(); e.stopPropagation()
    
    const target = e.currentTarget as HTMLElement
    let initialX = 0, initialY = 0
    if (type === 'header') { initialX = settings.headerX ?? 540; initialY = settings.headerY ?? 120 }
    else if (type === 'subtitle' && id) {
       const sub = settings.subTitles?.find(s => s.id === id); if (!sub) return
       initialX = sub.x; initialY = sub.y
    }
    else if ((type === 'image' || type === 'text') && id) {
       const item = settings.globalTimeline?.find(i => i.id === id); if (!item) return
       initialX = item.x || 540; initialY = item.y || 960
    }
    else if (type === 'rank') { 
       initialX = settings.rankX ?? 40; 
       const rankFontSize = settings.rankFontSize || 100;
       const SPACING = Math.max(140, rankFontSize * 1.2);
       const groupH = (items.length - 1) * SPACING;
       const defaultRankY = Math.round(1920 / 2 - groupH / 2) - 150;
       initialY = (settings.rankY !== undefined && settings.rankY !== 0) ? settings.rankY : defaultRankY;
    }
    else if (type === 'video') { 
       initialX = 0; 
       const targetH = Math.round(1920 * (currentRenderItem?.videoHeightPct || 70) / 100)
       initialY = (settings.videoY !== undefined && settings.videoY !== -1) ? settings.videoY : (1920 - targetH) / 2 
    }

    dragInfo.current = { type, id, el: target, initialX, initialY, startX: e.clientX, startY: e.clientY }
    target.style.transition = 'none'
  }

  const onChangeRef = useRef(onChange)
  const subTitlesRef = useRef(settings.subTitles)
  const globalTimelineRef = useRef(settings.globalTimeline)
  
  useEffect(() => { 
    onChangeRef.current = onChange 
    subTitlesRef.current = settings.subTitles
    globalTimelineRef.current = settings.globalTimeline
  }, [onChange, settings.subTitles, settings.globalTimeline])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragInfo.current || scale === 0) return
      const { type, initialX, initialY, startX, startY, el } = dragInfo.current
      const dx = (e.clientX - startX) / scale
      const dy = (e.clientY - startY) / scale
      const nx = Math.round(initialX + dx)
      const ny = Math.round(initialY + dy)

      if (el) {
        if (type === 'video') el.style.top = `${ny}px`
        else { el.style.left = `${nx}px`; el.style.top = `${ny}px` }
      }
    }

    const onUp = (e: MouseEvent) => {
      if (!dragInfo.current) return
      const { type, id, initialX, initialY, startX, startY, el } = dragInfo.current
      const dx = (e.clientX - startX) / scale
      const dy = (e.clientY - startY) / scale
      const nx = Math.round(initialX + dx)
      const ny = Math.round(initialY + dy)

      if (el) el.style.transition = ''
      const oc = onChangeRef.current
      if (type === 'header') { oc('headerX', nx); oc('headerY', ny) }
      else if (type === 'subtitle' && id) {
         const newSubs = (subTitlesRef.current || []).map(s => s.id === id ? { ...s, x: nx, y: ny } : s)
         oc('subTitles', newSubs)
      }
      else if ((type === 'image' || type === 'text') && id) {
         const newTl = (globalTimelineRef.current || []).map(i => i.id === id ? { ...i, x: nx, y: ny } : i)
         oc('globalTimeline', newTl)
      }
      else if (type === 'rank') { oc('rankX', nx); oc('rankY', ny) }
      else if (type === 'video') { oc('videoY', ny) }
      dragInfo.current = null
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [scale])

  const rankFontSize = settings.rankFontSize || 100
  const SPACING = Math.max(140, rankFontSize * 1.2)
  const n = items.length
  const groupH = (n - 1) * SPACING
  const defaultRankY = Math.round(1920 / 2 - groupH / 2) - 150
  const currentRankY = (settings.rankY !== undefined && settings.rankY !== 0) ? settings.rankY : defaultRankY
  const targetH = Math.round(1920 * (currentRenderItem?.videoHeightPct || 70) / 100)
  const currentVideoY = (settings.videoY !== undefined && settings.videoY !== -1) ? settings.videoY : (1920 - targetH) / 2

  const h1AlignX = settings.headerAlign === 'left' ? '0' : settings.headerAlign === 'right' ? '-100%' : '-50%'

  const getImageUrl = (p: string) => {
    if (!p) return undefined
    if (p.startsWith('http')) return p
    const normalized = p.replace(/\\/g, '/')
    if (normalized.includes('temp/')) return `${BACKEND_URL}/temp/${normalized.split('temp/')[1]}`
    return p
  }

  // Global Timeline Handlers
  
  const tracks = useMemo(() => {
    const videoItems: TimelineItem[] = clipRanges.map(r => ({
      id: `v_${r.idx}`,
      type: 'video',
      name: `Clip ${r.idx + 1}: ${r.item.clipTitle || 'Video'}`,
      startTime: r.start,
      duration: r.end - r.start,
      content: '',
      layer: 0,
      volume: r.item.volume ?? 1
    }))

    const t: Track[] = [
      { id: 'main-video', name: 'Video 1', type: 'video', items: videoItems },
    ]
    
    // Group overlays by layer
    const overlays = globalTimeline.filter(it => it.type === 'image' || it.type === 'text')
    const overlayLayers = [...new Set(overlays.map(it => it.layer || 1))].sort((a,b) => a-b)
    overlayLayers.forEach(layer => {
      const items = overlays.filter(it => (it.layer || 1) === layer)
      if (items.length > 0) {
        t.push({ id: `overlay-${layer}`, name: `Overlay ${layer}`, type: 'overlay', items })
      }
    })

    // Group audio by layer
    const sfxs = globalTimeline.filter(it => it.type === 'sfx')
    const sfxLayers = [...new Set(sfxs.map(it => it.layer || 1))].sort((a,b) => a-b)
    sfxLayers.forEach(layer => {
      const items = sfxs.filter(it => (it.layer || 1) === layer)
      if (items.length > 0) {
        t.push({ id: `sfx-${layer}`, name: `Audio ${layer}`, type: 'audio', items })
      }
    })

    return t;
  }, [clipRanges, globalTimeline])

  const handleTimelineChange = (newTracks: Track[]) => {
    // Update globalTimeline for overlay/sfx/text tracks only
    const flatItems = newTracks.filter(t => t.id !== 'main-video').flatMap(t => t.items)
    onChange('globalTimeline', flatItems)

    // Sync Main Video Track
    const mainTrack = newTracks.find(t => t.id === 'main-video')
    if (mainTrack && onItemsChange) {
      let changed = false;
      const newItems = items.map((it, idx) => {
        const tItem = mainTrack.items.find(ti => ti.id === `v_${idx}`)
        if (tItem) {
          const timeChanged = Math.abs((it.timelineStart ?? 0) - tItem.startTime) > 0.05;
          const durChanged = Math.abs((it.endTime - it.startTime) - tItem.duration) > 0.05;
          const volChanged = it.volume !== tItem.volume;

          if (timeChanged || durChanged || volChanged) {
            changed = true;
            // For main video, we update timelineStart and potentially duration (endTime)
            const newTimelineStart = tItem.startTime;
            const newDuration = tItem.duration;
            return { 
              ...it, 
              volume: tItem.volume, 
              timelineStart: newTimelineStart,
              endTime: it.startTime + newDuration
            }
          }
        }
        return it;
      });
      if (changed) onItemsChange(newItems);
    }
  }

  const handleSplit = (targetId?: string) => {
      const splitTime = globalTimeRef.current;
      // 1. Split Main Video Clips
      let splitVideo = false;
      const newItems: ClipItem[] = [];
      clipRanges.forEach((r, idx) => {
         const isTarget = !targetId || targetId === `v_${idx}`
         const canSplit = splitTime > r.start + 0.1 && splitTime < r.end - 0.1
         
         if (isTarget && canSplit) {
            splitVideo = true;
            const leftDur = splitTime - r.start;
            newItems.push({ ...r.item, endTime: r.item.startTime + leftDur, timelineStart: r.start })
            newItems.push({ 
              ...r.item, 
              id: Math.random().toString(36).slice(2, 10), 
              startTime: r.item.startTime + leftDur, 
              timelineStart: splitTime,
              // @ts-ignore
              isSplitPart: true
            })
         } else {
            newItems.push({ ...r.item, timelineStart: r.start })
         }
      })
      if (splitVideo && onItemsChange) onItemsChange(newItems);

      // 2. Split Global Timeline Items (Text, Image, SFX)
      let splitGlobal = false;
      const newGlobalTimeline: TimelineItem[] = [];
      globalTimeline.forEach(it => {
         const isTarget = !targetId || targetId === it.id
         const canSplit = splitTime > it.startTime + 0.1 && splitTime < it.startTime + it.duration - 0.1
         
         if (isTarget && canSplit) {
            splitGlobal = true;
            const leftDur = splitTime - it.startTime;
            newGlobalTimeline.push({ ...it, duration: leftDur });
            newGlobalTimeline.push({ ...it, id: Math.random().toString(36).slice(2, 10), startTime: splitTime, duration: it.duration - leftDur });
         } else {
            newGlobalTimeline.push(it);
         }
      })
      if (splitGlobal) onChange('globalTimeline', newGlobalTimeline);
   }

  const handleSFXUpload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await axios.post(`${BACKEND_URL}/api/videos/upload-music`, fd);
      const newItem: TimelineItem = { id: Math.random().toString(36).slice(2, 10), type: 'sfx', name: file.name, startTime: globalTime, duration: 1.5, content: r.data.musicPath, layer: 1 };
      onChange('globalTimeline', [...globalTimeline, newItem])
    } catch { alert('Upload SFX failed') }
  }

  const handleOverlayUpload = async (file: File, type: 'image' | 'video') => {
    const fd = new FormData(); fd.append('file', file)
    try {
      const r = await axios.post(`${BACKEND_URL}/api/videos/upload-music`, fd);
      const newItem: TimelineItem = { id: Math.random().toString(36).slice(2, 10), type, name: file.name, startTime: globalTime, duration: 3, content: r.data.musicPath, layer: 1, animation: 'pop' };
      onChange('globalTimeline', [...globalTimeline, newItem])
    } catch { alert(`Upload ${type} failed`) }
  }

  const handleAddText = () => {
    // Find next available layer for this time to avoid overlapping in track
    const currentLayer = Math.max(0, ...globalTimeline.filter(it => it.type === 'text').map(it => it.layer || 0)) + 1
    const newItem: TimelineItem = { id: Math.random().toString(36).slice(2, 10), type: 'text', name: 'New Text', startTime: globalTime, duration: 3, content: 'NEW TEXT|#ffffff|80', layer: currentLayer, animation: 'pop' };
    onChange('globalTimeline', [...globalTimeline, newItem])
  }

  const handleEditItem = (item: TimelineItem) => {
    setEditingItem(item)
  }

  const handleUpdateItem = (id: string, updates: Partial<TimelineItem>) => {
    onChange('globalTimeline', globalTimeline.map(it => it.id === id ? { ...it, ...updates } : it))
  }

  const addSFX = (sfx: typeof SFX_LIBRARY[0]) => {
    const newItem: TimelineItem = { id: Math.random().toString(36).slice(2, 10), type: 'sfx', startTime: globalTime, duration: 2, content: sfx.url, layer: 1, name: sfx.name }
    onChange('globalTimeline', [...globalTimeline, newItem])
  }

  const handleDeleteItem = (trackId: string, itemId: string) => {
    if (trackId === 'main-video') {
       if (onItemsChange) onItemsChange(items.filter((it, idx) => `v_${idx}` !== itemId));
    } else {
       onChange('globalTimeline', globalTimeline.filter(t => t.id !== itemId));
    }
  }

  const handleAddTrack = (type: 'video' | 'audio') => {
    if (type === 'audio') {
      // Add a blank audio placeholder
      const newItem: TimelineItem = {
        id: Math.random().toString(36).slice(2, 10),
        type: 'sfx', name: 'New Audio Track',
        startTime: 0, duration: totalVideoDuration,
        content: '', layer: 1
      }
      onChange('globalTimeline', [...globalTimeline, newItem])
    } else {
      // For video, add blank overlay
      const newItem: TimelineItem = {
        id: Math.random().toString(36).slice(2, 10),
        type: 'image', name: 'New Video Layer',
        startTime: 0, duration: 3,
        content: '', layer: 1
      }
      onChange('globalTimeline', [...globalTimeline, newItem])
    }
  }

  useEffect(() => {
    if (videoRef.current && currentRenderItem) {
      videoRef.current.volume = clampVolume(masterVolume * (currentRenderItem.volume ?? 1));
    }
  }, [masterVolume, currentRenderItem?.volume])

  return (
    <div className="w-full h-full flex flex-col items-center bg-[#050508] relative">
      {/* Player Section */}
      <div ref={containerRef} className="flex-1 w-full flex items-center justify-center relative overflow-hidden p-4">
        <div 
          className="relative shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-lg border border-white/5 overflow-hidden"
          style={{ width: 1080, height: 1920, backgroundColor: settings.bgColor || '#000000', transform: `scale(${scale})`, transformOrigin: 'center center', flexShrink: 0 }}
        >
          {/* 1. Video Layer */}
          <div
            onMouseDown={e => handleMouseDown(e, 'video')}
            className="absolute left-0 right-0 cursor-move z-10"
            style={{ top: currentVideoY, height: targetH }}
          >
            <div className="w-full h-full bg-zinc-950 overflow-hidden relative">
              {/* Always mount video — src managed imperatively to avoid re-mount lag */}
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${currentSrc ? '' : 'hidden'}`}
                playsInline
                onLoadedMetadata={e => {
                  const v = e.target as HTMLVideoElement
                  if (activeRange) v.currentTime = activeRange.localStart + (globalTime - activeRange.start)
                  v.volume = clampVolume(masterVolume * (currentRenderItem?.volume ?? 1))
                }}
              />
              {!currentSrc && currentRenderItem?.preview?.thumbnail && (
                <img src={currentRenderItem.preview.thumbnail} alt="" className="w-full h-full object-cover opacity-50" />
              )}
              {!currentSrc && !currentRenderItem?.preview?.thumbnail && (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-900 gap-4">
                  <span className="text-6xl">🎬</span>
                  <span className="text-2xl font-black italic">PASTE LINK TO DOWNLOAD PREVIEW</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Overlay Layer (Images & Texts from Timeline) */}
          {globalTimeline.filter(t => t.type === 'image' && globalTime >= t.startTime && globalTime < t.startTime + t.duration).map(img => (
            <div key={img.id}
              onMouseDown={e => handleMouseDown(e, 'image', img.id)}
              className="absolute z-20 overflow-hidden cursor-move active:scale-[0.98] transition-transform"
              style={{ left: img.x || 540, top: img.y || 960, width: 400, height: 400, transform: 'translate(-50%, -50%)' }}
            >
               {getImageUrl(img.content) && (
                 <img src={getImageUrl(img.content)!} className="w-full h-full object-contain pointer-events-none drop-shadow-2xl animate-in zoom-in duration-300" />
               )}
               <div className="absolute inset-0 border-2 border-orange-500/50 rounded-lg pointer-events-none" />
            </div>
          ))}

          {globalTimeline.filter(t => t.type === 'text' && globalTime >= t.startTime && globalTime < t.startTime + t.duration).map(txt => (
            <div key={txt.id}
              onMouseDown={e => handleMouseDown(e, 'text', txt.id)}
              className="absolute z-30 overflow-hidden cursor-move active:scale-[0.98] transition-transform flex items-center justify-center min-w-[200px]"
              style={{ left: txt.x || 540, top: txt.y || 960, transform: 'translate(-50%, -50%)' }}
            >
              <span style={{ fontFamily: '"Segoe UI", sans-serif', color: txt.content?.split('|')[1] || '#ffffff', fontWeight: 900, fontSize: parseInt(txt.content?.split('|')[2] || '80'), lineHeight: 1.1, textShadow: '0 4px 40px rgba(0,0,0,1)', whiteSpace: 'pre', textAlign: 'center' }}>
                {txt.content?.split('|')[0] || txt.name}
              </span>
              <div className="absolute inset-0 border-2 border-green-500/50 rounded-lg pointer-events-none opacity-0 hover:opacity-100" />
            </div>
          ))}

          {/* Audio Engine (Hidden) */}
          <div className="hidden">
             {globalTimeline.filter(t => t.type === 'sfx' || t.type === 'audio').map(audio => (
                <audio 
                  key={audio.id} 
                  src={getImageUrl(audio.content)} 
                  ref={el => {
                    if (!el) return;
                    el.volume = clampVolume(masterVolume * (audio.volume ?? 1));
                    if (isPlaying && globalTime >= audio.startTime && globalTime < audio.startTime + audio.duration) {
                      if (el.paused) {
                        el.currentTime = globalTime - audio.startTime;
                        el.play().catch(()=>{});
                      }
                      if (Math.abs(el.currentTime - (globalTime - audio.startTime)) > 0.3) {
                        el.currentTime = globalTime - audio.startTime;
                      }
                    } else {
                      if (!el.paused) el.pause();
                    }
                  }}
                />
             ))}
          </div>

          {/* 3. Text Layers */}
          {settings.headerText && (
            <div onMouseDown={e => handleMouseDown(e, 'header')} className="absolute cursor-move z-30" 
              style={{ top: settings.headerY ?? 120, left: settings.headerX ?? 540, width: '1000px', transform: `translateX(${h1AlignX})`, textAlign: settings.headerAlign || 'center', pointerEvents: 'auto' }}>
              <span style={{ fontFamily: '"Segoe UI", sans-serif', color: settings.headerColor, fontWeight: 900, fontSize: settings.headerFontSize || 80, lineHeight: 1.1, textShadow: '0 4px 40px rgba(0,0,0,1)', whiteSpace: 'pre' }}>
                {settings.headerText}
              </span>
            </div>
          )}

          {(settings.subTitles || []).map(sub => (
            <div key={sub.id} onMouseDown={e => handleMouseDown(e, 'subtitle', sub.id)} className="absolute cursor-move z-30 min-w-[100px] flex items-center justify-center" 
              style={{ top: sub.y, left: sub.x, transform: 'translate(-50%, -50%)' }}>
              <span style={{ fontFamily: '"Segoe UI", sans-serif', color: sub.color, fontWeight: 900, fontSize: sub.fontSize || 50, lineHeight: 1.1, textShadow: '0 4px 30px rgba(0,0,0,1)', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                {sub.text}
              </span>
            </div>
          ))}

          <div onMouseDown={e => handleMouseDown(e, 'rank')} className="absolute cursor-move z-30" 
            style={{ top: currentRankY, left: settings.rankX ?? 40 }}>
            {items.map((item, idx) => {
              const rank = idx + 1; const isActive = idx === activeRange?.idx
              const c = item.rankColor || settings.rankNumberColor || '#FFD700'
              return (
                <div key={item.id} className="relative" style={{ height: SPACING }}>
                  <span style={{ fontFamily: '"Segoe UI", sans-serif', color: c, fontSize: rankFontSize, fontWeight: 900, lineHeight: 1, textShadow: `0 0 50px ${c}40, 4px 4px 20px rgba(0,0,0,1)`, position: 'absolute', left: 0, top: 0 }}>{rank}.</span>
                  {item.clipTitle && (
                    <div style={{ fontFamily: '"Segoe UI", sans-serif', position: 'absolute', left: rankFontSize * 1.1, top: rankFontSize * 0.1, width: '850px', color: isActive ? (item.clipTitleColor || '#ffffff') : 'rgba(255,255,255,0.3)', fontSize: item.clipTitleFontSize || 52, fontWeight: 900, whiteSpace: 'pre-wrap', lineHeight: 1.1, WebkitTextStroke: `${item.clipTitleStroke || 2}px ${item.clipTitleStrokeColor || '#000000'}` }}>
                      {item.clipTitle}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="absolute inset-0 pointer-events-none border-[35px] border-white/5 rounded-[70px] m-8" />
        </div>
      </div>

      {/* Global Timeline Workspace (Bottom Area) */}
      <div className="fixed bottom-0 left-0 right-0 h-[35%] bg-[#181818] border-t border-white/5 flex flex-col shrink-0 z-[100]">
        <TimelineEditor 
          tracks={tracks}
          totalDuration={totalVideoDuration || 30}
          currentTime={globalTime}
          onSeek={handleSeek}
          onChange={handleTimelineChange}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onSplit={handleSplit}
          onDelete={handleDeleteItem}
          onAddTrack={handleAddTrack}
          onEditItem={handleEditItem}
          onAddText={handleAddText}
          onAddSFX={addSFX}
          onUploadSFX={handleSFXUpload}
          onUploadOverlay={handleOverlayUpload}
          masterVolume={masterVolume}
          onMasterVolumeChange={(v) => {
            setMasterVolume(v)
            if (videoRef.current) videoRef.current.volume = Math.max(0, Math.min(1, v))
          }}
        />
      </div>
      {/* ── Text Editor Modal ── */}
      {editingItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1c1c20] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span className="text-purple-500">✍️</span> {editingItem.type === 'text' ? 'Edit Text' : 'Rename Clip'}
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-zinc-500 hover:text-white transition">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Content</label>
                {editingItem.type === 'text' ? (
                  <textarea 
                    autoFocus
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none transition h-24"
                    value={editingItem.content?.split('|')[0] || ''}
                    onChange={e => {
                      const parts = editingItem.content?.split('|') || ['', '#ffffff', '80']
                      const newContent = `${e.target.value}|${parts[1]}|${parts[2]}`
                      const newEdit = { ...editingItem, content: newContent, name: e.target.value }
                      setEditingItem(newEdit)
                      handleUpdateItem(editingItem.id, { content: newContent, name: e.target.value })
                    }}
                  />
                ) : (
                  <input 
                    autoFocus
                    className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-white text-sm focus:border-purple-500 outline-none transition"
                    value={editingItem.name}
                    onChange={e => {
                      const newEdit = { ...editingItem, name: e.target.value }
                      setEditingItem(newEdit)
                      handleUpdateItem(editingItem.id, { name: e.target.value })
                    }}
                  />
                )}
              </div>

              {editingItem.type === 'text' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Color</label>
                    <div className="flex gap-2">
                      <input 
                        type="color" 
                        className="w-10 h-10 rounded-lg bg-transparent border-none cursor-pointer"
                        value={editingItem.content?.split('|')[1] || '#ffffff'}
                        onChange={e => {
                          const parts = editingItem.content?.split('|') || ['', '#ffffff', '80']
                          const newContent = `${parts[0]}|${e.target.value}|${parts[2]}`
                          setEditingItem({ ...editingItem, content: newContent })
                          handleUpdateItem(editingItem.id, { content: newContent })
                        }}
                      />
                      <input 
                        type="text"
                        className="flex-1 bg-black/40 border border-white/5 rounded-xl px-3 text-white text-[10px] font-mono focus:border-purple-500 outline-none transition uppercase"
                        value={editingItem.content?.split('|')[1] || '#ffffff'}
                        onChange={e => {
                          const parts = editingItem.content?.split('|') || ['', '#ffffff', '80']
                          const newContent = `${parts[0]}|${e.target.value}|${parts[2]}`
                          setEditingItem({ ...editingItem, content: newContent })
                          handleUpdateItem(editingItem.id, { content: newContent })
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 block">Size</label>
                    <input 
                      type="number" 
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-white text-sm focus:border-purple-500 outline-none transition"
                      value={editingItem.content?.split('|')[2] || '80'}
                      onChange={e => {
                        const parts = editingItem.content?.split('|') || ['', '#ffffff', '80']
                        const newContent = `${parts[0]}|${parts[1]}|${e.target.value}`
                        setEditingItem({ ...editingItem, content: newContent })
                        handleUpdateItem(editingItem.id, { content: newContent })
                      }}
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={() => setEditingItem(null)}
                className="w-full py-3 mt-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PreviewPanel
