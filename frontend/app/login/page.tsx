'use client'
import { useAuth } from "../../contexts/AuthContext"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Zap, ShieldCheck, Globe } from "lucide-react"

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) return null

  return (
    <div className="min-h-screen bg-[#09090d] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="bg-[#121217]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl space-y-8">
          
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/20 animate-pulse">
              <Zap className="w-8 h-8 text-white fill-current" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white pt-2">
              KERN-R <span className="text-indigo-400">STUDIO</span>
            </h1>
            <p className="text-zinc-400 text-sm font-medium">
              Professional Video Editor for <span className="text-zinc-200">kerntemplate.online</span>
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={signInWithGoogle}
              className="w-full h-14 bg-white hover:bg-zinc-100 text-black rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 group shadow-xl"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            
            <div className="flex items-center gap-4 text-zinc-600 px-2 pt-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Secure Login</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: ShieldCheck, label: 'Secure' },
              { icon: Zap, label: 'Fast' },
              { icon: Globe, label: 'Cloud' }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                <item.icon className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-[10px] font-medium text-zinc-500">{item.label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[11px] text-zinc-600 leading-relaxed px-4">
            By signing in, you agree to our Terms of Service and Privacy Policy. All your data is stored securely in the cloud.
          </p>
        </div>
        
        <p className="text-center mt-8 text-[12px] text-zinc-500 font-medium">
          © 2026 KERN-R. All rights reserved.
        </p>
      </div>
    </div>
  )
}
