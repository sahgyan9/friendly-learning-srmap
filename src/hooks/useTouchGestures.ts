import { useEffect, useRef, useState } from 'react';

export interface TouchGestureState {
  isSwipeLeft: boolean;
  isSwipeRight: boolean;
  isSwipeUp: boolean;
  isSwipeDown: boolean;
  isPinching: boolean;
  scale: number;
  distance: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
}

export interface TouchGestureOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  preventDefault?: boolean;
}

export const useTouchGestures = (
  element: React.RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) => {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinch,
    onTap,
    onDoubleTap,
    preventDefault = false,
  } = options;

  const [gestureState, setGestureState] = useState<TouchGestureState>({
    isSwipeLeft: false,
    isSwipeRight: false,
    isSwipeUp: false,
    isSwipeDown: false,
    isPinching: false,
    scale: 1,
    distance: 0,
    direction: null,
  });

  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTap = useRef<number>(0);
  const initialDistance = useRef<number>(0);

  const getTouchPos = (e: TouchEvent) => ({
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
  });

  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (preventDefault) {
      e.preventDefault();
    }

    const touch = getTouchPos(e);
    touchStart.current = { ...touch, time: Date.now() };
    
    // Handle multi-touch (pinch)
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      setGestureState(prev => ({ ...prev, isPinching: true }));
    }

    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStart.current) return;

    if (preventDefault) {
      e.preventDefault();
    }

    // Handle pinch gesture
    if (e.touches.length === 2 && initialDistance.current > 0) {
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const scale = currentDistance / initialDistance.current;
      
      setGestureState(prev => ({
        ...prev,
        scale,
        distance: currentDistance - initialDistance.current,
      }));

      if (onPinch) {
        onPinch(scale);
      }
    }

    const touch = getTouchPos(e);
    touchEnd.current = { ...touch, time: Date.now() };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current || !touchEnd.current) return;

    if (preventDefault) {
      e.preventDefault();
    }

    const deltaX = touchStart.current.x - touchEnd.current.x;
    const deltaY = touchStart.current.y - touchEnd.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    // Reset pinch state
    if (gestureState.isPinching) {
      setGestureState(prev => ({ 
        ...prev, 
        isPinching: false, 
        scale: 1, 
        distance: 0 
      }));
      initialDistance.current = 0;
      return;
    }

    // Check for tap gestures
    if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
      const now = Date.now();
      
      // Double tap detection
      if (now - lastTap.current < 300) {
        if (onDoubleTap) {
          onDoubleTap();
          // Add stronger haptic feedback for double tap
          if ('vibrate' in navigator) {
            navigator.vibrate([50, 50, 50]);
          }
        }
      } else {
        if (onTap) {
          onTap();
          // Add subtle haptic feedback for tap
          if ('vibrate' in navigator) {
            navigator.vibrate(25);
          }
        }
      }
      
      lastTap.current = now;
      return;
    }

    // Check for swipe gestures
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);

    let newState = { ...gestureState };

    if (isHorizontalSwipe && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe left
        newState.isSwipeLeft = true;
        newState.direction = 'left';
        if (onSwipeLeft) {
          onSwipeLeft();
          // Add haptic feedback for swipe
          if ('vibrate' in navigator) {
            navigator.vibrate(75);
          }
        }
      } else {
        // Swipe right
        newState.isSwipeRight = true;
        newState.direction = 'right';
        if (onSwipeRight) {
          onSwipeRight();
          if ('vibrate' in navigator) {
            navigator.vibrate(75);
          }
        }
      }
    } else if (isVerticalSwipe && Math.abs(deltaY) > threshold) {
      if (deltaY > 0) {
        // Swipe up
        newState.isSwipeUp = true;
        newState.direction = 'up';
        if (onSwipeUp) {
          onSwipeUp();
          if ('vibrate' in navigator) {
            navigator.vibrate(75);
          }
        }
      } else {
        // Swipe down
        newState.isSwipeDown = true;
        newState.direction = 'down';
        if (onSwipeDown) {
          onSwipeDown();
          if ('vibrate' in navigator) {
            navigator.vibrate(75);
          }
        }
      }
    }

    setGestureState(newState);

    // Reset gesture state after animation
    setTimeout(() => {
      setGestureState(prev => ({
        ...prev,
        isSwipeLeft: false,
        isSwipeRight: false,
        isSwipeUp: false,
        isSwipeDown: false,
        direction: null,
      }));
    }, 100);

    touchStart.current = null;
    touchEnd.current = null;
  };

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    // Add touch event listeners
    el.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    el.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    el.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, threshold, preventDefault]);

  return gestureState;
};
