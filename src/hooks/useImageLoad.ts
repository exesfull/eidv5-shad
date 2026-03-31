// src/hooks/useImageLoad.ts
import { useState, useEffect } from "react"

export function useImageLoad(src?: string) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!src) {
      setLoaded(false)
      setError(false)
      return
    }

    let isMounted = true
    const img = new Image()
    
    img.onload = () => { if (isMounted) setLoaded(true) }
    img.onerror = () => { if (isMounted) setError(true) }
    img.src = src

    return () => { isMounted = false }
  }, [src])

  return { loaded, error }
}