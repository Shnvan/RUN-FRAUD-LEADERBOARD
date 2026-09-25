"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

type TurnstileOptions = {
  sitekey: string;
  size: "normal" | "compact";
  theme: "light";
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [size, setSize] = useState<"normal" | "compact">("normal");

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setSize(query.matches ? "compact" : "normal");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!loaded || !window.turnstile || !container.current) return;
    const widgetId = window.turnstile.render(container.current, {
      sitekey: siteKey,
      size,
      theme: "light",
    });
    return () => window.turnstile?.remove(widgetId);
  }, [loaded, siteKey, size]);

  return <div className="min-w-0">
    <Script
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
      onLoad={() => { setLoadError(false); setLoaded(true); }}
      onReady={() => { setLoadError(false); setLoaded(true); }}
      onError={() => setLoadError(true)}
    />
    <div ref={container} />
    {loadError && <p role="alert" className="mt-2 text-xs font-medium">Human verification could not load. Check your connection and try again.</p>}
  </div>;
}
