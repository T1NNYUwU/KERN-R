'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { MediaFile } from '../../lib/store'

interface WaveformProps {
  media: MediaFile
  color: string
  width: number
  height: number
  trimStart: number
  duration: number
}

// Simple cache for peak data to avoid re-decoding the same file multiple times
const peakCache = new Map<string, number[]>()

export default function Waveform({ media, color, width, height, trimStart, duration }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [peaks, setPeaks] = useState<number[] | null>(peakCache.get(media.id) || null)

  useEffect(() => {
    if (peaks) return
    if (!media.file) return

    let isMounted = true

    const generatePeaks = async () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const arrayBuffer = await media.file.arrayBuffer()
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
        
        const channelData = audioBuffer.getChannelData(0)
        const sampleSize = 100 // number of samples per peak
        const totalPeaks = Math.floor(channelData.length / sampleSize)
        const result: number[] = []

        for (let i = 0; i < totalPeaks; i++) {
          let max = 0
          for (let j = 0; j < sampleSize; j++) {
            const val = Math.abs(channelData[i * sampleSize + j])
            if (val > max) max = val
          }
          result.push(max)
        }

        if (isMounted) {
          peakCache.set(media.id, result)
          setPeaks(result)
        }
        audioCtx.close()
      } catch (err) {
        console.error('Failed to generate waveform', err)
      }
    }

    generatePeaks()
    return () => { isMounted = false }
  }, [media.id, media.file, peaks])

  useEffect(() => {
    if (!peaks || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = color
    
    // Calculate which portion of the peaks to show based on trimStart and duration
    const totalDuration = media.duration || 1
    const startIdx = Math.floor((trimStart / totalDuration) * peaks.length)
    const endIdx = Math.floor(((trimStart + duration) / totalDuration) * peaks.length)
    const visiblePeaks = peaks.slice(startIdx, endIdx)

    const barWidth = 2
    const gap = 1
    const step = Math.max(1, Math.floor(visiblePeaks.length / (width / (barWidth + gap))))

    for (let i = 0; i < width; i += (barWidth + gap)) {
      const peakIdx = Math.floor((i / width) * visiblePeaks.length)
      const val = visiblePeaks[peakIdx] || 0
      const barH = val * height * 0.8
      ctx.fillRect(i, (height - barH) / 2, barWidth, barH)
    }
  }, [peaks, width, height, color, trimStart, duration, media.duration])

  return (
    <canvas 
      ref={canvasRef} 
      style={{ width, height, opacity: 0.6 }} 
      className="pointer-events-none"
    />
  )
}
