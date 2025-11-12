'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ContentTrackerProps {
  contentId: string;
  contentType: 'lesson' | 'blog';
  xpReward: number;
  onComplete?: (xpEarned: number) => void;
  children: React.ReactNode;
}

export function ContentTracker({
  contentId,
  contentType,
  xpReward,
  onComplete,
  children
}: ContentTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasScrolled100, setHasScrolled100] = useState(false);
  const [dwellTime, setDwellTime] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;

    const storageKey = `content_${contentType}_${contentId}_${user.id}`;
    const completed = localStorage.getItem(storageKey);

    if (completed) {
      setHasCompleted(true);
      return;
    }

    let dwellInterval: NodeJS.Timeout;
    let observerInstance: IntersectionObserver;

    const startTracking = () => {
      if (isTracking) return;
      setIsTracking(true);

      dwellInterval = setInterval(() => {
        setDwellTime((prev) => {
          const newTime = prev + 1;

          if (newTime >= 60 && hasScrolled100 && !hasCompleted) {
            completeContent();
          }

          return newTime;
        });
      }, 1000);
    };

    const stopTracking = () => {
      setIsTracking(false);
      if (dwellInterval) {
        clearInterval(dwellInterval);
      }
    };

    const completeContent = async () => {
      if (hasCompleted) return;

      setHasCompleted(true);
      localStorage.setItem(storageKey, 'true');

      try {
        const endpoint = contentType === 'lesson'
          ? `/api/lessons/${contentId}/complete`
          : `/api/blog/${contentId}/read`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, xpEarned: xpReward })
        });

        const data = await response.json();

        if (data.success) {
          toast({
            title: `+${xpReward} XP Earned!`,
            description: `You've completed this ${contentType}. Total XP: ${data.newTotal}`,
          });

          if (onComplete) {
            onComplete(xpReward);
          }
        }
      } catch (error) {
        console.error('Failed to track completion:', error);
      }
    };

    const handleScroll = () => {
      if (!containerRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage >= 0.99) {
        setHasScrolled100(true);
      }
    };

    observerInstance = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startTracking();
          } else {
            stopTracking();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observerInstance.observe(containerRef.current);
      containerRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      stopTracking();
      if (observerInstance && containerRef.current) {
        observerInstance.unobserve(containerRef.current);
      }
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [user, contentId, contentType, xpReward, hasScrolled100, hasCompleted, isTracking]);

  return (
    <div ref={containerRef} className="relative">
      {children}
      {user && !hasCompleted && (
        <div className="fixed bottom-4 right-4 bg-white border-2 border-blue-600 rounded-lg p-4 shadow-lg z-50">
          <div className="text-sm font-semibold mb-2">Reading Progress</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${hasScrolled100 ? 'bg-green-600' : 'bg-gray-300'}`} />
              <span>Scroll to bottom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${dwellTime >= 60 ? 'bg-green-600' : 'bg-gray-300'}`} />
              <span>Read for 60s ({dwellTime}s)</span>
            </div>
          </div>
          {hasScrolled100 && dwellTime >= 60 && (
            <div className="mt-2 text-green-600 font-semibold text-xs">
              +{xpReward} XP Earned!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
