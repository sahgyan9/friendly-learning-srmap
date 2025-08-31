import { useState, useRef, useEffect } from "react";
import { motion, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  maxPullDistance?: number;
}

const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 80, 
  maxPullDistance = 120 
}: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = () => {
    // Only allow pull-to-refresh when at the top of the page
    return typeof window !== 'undefined' && window.scrollY === 0;
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (typeof window !== 'undefined' && info.offset.y > 0 && window.scrollY === 0) {
      const distance = Math.min(info.offset.y, maxPullDistance);
      setPullDistance(distance);
      setShouldRefresh(distance >= threshold);
    }
  };

  const handleDragEnd = async (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      // Add haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setShouldRefresh(false);
      }
    } else {
      // Reset pull distance
      setPullDistance(0);
      setShouldRefresh(false);
    }
  };

  const refreshOpacity = Math.min(pullDistance / threshold, 1);
  const iconRotation = (pullDistance / threshold) * 180;

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Pull to refresh indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        style={{
          height: Math.max(pullDistance, 0),
          opacity: refreshOpacity,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: refreshOpacity }}
      >
        <div className="flex flex-col items-center space-y-2 py-4">
          <motion.div
            animate={{ 
              rotate: isRefreshing ? 360 : iconRotation,
              scale: shouldRefresh ? 1.1 : 1 
            }}
            transition={{ 
              rotate: isRefreshing ? { 
                duration: 1, 
                repeat: Infinity, 
                ease: "linear" 
              } : { duration: 0.2 },
              scale: { duration: 0.2 }
            }}
          >
            <RefreshCw 
              className={`h-6 w-6 ${
                shouldRefresh ? 'text-primary' : 'text-muted-foreground'
              }`} 
            />
          </motion.div>
          <motion.p 
            className={`text-sm font-medium ${
              shouldRefresh ? 'text-primary' : 'text-muted-foreground'
            }`}
            animate={{ scale: shouldRefresh ? 1.05 : 1 }}
          >
            {isRefreshing 
              ? 'Refreshing...' 
              : shouldRefresh 
                ? 'Release to refresh' 
                : 'Pull to refresh'
            }
          </motion.p>
        </div>
      </motion.div>

      {/* Content container with drag gesture */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.3, bottom: 0 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ y: isRefreshing ? threshold : pullDistance }}
        transition={{ 
          y: { 
            type: "spring", 
            stiffness: 300, 
            damping: 30 
          } 
        }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
