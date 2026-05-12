import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { Clip, MediaFile } from './store'

let ffmpeg: FFmpeg | null = null

export async function getFFmpeg() {
  if (ffmpeg) return ffmpeg

  ffmpeg = new FFmpeg()
  
  // Set up progress logging
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message)
  })

  // Load ffmpeg.wasm
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  return ffmpeg
}

export async function exportVideo(
  clips: Clip[],
  mediaFiles: MediaFile[],
  onProgress: (progress: number) => void
): Promise<string> {
  const ff = await getFFmpeg()

  // Find all video clips, sort by start time
  const videoClips = clips
    .filter(c => c.type === 'video')
    .sort((a, b) => a.startTime - b.startTime)

  if (videoClips.length === 0) {
    throw new Error('No video clips to export')
  }

  onProgress(10) // Setup phase

  // Write all needed files to FFmpeg FS
  for (const clip of videoClips) {
    const media = mediaFiles.find(m => m.id === clip.mediaId)
    if (!media) continue
    
    // Check if already written
    try {
      await ff.readFile(media.id + '.mp4')
    } catch {
      // File doesn't exist yet, write it
      const fileData = await fetchFile(media.file)
      await ff.writeFile(media.id + '.mp4', fileData)
    }
  }

  onProgress(30)

  // Build FFmpeg command for simple concat
  // Assuming all clips are standard 1080p for now or we just concat them using a simple filter
  let filterComplex = ''
  let inputs: string[] = []

  videoClips.forEach((clip, i) => {
    inputs.push('-i', `${clip.mediaId}.mp4`)
    const trimStart = clip.trimStart || 0
    const duration = clip.duration
    
    // We scale everything to 1920x1080 to ensure concat works smoothly
    filterComplex += `[${i}:v]trim=start=${trimStart}:duration=${duration},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v${i}]; `
    filterComplex += `[${i}:a]atrim=start=${trimStart}:duration=${duration},asetpts=PTS-STARTPTS[a${i}]; `
  })

  const vTracks = videoClips.map((_, i) => `[v${i}][a${i}]`).join('')
  filterComplex += `${vTracks}concat=n=${videoClips.length}:v=1:a=1[v][a]`

  const outputName = 'output.mp4'

  // Hook progress
  ff.on('progress', ({ progress }) => {
    // scale 30 to 90
    onProgress(30 + Math.floor(progress * 60))
  })

  // Execute FFmpeg
  await ff.exec([
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[v]',
    '-map', '[a]',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-y',
    outputName
  ])

  onProgress(95)

  // Read the result
  const data = await ff.readFile(outputName)
  const blob = new Blob([data as any], { type: 'video/mp4' })
  const url = URL.createObjectURL(blob)

  onProgress(100)

  return url
}
