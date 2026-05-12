'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { useEditorStore } from '../lib/store'
import { 
  Download, MousePointer2, Scissors, Trash2, 
  Undo2, Redo2, Monitor, LayoutTemplate, 
  Type, Music, Image as ImageIcon, FolderClosed,
  Settings, User, HelpCircle, Layers
} from 'lucide-react'

const MediaBin    = dynamic(() => import('../components/editor/MediaBin'),    { ssr: false })
const VideoPreview = dynamic(() => import('../components/editor/VideoPreview'), { ssr: false })
const Timeline    = dynamic(() => import('../components/editor/Timeline'),    { ssr: false })
const TextLibrary = dynamic(() => import('../components/editor/TextLibrary'), { ssr: false })
const AudioLibrary = dynamic(() => import('../components/editor/AudioLibrary'), { ssr: false })
const Inspector   = dynamic(() => import('../components/editor/Inspector'),   { ssr: false })

export default function EditorPage() {
  const { initStore, undo, redo, historyIndex, history } = useEditorStore()
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1
  
  useEffect(() => {
    initStore()
  }, [initStore])

  const [activeTab, setActiveTab] = useState('media')
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const navItems = [
    { id: 'media', icon: FolderClosed, label: 'Media' },
    { id: 'audio', icon: Music, label: 'Audio' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'elements', icon: LayoutTemplate, label: 'Elements' },
    { id: 'effects', icon: Layers, label: 'Effects' },
  ]

  return (
    <div className="flex flex-col w-screen h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden select-none">
      {/* ── Top Bar ── */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 bg-zinc-950 border-b border-zinc-800/60 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="font-black text-sm text-white tracking-tighter">K</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight leading-tight">KERN-R Studio</span>
            <span className="text-[10px] font-medium text-zinc-500 leading-tight">v3.0 - Web Native</span>
          </div>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3 py-1.5 rounded-md border border-zinc-800/50">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className={`hover:text-zinc-100 transition-colors p-1 ${canUndo ? '' : 'opacity-30 cursor-not-allowed'}`}
            ><Undo2 className="w-4 h-4" /></button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className={`hover:text-zinc-100 transition-colors p-1 ${canRedo ? '' : 'opacity-30 cursor-not-allowed'}`}
            ><Redo2 className="w-4 h-4" /></button>
          </div>
          
          <div className="h-4 w-px bg-zinc-800"></div>
          
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700">Space</kbd> Play/Pause</div>
            <div className="flex items-center gap-1.5"><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 border border-zinc-700">S</kbd> Split</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-800">
            <Settings className="w-4 h-4" />
          </button>
          <button className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors rounded-full hover:bg-zinc-800">
            <HelpCircle className="w-4 h-4" />
          </button>
          <button 
            disabled={isExporting}
            onClick={async () => {
              try {
                setIsExporting(true)
                setExportProgress(0)
                
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3005'
                const { clips, mediaFiles } = useEditorStore.getState()
                
                // 1. Send render request
                const res = await fetch(`${backendUrl}/api/videos/render`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: crypto.randomUUID(),
                    clips,
                    mediaFiles
                  })
                })
                
                const { jobId } = await res.json()
                if (!jobId) throw new Error('Failed to start export job')

                // 2. Poll for status
                const pollInterval = setInterval(async () => {
                  try {
                    const statusRes = await fetch(`${backendUrl}/api/videos/status/${jobId}`)
                    const data = await statusRes.json()
                    
                    setExportProgress(data.progress || 0)
                    
                    if (data.status === 'COMPLETED') {
                      clearInterval(pollInterval)
                      setIsExporting(false)
                      // Download
                      const a = document.createElement('a')
                      a.href = data.final_video_url
                      a.target = '_blank'
                      a.download = `KERN-R-${jobId}.mp4`
                      a.click()
                    } else if (data.status === 'FAILED') {
                      clearInterval(pollInterval)
                      setIsExporting(false)
                      alert('Export failed on server.')
                    }
                  } catch (e) {
                    console.error('Polling error:', e)
                  }
                }, 2000)

              } catch (e) {
                console.error(e)
                alert('Export failed to start!')
                setIsExporting(false)
              }
            }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-white text-sm font-semibold transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] border border-indigo-500/50 ${
              isExporting ? 'bg-zinc-700 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </header>

      {/* Export Modal */}
      {isExporting && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 flex flex-col items-center w-80 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Exporting Video</h2>
            
            {/* Circular Progress */}
            <div className="relative w-24 h-24 mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="48" cy="48" r="44" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                <circle cx="48" cy="48" r="44" stroke="#7c3aed" strokeWidth="8" fill="none" 
                  strokeDasharray={`${2 * Math.PI * 44}`} 
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - exportProgress / 100)}`}
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{exportProgress}%</span>
              </div>
            </div>
            
            <p className="text-sm text-zinc-400 text-center">
              Please don't close this tab.<br/>Processing with FFmpeg...
            </p>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Leftmost Nav Sidebar */}
        <div className="w-[72px] shrink-0 bg-zinc-950 border-r border-zinc-800/60 flex flex-col items-center py-4 gap-6 z-10">
          <div className="flex flex-col gap-2 w-full px-2">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-zinc-800/80 text-indigo-400 shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : ''}`} />
                  <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
                </button>
              )
            })}
          </div>
          
          <div className="mt-auto mb-2">
            <button className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Half: Media Bin + Preview + Inspector */}
          <div className="flex-[0.55] flex overflow-hidden bg-zinc-950">
            
            {/* Left: Secondary Panel (Media Bin) */}
            <div className="w-[300px] shrink-0 bg-[#0c0c0e] border-r border-zinc-800/60 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10">
              <div className="h-10 px-4 flex items-center border-b border-zinc-800/60 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {navItems.find(i => i.id === activeTab)?.label} Library
                </span>
              </div>
              <div className="flex-1 overflow-hidden relative">
                {activeTab === 'media' ? (
                  <MediaBin />
                ) : activeTab === 'text' ? (
                  <TextLibrary />
                ) : activeTab === 'audio' ? (
                  <AudioLibrary />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs font-medium">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>

            {/* Center: Video Preview Player */}
            <div className="flex-1 bg-black relative flex flex-col overflow-hidden shadow-inner">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800/80 text-xs font-medium text-zinc-300">
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                Fit (100%)
              </div>
              <VideoPreview />
            </div>

            {/* Right: Inspector */}
            <div className="w-[280px] shrink-0 bg-[#0c0c0e] border-l border-zinc-800/60 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.2)] z-10">
              <div className="h-10 px-4 flex items-center border-b border-zinc-800/60 shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Details</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <Inspector />
              </div>
            </div>

          </div>

          {/* Bottom Half: Timeline */}
          <div className="flex-[0.45] min-h-[250px] flex flex-col bg-[#0f0f13] border-t border-zinc-800/80 z-20 shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
            <Timeline />
          </div>

        </div>
      </div>
    </div>
  )
}
