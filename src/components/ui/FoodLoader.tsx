'use client'

import React from 'react'
import Lottie from 'lottie-react'
import spoonLoaderData from '../../../public/Spoon Loader.json'

interface FoodLoaderProps {
    text?: string
    fullScreen?: boolean
    size?: number
}

export function FoodLoader({ text = "Preparing something delicious...", fullScreen = true, size = 220 }: FoodLoaderProps) {
    return (
        <div className={`flex flex-col items-center justify-center font-display ${fullScreen ? 'fixed inset-0 min-h-[100dvh] w-full z-[100] bg-background-light/90 dark:bg-background-dark/95 backdrop-blur-xl transition-all duration-500' : 'py-12 w-full'}`}>
            <div className="relative flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">

                <Lottie
                    animationData={spoonLoaderData}
                    loop={true}
                    style={{ width: size, height: size }}
                />

                {text && (
                    <div className="flex flex-col items-center gap-2 mt-2">
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
