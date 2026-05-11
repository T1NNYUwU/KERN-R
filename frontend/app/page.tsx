'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'

const PRESETS = [
  {
    id: 'ranking',
    title: '🏆 Ranking Mode',
    description: 'Create Top 5 / Top 10 viral videos with AI voice and automatic ranking layouts.',
    color: 'from-amber-500 to-orange-600',
    icon: '🥇',
    path: '/ranking',
    status: 'Ready'
  },
  {
    id: 'sequence',
    title: '🎬 Sequence Mode',
    description: 'Combine multiple clips with transitions, overlays, and background music.',
    color: 'from-blue-500 to-indigo-600',
    icon: '🎞️',
    path: '/sequence',
    status: 'Coming Soon'
  },
  {
    id: 'split',
    title: '📐 Split Screen',
    description: 'Create multi-screen layouts (2x2, side-by-side) with synced audio.',
    color: 'from-emerald-500 to-teal-600',
    icon: '🔳',
    path: '/split',
    status: 'Coming Soon'
  },
  {
    id: 'voiceover',
    title: '🎤 Voiceover Pro',
    description: 'Professional AI narration for your clips with precise subtitle timing.',
    color: 'from-purple-500 to-pink-600',
    icon: '🎙️',
    path: '/voiceover',
    status: 'Coming Soon'
  }
]

export default function ModeSelector() {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" /> 
          KERN-R Hybrid Studio v2.0
        </div>
        <h1 className="text-5xl font-black mb-4 tracking-tighter bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          Choose Your Mode
        </h1>
        <p className="text-zinc-500 text-lg max-w-lg mx-auto">
          Select a preset to start creating professional videos with AI-powered automation.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full relative z-10">
        {PRESETS.map((p, idx) => (
          <Link key={p.id} href={p.status === 'Ready' ? p.path : '#'}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={p.status === 'Ready' ? { scale: 1.02, y: -5 } : {}}
              className={`relative group cursor-pointer overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900/40 p-8 backdrop-blur-xl transition-all ${
                p.status === 'Ready' ? 'hover:border-white/20 hover:bg-zinc-900/60' : 'opacity-60 grayscale cursor-not-allowed'
              }`}
            >
              {/* Card Background Glow */}
              <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${p.color} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-500`} />
              
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${p.color} flex items-center justify-center text-3xl shadow-xl`}>
                    {p.icon}
                  </div>
                  {p.status !== 'Ready' && (
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {p.status}
                    </span>
                  )}
                </div>
                
                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r transition-all duration-300 group-hover:from-white group-hover:to-white/40">
                  {p.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-relaxed mb-8 flex-1">
                  {p.description}
                </p>
                
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">
                  {p.status === 'Ready' ? 'Start Creating' : 'Locked'} 
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-16 text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-black"
      >
        Powered by FFmpeg & AI
      </motion.div>

    </div>
  )
}
