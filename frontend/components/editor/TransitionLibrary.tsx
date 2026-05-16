'use client'
import { useEditorStore, makeClipId } from '../../lib/store'
import { Layers, Zap, Plus, Play } from 'lucide-react'

const TRANSITIONS = [
  { id: 'fade', name: 'Fade', duration: 0.5 },
  { id: 'cross', name: 'Cross Dissolve', duration: 1.0 },
  { id: 'slide-left', name: 'Slide Left', duration: 0.6 },
  { id: 'zoom-in', name: 'Zoom In', duration: 0.8 },
  { id: 'white-out', name: 'White Out', duration: 0.4 },
]

export default function TransitionLibrary() {
  const { selectedClipId, updateClip, clips, currentTime } = useEditorStore()
  
  const applyTransition = (t: typeof TRANSITIONS[0]) => {
    if (!selectedClipId) {
      alert('Please select a clip on the timeline first')
      return
    }
    
    // For now, transitions are simplified as Fade In/Out or Keyframe presets
    if (t.id === 'fade') {
      updateClip(selectedClipId, { fadeIn: t.duration })
    } else if (t.id === 'white-out') {
      updateClip(selectedClipId, { fadeIn: t.duration, brightness: 200 })
      // We could use keyframes here to return to 100
      const kf1 = { id: `kf-${Date.now()}-1`, time: 0, properties: { brightness: 200 } }
      const kf2 = { id: `kf-${Date.now()}-2`, time: t.duration, properties: { brightness: 100 } }
      updateClip(selectedClipId, { keyframes: [kf1, kf2] })
    } else {
      // Basic fade in for others for now
      updateClip(selectedClipId, { fadeIn: t.duration })
    }
  }

  return (
    <div className="p-3 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {TRANSITIONS.map(t => (
          <div 
            key={t.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col gap-2 hover:border-indigo-500/50 transition-colors cursor-pointer group"
            onClick={() => applyTransition(t)}
          >
            <div className="aspect-video bg-zinc-950 rounded flex items-center justify-center relative overflow-hidden">
              <Layers className="w-6 h-6 text-zinc-700 group-hover:text-indigo-500 transition-colors" />
              <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors flex items-center justify-center">
                <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200">{t.name}</span>
              <Plus className="w-3 h-3 text-zinc-600 group-hover:text-indigo-400" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 space-y-2 mt-4">
        <div className="flex items-center gap-2 text-indigo-400">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span className="text-[11px] font-bold uppercase">Pro Tip</span>
        </div>
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Transitions are currently applied as "In-Animations" to the selected clip. Overlap clips for better effect.
        </p>
      </div>
    </div>
  )
}
