'use client'
import React, { useEffect, useRef, useState, memo } from 'react'

interface Props {
  ytId: string | null
  startTime: number
  endTime: number
  isActive: boolean
}

const YoutubePlayer = ({ ytId, startTime, endTime, isActive }: Props) => {
  const playerRef = useRef<any>(null)
  const containerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!ytId || typeof window === 'undefined') return
    
    let isMounted = true

    const initPlayer = () => {
      if (!isMounted) return
      if (!(window as any).YT || !(window as any).YT.Player) {
         // API not ready, wait a bit
         setTimeout(initPlayer, 200)
         return
      }

      const element = document.getElementById(containerId.current)
      if (!element) return

      try {
        if (playerRef.current && playerRef.current.destroy) {
          playerRef.current.destroy()
          playerRef.current = null
        }

        playerRef.current = new (window as any).YT.Player(containerId.current, {
          height: '100%',
          width: '100%',
          videoId: ytId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            modestbranding: 1,
            rel: 0,
            start: Math.floor(startTime),
            end: Math.ceil(endTime),
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
               if (isMounted) {
                 setIsReady(true)
                 event.target.playVideo()
               }
            },
            onStateChange: (event: any) => {
              if (event.data === (window as any).YT.PlayerState.ENDED) {
                event.target.seekTo(startTime)
                event.target.playVideo()
              }
            }
          }
        })
      } catch (err) {
        console.error('YT Player Error:', err)
      }
    }

    // Ensure script is loaded
    if (!(window as any).YT_API_LOADED) {
      (window as any).YT_API_LOADED = true
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer()
    } else {
      const prev = (window as any).onYouTubeIframeAPIReady
      ;(window as any).onYouTubeIframeAPIReady = () => {
        if (prev) prev()
        initPlayer()
      }
    }

    // Interval for loop-back
    const iv = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && isReady) {
        try {
          const now = playerRef.current.getCurrentTime()
          if (now >= endTime - 0.3 || now < startTime - 2) {
            playerRef.current.seekTo(startTime)
            playerRef.current.playVideo()
          }
        } catch (e) {}
      }
    }, 400)

    return () => {
      isMounted = false
      clearInterval(iv)
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [ytId, startTime, endTime])

  if (!ytId) return null

  return (
     <div className="w-full h-full bg-black relative">
       <div id={containerId.current} className="w-full h-full" />
       {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
             <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
       )}
     </div>
  )
}

export default memo(YoutubePlayer)
