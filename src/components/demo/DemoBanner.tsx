import Link from "next/link";
import { useDemoMode } from "@/lib/demo-client";

export function DemoBanner() {
  const { isDemo } = useDemoMode();

  if (!isDemo) return null;

  return (
    <div className="rx-demobanner rx-section" role="region" aria-label="Demo mode">
      <div className="rx-sectionhead">
        <h2 className="rx-h2">Demo mode active</h2>
        <p className="rx-small mt-1 text-muted">
          You are viewing a demo of the platform. Everything flows as if millions
          of users are already active and all channels are open.
        </p>
      </div>
      <div className="rx-demostat">
        <div className="rx-demostat-row">
          <span className="rx-demostat-num">42.0M</span>
          <span className="rx-demostat-label">users active on demo</span>
        </div>
        <div className="rx-demostat-row">
          <span className="rx-demostat-num">48</span>
          <span className="rx-demostat-label">live corridors / channels open</span>
        </div>
        <div className="rx-demostat-row">
          <span className="rx-demostat-num">100k</span>
          <span className="rx-demostat-label">simulated transfers today</span>
        </div>
      </div>
      <p className="rx-small mt-3 text-muted">
        Demo login: alice@remitx.dev / Password123!
        {" "}
        <Link href="/login" className="rx-link">
          switch to real sign-up
        </Link>
      </p>
    </div>
  );
}