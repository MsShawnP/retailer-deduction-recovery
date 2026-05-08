import { useMemo, useState } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import type { Deduction } from "../types";
import { buildSankeyData, LAYER_TITLES } from "./data";
import "./SankeyView.css";

interface Props {
  deductions: Deduction[];
}

const WIDTH = 1100;
const HEIGHT = 880;
const MARGIN = { top: 36, right: 220, bottom: 16, left: 16 };

// Layer colors — restrained, Economist-like.
const LAYER_COLORS = [
  "#2a3a5a", // type        — navy
  "#94221f", // root cause  — red (cause is the project's central story)
  "#5a6b3e", // evidence q  — olive
  "#7a5a3a", // accessibility — brown
  "#5a3a5a", // timeliness  — plum
  "#3a4a3a", // outcome     — dark green
];

function dollarsCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function SankeyView({ deductions }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const layout = useMemo(() => {
    const { nodes, links } = buildSankeyData(deductions);

    // d3-sankey resolves link.source/target to node objects when given
    // an id accessor and id-keyed links. Pass our string ids directly.
    const nodesCopy = nodes.map((n) => ({ ...n }));
    const linksCopy = links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }));

    const generator = sankey<any, any>()
      .nodeId((d: any) => d.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(14)
      .nodePadding(10)
      .extent([
        [MARGIN.left, MARGIN.top],
        [WIDTH - MARGIN.right, HEIGHT - MARGIN.bottom],
      ]);

    const result = generator({
      nodes: nodesCopy as any,
      links: linksCopy as any,
    });

    const totalIn = result.links
      .filter((l: any) => l.source.layer === 0)
      .reduce((s: number, l: any) => s + l.value, 0);

    return {
      nodes: result.nodes,
      links: result.links,
      total: totalIn,
    };
  }, [deductions]);

  const linkPath = sankeyLinkHorizontal();

  return (
    <div className="sankey">
      <h2>Deduction flow — every dollar, traced through five compounding failures</h2>
      <p className="sankey-sub">
        {dollarsCompact(layout.total)} of deductions, traced from type through
        root cause, evidence quality, accessibility, timeliness, and outcome.
        Hover a band to inspect.
      </p>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="sankey-svg">
        {/* Layer titles across the top */}
        {LAYER_TITLES.map((title, i) => {
          const layerWidth =
            (WIDTH - MARGIN.left - MARGIN.right) / (LAYER_TITLES.length - 1);
          const x = MARGIN.left + i * layerWidth;
          return (
            <text
              key={i}
              x={x}
              y={MARGIN.top - 12}
              className="sankey-layer-title"
            >
              {title}
            </text>
          );
        })}

        {/* Links */}
        <g className="sankey-links">
          {layout.links.map((link: any, i) => {
            const sourceLayer = link.source.layer;
            const opacity = hovered
              ? link.source.id === hovered || link.target.id === hovered ? 0.55 : 0.08
              : 0.30;
            return (
              <path
                key={i}
                d={linkPath(link) || ""}
                stroke={LAYER_COLORS[sourceLayer]}
                strokeWidth={Math.max(1, link.width)}
                fill="none"
                opacity={opacity}
                onMouseEnter={() => setHovered(link.source.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <title>
                  {link.source.label} → {link.target.label}: {dollarsCompact(link.value)}
                </title>
              </path>
            );
          })}
        </g>

        {/* Nodes */}
        <g className="sankey-nodes">
          {layout.nodes.map((node: any) => {
            const opacity = hovered
              ? node.id === hovered ? 1 : 0.4
              : 1;
            return (
              <g key={node.id} opacity={opacity}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={Math.max(1, node.y1 - node.y0)}
                  fill={LAYER_COLORS[node.layer]}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>
                    {node.label}: {dollarsCompact(node.value || 0)}
                  </title>
                </rect>
                {/* Label — right-side for last layer, left for others */}
                {(node.y1 - node.y0) > 8 && (
                  <text
                    x={node.layer === LAYER_TITLES.length - 1 ? node.x1 + 6 : node.x1 + 6}
                    y={(node.y0 + node.y1) / 2}
                    dy="0.35em"
                    className="sankey-node-label"
                    textAnchor={node.layer === LAYER_TITLES.length - 1 ? "start" : "start"}
                  >
                    {node.label}
                    <tspan className="sankey-node-value">
                      {" "}
                      {dollarsCompact(node.value || 0)}
                    </tspan>
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
