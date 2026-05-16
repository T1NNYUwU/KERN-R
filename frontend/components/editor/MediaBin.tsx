'use client'
import { useRef, useCallback, useState } from 'react'
import { useEditorStore, MediaFile, makeClipId, Clip } from '../../lib/store'
import { Film, Music, Image as ImageIcon, Plus, Trash2, Import, UploadCloud, Sparkles, Link as LinkIcon, Globe, Loader2 } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getMediaDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const el = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video') as HTMLVideoElement
    const url = URL.createObjectURL(file)
    
    const timeoutId = setTimeout(() => {
      URL.revokeObjectURL(url)
      resolve(10) // Fallback to 10s if browser hangs
    }, 2000)

    el.preload = 'metadata'
    el.onloadedmetadata = () => { 
      clearTimeout(timeoutId)
      if (el.duration === Infinity || isNaN(el.duration)) {
        el.currentTime = Number.MAX_SAFE_INTEGER
        el.ontimeupdate = () => {
          el.ontimeupdate = null
          el.currentTime = 0
          resolve(el.duration && !isNaN(el.duration) ? el.duration : 10)
          URL.revokeObjectURL(url)
        }
      } else {
        URL.revokeObjectURL(url)
        resolve(el.duration && !isNaN(el.duration) ? el.duration : 10)
      }
    }
    el.onerror = () => { 
      clearTimeout(timeoutId)
      URL.revokeObjectURL(url)
      resolve(10) 
    }
    el.src = url
    el.load()
  })
}

function captureThumb(url: string): Promise<string> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration * 0.1)
    }
    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 240
      canvas.height = Math.round((video.videoHeight / video.videoWidth) * 240) || 135
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    video.onerror = () => resolve('')
    video.src = url
  })
}

