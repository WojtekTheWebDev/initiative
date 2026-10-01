"use client";

import { useRef, useState } from "react";
import { MapCanvas, type MapHandle } from "@/components/map/MapCanvas";
import { fitBounds, worldToScreen } from "@/lib/map/camera";
import { edgeArrow } from "@/lib/map/edge";
import { heroGlyph, monsterGlyph } from "@/lib/map/glyphs";
import { radiusFor, ringPositions, monsterBaseRadius, HERO_BASE_RADIUS } from "@/lib/map/rings";
import type { Pos, Size } from "@/lib/types";

const DUMMIES: { id: string; name: string; size: Size; pos: Pos; heroes: string[] }[] = [
  { id: "a", name: "Search Rewrite", size: "XL", pos: { x: -420, y: 180 }, heroes: ["archer", "warrior"] },
  { id: "b", name: "Flaky CI", size: "M", pos: { x: -180, y: -120 }, heroes: [] },
  { id: "c", name: "Payments Incident", size: "L", pos: { x: -620, y: -260 }, heroes: ["mage"] },
  { id: "d", name: "Hire Backend", size: "M", pos: { x: 260, y: -80 }, heroes: ["commander", "rogue", "bard"] },
  { id: "e", name: "Roadmap Ask", size: "S", pos: { x: 420, y: 200 }, heroes: [] },
  { id: "far", name: "Far Away", size: "S", pos: { x: 2400, y: -1600 }, heroes: [] },
];

export function DemoMap() {
  const map = useRef<MapHandle>(null);
  const [clicked, setClicked] = useState<Pos | null>(null);

  return (
    <MapCanvas
      ref={map}
      initialCamera={(vp) => fitBounds(DUMMIES.slice(0, 5).map((d) => d.pos), vp, 120)}
      onBackgroundClick={setClicked}
      overlay={({ camera, viewport }) => (
        <>
          <div className="pointer-events-auto absolute bottom-3 left-3 rounded bg-black/70 px-3 py-2 font-mono text-xs text-white">
            <div>
              x {camera.x.toFixed(0)} y {camera.y.toFixed(0)} scale {camera.scale.toFixed(2)}
            </div>
            <div>
              viewport {viewport.width}x{viewport.height}
              {clicked && ` | clicked ${clicked.x.toFixed(0)}, ${clicked.y.toFixed(0)}`}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {DUMMIES.map((d) => (
                <button
                  key={d.id}
                  className="rounded bg-white/20 px-1.5 hover:bg-white/30"
                  onClick={() => map.current?.flyTo(d.pos)}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
          <svg className="absolute inset-0 h-full w-full">
            {DUMMIES.map((d) => {
              const a = edgeArrow(
                worldToScreen(camera, d.pos),
                { x: 0, y: 0, width: viewport.width, height: viewport.height },
                22,
              );
              if (!a) return null;
              return (
                <g
                  key={d.id}
                  transform={`translate(${a.x} ${a.y}) rotate(${(a.angle * 180) / Math.PI})`}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onClick={() => map.current?.flyTo(d.pos)}
                >
                  <title>{d.name}</title>
                  <path d="M12 0 L-8 -9 L-8 9 Z" fill="#dc2626" />
                </g>
              );
            })}
          </svg>
        </>
      )}
    >
      {DUMMIES.map((d) => {
        const r = monsterBaseRadius(d.size);
        const ring = ringPositions(d.pos, d.heroes.length, radiusFor(d.size, d.heroes.length));
        return (
          <g key={d.id}>
            <g data-figure="" style={{ cursor: "pointer" }}>
              <circle
                cx={d.pos.x}
                cy={d.pos.y}
                r={r}
                fill={d.pos.x < 0 ? "#fde2dc" : "#dce6fb"}
                stroke={d.pos.x < 0 ? "#b4432c" : "#2f5fb3"}
                strokeWidth={3}
              />
              <text
                x={d.pos.x}
                y={d.pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={r * 1.1}
              >
                {monsterGlyph(d.size)}
              </text>
              <text
                x={d.pos.x}
                y={d.pos.y + r + 16}
                textAnchor="middle"
                fontSize={13}
                fill="currentColor"
              >
                {d.name}
              </text>
            </g>
            {ring.map((p, i) => (
              <g key={i} data-figure="">
                <circle cx={p.x} cy={p.y} r={HERO_BASE_RADIUS} fill="#fff" stroke="#555" strokeWidth={2} />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={18}
                >
                  {heroGlyph(d.heroes[i])}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </MapCanvas>
  );
}
