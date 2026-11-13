"use client";
import { createContext, useContext, useEffect, useState } from "react";

const DEMO_COOKIE = "remitx_demo";

interface DemoModeContextValue {
  isDemo: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  isDemo: false,
});

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const checkDemo = () => {
      const cookies = document.cookie
        .split("; ")
        .reduce<Record<string, string>>((acc, cookie) => {
          const eq = cookie.indexOf("=");
          if (eq === -1) return acc;
          acc[cookie.slice(0, eq)] = cookie.slice(eq + 1);
          return acc;
        }, {});
      setIsDemo(cookies[DEMO_COOKIE] === "1");
    };
    checkDemo();
    const id = setInterval(checkDemo, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <DemoModeContext.Provider value={{ isDemo }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext);
}

