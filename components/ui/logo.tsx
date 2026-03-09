import React from 'react';
import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
    return (
        <svg
            viewBox="0 0 160 120"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("w-auto h-16", className)}
            {...props}
        >
            <style>
                {`
          .dwi-logo-stroke {
            fill: none;
            stroke: currentColor;
            stroke-width: 18;
            stroke-linecap: butt;
            stroke-linejoin: round;
          }
          .dwi-logo-dot {
            fill: currentColor;
          }
        `}
            </style>

            {/* Top-left part */}
            <path
                className="dwi-logo-stroke"
                d="M 20 30 L 40 30 A 20 20 0 0 1 60 50 L 60 62.5"
            />

            {/* Main continuous path */}
            <path
                className="dwi-logo-stroke"
                d="
          M 20 62.5 
          L 20 85 
          A 20 20 0 0 0 40 105 
          L 55 105 
          L 77.5 50 
          L 100 105 
          L 115 105 
          L 115 65 
          A 15 15 0 0 1 130 50 
          L 140 50
        "
            />

            {/* Dot for 'i' */}
            <circle className="dwi-logo-dot" cx="135" cy="22.5" r="9" />
        </svg>
    );
}
