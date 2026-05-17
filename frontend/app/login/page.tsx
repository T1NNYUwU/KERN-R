'use client'
import { useAuth } from "../../contexts/AuthContext"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Zap, ShieldCheck, Globe, Film, Sparkles, Wand2 } from "lucide-react"

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !loading) router.push('/')
  }, [user, loading, router])

  if (loading) return null

  return (
    <div style={{ minHeight: '100vh', background: '#07070b', display: 'flex', position: 'relative', overflow: 'hidden' }}>

      {/* ── Ambient Background ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'rgba(99,102,241,0.12)', borderRadius: '50%', filter: 'blur(140px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '50%', height: '50%', background: 'rgba(124,58,237,0.08)', borderRadius: '50%', filter: 'blur(120px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '30%', height: '30%', background: 'rgba(99,102,241,0.04)', borderRadius: '50%', filter: 'blur(100px)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* ── LEFT SIDE — Brand Panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        padding: '60px 64px', position: 'relative', zIndex: 10,
      }}>
        <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48 }}>
            <div style={{
              width: 56, height: 56, background: '#4f46e5', borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(99,102,241,0.5)',
              border: '1px solid rgba(99,102,241,0.3)',
            }}>
              <Zap style={{ width: 28, height: 28, color: '#fff', fill: '#fff' }} />
            </div>
            <div>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1, margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
                KERN-R <span style={{ color: '#818cf8' }}>STUDIO</span>
              </p>
              <p style={{ fontSize: 12, color: '#52525b', fontWeight: 500, margin: '4px 0 0', fontFamily: 'Inter, system-ui, sans-serif' }}>kerntemplate.online</p>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ marginBottom: 48 }}>
            <h1 style={{ fontSize: 60, fontWeight: 900, color: '#fff', lineHeight: 1.1, margin: '0 0 20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
              Edit video.<br />
              <span style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                At full speed.
              </span>
            </h1>
            <p style={{ fontSize: 16, color: '#a1a1aa', lineHeight: 1.6, maxWidth: 360, margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
              Professional timeline editing powered by AI — create stunning content in minutes, not hours.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
            {[
              { icon: Film,     label: 'Timeline Editor', desc: 'Multi-track professional editing' },
              { icon: Wand2,    label: 'AI Text Overlay',  desc: 'Smart captions & animated text' },
              { icon: Sparkles, label: 'FFmpeg Render',    desc: 'Hardware-accelerated export' },
            ].map((f, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 18px', borderRadius: 20,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <f.icon style={{ width: 16, height: 16, color: '#818cf8' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7', margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>{f.label}</p>
                  <p style={{ fontSize: 12, color: '#52525b', margin: '2px 0 0', fontFamily: 'Inter, system-ui, sans-serif' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE — Login Panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 64px', position: 'relative', zIndex: 10,
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.015)',
        backdropFilter: 'blur(40px)',
      }}>
        {/* Card */}
        <div style={{
          width: '100%', maxWidth: 440,
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 28,
          padding: '40px 40px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px', fontFamily: 'Inter, system-ui, sans-serif' }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: '#71717a', margin: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>Sign in to your creative studio</p>
          </div>

          {/* Google Sign In */}
          <button
            onClick={signInWithGoogle}
            style={{
              width: '100%', height: 52,
              background: '#ffffff', color: '#1a1a1a',
              borderRadius: 16, fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              transition: 'all 0.2s',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f5')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
          >
            <svg style={{ width: 20, height: 20, flexShrink: 0 }} viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3f3f46', fontFamily: 'Inter, system-ui, sans-serif' }}>Secure Login</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
          </div>

          {/* Feature badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { icon: ShieldCheck, label: 'Secure' },
              { icon: Zap,         label: 'Fast'   },
              { icon: Globe,       label: 'Cloud'  },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 8px', borderRadius: 16,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'default',
              }}>
                <item.icon style={{ width: 18, height: 18, color: '#52525b' }} />
                <span style={{ fontSize: 11, color: '#52525b', fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p style={{ textAlign: 'center', fontSize: 11, color: '#3f3f46', lineHeight: 1.6, marginTop: 28, marginBottom: 0, fontFamily: 'Inter, system-ui, sans-serif' }}>
            By continuing, you agree to our{' '}
            <span style={{ color: '#71717a', cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: '#71717a', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
        </div>

        {/* Copyright */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#3f3f46', fontFamily: 'Inter, system-ui, sans-serif' }}>
          © 2026 KERN-R Studio. All rights reserved.
        </p>
      </div>
    </div>
  )
}
