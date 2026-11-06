/**
 * The dotted line from sender to recipient. It echoes the dot-matrix hero on the
 * landing page and is the one animated moment in the send flow: dots light up in
 * sequence each time a corridor loads.
 */
/**
 * The dotted line from sender to recipient. It echoes the dot-matrix hero on the
 * landing page and provides a living animation of cross-border settlement:
 * dots light up in a traveling wave, ripple pings radiate from routing nodes,
 * and a packet glides from sender to recipient.
 */
export default function RouteTrace({
  nodes,
  animateKey,
  loop = true,
}: {
  nodes: string[];
  animateKey?: string;
  loop?: boolean;
}) {
  const width = 360;
  const pad = 22;
  const y = 14;
  const numSegments = Math.max(1, nodes.length - 1);
  const gap = (width - pad * 2) / numSegments;
  const dotsPerSegment = 11;

  // Total cycle timing for the traveling pulse (in seconds)
  const cycleDur = 3.2;
  const travelPerSegment = 0.95;
  const pauseAtNode = 0.2;

  let index = 0;
  const dots: { x: number; i: number; delay: string }[] = [];
  for (let s = 0; s < numSegments; s++) {
    const x0 = pad + s * gap;
    const segmentStart = s * (travelPerSegment + pauseAtNode) + 0.08;
    for (let d = 1; d <= dotsPerSegment; d++) {
      const dotDelay = (segmentStart + (d / (dotsPerSegment + 1)) * travelPerSegment).toFixed(3);
      dots.push({
        x: x0 + (gap / (dotsPerSegment + 1)) * d,
        i: index++,
        delay: `${dotDelay}s`,
      });
    }
  }

  // Calculate packet cx values and keyTimes across all nodes
  const cxPoints: number[] = [];
  const cxKeyTimes: number[] = [];
  const opacityValues: number[] = [];
  const opacityKeyTimes: number[] = [];

  // Start at pad
  cxPoints.push(pad);
  cxKeyTimes.push(0);
  opacityValues.push(0);
  opacityKeyTimes.push(0);

  // Fade in at start
  const tStart = 0.08;
  cxPoints.push(pad);
  cxKeyTimes.push(Number((tStart / cycleDur).toFixed(3)));
  opacityValues.push(1);
  opacityKeyTimes.push(Number((tStart / cycleDur).toFixed(3)));

  // Each intermediate node and arrival
  for (let n = 1; n < nodes.length; n++) {
    const tArrive = (n - 1) * (travelPerSegment + pauseAtNode) + 0.08 + travelPerSegment;
    const xPos = pad + n * gap;

    cxPoints.push(xPos);
    cxKeyTimes.push(Number((tArrive / cycleDur).toFixed(3)));
    opacityValues.push(1);
    opacityKeyTimes.push(Number((tArrive / cycleDur).toFixed(3)));

    if (n < nodes.length - 1) {
      // Pause at intermediate routing node
      const tDepart = tArrive + pauseAtNode;
      cxPoints.push(xPos);
      cxKeyTimes.push(Number((tDepart / cycleDur).toFixed(3)));
      opacityValues.push(1);
      opacityKeyTimes.push(Number((tDepart / cycleDur).toFixed(3)));
    } else {
      // Arrival at destination: linger and fade out
      const tFade = Math.min(cycleDur - 0.2, tArrive + 0.35);
      cxPoints.push(xPos);
      cxKeyTimes.push(Number((tFade / cycleDur).toFixed(3)));
      opacityValues.push(0);
      opacityKeyTimes.push(Number((tFade / cycleDur).toFixed(3)));
    }
  }

  // End of cycle reset
  cxPoints.push(pad);
  cxKeyTimes.push(1);
  opacityValues.push(0);
  opacityKeyTimes.push(1);

  const cxValuesStr = cxPoints.join("; ");
  const cxKeyTimesStr = cxKeyTimes.join("; ");
  const opacityValuesStr = opacityValues.join("; ");
  const opacityKeyTimesStr = opacityKeyTimes.join("; ");

  return (
    <svg
      key={animateKey}
      className="rx-trace"
      data-loop={loop ? "true" : undefined}
      viewBox={`0 0 ${width} 46`}
      role="img"
      aria-label={`Route: ${nodes.join(", then ")}`}
    >
      {/* Small route dots */}
      {dots.map((d) => (
        <circle
          key={d.i}
          className="rx-trace-dot"
          cx={d.x}
          cy={y}
          r={1.6}
          style={{
            ["--i" as string]: d.i,
            ["--delay" as string]: d.delay,
          }}
        />
      ))}

      {/* Ripple pings at routing nodes when animated */}
      {loop &&
        nodes.map((_, n) => {
          const x = pad + n * gap;
          const isEnd = n === nodes.length - 1;
          const isStart = n === 0;
          const tHit = isStart
            ? 0.08
            : (n - 1) * (travelPerSegment + pauseAtNode) + 0.08 + travelPerSegment;
          const tExpand = Math.min(cycleDur, tHit + 0.45);
          const k0 = 0;
          const k1 = Number((tHit / cycleDur).toFixed(3));
          const k2 = Number((tExpand / cycleDur).toFixed(3));
          const k3 = 1;

          return (
            <g key={`ripple-${n}`} className="rx-trace-animated">
              <circle
                cx={x}
                cy={y}
                r={5}
                fill="none"
                stroke={isEnd ? "#17603c" : "#111111"}
                strokeWidth="1.5"
                opacity={0}
              >
                <animate
                  attributeName="r"
                  values="5; 5; 14; 14; 5"
                  keyTimes={`${k0}; ${k1}; ${k2}; ${k2}; ${k3}`}
                  dur={`${cycleDur}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values={`0; ${isEnd ? "0.85" : "0.6"}; 0; 0; 0`}
                  keyTimes={`${k0}; ${k1}; ${k2}; ${k2}; ${k3}`}
                  dur={`${cycleDur}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}

      {/* Traveling light packet with subtle ambient glow */}
      {loop && (
        <g className="rx-trace-animated">
          {/* Ambient soft glow */}
          <circle cy={y} r={7} className="rx-trace-packet-halo" opacity={0}>
            <animate
              attributeName="cx"
              values={cxValuesStr}
              keyTimes={cxKeyTimesStr}
              dur={`${cycleDur}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={opacityValues.map((v) => (v ? 0.16 : 0)).join("; ")}
              keyTimes={opacityKeyTimesStr}
              dur={`${cycleDur}s`}
              repeatCount="indefinite"
            />
          </circle>
          {/* Sharp core bead */}
          <circle cy={y} r={3} className="rx-trace-packet-core" opacity={0}>
            <animate
              attributeName="cx"
              values={cxValuesStr}
              keyTimes={cxKeyTimesStr}
              dur={`${cycleDur}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values={opacityValuesStr}
              keyTimes={opacityKeyTimesStr}
              dur={`${cycleDur}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}

      {/* Static routing nodes with labels */}
      {nodes.map((label, n) => {
        const x = pad + n * gap;
        const anchor = n === 0 ? "start" : n === nodes.length - 1 ? "end" : "middle";
        const tx = n === 0 ? x - 6 : n === nodes.length - 1 ? x + 6 : x;
        const isEnd = n === nodes.length - 1;
        const tArrive = (n - 1) * (travelPerSegment + pauseAtNode) + 0.08 + travelPerSegment;
        const tSettle = Math.min(cycleDur - 0.1, tArrive + 0.5);

        return (
          <g key={`${label}-${n}`}>
            <circle cx={x} cy={y} r={5} fill="#111111">
              {loop && isEnd && (
                <animate
                  attributeName="fill"
                  values="#111111; #111111; #17603c; #17603c; #111111"
                  keyTimes={`0; ${Number((tArrive / cycleDur).toFixed(3))}; ${Number(
                    ((tArrive + 0.05) / cycleDur).toFixed(3)
                  )}; ${Number((tSettle / cycleDur).toFixed(3))}; 1`}
                  dur={`${cycleDur}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
            <text x={tx} y={40} textAnchor={anchor} fontSize="12" fontWeight="500" fill="#3a3a3a">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
