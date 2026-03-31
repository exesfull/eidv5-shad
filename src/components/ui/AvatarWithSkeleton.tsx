// src/components/avatar-with-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { useImageLoad } from "@/hooks/useImageLoad"
import { cn } from "@/lib/utils"

interface AvatarWithSkeletonProps {
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
  xl: "w-30 h-30", // ваш размер из LoginPage
}

export function AvatarWithSkeleton({
  src,
  alt = "",
  className,
  size = "md",
  fallback,
}: AvatarWithSkeletonProps) {
  const { loaded, error } = useImageLoad(src)
  const sizeClass = sizeClasses[size]

  // Если нет src или ошибка — показываем фоллбэк
  if (!src || error) {
    return (
      <div className={cn("", sizeClass, className)}>
        {fallback || (
          <svg className="w-1/2 h-1/2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>
    )
  }

  return (
    <div className={cn("", sizeClass, className)}>
      {/* Скелетон показывается пока изображение грузится */}
      {!loaded && (
        <Skeleton className="absolute inset-0 rounded-full" />
      )}
      
      {/* Изображение */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={(e) => {
          // Дополнительная страховка для onLoad
          if (!loaded) {
            const target = e.target as HTMLImageElement
            target.style.opacity = "1"
          }
        }}
      />
    </div>
  )
}