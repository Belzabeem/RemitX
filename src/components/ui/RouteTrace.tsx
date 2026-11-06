/**
 * The dotted line from sender to recipient. It echoes the dot-matrix hero on the
 * landing page and is the one animated moment in the send flow: dots light up in
 * sequence each time a corridor loads.
 */
export default function RouteTrace({ nodes, animateKey }: { nodes: string[]; animateKey?: string }) {
  const width = 360;
  const pad = 22;
  const y = 14;
  const gap = (width - pad * 2) / (nodes.length - 1);
  const dotsPerSegment = 11;

  let index = 0;
  const dots: { x: number; i: number }[] = [];
  for (let s = 0; s < nodes.length - 1; s++) {
    const x0 = pad + s * gap;
    for (let d = 1; d <= dotsPerSegment; d++) {
      dots.push({ x: x0 + (gap / (dotsPerSegment + 1)) * d, i: index++ });
    }
  }

  return (
    <svg key={animateKey} className="rx-trace" viewBox={`0 0 ${width} 46`} role="img" aria-label={`Route: ${nodes.join(", then ")}`}>
      {dots.map((d) => (
        <circle key={d.i} className="rx-trace-dot" cx={d.x} cy={y} r={1.6} style={{ ["--i" as string]: d.i }} />
      ))}
      {nodes.map((label, n) => {
        const x = pad + n * gap;
        const anchor = n === 0 ? "start" : n === nodes.length - 1 ? "end" : "middle";
        const tx = n === 0 ? x - 6 : n === nodes.length - 1 ? x + 6 : x;
        return (
          <g key={`${label}-${n}`}>
            <circle cx={x} cy={y} r={5} fill="#111" />
            <text x={tx} y={40} textAnchor={anchor} fontSize="12" fontWeight="500" fill="#3a3a3a">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
