'use client'
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'

interface TimelineProps {
  start: number
  end: number
  maxDuration: number
  onChange: (start: number, end: number) => void
}

export default function Timeline({ start = 0, end = 0, maxDuration = 30, onChange }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(60) // Pixels per second
  const [isDragging, setIsDragging] = useState<'start' | 'end' | 'scroll' | null>(null)

  const handleMouseDown = (type: 'start' | 'end' | 'scroll', e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(type)
  }

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const scrollLeft = containerRef.current.scrollLeft
      const x = e.clientX - rect.left + scrollLeft
      const time = Math.max(0, Math.min(maxDuration, x / zoom))

      if (isDragging === 'start') {
        onChange(Math.min(time, end - 0.01), end)
      } else if (isDragging === 'end') {
        onChange(start, Math.max(time, start + 0.01))
      }
    }

    const handleMouseUp = () => setIsDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, start, end, maxDuration, zoom, onChange])

  const totalWidth = useMemo(() => maxDuration * zoom, [maxDuration, zoom])
  
  // Ticks calculation
  const ticks = useMemo(() => {
    const arr = []
    const step = zoom < 30 ? 1 : zoom < 100 ? 0.5 : 0.1
    for (let i = 0; i <= maxDuration; i += step) {
      arr.push(i)
    }
    return arr
  }, [maxDuration, zoom])

  return (
    <div className="space-y-4 p-1">
      {/* Header Info */}
      <div className="flex justify-between items-center">
        <div className="flex gap-6 font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-600 uppercase font-bold">Start</span>
            <span className="text-green-400 font-black text-sm">{start.toFixed(2)}s</span>
          </div>
          <div className="flex flex-col border-x border-white/10 px-6">
            <span className="text-[10px] text-zinc-600 uppercase font-bold">Duration</span>
            <span className="text-white font-black text-sm">{(end - start).toFixed(2)}s</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-600 uppercase font-bold">End</span>
            <span className="text-red-400 font-black text-sm">{end.toFixed(2)}s</span>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center bg-zinc-900 border border-white/10 rounded-xl p-1 shadow-xl">
          <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 font-bold transition-colors">－</button>
          <div className="px-3 flex flex-col items-center">
             <span className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Zoom</span>
          </div>
          <button onClick={() => setZoom(z => Math.min(600, z + 10))} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-zinc-400 font-bold transition-colors">＋</button>
        </div>
      </div>

      {/* Main Timeline Wrapper */}
      <div className="relative bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div 
          ref={containerRef}
          className="relative h-28 overflow-x-auto select-none no-scrollbar"
          style={{ cursor: isDragging ? 'grabbing' : 'auto' }}
        >
          <div className="relative h-full pt-10" style={{ width: totalWidth, minWidth: '100%' }}>
            {/* Ruler Ticks */}
            <div className="absolute inset-0 flex items-end pb-0 pointer-events-none">
              {ticks.map(t => {
                const isSecond = Math.abs(t - Math.round(t)) < 0.01
                const isHalf = Math.abs(t % 0.5) < 0.01
                return (
                  <div 
                    key={t} 
                    className="absolute bottom-0 border-l"
                    style={{ 
                      left: t * zoom, 
                      height: isSecond ? '40px' : isHalf ? '25px' : '12px',
                      borderColor: isSecond ? 'rgba(255,255,255,0.7)' : isHalf ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
                      borderLeftWidth: isSecond ? '3px' : '2px'
                    }}
                  >
                    {isSecond && (
                      <span className="absolute -top-10 -left-4 text-[10px] font-black text-zinc-500 whitespace-nowrap">
                        {Math.round(t)}s
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Active Range Overlay */}
            <div 
              className="absolute top-0 bottom-0 bg-blue-500/10 border-x border-blue-500/20"
              style={{ left: start * zoom, width: (end - start) * zoom }}
            />

            {/* Start Handle */}
            <div 
              onMouseDown={(e) => handleMouseDown('start', e)}
              className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize z-40 group"
              style={{ left: start * zoom }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(34,197,94,0.5)] z-50 group-hover:scale-125 transition-transform" />
              <div className="absolute inset-y-0 left-1/2 w-[2px] bg-green-500" />
            </div>

            {/* End Handle */}
            <div 
              onMouseDown={(e) => handleMouseDown('end', e)}
              className="absolute top-0 bottom-0 w-8 -ml-4 cursor-col-resize z-40 group"
              style={{ left: end * zoom }}
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-[0_0_10px_rgba(239,68,68,0.5)] z-50 group-hover:scale-125 transition-transform" />
              <div className="absolute inset-y-0 left-1/2 w-[2px] bg-red-500" />
            </div>
          </div>
        </div>

        {/* Custom scrollbar area - separated */}
        <div className="h-4 bg-zinc-900 border-t border-white/5 flex items-center px-1">
           <div className="w-full h-1.5 bg-white/5 rounded-full" />
        </div>
      </div>
      <p className="text-[9px] text-zinc-600 text-center font-medium opacity-50 uppercase tracking-tighter">↔ Drag circles at the top to adjust range</p>
    </div>
  )
}
