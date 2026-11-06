"use client";

import { useEffect, useRef, useId, useState } from "react";
import Notice from "@/components/ui/Notice";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export default function TurnstileWidget({ onVerify, onExpire }: TurnstileWidgetProps) {
  const containerId = `turnstile-${useId().replace(/:/g, "")}`;
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No site key configured: in production the server now fails closed
    // (verifyTurnstileToken returns success:false), so don't hand the form a
    // fake token that could never verify. Show the config notice instead and
    // let the user retry once keys are set.
    if (!SITE_KEY) {
      if (process.env.NODE_ENV !== "production") {
        onVerify("dev-skip-no-site-key");
      }
      return;
    }

    function render() {
      if (!window.turnstile) return;
      const el = document.getElementById(containerId);
      if (!el || widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(el, {
          sitekey: SITE_KEY as string,
          callback: onVerify,
          "expired-callback": onExpire,
          "error-callback": () => {
            setError("Verification challenge failed. Please check your connection and try again.");
            onExpire?.();
          },
          theme: "light",
        });
        setError(null);
      } catch {
        setError("Could not load the verification widget. Please refresh the page.");
      }
    }

    if (window.turnstile) {
      render();
      return;
    }

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setError("Failed to load the verification script. Check your network connection.");
      };
      document.head.appendChild(script);
    }
    window.onTurnstileLoad = render;

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  if (!SITE_KEY) {
    const local = process.env.NODE_ENV !== "production";
    return (
      <Notice tone="caution">
        {local
          ? "Bot verification is skipped locally because NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set."
          : "Bot verification isn't configured, so this form can't be submitted yet."}
      </Notice>
    );
  }

  if (error) {
    return <Notice tone="danger">{error}</Notice>;
  }

  return <div id={containerId} />;
}