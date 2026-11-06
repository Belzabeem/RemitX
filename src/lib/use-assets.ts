"use client";
import { useEffect, useState } from "react";
import { api } from "./client-api";

export function useAssets(): string[] {
  const [assets, setAssets] = useState<string[]>(["XLM"]);
  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await api<{ assets: string[] }>("/api/stellar/assets");
      if (!ignore && res.ok) setAssets(res.data.assets);
    })();
    return () => { ignore = true; };
  }, []);
  return assets;
}
