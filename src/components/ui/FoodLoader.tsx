'use client'

import React, { useEffect, useRef } from 'react'
import lottie from 'lottie-web'
import spoonData from '../../../public/Spoon Loader.json'

interface FoodLoaderProps {
    text?: string
    fullScreen?: boolean
    size?: number
}

export function FoodLoader({ text = "Preparing something delicious...", fullScreen = true, size = 180 }: FoodLoaderProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const anim = lottie.loadAnimation({
            container: containerRef.current,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: spoonData,
        })

        return () => anim.destroy()
    }, [])

    const dishSize = size * 1.55

    return (
        <div className={`flex flex-col items-center justify-center font-display ${fullScreen ? 'fixed inset-0 min-h-[100dvh] w-full z-[100] bg-background-light/90 dark:bg-background-dark/95 backdrop-blur-xl' : 'py-12 w-full'}`}>
            <div className="relative flex flex-col items-center">

                {/* Dish + Spoon Stack */}
                <div
                    className="relative flex items-center justify-center"
                    style={{ width: dishSize, height: dishSize }}
                >
                    {/* 3D Orange Circular Dish SVG */}
                    <svg
                        viewBox="0 0 200 200"
                        xmlns="http://www.w3.org/2000/svg"
                        className="absolute inset-0 w-full h-full drop-shadow-[0_16px_32px_rgba(242,147,13,0.5)]"
                        aria-hidden="true"
                    >
                        <defs>
                            <radialGradient id="dishGrad" cx="42%" cy="35%" r="65%">
                                <stop offset="0%"  stopColor="#ffd27d" />
                                <stop offset="35%" stopColor="#f2930d" />
                                <stop offset="75%" stopColor="#c9680a" />
                                <stop offset="100%" stopColor="#874305" />
                            </radialGradient>
                            <radialGradient id="wellGrad" cx="42%" cy="38%" r="60%">
                                <stop offset="0%"  stopColor="#fde68a" />
                                <stop offset="50%" stopColor="#f2930d" />
                                <stop offset="100%" stopColor="#92400e" />
                            </radialGradient>
                            <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
                                <stop offset="0%"  stopColor="#000" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#000" stopOpacity="0" />
                            </radialGradient>
                            <filter id="blurShadow">
                                <feGaussianBlur stdDeviation="4" />
                            </filter>
                        </defs>

                        {/* Cast shadow */}
                        <ellipse cx="100" cy="182" rx="68" ry="10" fill="url(#shadowGrad)" filter="url(#blurShadow)" />

                        {/* Dish body — perfect circle */}
                        <circle cx="100" cy="100" r="86" fill="url(#dishGrad)" />

                        {/* Rim shine */}
                        <circle cx="100" cy="100" r="86" fill="none" stroke="#ffe8a0" strokeWidth="2.5" opacity="0.5" />

                        {/* 3D depth — bottom half arc */}
                        <path d="M14,100 Q14,155 100,162 Q186,155 186,100" fill="#7c3000" opacity="0.45" />

                        {/* Inner well — slightly smaller circle */}
                        <circle cx="100" cy="104" r="64" fill="url(#wellGrad)" />

                        {/* Specular highlight */}
                        <ellipse cx="80" cy="80" rx="26" ry="13" fill="white" opacity="0.18" transform="rotate(-20 80 80)" />
                    </svg>

                    {/* Spoon Lottie Animation — centered on dish, starts instantly */}
                    <div
                        ref={containerRef}
                        className="relative z-10"
                        style={{ width: size, height: size }}
                    />
                </div>

                {/* Glow ring */}
                <div
                    className="rounded-full bg-primary/25 blur-2xl animate-pulse"
                    style={{ width: dishSize * 0.55, height: 16, marginTop: -8 }}
                />

                {text && (
                    <div className="flex flex-col items-center gap-2 mt-5">
                        <p className="text-slate-900 dark:text-slate-100 font-bold text-lg tracking-tight leading-snug text-center">
                            {text}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:75ms]"></span>
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]"></span>
                            <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]"></span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
