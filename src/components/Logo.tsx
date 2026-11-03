
import React from 'react';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  textColor?: string;
  /**
   * Applied to the wordmark wrapper, so a caller can hide or restyle just the
   * text while keeping the mark. The site header uses this to drop the wordmark
   * on phones — see the note there for why.
   */
  textClassName?: string;
}

const Logo = ({
  className = "",
  showText = true,
  textColor = "text-gray-700",
  textClassName = "",
}: LogoProps) => {
  return (
    // Static on purpose. It used to fade and scale in on every route change
    // and wobble on hover; the header logo is a landmark, and landmarks that
    // move feel unreliable. The one-time intro is where the mark animates.
    <div className={`flex items-center ${className}`}>
      <div className="relative h-8 w-10 md:h-9 md:w-12">
        {/*
          Two SVGs instead of one raster image + a brightness filter. The mark's
          navy ink used to nearly vanish on the dark theme because a CSS filter
          was doing the lifting instead of a real reversed asset — see
          brand_assets/BRAND_GUIDELINES.md §1. Swapping via dark:hidden/dark:block
          costs nothing extra (both are a few hundred bytes) and needs no JS.
        */}
        <img
          src="/logo-mark-light.svg"
          alt="Friendly Learning - SRM AP Student Mentorship Platform Logo"
          className="h-full w-auto object-contain dark:hidden"
          loading="eager"
          width="38"
          height="40"
        />
        <img
          src="/logo-mark-dark.svg"
          alt="Friendly Learning - SRM AP Student Mentorship Platform Logo"
          className="hidden h-full w-auto object-contain dark:block"
          loading="eager"
          width="38"
          height="40"
        />
      </div>

      {showText && (
        <div className={cn("ml-1 flex items-center", textClassName)}>
          <span className="text-xl font-bold text-primary tracking-tight">Friendly</span>
          <span className={`text-xl font-bold ${textColor} tracking-tight`}>Learning</span>
          <span className="text-sm font-medium text-primary ml-1 tracking-tight">SRMAP</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
