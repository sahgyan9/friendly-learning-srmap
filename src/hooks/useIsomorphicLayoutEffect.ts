import { useEffect, useLayoutEffect } from "react";

// useLayoutEffect is unavailable during SSR (prerender build); fall back to
// useEffect there since layout measurement never happens on the server.
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
