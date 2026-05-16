'use client'
import { useState } from 'react'
import { useEditorStore } from '../../lib/store'
import { 
  Type, AlignLeft, Palette, Image as ImageIcon,
  Scissors, Zap, Loader2
} from 'lucide-react'

const FONT_FAMILIES = [
  'Inter', 'System', 'Roboto', 'Kanit', 'Prompt', 'Sarabun',
  'Noto Sans Thai', 'IBM Plex Sans Thai',
  'Playfair Display', 'Montserrat', 'Poppins', 'Oswald',
]

function SliderRow({ 
  label, value, min, max, step = 1, unit = '', 
  onChange, color = 'indigo'
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  color?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium text-[#c1c1c8]">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1 h-1 bg-[#25252b] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        />
        <div className="w-14 h-7 bg-[#1a1a1f] border border-[#25252b] rounded flex items-center justify-center text-[11px] font-mono text-white">
          {typeof value === 'number' ? value.toFixed(step < 1 ? 1 : 0) : value}{unit}
        </div>
      </div>
    </div>
  )
}

export default function Inspector() {
  const clip = useEditorStore(s => s.clips.find(c => c.id === s.selectedClipId))
  const { updateClip, splitClip, removeClip, clips } = useEditorStore()
  const mediaFiles = useEditorStore(s => s.mediaFiles)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mainTab, setMainTab] = useState('Text')
  const [subTab, setSubTab] = useState('Basic')

  if (!clip) {
    return (
      <div className="h-full bg-[#121215] flex flex-col items-center justify-center text-center px-4 opacity-50">
        <div className="w-12 h-12 rounded-full bg-[#1a1a1f] flex items-center justify-center mb-3 border border-[#25252b]">
          <Move className="w-5 h-5 text-[#8a8a93]" />
        </div>
        <p className="text-[13px] font-medium text-[#8a8a93] leading-relaxed">
          Select a clip on the timeline<br/>to edit its properties
        </p>
      </div>
    )
  }

  const u = (updates: Parameters<typeof updateClip>[1]) => updateClip(clip.id, updates)

  const isMedia = clip.type === 'video' || clip.type === 'image'
  const isText  = clip.type === 'text'
  const isAudio = clip.type === 'audio'

  // CapCut style main tabs
  const mainTabs = isText ? ['Text', 'Animation', 'Tracking'] : 
                   isMedia ? ['Video', 'Audio', 'Animation', 'Adjustment'] : 
                   ['Audio', 'Speed']

  return (
    <div className="flex flex-col h-full bg-[#121215] text-white">
      
      {/* ── Main Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center px-4 pt-2 border-b border-[#25252b] overflow-x-auto custom-scrollbar shrink-0">
        {mainTabs.map(tab => (
          <button
            key={tab}
            onClick={() => { setMainTab(tab); setSubTab('Basic') }}
            className={`px-4 py-2 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${
              mainTab === tab ? 'text-white border-white' : 'text-[#8a8a93] border-transparent hover:text-[#c1c1c8]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* ── Sub Tabs (If Text) ───────────────────────────────────────────── */}
        {mainTab === 'Text' && isText && (
          <div className="flex items-center mx-4 mt-4 bg-[#1a1a1f] p-1 rounded-lg">
            {['Basic', 'Bubble', 'Effects'].map(tab => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
                  subTab === tab ? 'bg-[#2a2a35] text-white' : 'text-[#8a8a93] hover:text-[#c1c1c8]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-6">

          {/* ── BASIC TAB ────────────────────────────────────────────────── */}
          {subTab === 'Basic' && (
            <>
              {/* Text Editor */}
              {isText && mainTab === 'Text' && (
                <div className="space-y-4">
                  <textarea
                    value={clip.text ?? ''}
                    onChange={e => u({ text: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-[#25252b] rounded-lg p-3 text-[13px] text-white focus:outline-none focus:border-indigo-500/50 resize-none h-24 transition-colors"
                    placeholder="Enter text..."
                  />

                  {/* Font & Size */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[11px] text-[#8a8a93] font-medium block mb-1.5">Font</label>
                      <select
                        value={clip.textFontFamily ?? 'System'}
                        onChange={e => u({ textFontFamily: e.target.value })}
                        className="w-full h-8 bg-[#1a1a1f] border border-[#25252b] rounded px-2 text-[12px] text-white focus:outline-none"
                      >
                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="w-16">
                      <label className="text-[11px] text-[#8a8a93] font-medium block mb-1.5">Size</label>
                      <input
                        type="number"
                        value={clip.textSize ?? 15}
                        onChange={e => u({ textSize: parseInt(e.target.value) || 15 })}
                        className="w-full h-8 bg-[#1a1a1f] border border-[#25252b] rounded px-2 text-[12px] text-center text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Styles */}
                  <div>
                    <label className="text-[11px] text-[#8a8a93] font-medium block mb-1.5">Style</label>
                    <div className="flex gap-2">
                      <button onClick={() => u({ textBold: !clip.textBold })} className={`w-8 h-8 rounded flex items-center justify-center font-bold font-serif transition-colors ${clip.textBold ? 'bg-[#3b82f6] text-white' : 'bg-[#1a1a1f] text-[#c1c1c8] hover:bg-[#25252b]'}`}>B</button>
                      <button onClick={() => u({ textItalic: !clip.textItalic })} className={`w-8 h-8 rounded flex items-center justify-center font-serif italic transition-colors ${clip.textItalic ? 'bg-[#3b82f6] text-white' : 'bg-[#1a1a1f] text-[#c1c1c8] hover:bg-[#25252b]'}`}>I</button>
                      
                      <div className="w-px h-5 bg-[#25252b] self-center mx-1" />
                      
                      <div className="relative w-8 h-8 rounded overflow-hidden border border-[#25252b]">
                        <input type="color" value={clip.textColor ?? '#ffffff'} onChange={e => u({ textColor: e.target.value })} className="absolute -inset-2 w-12 h-12 cursor-pointer" />
                      </div>
                    </div>
                  </div>

                  {/* Stroke (Outline) */}
                  <div className="pt-2 border-t border-[#25252b]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-medium">Stroke</span>
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-8 h-8 rounded overflow-hidden border border-[#25252b]">
                        <input type="color" value={clip.textStrokeColor ?? '#000000'} onChange={e => u({ textStrokeColor: e.target.value })} className="absolute -inset-2 w-12 h-12 cursor-pointer" />
                      </div>
                      <div className="flex-1">
                        <SliderRow label="" value={clip.textStroke ?? 0} min={0} max={20} unit="px" onChange={v => u({ textStroke: v })} />
                      </div>
                    </div>
                  </div>
                  
                  {/* Background */}
                  <div className="pt-2 border-t border-[#25252b]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] font-medium">Background</span>
                      <button onClick={() => u({ textBg: clip.textBg ? '' : 'rgba(0,0,0,0.8)' })} className={`w-8 h-4 rounded-full transition-colors relative ${clip.textBg ? 'bg-[#3b82f6]' : 'bg-[#3a3a42]'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${clip.textBg ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    {clip.textBg && (
                      <div className="relative w-8 h-8 rounded overflow-hidden border border-[#25252b]">
                        <input type="color" value={clip.textBg.startsWith('#') ? clip.textBg : '#000000'} onChange={e => u({ textBg: e.target.value })} className="absolute -inset-2 w-12 h-12 cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Video Transform */}
              {isMedia && mainTab === 'Video' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-white">Basic settings</span>
                    <button onClick={() => u({ scaleX: 100, scaleY: 100, posX: 0, posY: 0, rotate: 0 })} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title="Reset">
                      <RotateCcw className="w-3 h-3 text-[#8a8a93]" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <SliderRow label="Scale" value={clip.scaleX ?? 100} min={10} max={400} unit="%" onChange={v => u({ scaleX: v, scaleY: v })} />
                    <SliderRow label="Position X" value={clip.posX ?? 0} min={-100} max={100} unit="%" onChange={v => u({ posX: v })} />
                    <SliderRow label="Position Y" value={clip.posY ?? 0} min={-100} max={100} unit="%" onChange={v => u({ posY: v })} />
                    <SliderRow label="Rotate" value={clip.rotate ?? 0} min={-180} max={180} unit="°" onChange={v => u({ rotate: v })} />
                  </div>

                  <div className="pt-4 border-t border-[#25252b] space-y-4">
                    <span className="text-[13px] font-medium text-white">Blend</span>
                    <SliderRow label="Opacity" value={clip.opacity ?? 100} min={0} max={100} unit="%" onChange={v => u({ opacity: v })} />
                  </div>
                </div>
              )}

              {/* Audio Volume & Smart Cut */}
              {(isAudio || (isMedia && mainTab === 'Audio')) && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <span className="text-[13px] font-medium text-white">Volume</span>
                    <SliderRow label="Volume" value={clip.volume ?? 0} min={-60} max={20} unit="dB" onChange={v => u({ volume: v })} />
                  </div>

                  <div className="pt-6 border-t border-[#25252b] space-y-4">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Zap className="w-4 h-4 fill-current" />
                      <span className="text-[13px] font-bold uppercase tracking-wider">AI Smart Tools</span>
                    </div>
                    
                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Smart Cut automatically detects and removes silent gaps in your video or audio, making it more engaging.
                      </p>
                      <button
                        disabled={isProcessing}
                        onClick={async () => {
                          const media = mediaFiles.find(m => m.id === clip.mediaId)
                          if (!media || !media.file) return
                          setIsProcessing(true)
                          try {
                            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
                            const buffer = await media.file.arrayBuffer()
                            const audioBuffer = await audioCtx.decodeAudioData(buffer)
                            const data = audioBuffer.getChannelData(0)
                            
                            const sampleRate = audioBuffer.sampleRate
                            const threshold = 0.02 // 2% amplitude
                            const minSilenceLen = 0.5 * sampleRate // 0.5 seconds
                            
                            const segments: { start: number; end: number }[] = []
                            let inSound = false
                            let soundStart = 0
                            let silenceCount = 0
                            
                            for (let i = 0; i < data.length; i++) {
                              const amplitude = Math.abs(data[i])
                              if (amplitude > threshold) {
                                if (!inSound) {
                                  inSound = true
                                  soundStart = i
                                }
                                silenceCount = 0
                              } else {
                                if (inSound) {
                                  silenceCount++
                                  if (silenceCount > minSilenceLen) {
                                    segments.push({ start: soundStart / sampleRate, end: (i - silenceCount) / sampleRate })
                                    inSound = false
                                  }
                                }
                              }
                            }
                            if (inSound) segments.push({ start: soundStart / sampleRate, end: data.length / sampleRate })
                            
                            // Filter segments based on clip's trim
                            const clipSourceStart = clip.trimStart
                            const clipSourceEnd = clip.trimStart + clip.duration
                            const activeSegments = segments.filter(s => s.end > clipSourceStart && s.start < clipSourceEnd)

                            if (activeSegments.length <= 1) {
                              alert("No significant silence found to cut.")
                            } else {
                              // Perform cuts from end to start to avoid index/time shifts
                              // Actually, for KERN-R, it's easier to just create NEW clips and remove the old one
                              // because we have a free-form timeline currently.
                              
                              let currentTimelineX = clip.startTime
                              activeSegments.forEach((seg, idx) => {
                                const segStart = Math.max(seg.start, clipSourceStart)
                                const segEnd = Math.min(seg.end, clipSourceEnd)
                                const dur = segEnd - segStart
                                
                                if (dur > 0.1) {
                                  const newClip = {
                                    ...clip,
                                    id: `clip-${Date.now()}-${idx}`,
                                    startTime: currentTimelineX,
                                    duration: dur,
                                    trimStart: segStart
                                  }
                                  useEditorStore.getState().addClip(newClip)
                                  currentTimelineX += dur + 0.1 // small gap or tight? tight is better for CapCut
                                  currentTimelineX -= 0.1 // make it tight
                                }
                              })
                              removeClip(clip.id)
                            }
                            audioCtx.close()
                          } catch (e) {
                            console.error(e)
                            alert("Smart Cut failed")
                          } finally {
                            setIsProcessing(false)
                          }
                        }}
                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                          isProcessing 
                            ? 'bg-zinc-800 text-zinc-600' 
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 active:scale-95'
                        }`}
                      >
                        {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
                        {isProcessing ? 'Processing...' : 'Apply Smart Cut'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </>
          )}

          {/* ── ANIMATION TAB ──────────────────────────────────────────────── */}
          {mainTab === 'Animation' && (
             <div className="space-y-4">
                <span className="text-[13px] font-medium text-white">In / Out Animations</span>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => u({ textAnimation: 'none' })} className={`py-3 rounded-lg border text-[12px] ${clip.textAnimation === 'none' || !clip.textAnimation ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#25252b] text-[#c1c1c8] hover:border-[#3a3a42]'}`}>None</button>
                  <button onClick={() => u({ textAnimation: 'fade' })} className={`py-3 rounded-lg border text-[12px] ${clip.textAnimation === 'fade' ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#25252b] text-[#c1c1c8] hover:border-[#3a3a42]'}`}>Fade In</button>
                  <button onClick={() => u({ textAnimation: 'slide-up' })} className={`py-3 rounded-lg border text-[12px] ${clip.textAnimation === 'slide-up' ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#25252b] text-[#c1c1c8] hover:border-[#3a3a42]'}`}>Slide Up</button>
                  <button onClick={() => u({ textAnimation: 'pop' })} className={`py-3 rounded-lg border text-[12px] ${clip.textAnimation === 'pop' ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/10' : 'border-[#25252b] text-[#c1c1c8] hover:border-[#3a3a42]'}`}>Pop In</button>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  )
}
