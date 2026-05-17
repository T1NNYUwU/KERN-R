'use client'
import { useRef, useCallback, useState } from 'react'
import { useEditorStore, MediaFile, Clip, makeClipId } from '../../lib/store'
import { 
  UploadCloud, Film, Music, Image as ImageIcon, 
  Trash2, Plus, Globe, Loader2, Sparkles, Import
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'
import { getBackendUrl } from '../../lib/types'

function fmtDur(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

async function getMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    if (file.type.startsWith('video')) {
      const v = document.createElement('video')
      v.src = url
      v.onloadedmetadata = () => resolve(v.duration)
      v.onerror = () => resolve(10)
    } else if (file.type.startsWith('audio')) {
      const a = new Audio(url)
      a.onloadedmetadata = () => resolve(a.duration)
      a.onerror = () => resolve(10)
    } else {
      resolve(10)
    }
  })
}

async function captureThumb(url: string): Promise<string> {
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.src = url
    v.crossOrigin = 'anonymous'
    v.currentTime = 1
    v.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 90
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(v, 0, 0, 160, 90)
      resolve(canvas.toDataURL('image/jpeg'))
    }
    v.onerror = () => resolve('')
  })
}

export default function MediaBin() {
  const { user } = useAuth()
  const { mediaFiles, addMedia, removeMedia, tracks, addTrack, clips, addClip } = useEditorStore()
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [isCleaning, setIsCleaning] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const processFiles = useCallback(async (files: FileList) => {
    if (!user) return
    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // จำกัดขนาดไฟล์ไม่เกิน 50MB (50 * 1024 * 1024 bytes)
        const maxSizeBytes = 50 * 1024 * 1024
        if (file.size > maxSizeBytes) {
          toast.error(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 50MB (จำกัดขนาดไม่เกิน 50MB)`)
          continue
        }

        const isVideo = file.type.startsWith('video')
        const isAudio = file.type.startsWith('audio')
        const isImage = file.type.startsWith('image')
        if (!isVideo && !isAudio && !isImage) continue

        const id = crypto.randomUUID()
        const localUrl = URL.createObjectURL(file)
        const type: MediaFile['type'] = isVideo ? 'video' : isAudio ? 'audio' : 'image'
        const duration = (isVideo || isAudio) ? await getMediaDuration(file) : 10
        const thumbnail = isVideo ? await captureThumb(localUrl) : (isImage ? localUrl : undefined)

        try {
          const formData = new FormData()
          formData.append('file', file)
          const backendUrl = getBackendUrl()
          const res = await fetch(`${backendUrl}/api/videos/upload`, { method: 'POST', body: formData })
          const data = await res.json()
          
          if (data.url) {
            await addMedia({ id, name: file.name, type, file, url: data.url, duration, thumbnail }, user.id)
          } else {
            throw new Error('Upload failed')
          }
        } catch (err) {
          console.error('Upload error, falling back to local storage:', err)
          await addMedia({ id, name: file.name, type, file, url: localUrl, duration, thumbnail }, user.id)
        }
      }
    } catch (err) {
      console.error('Error processing files:', err)
    } finally {
      setIsUploading(false)
    }
  }, [addMedia, user])

  const handleUrlImport = async () => {
    if (!urlInput.trim() || !user) return
    setIsFetching(true)
    try {
      const backendUrl = getBackendUrl()
      const res = await fetch(`${backendUrl}/api/videos/preview?url=${encodeURIComponent(urlInput)}`)
      const data = await res.json()
      
      if (data.videoUrl) {
        const videoRes = await fetch(data.videoUrl)
        const blob = await videoRes.blob()
        const file = new File([blob], `${data.title || 'Downloaded'}.mp4`, { type: 'video/mp4' })
        const id = crypto.randomUUID()
        await addMedia({
          id, name: data.title || 'Downloaded Video', type: 'video',
          file, url: data.videoUrl, duration: data.duration || 10, thumbnail: data.thumbnail
        }, user.id)
        setUrlInput('')
        toast.success('Imported video from URL')
      } else {
        toast.error(data.error || 'Failed to fetch video info')
      }
    } catch (err) {
      console.error('URL Import error:', err)
      toast.error('Failed to download video')
    } finally {
      setIsFetching(false)
    }
  }

  const handleCleanup = async () => {
    if (!confirm('Are you sure you want to clean up server garbage?')) return
    setIsCleaning(true)
    try {
      const backendUrl = getBackendUrl()
      const res = await fetch(`${backendUrl}/api/videos/cleanup`, { method: 'POST' })
      const data = await res.json()
      if (data.success) toast.success(`Cleanup successful! Deleted ${data.deletedCount} files.`)
    } catch (err) { console.error('Cleanup failed:', err) }
    finally { setIsCleaning(false) }
  }

  const handleAddToTimeline = useCallback((media: MediaFile) => {
    const targetTrack = tracks.find(t => t.type === media.type) ?? tracks.find(t => media.type === 'image' && t.type === 'video')
    const trackId: string = targetTrack?.id || addTrack(media.type === 'image' ? 'video' : media.type)
    const trackClips = clips.filter(c => c.trackId === trackId)
    const nextStart = trackClips.length === 0 ? 0 : Math.max(...trackClips.map(c => c.startTime + c.duration))
    addClip({
      id: makeClipId(), mediaId: media.id, name: media.name.replace(/\.[^.]+$/, ''),
      type: media.type, trackId, startTime: nextStart, duration: media.duration,
      trimStart: 0, trimEnd: 0, volume: 1
    })
  }, [tracks, clips, addClip, addTrack])

  return (
    <div
      className="w-full h-full flex flex-col bg-transparent"
      onDrop={e => { e.preventDefault(); processFiles(e.dataTransfer.files) }}
      onDragOver={e => e.preventDefault()}
    >
      {/* Header Area */}
      <div className="px-4 pt-4 pb-3 shrink-0">

        {/* 🌐 Link Input Section */}
        <div className="flex flex-col gap-2">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
            Import from URL
          </div>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 group">
              <Globe 
                style={{ left: '12px' }}
                className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-zinc-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none z-10" 
              />
              <input
                type="text" 
                value={urlInput} 
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlImport()}
                placeholder="Paste URL here..."
                style={{ paddingLeft: '36px' }}
                className="w-full h-10 bg-zinc-900/80 border border-white/[0.08] rounded-xl pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 transition-all"
              />
            </div>
            <button
              onClick={handleUrlImport} disabled={isFetching || !urlInput.trim()}
              title="Import from URL"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${isFetching || !urlInput.trim() ? 'bg-zinc-800/80 text-zinc-600 cursor-not-allowed border border-white/5' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_4px_12px_rgba(79,70,229,0.3)]'}`}
            >
              {isFetching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Import className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 📥 Import Button Section (Shown below URL only when media list contains files) */}
        {mediaFiles.length > 0 && (
          <button
            onClick={() => !isUploading && inputRef.current?.click()}
            disabled={isUploading}
            className={`group flex flex-col items-center justify-center gap-2.5 w-full py-5 rounded-[24px] bg-indigo-600/5 hover:bg-indigo-600/10 border border-dashed border-indigo-500/25 text-indigo-400 font-bold transition-all duration-300 mt-4 ${isUploading ? 'cursor-wait opacity-70 animate-pulse' : 'active:scale-[0.97] hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]'}`}
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            ) : (
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold tracking-wide">
                {isUploading ? 'Importing assets...' : 'Import Files'}
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">
                Supports Video, Audio, Image (Max 50MB)
              </span>
            </div>
          </button>
        )}

        <input ref={inputRef} type="file" multiple accept="video/*,audio/*,image/*" className="hidden" onChange={e => e.target.files && processFiles(e.target.files)} />
      </div>

      {/* Media List */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2.5 custom-scrollbar">
        {mediaFiles.length === 0 ? (
          <div
            onClick={() => !isUploading && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-5 cursor-pointer rounded-[32px] border-2 border-dashed border-zinc-800/60 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-500/50 transition-all min-h-[280px] p-6 ${isUploading ? 'cursor-wait pointer-events-none opacity-60 animate-pulse' : ''}`}
          >
            <div className="w-20 h-20 rounded-full bg-zinc-800/30 flex items-center justify-center border border-white/5 shadow-inner">
              {isUploading ? (
                <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              ) : (
                <UploadCloud className="w-10 h-10 text-zinc-500" />
              )}
            </div>
            <div className="text-center space-y-1">
              <p className="text-[15px] font-bold text-zinc-400">
                {isUploading ? 'Importing assets...' : 'Add your media'}
              </p>
              <p className="text-xs text-zinc-500">
                {isUploading ? 'Processing files, please wait...' : 'Drag and drop files here to start'}
              </p>
              {!isUploading && (
                <p className="text-[10px] text-zinc-600 font-normal pt-1">
                  Supports Video, Audio, Image (Max 50MB)
                </p>
              )}
            </div>
          </div>
        ) : (
          mediaFiles.map(media => (
            <div key={media.id} draggable onDragStart={e => e.dataTransfer.setData('mediaId', media.id)} onDoubleClick={() => handleAddToTimeline(media)}
              className="flex items-center gap-4 p-3 rounded-2xl group cursor-pointer transition-all hover:bg-white/[0.03] bg-zinc-900/20 border border-white/5 hover:border-white/10 hover:shadow-xl"
            >
              <div className="w-20 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-zinc-950 relative border border-white/5 shadow-lg group-hover:scale-[1.05] transition-transform">
                {media.thumbnail ? <img src={media.thumbnail} className="w-full h-full object-cover" alt="" /> : 
                  media.type === 'audio' ? <Music className="w-6 h-6 text-emerald-500/60" /> : 
                  media.type === 'image' ? <ImageIcon className="w-6 h-6 text-amber-500/60" /> : <Film className="w-6 h-6 text-blue-500/60" />
                }
                <div className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-md rounded-md px-1.5 py-1">
                  {media.type === 'video' && <Film className="w-3 h-3 text-blue-400" />}
                  {media.type === 'audio' && <Music className="w-3 h-3 text-emerald-400" />}
                  {media.type === 'image' && <ImageIcon className="w-3 h-3 text-amber-400" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-zinc-300 truncate group-hover:text-white transition-colors">{media.name.replace(/\.[^.]+$/, '')}</p>
                <p className="text-[11px] font-mono text-zinc-600 mt-1">{fmtDur(media.duration)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                <button onClick={e => { e.stopPropagation(); handleAddToTimeline(media) }} className="w-8 h-8 rounded-full flex items-center justify-center text-indigo-400 hover:bg-indigo-500/20 transition-colors"><Plus className="w-4 h-4" /></button>
                <button onClick={e => { e.stopPropagation(); removeMedia(media.id, user!.id) }} className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {mediaFiles.length > 0 && (
        <div className="px-6 py-4 shrink-0 border-t border-white/5 flex justify-between items-center bg-black/20">
          <p className="text-[11px] font-bold text-zinc-600 uppercase tracking-widest">{mediaFiles.length} item{mediaFiles.length !== 1 ? 's' : ''}</p>
          <button onClick={handleCleanup} disabled={isCleaning} className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50 uppercase tracking-tight">
            {isCleaning ? 'Cleaning...' : <><Sparkles className="w-3.5 h-3.5" /> Clean Trash</>}
          </button>
        </div>
      )}
    </div>
  )
}
