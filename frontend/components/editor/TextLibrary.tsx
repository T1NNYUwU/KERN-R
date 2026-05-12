import { useEditorStore, makeClipId } from '../../lib/store'
import { Plus, Type, CaseUpper, GripHorizontal } from 'lucide-react'

export default function TextLibrary() {
  const { addClip, tracks, currentTime } = useEditorStore()

  const handleAddText = (type: 'heading' | 'subheading' | 'body') => {
    let textTrack = tracks.find(t => t.type === 'text')
    let trackId = textTrack?.id
    if (!trackId) {
      trackId = useEditorStore.getState().addTrack('text')
    }

    addClip({
      id: makeClipId(),
      mediaId: 'text_custom', // Dummy mediaId for text
      name: type === 'heading' ? 'Heading Text' : type === 'subheading' ? 'Subheading Text' : 'Body Text',
      type: 'text',
      trackId,
      startTime: currentTime,
      duration: 3,
      trimStart: 0,
      trimEnd: 0,
      volume: 1, // irrelevant for text
      text: type === 'heading' ? 'Heading Text' : type === 'subheading' ? 'Subheading Text' : 'Body Text',
      textColor: '#ffffff',
      textSize: type === 'heading' ? 64 : type === 'subheading' ? 48 : 32,
      textX: 50, // % from left
      textY: 50, // % from top
      textFont: 'Inter',
      textBold: type === 'heading',
      textItalic: false,
      textShadow: true,
      textStroke: type === 'heading' ? 2 : 0,
      textStrokeColor: '#000000',
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto custom-scrollbar bg-[#0c0c0e]">
      
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Default Text</h3>
        
        <button 
          onClick={() => handleAddText('heading')}
          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
              <CaseUpper className="w-4 h-4" />
            </div>
            <span className="text-lg font-bold text-zinc-200">Heading Text</span>
          </div>
          <Plus className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
        </button>

        <button 
          onClick={() => handleAddText('subheading')}
          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
              <Type className="w-4 h-4" />
            </div>
            <span className="text-base font-semibold text-zinc-300">Subheading</span>
          </div>
          <Plus className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
        </button>

        <button 
          onClick={() => handleAddText('body')}
          className="flex items-center justify-between p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-800/80 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors">
              <GripHorizontal className="w-4 h-4" />
            </div>
            <span className="text-sm font-normal text-zinc-400">Body Text</span>
          </div>
          <Plus className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center mt-8 opacity-50 text-center">
        <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3 border border-zinc-800/50">
          <Type className="w-5 h-5 text-zinc-500" />
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed font-medium">
          More text templates and <br/>effects coming soon
        </p>
      </div>

    </div>
  )
}
