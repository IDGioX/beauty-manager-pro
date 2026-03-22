import { useState, useEffect, useRef } from 'react';

interface UseAnimatedCounterOptions {
  duration?: number;
  delay?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'spring';
}

/**
 * Hook per animare un contatore numerico
 * Il numero "sale" dal valore iniziale a quello finale con un effetto fluido
 */
export function useAnimatedCounter(
  endValue: number,
  options: UseAnimatedCounterOptions = {}
): number {
  const { duration = 1000, delay = 0, easing = 'easeOut' } = options;
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Funzioni di easing
  const easingFunctions = {
    linear: (t: number) => t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    spring: (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
  };

  useEffect(() => {
    if (endValue === 0) {
      setCount(0);
      return;
    }

    const startAnimation = () => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp;
        }

        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easingFunctions[easing](progress);

        setCount(Math.round(easedProgress * endValue));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timeoutId);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      startTimeRef.current = null;
    };
  }, [endValue, duration, delay, easing]);

  return count;
}

/**
 * Hook per animare un valore monetario con formattazione
 */
export function useAnimatedCurrency(
  endValue: number,
  options: UseAnimatedCounterOptions = {}
): string {
  const count = useAnimatedCounter(endValue, options);
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(count);
}
