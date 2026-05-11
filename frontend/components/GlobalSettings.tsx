'use client'
import { VideoSettings, makeSubTitle, makeOverlayImage, getBackendUrl } from '../lib/types'
import axios from 'axios'

const BACKEND_URL = getBackendUrl()

export default function GlobalSettings({ settings, onChange }: {
  settings: VideoSettings
  onChange: (key: string, value: any) => void
}) {

  const handleImageUpload = async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    try { 
      const r = await axios.post(`${BACKEND_URL}/api/videos/upload-overlay`, fd)
      const newImg = makeOverlayImage(r.data.imagePath)
      onChange('overlayImages', [...(settings.overlayImages || []), newImg]) 
    } catch (err) { 
      console.error('Upload Error:', err)
      alert('Image upload failed. Check console for details.') 
    }
  }

  const addSub = () => {
    const newSubs = [...(settings.subTitles || []), makeSubTitle()]
    onChange('subTitles', newSubs)
  }

  const updateSub = (id: string, key: string, val: any) => {
    const newSubs = settings.subTitles.map(s => s.id === id ? { ...s, [key]: val } : s)
    onChange('subTitles', newSubs)
  }

  const removeSub = (id: string) => {
    onChange('subTitles', settings.subTitles.filter(s => s.id !== id))
  }

  const updateImg = (id: string, key: string, val: any) => {
    const newImgs = settings.overlayImages.map(img => img.id === id ? { ...img, [key]: val } : img)
    onChange('overlayImages', newImgs)
  }

  const removeImg = (id: string) => {
    onChange('overlayImages', settings.overlayImages.filter(img => img.id !== id))
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-zinc-950 p-5 space-y-6">

      {/* 1. MAIN TITLE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="text-blue-400">👑</span>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Main Title</p>
           </div>
           <div className="flex bg-zinc-900 p-1 rounded-lg border border-white/5">
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onClick={() => onChange('headerAlign', a)}
                  className={`px-3 py-1 text-[9px] font-black uppercase rounded-md transition-all ${
                    settings.headerAlign === a ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'
                  }`}>{a}</button>
              ))}
           </div>
        </div>
        
        <div className="space-y-3">
          <textarea 
            value={settings.headerText} 
            onChange={e => onChange('headerText', e.target.value)}
            placeholder="Main Title Here..."
            className="w-full bg-zinc-900 rounded-xl p-3 text-sm text-white border border-white/5 focus:border-blue-500/50 outline-none resize-none h-20"
          />
          <div className="flex items-center gap-4">
             <div className="flex-1 space-y-1.5">
                <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
                  <span>Size</span>
                  <span className="text-blue-400">{settings.headerFontSize}px</span>
                </div>
                <input type="range" min={30} max={200} value={settings.headerFontSize} onChange={e => onChange('headerFontSize', +e.target.value)} className="w-full accent-blue-500" />
             </div>
             <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2 border border-white/5">
                <input type="color" value={settings.headerColor} onChange={e => onChange('headerColor', e.target.value)} className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                <span className="text-[10px] text-zinc-500 font-mono uppercase">{settings.headerColor}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* 2. MULTIPLE SUBTITLES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="text-purple-400">📝</span>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Subtitles / Decor Text</p>
           </div>
           <button onClick={addSub} className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black uppercase rounded-md hover:bg-purple-500 transition shadow-lg">
              ＋ Add Text
           </button>
        </div>
        
        <div className="space-y-3">
          {(settings.subTitles || []).map((sub) => (
            <div key={sub.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 space-y-2 relative group">
              <button onClick={() => removeSub(sub.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-lg z-10">✕</button>
              <textarea 
                value={sub.text} onChange={e => updateSub(sub.id, 'text', e.target.value)}
                className="w-full bg-zinc-900 rounded-lg p-2 text-xs text-white border border-white/5 focus:outline-none resize-none h-12"
              />
              <div className="flex items-center gap-3">
                 <div className="flex-1 flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-bold">
                       <span>Size</span>
                       <span className="text-purple-400">{sub.fontSize}px</span>
                    </div>
                    <input type="range" min={20} max={150} value={sub.fontSize} onChange={e => updateSub(sub.id, 'fontSize', +e.target.value)} className="w-full accent-purple-500 h-1" />
                 </div>
                 <input type="color" value={sub.color} onChange={e => updateSub(sub.id, 'color', e.target.value)} className="w-5 h-5 rounded cursor-pointer bg-transparent border-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* 3. MULTIPLE OVERLAY IMAGES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <span className="text-orange-400">🖼️</span>
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Overlay Images</p>
           </div>
           <div className="relative overflow-hidden group">
              <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <button className="px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase rounded-md group-hover:bg-orange-500 transition shadow-lg">
                ＋ Add Image
              </button>
           </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
           {(settings.overlayImages || []).map(img => (
              <div key={img.id} className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 space-y-3 relative group">
                 <button onClick={() => removeImg(img.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-lg z-10">✕</button>
                 
                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                       <img src={img.path.replace(/\\/g, '/').replace(/.*temp/, `${BACKEND_URL}/temp`)} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-500">
                             <span>W</span>
                             <span className="text-white">{img.w}px</span>
                          </div>
                          <input type="range" min={50} max={1080} value={img.w} onChange={e => updateImg(img.id, 'w', +e.target.value)} className="w-full accent-orange-500 h-1" />
                       </div>
                       <div className="space-y-1">
                          <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-500">
                             <span>H</span>
                             <span className="text-white">{img.h}px</span>
                          </div>
                          <input type="range" min={50} max={1920} value={img.h} onChange={e => updateImg(img.id, 'h', +e.target.value)} className="w-full accent-orange-500 h-1" />
                       </div>
                    </div>
                 </div>
              </div>
           ))}
        </div>
      </div>

      <div className="border-t border-white/5" />

      {/* 4. OTHER APPEARANCE & AUDIO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
           <span className="text-zinc-400">⚙️</span>
           <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Global Appearance & Audio</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {/* Global Audio */}
          <div className="bg-zinc-900 rounded-xl px-4 py-3 border border-white/5 space-y-3">
             <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 font-bold uppercase tracking-tighter">Global Background Music</span>
             </div>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={settings.globalMusicPath || ''} 
                  onChange={e => onChange('globalMusicPath', e.target.value)}
                  placeholder="URL or Upload File..."
                  className="flex-1 bg-zinc-950 rounded-lg px-3 py-2 text-xs text-white border border-white/10 outline-none"
                />
                <div className="relative overflow-hidden shrink-0">
                  <input type="file" accept="audio/*" onChange={async e => {
                    const file = e.target.files?.[0]; if (!file) return;
                    const fd = new FormData(); fd.append('file', file)
                    try { 
                      const r = await axios.post(`${BACKEND_URL}/api/videos/upload-music`, fd)
                      onChange('globalMusicPath', r.data.musicPath) 
                    } catch(err) { alert('Upload failed') }
                  }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <button className="px-3 py-2 bg-blue-600 hover:bg-blue-500 transition rounded-lg text-[10px] font-black uppercase text-white shadow-lg">Upload</button>
                </div>
             </div>
             {settings.globalMusicPath && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] uppercase font-bold text-zinc-500">
                     <span>Volume</span>
                     <span className="text-blue-400">{settings.globalMusicVolume ?? 20}%</span>
                  </div>
                  <input type="range" min={0} max={100} value={settings.globalMusicVolume ?? 20} onChange={e => onChange('globalMusicVolume', +e.target.value)} className="w-full accent-blue-500 h-1" />
                </div>
             )}
          </div>
          <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3 border border-white/5">
            <span className="text-xs text-zinc-300 font-bold uppercase tracking-tighter">Background Color</span>
            <div className="flex items-center gap-2">
              <input type="color" value={settings.bgColor} onChange={e => onChange('bgColor', e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0" />
              <span className="text-xs text-zinc-500 font-mono uppercase">{settings.bgColor}</span>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl px-4 py-3 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-bold uppercase tracking-tighter">Rank Font Size</span>
              <span className="text-xs font-black text-yellow-400">{settings.rankFontSize}px</span>
            </div>
            <input type="range" min={40} max={200} value={settings.rankFontSize} onChange={e => onChange('rankFontSize', +e.target.value)} className="w-full accent-yellow-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
