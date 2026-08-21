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
    gsap.fromTo(
      elements,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );
  }, { scope: container });

  return <div ref={container} className={className}>{children}</div>;
}
