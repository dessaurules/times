import { useState, useEffect, useCallback, type ReactNode } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { cn } from '@/lib/utils'

export interface ZeitenCarouselSlide {
  key: string
  label: string
  content: ReactNode
}

interface Props {
  slides: ZeitenCarouselSlide[]
  initialIndex?: number
}

export default function ZeitenCarousel({ slides, initialIndex = 0 }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'center',
    loop: false,
    startIndex: initialIndex,
    containScroll: 'trimSnaps',
  })
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi, onSelect])

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi])

  return (
    <div>
      {/* Titel-Leiste */}
      <div className="flex items-center justify-center gap-4 mb-3">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            onClick={() => scrollTo(i)}
            className={cn(
              'text-sm font-semibold px-1 py-1 transition-colors',
              i === selectedIndex ? 'text-indigo-600' : 'text-[#9CA3AF]'
            )}
          >
            {slide.label}
          </button>
        ))}
      </div>

      {/* Karussell */}
      <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
        <div className="flex gap-3">
          {slides.map(slide => (
            <div key={slide.key} className="flex-[0_0_88%] min-w-0">
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {slides.map((slide, i) => (
          <button
            key={slide.key}
            aria-label={`Zu ${slide.label} wechseln`}
            onClick={() => scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === selectedIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-[#D1D5DB]'
            )}
          />
        ))}
      </div>
    </div>
  )
}
