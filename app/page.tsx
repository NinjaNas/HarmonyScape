"use client";

import Canvas from "@/components/Canvas";

// Pre-rendering prevents window from existing on first paint

export default function Page(): React.ReactNode {
  return (
    <>
      <Canvas></Canvas>
    </>
  );
}
