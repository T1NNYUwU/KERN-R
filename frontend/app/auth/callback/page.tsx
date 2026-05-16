'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      // Get the code from the URL
      const searchParams = new URLSearchParams(window.location.search)
      const code = searchParams.get('code')

      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
      
      router.push('/')
      router.refresh() // บังคับให้ Middleware เช็ค Cookie อีกรอบ
    }
    handleAuth()
  }, [router])

  return (
    <div className="min-h-screen bg-[#09090d] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-zinc-400 font-medium animate-pulse">Syncing your session...</p>
      </div>
    </div>
  )
}
