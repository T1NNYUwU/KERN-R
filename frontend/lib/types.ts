// Shared types for Video Ranking Studio

export const getBackendUrl = () => {
  let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005';

  if (typeof window !== 'undefined') {
    // Force backend port 3005 in local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3005';
    }
  }

  // Auto trim trailing slash to prevent double slash errors (e.g. //api/videos/health)
  return backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
};

export interface SubTitleItem {
  id: string
  text: string
  fontSize: number
  color: string
  x: number
  y: number
}

export interface OverlayImageItem {
  id: string
  path: string
  w: number
  h: number
  x: number
  y: number
}

export interface ClipItem {
  id: string
  link: string
  clipTitle: string
  clipTitleFontSize: number
  clipTitleColor: string
  clipTitleStroke: number
  clipTitleStrokeColor: string
  rankColor: string
  script: string
  audioMode: 'ai' | 'clip' | 'music'
  musicPath: string
  volume?: number
  timelineStart?: number
  startTime: number
  endTime: number
  textAnimation: 'fade' | 'slide' | 'zoom' | 'pop'
  videoHeightPct: number
  preview: { thumbnail: string; title: string; duration: number; uploader?: string; videoUrl?: string } | null
  timelineItems?: TimelineItem[]
  voice?: string
  ttsEngine?: string
}

export interface VideoSettings {
  headerText: string
  headerFontSize: number
  headerColor: string
  headerX: number
  headerY: number
  headerAlign: 'left' | 'center' | 'right'

  subTitles: SubTitleItem[]
  overlayImages: OverlayImageItem[]

  bgColor: string
  handleText: string
  handleColor: string
  handleFontSize: number
  handleX: number
  handleY: number

  rankFontSize: number
  rankNumberColor: string
  rankX: number
  rankY: number
  videoY: number

  globalMusicPath?: string
  globalMusicVolume?: number
  globalTimeline?: TimelineItem[]
}

export const makeItem = (): ClipItem => ({
  id: Math.random().toString(36).slice(2, 10),
  link: '', clipTitle: '', clipTitleFontSize: 52, clipTitleColor: '#ffffff',
  clipTitleStroke: 0, clipTitleStrokeColor: '#000000',
  rankColor: '#FFD700', script: '', audioMode: 'ai', musicPath: '',
  volume: 1.0, timelineStart: 0,
  startTime: 0, endTime: 30, textAnimation: 'fade', videoHeightPct: 70, preview: null,
  voice: 'th-TH-NiwatNeural', ttsEngine: 'edge'
})

export const makeSubTitle = (): SubTitleItem => ({
  id: Math.random().toString(36).slice(2, 10),
  text: 'New Subtitle',
  fontSize: 50,
  color: '#ffffff',
  x: 540,
  y: 300,
})

export const makeOverlayImage = (path: string): OverlayImageItem => ({
  id: Math.random().toString(36).slice(2, 10),
  path,
  w: 400,
  h: 400,
  x: 540,
  y: 960,
})

export interface TimelineItem {
  id: string
  type: 'video' | 'audio' | 'sfx' | 'image' | 'text'
  startTime: number // seconds from start of clip/project
  duration: number
  content: any // path, text, etc.
  layer: number
  name: string
  animation?: string
  volume?: number
  x?: number
  y?: number
}

export interface Track {
  id: string
  name: string
  type: 'video' | 'audio' | 'overlay'
  items: TimelineItem[]
}

export const makeTimelineItem = (type: TimelineItem['type'], name: string): TimelineItem => ({
  id: Math.random().toString(36).slice(2, 10),
  type,
  startTime: 0,
  duration: 2,
  content: '',
  layer: 1,
  name,
})

export const defaultSettings = (): VideoSettings => ({
  headerText: 'Top 5',
  headerFontSize: 80,
  headerColor: '#ffffff',
  headerX: 540,
  headerY: 120,
  headerAlign: 'center',

  subTitles: [],
  overlayImages: [],

  bgColor: '#0a0a0a',
  handleText: '',
  handleColor: '#ffffff',
  handleFontSize: 32,
  handleX: 540,
  handleY: 1820,

  rankFontSize: 100,
  rankNumberColor: '#FFD700',
  rankX: 40,
  rankY: 0,
  videoY: -1,

  globalMusicPath: '',
  globalMusicVolume: 20,
})
