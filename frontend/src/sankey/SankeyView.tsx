import { useMemo } from "react";
import { sankey, sankeyLinkHorizontal, sankeyJustify } from "d3-sankey";
import type { Deduction } from "../types";
import {
  buildSankeyData,
  LAYER_TITLES,
  OUTCOME_COLORS,
  highlightedLinkSet,
  isOnSelectedPath,
  type Selection,
} from "./data";
import "./SankeyView.css";

interface Props {
  deductions: Deduction[];
  selection: Selection | null;
  onSelect: (sel: Selection | null) => void;
}

const WIDTH = 1100;
const HEIGHT = 880;
const MARGIN = { top: 36, right: 220, bottom: 16, left: 16 };

const LAYER_COLORS = [
  "#2a3a5a", // type
  "#94221f", // root cause
  "#5a6b3e", // evidence quality
  "#7a5a3a", // accessibility
  "#5a3a5a", // timeliness
  "#3a4a3a", // outcome (overridden per-node by OUTCOME_COLORS)
];

function dollarsCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function nodeColor(node: { layer: number; label: string }): string {
  if (node.layer === 5) {
    return OUTCOME_COLORS[node.label] || LAYER_COLORS[5];
  }
  return LAYER_COLORS[node.layer];
}

export default function SankeyView({ deductions, selection, onSelect }: Props) {
  const layout = useMemo(() => {
    const { nodes, links } = buildSankeyData(deductions);

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

    const result = generator({ nodes: nodesCopy as any, links: linksCopy as any });

    const totalIn = result.links
      .filter((l: any) => l.source.layer === 0)
      .reduce((s: number, l: any) => s + l.value, 0);

    return { nodes: result.nodes, links: result.links, total: totalIn };
  }, [deductions]);

  // For the current selection, compute which links should be highlighted.
  const highlightLinks = useMemo(() => {
    if (!selection) return null;
    const filtered = deductions.filter((d) => isOnSelectedPath(d, selection));
    return highlightedLinkSet(filtered);
  }, [deductions, selection]);

  const linkPath = sankeyLinkHorizontal();

  function clearSelection(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onSelect(null);
  }

  function toggleNode(nodeId: string) {
    if (selection?.kind === "node" && selection.nodeId === nodeId) {
      onSelect(null);
    } else {
      onSelect({ kind: "node", nodeId });
    }
  }

  function toggleLink(source: string, target: string) {
    if (
      selection?.kind === "link" &&
      selection.source === source &&
      selection.target === target
    ) {
      onSelect(null);
    } else {
      onSelect({ kind: "link", source, target });
    }
  }

  return (
    <div className="sankey">
      <h2>Deduction flow — every dollar, traced through five compounding failures</h2>
      <p className="sankey-sub">
        {dollarsCompact(layout.total)} of deductions, traced from type through
        root cause, evidence quality, accessibility, timeliness, and outcome.
        Click a node or band to filter. Click empty space to clear.
      </p>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="sankey-svg"
        onClick={clearSelection}
      >
        {/* Background — captures empty-space clicks */}
        <rect
          x={0}
          y={0}
          width={WIDTH}
          height={HEIGHT}
          fill="transparent"
          onClick={() => onSelect(null)}
        />

        {/* Layer titles across the top */}
        {LAYER_TITLES.map((title, i) => {
          const layerWidth =
            (WIDTH - MARGIN.left - MARGIN.right) / (LAYER_TITLES.length - 1);
          const x = MARGIN.left + i * layerWidth;
          return (
            <text key={i} x={x} y={MARGIN.top - 14} className="sankey-layer-title">
              {title}
            </text>
          );
        })}

        {/* Links */}
        <g className="sankey-links">
          {layout.links.map((link: any, i) => {
            const sourceLayer = link.source.layer;
            const linkKey = `${link.source.id}>>${link.target.id}`;
            const isHighlighted = highlightLinks
              ? highlightLinks.has(linkKey)
              : null;
            const opacity =
              isHighlighted === null ? 0.30 :
              isHighlighted ? 0.65 : 0.04;

            return (
              <path
                key={i}
                d={linkPath(link) || ""}
                stroke={LAYER_COLORS[sourceLayer]}
                strokeWidth={Math.max(1, link.width)}
                fill="none"
                opacity={opacity}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLink(link.source.id, link.target.id);
                }}
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
            const isSelected =
              selection?.kind === "node" && selection.nodeId === node.id;
            const isOnPath = highlightLinks
              ? highlightLinks.has(`${node.id}>>placeholder`) ||
                [...highlightLinks].some(
                  (k) => k.startsWith(`${node.id}>>`) || k.endsWith(`>>${node.id}`)
                )
              : null;
            const opacity =
              isSelected ? 1 :
              isOnPath === null ? 1 :
              isOnPath ? 1 : 0.25;

            return (
              <g key={node.id} opacity={opacity}>
                <rect
                  x={node.x0}
                  y={node.y0}
                  width={node.x1 - node.x0}
                  height={Math.max(1, node.y1 - node.y0)}
                  fill={nodeColor(node)}
                  stroke={isSelected ? "#1a1a1a" : "none"}
                  strokeWidth={isSelected ? 2 : 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNode(node.id);
                  }}
                  className="sankey-node-rect"
                >
                  <title>
                    {node.label}: {dollarsCompact(node.value || 0)}
                  </title>
                </rect>

                {(node.y1 - node.y0) > 8 && (
                  <text
                    x={node.x1 + 6}
                    y={(node.y0 + node.y1) / 2}
                    dy="0.35em"
                    className="sankey-node-label"
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
