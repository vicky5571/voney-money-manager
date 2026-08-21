'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export function AnimatedPage({ children, className }: { children: React.ReactNode; className?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!container.current) return;
    const elements = container.current.querySelectorAll('[data-animate]');
    if (elements.length === 0) return;

    // Fast, smooth, non-blocking entrance without long blank delay
    gsap.fromTo(
      elements,
      { opacity: 0.7, y: 8 },
      { opacity: 1, y: 0, duration: 0.25, stagger: 0.04, ease: 'power2.out', clearProps: 'all' }
    );
  }, { scope: container });

  return <div ref={container} className={className}>{children}</div>;
}
