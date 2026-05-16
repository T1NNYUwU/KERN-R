import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { saveMediaFile, deleteMediaFile, getMediaFile, getAllMediaIds } from './db'

export type ClipType = 'video' | 'audio' | 'image' | 'text'

export interface MediaFile {
  id: string
  name: string
  type: ClipType
  file?: File
  url: string        // Object URL
  duration: number   // seconds
  thumbnail?: string // Object URL for thumbnail
  width?: number
  height?: number
}

// Serializable version of MediaFile
export interface PersistedMediaFile extends Omit<MediaFile, 'file' | 'url'> {
  url?: string // Persistent URL (e.g. Supabase or Backend URL)
}

export interface Keyframe {
  id: string
  time: number // 0 to clip.duration (seconds from clip start)
  properties: {
    scaleX?: number
    scaleY?: number
    posX?: number
    posY?: number
    opacity?: number
    rotate?: number
    brightness?: number
    contrast?: number
    saturation?: number
  }
}

export interface Clip {
  id: string
  mediaId: string
  name: string
  type: ClipType
  trackId: string
  // Timeline position
  startTime: number   // where it starts on the global timeline (seconds)
  duration: number    // how long it plays (seconds)
  // Trim (source in/out)
  trimStart: number   // offset from media start (seconds)
  trimEnd: number     // offset from media end (seconds, 0 = play to end)
  // Volume
  volume: number      // 0.0 - 2.0
  // Transitions
  fadeIn?: number     // seconds, default 0
  fadeOut?: number    // seconds, default 0
  // Video / Image transform
  scaleX?: number      // % default 100
  scaleY?: number      // % default 100
  posX?: number        // % offset from center, default 0
  posY?: number        // % offset from center, default 0
  opacity?: number     // 0–100, default 100
  rotate?: number      // degrees, default 0
  // Color Adjustment
  brightness?: number  // 0-200, default 100
  contrast?: number    // 0-200, default 100
  saturation?: number  // 0-200, default 100
  // For text clips
  text?: string
  textColor?: string
  textSize?: number
  textX?: number
  textY?: number
  textFont?: string
  textFontFamily?: string
  textBold?: boolean
  textItalic?: boolean
  textShadow?: boolean
  textStroke?: number
  textStrokeColor?: string
  textBg?: string
  textAnimation?: 'none' | 'fade' | 'slide-up' | 'pop'
  // Keyframes
  keyframes?: Keyframe[]
}

export interface Track {
  id: string
  name: string
  type: 'video' | 'audio' | 'image' | 'text' | 'overlay'
  muted: boolean
  locked: boolean
  height: number
}

export interface HistoryEntry {
  tracks: Track[]
  clips: Clip[]
}

interface EditorStore {
  // Initialization
  isInitialized: boolean
  userId: string | null
  initStore: (userId: string) => Promise<void>

  // Media library
  mediaFiles: MediaFile[]
  persistedMediaMeta: PersistedMediaFile[]
  addMedia: (media: MediaFile, userId: string) => Promise<void>
  removeMedia: (id: string, userId: string) => Promise<void>

  // Tracks
  tracks: Track[]
  addTrack: (type: Track['type']) => string
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<Track>) => void

  // Clips
  clips: Clip[]
  addClip: (clip: Clip) => void
  removeClip: (id: string) => void
  updateClip: (id: string, updates: Partial<Clip>) => void
  splitClip: (clipId: string, atTime: number) => void
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void

  // Playback
  currentTime: number
  isPlaying: boolean
  setCurrentTime: (t: number) => void
  setIsPlaying: (p: boolean) => void

  // Selection
  selectedClipId: string | null
  setSelectedClipId: (id: string | null) => void

  // Timeline view
  zoom: number          // px per second
  setZoom: (z: number) => void
  scrollX: number
  setScrollX: (x: number) => void

  // Total duration
  totalDuration: number

  // History (Undo/Redo)
  history: HistoryEntry[]
  historyIndex: number
  pushHistory: () => void
  undo: () => void
  redo: () => void
}

const DEFAULT_TRACK_HEIGHT = 56
const MAIN_TRACK_HEIGHT = 72

