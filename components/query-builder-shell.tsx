"use client";

import { useEffect, useState } from "react";
import QueryBuilderApp from "./query-builder-app";
import Image from "next/image";

export default function QueryBuilderShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-background text-slate-50">
      <div className={ready ? "opacity-100" : "pointer-events-none opacity-0"}>
        <QueryBuilderApp />
      </div>

      {!ready && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 py-10">
          <div className="flex min-h-screen items-center justify-center">
            <Image
              src="/preview.png"
              alt="Loading..."
              width={50}
              height={50}
              className="animate-pulse"
            />
          </div>
        </div>
      )}
    </div>
  );
}
