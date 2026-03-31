// src/components/ui/avatar-with-loader.tsx
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AvatarWithLoaderProps {
  src?: string
  alt?: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
  fallback?: React.ReactNode
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-20 h-20",
  xl: "w-30 h-30",
}

// SVG анимация загрузки
function AvatarLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted rounded-full overflow-hidden">
      <svg 
        className="w-3/4 h-3/4" 
        viewBox="0 0 300 150"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          fill="none" 
          stroke="#1B86CE" 
          strokeWidth="11" 
          strokeLinecap="round" 
          strokeDasharray="300 385" 
          strokeDashoffset="0" 
          d="M275 75c0 31-27 50-50 50-58 0-92-100-150-100-28 0-50 22-50 50s23 50 50 50c58 0 92-100 150-100 24 0 50 19 50 50Z"
        >
          <animate 
            attributeName="stroke-dashoffset" 
            calcMode="spline" 
            dur="2" 
            values="685;-685" 
            keySplines="0 0 1 1" 
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  )
}

export function AvatarWithLoader({
  src,
  alt = "",
  className,
  size = "md",
  fallback,
}: AvatarWithLoaderProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const sizeClass = sizeClasses[size]

  // Если нет src или ошибка — показываем фоллбэк
  if (!src || error) {
    return (
      <div className={cn("rounded-full overflow-hidden bg-muted", sizeClass, className)}>
        {fallback || (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-1/2 h-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("relative rounded-full overflow-hidden bg-muted", sizeClass, className)}>
      {/* Анимация загрузки пока изображение грузится */}
      {!loaded && <AvatarLoader />}

      {/* Изображение */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  )
}