export const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      isInitialized: false,
      userId: null,
      initStore: async (userId: string) => {
        // Handle User Switch: If the stored userId is different, clear the state
        if (get().userId && get().userId !== userId) {
          set({
            tracks: [],
            clips: [],
            mediaFiles: [],
            persistedMediaMeta: [],
            totalDuration: 10,
            selectedClipId: null,
            history: [],
            historyIndex: -1,
            isInitialized: false
          })
        }

        if (get().isInitialized && get().userId === userId) return
        
        // Restore media files from IndexedDB
        const { persistedMediaMeta } = get()
        const loadedMedia: MediaFile[] = []
        
        for (const meta of persistedMediaMeta) {
          try {
            const file = await getMediaFile(userId, meta.id)
            if (file) {
              const url = (meta.url && meta.url.startsWith('http')) ? meta.url : URL.createObjectURL(file)
              loadedMedia.push({ ...meta, file, url })
            } else if (meta.url && meta.url.startsWith('http')) {
              loadedMedia.push({
                ...meta,
                file: new File([], meta.name),
                url: meta.url
              })
            }
          } catch (e) {
            console.error('Failed to load media file', meta.id, e)
          }
        }
        
        // Self-Healing: Fix duplicate track/clip IDs in persisted state
        const { tracks, clips } = get()
        const trackIds = new Set()
        const clipIds = new Set()
        let hasChanges = false

        const fixedTracks = tracks.map(t => {
          if (trackIds.has(t.id)) {
            hasChanges = true
            return { ...t, id: `track-${t.type}-${crypto.randomUUID().slice(0, 8)}` }
          }
          trackIds.add(t.id)
          return t
        })

        const fixedClips = clips.map(c => {
          if (clipIds.has(c.id)) {
            hasChanges = true
            return { ...c, id: `clip-${crypto.randomUUID()}` }
          }
          clipIds.add(c.id)
          // Also update trackId if it changed
          const oldTrackIdx = tracks.findIndex(t => t.id === c.trackId)
          if (oldTrackIdx !== -1 && fixedTracks[oldTrackIdx].id !== c.trackId) {
            return { ...c, trackId: fixedTracks[oldTrackIdx].id }
          }
          return c
        })

        if (hasChanges) {
          set({ tracks: fixedTracks, clips: fixedClips })
        }

        set({ mediaFiles: loadedMedia, isInitialized: true, userId })
      },

      mediaFiles: [],
      persistedMediaMeta: [],
      addMedia: async (media, userId) => {
        if (media.file && media.file.size > 0) {
          await saveMediaFile(userId, media.id, media.file)
        }
        set(s => {
          const { file, ...metaWithUrl } = media
          const meta: PersistedMediaFile = {
            ...metaWithUrl,
            url: media.url.startsWith('http') ? media.url : undefined
          }
          return {
            mediaFiles: [...s.mediaFiles, media],
            persistedMediaMeta: [...s.persistedMediaMeta, meta]
          }
        })
      },
      removeMedia: async (id, userId) => {
        await deleteMediaFile(userId, id)
        set(s => {
          const mediaToRemove = s.mediaFiles.find(m => m.id === id)
          if (mediaToRemove?.url) URL.revokeObjectURL(mediaToRemove.url)

          return {
            mediaFiles: s.mediaFiles.filter(f => f.id !== id),
            persistedMediaMeta: s.persistedMediaMeta.filter(m => m.id !== id)
          }
        })
      },

      tracks: [],
  addTrack: (type) => {
    const id = `track-${type}-${crypto.randomUUID().slice(0, 8)}`
    const name = type === 'video' ? 'Video' : type === 'audio' ? 'Audio' : type === 'text' ? 'Text' : 'Overlay'
    const track: Track = { id, name, type, muted: false, locked: false, height: DEFAULT_TRACK_HEIGHT }
    set(s => ({ tracks: [...s.tracks, track] }))
    return id
  },
  removeTrack: (id) => set(s => ({
    tracks: s.tracks.filter(t => t.id !== id),
    clips: s.clips.filter(c => c.trackId !== id),
  })),
  updateTrack: (id, updates) => set(s => ({
    tracks: s.tracks.map(t => t.id === id ? { ...t, ...updates } : t),
  })),

  clips: [],
  addClip: (clip) => {
    get().pushHistory()
    set(s => {
      let newClips = [...s.clips, clip]
      newClips = applyMagneticLogic(newClips, s.tracks)
      return {
        clips: newClips,
        totalDuration: calcDuration(newClips),
      }
    })
  },
  removeClip: (id) => {
    get().pushHistory()
    set(s => {
      let newClips = s.clips.filter(c => c.id !== id)
      newClips = applyMagneticLogic(newClips, s.tracks)
      return {
        clips: newClips,
        selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
        totalDuration: calcDuration(newClips),
      }
    })
  },
  updateClip: (id, updates) => {
    set(s => {
      let newClips = s.clips.map(c => c.id === id ? { ...c, ...updates } : c)
      newClips = applyMagneticLogic(newClips, s.tracks)
      return { clips: newClips, totalDuration: calcDuration(newClips) }
    })
  },
  splitClip: (clipId, atTime) => {
    const { clips, tracks } = get()
    const clip = clips.find(c => c.id === clipId)
    if (!clip) return
    const splitLocal = atTime - clip.startTime // where in the clip to cut
    if (splitLocal <= 0.1 || splitLocal >= clip.duration - 0.1) return

    get().pushHistory()

    const leftId = makeClipId()
    const rightId = makeClipId()

    const left: Clip = { ...clip, id: leftId, duration: splitLocal }
    const right: Clip = {
      ...clip, id: rightId,
      startTime: clip.startTime + splitLocal,
      duration: clip.duration - splitLocal,
      trimStart: clip.trimStart + splitLocal,
    }

    set(s => {
      let newClips = s.clips.filter(c => c.id !== clipId).concat([left, right])
      newClips = applyMagneticLogic(newClips, s.tracks)
      return { clips: newClips, selectedClipId: rightId, totalDuration: calcDuration(newClips) }
    })
  },
  moveClip: (clipId, newStartTime, newTrackId) => {
    get().pushHistory()
    set(s => {
      let newClips = s.clips.map(c =>
        c.id === clipId
          ? { ...c, startTime: Math.max(0, newStartTime), ...(newTrackId ? { trackId: newTrackId } : {}) }
          : c
      )
      newClips = applyMagneticLogic(newClips, s.tracks)
      return { clips: newClips, totalDuration: calcDuration(newClips) }
    })
  },

  currentTime: 0,
  isPlaying: false,
  setCurrentTime: (t) => set({ currentTime: t }),
  setIsPlaying: (p) => set({ isPlaying: p }),

  selectedClipId: null,
  setSelectedClipId: (id) => set({ selectedClipId: id }),

  zoom: 80,
  setZoom: (z) => set({ zoom: Math.max(20, Math.min(400, z)) }),
  scrollX: 0,
  setScrollX: (x) => set({ scrollX: Math.max(0, x) }),

  totalDuration: 30,

  history: [],
  historyIndex: -1,
  pushHistory: () => {
    const { tracks, clips, history, historyIndex } = get()
    const entry: HistoryEntry = {
      tracks: JSON.parse(JSON.stringify(tracks)),
      clips: JSON.parse(JSON.stringify(clips)),
    }
    const newHistory = history.slice(0, historyIndex + 1).concat([entry])
    set({ history: newHistory.slice(-50), historyIndex: Math.min(newHistory.length - 1, 49) })
  },
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const entry = history[historyIndex - 1]
    set({ ...entry, historyIndex: historyIndex - 1, totalDuration: calcDuration(entry.clips) })
  },
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    set({ ...entry, historyIndex: historyIndex + 1, totalDuration: calcDuration(entry.clips) })
  },
}), {
  name: 'editor-storage-v3-multiuser',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    tracks: state.tracks,
    clips: state.clips,
    totalDuration: state.totalDuration,
    persistedMediaMeta: state.persistedMediaMeta,
    userId: state.userId
  })
}))

function applyMagneticLogic(clips: Clip[], tracks: Track[]): Clip[] {
  // Disabled magnetic logic to allow free-form dragging
  // This solves the bug where users cannot move a single clip
  return clips;
}

function calcDuration(clips: Clip[]): number {
  if (clips.length === 0) return 10
  return Math.max(10, ...clips.map(c => c.startTime + c.duration))
}

export function makeClipId() { return `clip-${crypto.randomUUID()}` }