function fmtDur(s: number) {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MediaBin() {
  const { mediaFiles, addMedia, removeMedia, clips, tracks, addClip, addTrack } = useEditorStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isCleaning, setIsCleaning] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')
  const [isFetching, setIsFetching] = useState(false)

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return
    setIsFetching(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005'
      const res = await fetch(`${backendUrl}/api/videos/preview?url=${encodeURIComponent(urlInput)}`)
      const data = await res.json()
      
      if (data.videoUrl) {
        // Fetch the file to get Blob and duration if needed
        const videoRes = await fetch(data.videoUrl)
        const blob = await videoRes.blob()
        const file = new File([blob], `${data.title || 'Downloaded'}.mp4`, { type: 'video/mp4' })
        
        const id = crypto.randomUUID()
        await addMedia({
          id,
          name: data.title || 'Downloaded Video',
          type: 'video',
          file,
          url: data.videoUrl,
          duration: data.duration || 10,
          thumbnail: data.thumbnail
        })
        setUrlInput('')
        setActiveTab('upload')
      } else {
        alert(data.error || 'Failed to fetch video info')
      }
    } catch (err) {
      console.error('URL Import error:', err)
      alert('Failed to download video')
    } finally {
      setIsFetching(false)
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to clean up server garbage? This will remove all temporary files and local uploads.')) return
    
    setIsCleaning(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005'
      const res = await fetch(`${backendUrl}/api/videos/cleanup`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        alert(`Cleanup successful! Deleted ${data.deletedCount} files.`)
      }
    } catch (err) {
      console.error('Cleanup failed:', err)
    } finally {
      setIsCleaning(false)
    }
  }

  const handleRemoveMedia = async (media: MediaFile) => {
    // If it's a local backend file, try to delete it
    if (media.url && media.url.includes('/uploads/')) {
      try {
        const filename = media.url.split('/').pop()
        if (filename) {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005'
          await fetch(`${backendUrl}/api/videos/uploads/${filename}`, { method: 'DELETE' })
        }
      } catch (e) {
        console.warn('Failed to delete file from server:', e)
      }
    }
    removeMedia(media.id)
  }

  const processFiles = useCallback(async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const isImage = file.type.startsWith('image/')
      if (!isVideo && !isAudio && !isImage) continue

      const id = crypto.randomUUID()
      const localUrl = URL.createObjectURL(file)
      const type: MediaFile['type'] = isVideo ? 'video' : isAudio ? 'audio' : 'image'

      const duration = (isVideo || isAudio) ? await getMediaDuration(file) : 10
      const thumbnail = isVideo ? await captureThumb(localUrl) : (isImage ? localUrl : undefined)

      // Upload to backend
      try {
        const formData = new FormData()
        formData.append('file', file)
        
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005'
        const res = await fetch(`${backendUrl}/api/videos/upload`, {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        
        if (data.url) {
          await addMedia({ id, name: file.name, type, file, url: data.url, duration, thumbnail })
        } else {
          throw new Error('Upload failed')
        }
      } catch (err) {
        console.error('Upload error, falling back to local storage:', err)
        // Fallback to local if backend is down
        await addMedia({ id, name: file.name, type, file, url: localUrl, duration, thumbnail })
      }
    }
  }, [addMedia])

  const handleAddToTimeline = useCallback((media: MediaFile) => {
    let targetTrack =
      tracks.find(t => t.type === media.type) ??
      tracks.find(t => media.type === 'image' && t.type === 'video')

    let trackId: string
    if (targetTrack?.id) {
      trackId = targetTrack.id
    } else {
      trackId = addTrack(media.type === 'image' ? 'video' : media.type)
    }

    const trackClips = clips.filter(c => c.trackId === trackId)
    const nextStart = trackClips.length === 0 ? 0
      : Math.max(...trackClips.map(c => c.startTime + c.duration))

    const clip: Clip = {
      id: makeClipId(),
      mediaId: media.id,
      name: media.name.replace(/\.[^.]+$/, ''),
      type: media.type,
      trackId: trackId,
      startTime: nextStart,
      duration: media.duration,
      trimStart: 0, trimEnd: 0, volume: 1,
    }
    addClip(clip)
  }, [tracks, clips, addClip])

  return (
    <div
      className="w-full h-full flex flex-col bg-transparent"
      onDrop={e => { e.preventDefault(); processFiles(e.dataTransfer.files) }}
      onDragOver={e => e.preventDefault()}
    >
      {/* Header & Tabs */}
      <div className="px-3 pt-3 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Project Media</span>
          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === 'upload' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'}`}
            >
              Upload
            </button>
            <button
              onClick={() => setActiveTab('url')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === 'url' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-400'}`}
            >
              Link
            </button>
          </div>
        </div>

        {activeTab === 'upload' ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-xs font-semibold transition-all active:scale-[0.98]"
          >
            <Import className="w-3.5 h-3.5" /> Import Local Files
          </button>
        ) : (
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                placeholder="YouTube or TikTok URL..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-8 pr-3 text-xs text-zinc-200 placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>
            <button
              onClick={handleUrlImport}
              disabled={isFetching || !urlInput.trim()}
              className={`px-3 rounded-lg flex items-center justify-center transition-all ${isFetching || !urlInput.trim() ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/10'}`}
            >
              {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        <input
          ref={inputRef} type="file" multiple accept="video/*,audio/*,image/*" className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {/* Media list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5 custom-scrollbar">
        {mediaFiles.length === 0 ? (
          <div
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 cursor-pointer rounded-xl transition-all border-2 border-dashed border-zinc-800/80 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-zinc-700 mx-1 mt-2 min-h-[160px]"
          >
            <UploadCloud className="w-8 h-8 text-zinc-600" />
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-400">Drop files to import</p>
              <p className="text-[10px] text-zinc-600 mt-1">Video, Audio, Images</p>
            </div>
          </div>
        ) : (
          mediaFiles.map(media => (
            <div
              key={media.id}
              draggable
              onDragStart={e => e.dataTransfer.setData('mediaId', media.id)}
              onDoubleClick={() => handleAddToTimeline(media)}
              className="flex items-center gap-2.5 p-1.5 rounded-lg group cursor-pointer transition-colors hover:bg-zinc-800/80 bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/80"
            >
              {/* Thumbnail */}
              <div className="w-14 h-10 rounded overflow-hidden shrink-0 flex items-center justify-center bg-zinc-950 relative border border-zinc-800/80 group-hover:border-indigo-500/50 transition-colors">
                {media.thumbnail
                  ? <img src={media.thumbnail} className="w-full h-full object-cover" alt="" />
                  : media.type === 'audio' ? <Music className="w-5 h-5 text-emerald-500/60" />
                  : media.type === 'image' ? <ImageIcon className="w-5 h-5 text-amber-500/60" />
                  : <Film className="w-5 h-5 text-blue-500/60" />
                }
                
                {/* Type Badge */}
                <div className="absolute bottom-0.5 right-0.5 bg-black/60 backdrop-blur-sm rounded-sm px-1 py-0.5">
                  {media.type === 'video' && <Film className="w-2.5 h-2.5 text-blue-400" />}
                  {media.type === 'audio' && <Music className="w-2.5 h-2.5 text-emerald-400" />}
                  {media.type === 'image' && <ImageIcon className="w-2.5 h-2.5 text-amber-400" />}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-medium text-zinc-300 truncate leading-tight group-hover:text-zinc-100">
                  {media.name.replace(/\.[^.]+$/, '')}
                </p>
                <p className="text-[10px] font-mono text-zinc-600 mt-0.5">{fmtDur(media.duration)}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={e => { e.stopPropagation(); handleAddToTimeline(media) }}
                  className="w-5 h-5 rounded flex items-center justify-center text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                  title="Add to timeline"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleRemoveMedia(media) }}
                  className="w-5 h-5 rounded flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: count and cleanup */}
      {mediaFiles.length > 0 && (
        <div className="px-4 py-2 shrink-0 border-t border-zinc-800/60 flex justify-between items-center bg-zinc-950/50">
          <p className="text-[10px] font-medium text-zinc-600">{mediaFiles.length} item{mediaFiles.length !== 1 ? 's' : ''}</p>
          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Clean up all server-side temporary files"
          >
            {isCleaning ? 'Cleaning...' : (
              <>
                <Sparkles className="w-3 h-3" /> Clean Garbage
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

