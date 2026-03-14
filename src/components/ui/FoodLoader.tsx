import React from 'react'

interface FoodLoaderProps {
    text?: string
    fullScreen?: boolean
}

export function FoodLoader({ text = "Preparing something delicious...", fullScreen = true }: FoodLoaderProps) {
    return (
        <div className={`flex flex-col items-center justify-center font-display ${fullScreen ? 'fixed inset-0 min-h-[100dvh] w-full z-[100] bg-background-light/90 dark:bg-background-dark/95 backdrop-blur-xl transition-all duration-500' : 'py-12 w-full'}`}>
            <div className="relative flex flex-col items-center animate-in fade-in zoom-in-95 duration-700">
                
                {/* 3D Bouncing Wrapper */}
                <div className="relative h-40 w-40 mb-2 perspective-[1200px] animate-bounce-3d">
                    
                    {/* Animated Steam (wafting behind) */}
                    <div className="absolute -top-10 inset-x-0 w-full flex justify-center gap-6 opacity-80 pointer-events-none mix-blend-screen z-0">
                         <svg width="40" height="40" viewBox="0 0 40 40" className="animate-[bounce_3s_infinite_ease-in-out]">
                             <path d="M10 40 Q 5 20 20 10 T 30 -10" fill="none" stroke="#e2e8f0" strokeWidth="4" filter="blur(3px)" strokeLinecap="round" className="animate-pulse"/>
                         </svg>
                         <svg width="40" height="40" viewBox="0 0 40 40" className="animate-[bounce_2.5s_infinite_ease-in-out_0.5s]">
                             <path d="M30 40 Q 35 20 20 10 T 10 -10" fill="none" stroke="#e2e8f0" strokeWidth="3" filter="blur(2px)" strokeLinecap="round" className="animate-[pulse_1.5s_infinite] opacity-80"/>
                         </svg>
                    </div>

                    {/* Hyper-realistic 3D Spinning Pizza */}
                    <svg 
                        viewBox="0 0 100 100" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full drop-shadow-[0_20px_25px_rgba(0,0,0,0.5)] animate-spin-3d relative z-10"
                    >
                        <defs>
                            {/* Realistic Crust Gradient (Toasted) */}
                            <linearGradient id="crustGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#d48c48"/>
                                <stop offset="40%" stopColor="#e89d58"/>
                                <stop offset="80%" stopColor="#b66b2a"/>
                                <stop offset="100%" stopColor="#8f4a13"/>
                            </linearGradient>
                            
                            {/* Shiny Melted Cheese Gradient */}
                            <linearGradient id="cheeseGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                                <stop offset="0%" stopColor="#fff8b5"/>
                                <stop offset="30%" stopColor="#ffd84d"/>
                                <stop offset="70%" stopColor="#f3b822"/>
                                <stop offset="100%" stopColor="#d58e11"/>
                            </linearGradient>

                            {/* Pepperoni Gradient with Oily Specular Highlights */}
                            <radialGradient id="pepGrad" cx="35%" cy="30%" r="65%">
                                <stop offset="0%" stopColor="#ff7b63"/>
                                <stop offset="50%" stopColor="#d83a24"/>
                                <stop offset="85%" stopColor="#96200e"/>
                                <stop offset="100%" stopColor="#5c1004"/>
                            </radialGradient>

                            {/* Drop Shadow for the ingredients */}
                            <filter id="shadowOver" x="-10%" y="-10%" width="120%" height="120%">
                                <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000" floodOpacity="0.4"/>
                            </filter>
                        </defs>

                        {/* Thick 3D Crust Edge (Back depth) */}
                        <path d="M49 8 L97 29 C87 64 71 85 50 99 C29 85 13 64 3 29 Z" fill="#63320c"/>
                        
                        {/* Main Toasted Crust Top Plane */}
                        <path d="M50 5 L95 25 C85 60 70 80 50 95 C30 80 15 60 5 25 Z" fill="url(#crustGrad)" stroke="#8f4a13" strokeWidth="1.5"/>
                        
                        {/* Realistic Crust Char/Burn Marks (Baked texture) */}
                        <g opacity="0.45" stroke="#331804" strokeLinecap="round">
                            <path d="M40 8 Q 50 12 60 8" strokeWidth="2.5" />
                            <path d="M75 14 Q 85 18 90 22" strokeWidth="3.5" />
                            <path d="M25 14 Q 15 18 10 22" strokeWidth="3" />
                            <path d="M30 6 Q 35 10 40 6" strokeWidth="1.5" />
                            <path d="M85 35 Q 90 45 88 50" strokeWidth="2" opacity="0.3"/>
                            <path d="M15 35 Q 10 45 12 50" strokeWidth="2" opacity="0.3"/>
                        </g>

                        {/* Golden Melted Cheese Base */}
                        <path d="M14 29 C25 22 75 22 86 29 C74 61 59 78 50 90 C41 78 26 61 14 29 Z" fill="url(#cheeseGrad)"/>
                        
                        {/* Highlights: Molten cheese bubbling up */}
                        <g opacity="0.75" fill="#fffbe6">
                            <circle cx="25" cy="40" r="4.5" filter="blur(1px)"/>
                            <circle cx="68" cy="48" r="6" filter="blur(1.5px)"/>
                            <circle cx="45" cy="72" r="3.5" filter="blur(1px)"/>
                            <circle cx="50" cy="35" r="5" filter="blur(2px)"/>
                            <ellipse cx="60" cy="70" rx="3" ry="5" transform="rotate(-30 60 70)" filter="blur(1px)"/>
                        </g>

                        {/* Shadows for depth under the ingredients */}
                        <g filter="url(#shadowOver)">
                            {/* Realistic Pepperoni Array */}
                            <g stroke="#4f0c01" strokeWidth="0.75">
                                {/* Slice 1 - Center Left */}
                                <g transform="translate(32, 43)">
                                    <circle r="9.5" fill="url(#pepGrad)"/>
                                    <path d="M-4.5 -4 Q 0 -6 3 -3" stroke="#ffa394" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9"/>
                                    <circle cx="-2" cy="2" r="1.5" fill="#360a02" opacity="0.7"/>
                                    <circle cx="3" cy="-1" r="1.2" fill="#360a02" opacity="0.5"/>
                                </g>

                                {/* Slice 2 - Top Right */}
                                <g transform="translate(68, 38)">
                                    <circle r="8.5" fill="url(#pepGrad)"/>
                                    <path d="M-4 -3.5 Q -1 -5 2 -2.5" stroke="#ffa394" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.85"/>
                                    <circle cx="1" cy="3" r="1.2" fill="#360a02" opacity="0.6"/>
                                </g>
                                
                                {/* Slice 3 - Bottom Center */}
                                <g transform="translate(50, 62)">
                                    <circle r="10" fill="url(#pepGrad)"/>
                                    <path d="M-5 -4.5 Q 0 -7 4 -3.5" stroke="#ffa394" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.9"/>
                                    <circle cx="-3" cy="3" r="1.5" fill="#360a02" opacity="0.7"/>
                                    <circle cx="2" cy="4" r="1" fill="#360a02" opacity="0.8"/>
                                </g>
                                
                                {/* Slice 4 - Bottom Right Mini */}
                                <g transform="translate(64, 76)">
                                    <circle r="6" fill="url(#pepGrad)"/>
                                    <path d="M-2 -2 Q 0 -3 2 -1" stroke="#ffa394" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.7"/>
                                </g>
                                
                                {/* Slice 5 - Top Left Cut off */}
                                <g transform="translate(34, 66)">
                                    <path d="M 0 6 A 7.5 7.5 0 0 1 -7.5 -1.5 L -2 -7 A 7.5 7.5 0 0 0 5 4 Z" fill="url(#pepGrad)"/>
                                </g>
                            </g>
                            
                            {/* Fresh Basil Leaves with intricate veins */}
                            <g>
                                {/* Leaf 1 */}
                                <g transform="translate(52, 32) rotate(15)">
                                    <path d="M0 0 C 4 -6 10 -6 6 6 C 0 10 -6 6 0 0 Z" fill="#2d6a1b" stroke="#1d4511" strokeWidth="0.5"/>
                                    <path d="M0 0 C 4 -6 10 -6 6 6" stroke="#71ad5f" strokeWidth="0.75" fill="none" opacity="0.8"/>
                                    <line x1="1" y1="1" x2="3" y2="4" stroke="#488c35" strokeWidth="0.5"/>
                                </g>
                                {/* Leaf 2 */}
                                <g transform="translate(38, 52) rotate(-40)">
                                    <path d="M0 0 C 5 -7 12 -7 8 7 C 0 12 -7 7 0 0 Z" fill="#1f4c12" stroke="#11290a" strokeWidth="0.5"/>
                                    <path d="M0 0 C 5 -7 12 -7 8 7" stroke="#5a914a" strokeWidth="0.75" fill="none" opacity="0.8"/>
                                    <line x1="1" y1="1" x2="3" y2="4" stroke="#366b26" strokeWidth="0.5"/>
                                </g>
                                {/* Leaf 3 */}
                                <g transform="translate(70, 56) rotate(60)">
                                    <path d="M0 0 C 4 -5 9 -5 6 5 C 0 9 -5 5 0 0 Z" fill="#2d6a1b" stroke="#1d4511" strokeWidth="0.5"/>
                                    <path d="M0 0 C 4 -5 9 -5 6 5" stroke="#71ad5f" strokeWidth="0.75" fill="none" opacity="0.8"/>
                                </g>
                            </g>
                        </g>
                    </svg>
                </div>
                
                {/* Heavier Glowing Floor Shadow */}
                <div className="w-24 h-6 bg-primary/40 dark:bg-primary/60 rounded-[100%] blur-xl mb-6 animate-shadow-pulse transform -translate-y-6"></div>
                
                {/* Modern Loading Typography */}
                <div className="flex flex-col items-center animate-pulse gap-2 mt-4">
                    <p className="text-slate-900 dark:text-slate-100 font-bold text-lg tracking-tight leading-snug">
                        {text}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-75"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-150"></span>
                        <span className="w-2 h-2 rounded-full bg-primary animate-bounce delay-300"></span>
                    </div>
                </div>
            </div>
        </div>
    )
}
