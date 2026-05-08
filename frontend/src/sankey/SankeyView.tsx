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

const WIDTH = 1600;
const HEIGHT = 1200;
const MARGIN = { top: 44, right: 260, bottom: 20, left: 32 };

// Single-hue teal gradient that DARKENS L→R, so the darkest teal
// (Timeliness, layer 4) sits adjacent to the categorical outcome
// column for maximum contrast. Outcome nodes are overridden per-bucket
// by OUTCOME_COLORS — red for losses, green for wins, gray for pending.
const LAYER_COLORS = [
  "#9CD7D4", // type        — lightest teal
  "#6BBFC8",
  "#43A4B5",
  "#26829A",
  "#125F77", // timeliness  — darkest teal, abuts outcome
  "#053D52", // outcome     — placeholder; layer 5 is rendered via
              //               OUTCOME_COLORS, so this value is unused
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

// WCAG relative luminance of a #RRGGBB hex color. Used to pick text
// color (dark vs. light) so node labels stay readable when they sit
// on top of the colored bands flowing from the node.
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// Pick a label fill color that contrasts with the band the label sits
// over. Node labels are positioned 6px right of the node rectangle,
// which puts them on top of the bands flowing OUT of that node — those
// bands are colored LAYER_COLORS[node.layer]. Layer 5 (Outcome) is the
// rightmost layer; its labels sit in the right margin on the white
// panel background, so always-dark text is correct there.
//
// For all other layers, we compare the WCAG contrast ratio of dark-ink
// vs. white against the band color and pick the higher. The simple
// "luminance > 0.5 → black" heuristic gets the medium teals wrong;
// they're below 0.5 luminance but still contrast better with dark ink.
const INK_LUMINANCE = relativeLuminance("#0D1B2A");

function labelFillForLayer(layer: number): string {
  if (layer >= LAYER_COLORS.length - 1) return "#0D1B2A";
  const bg = relativeLuminance(LAYER_COLORS[layer]);
  const ratio = (a: number, b: number) =>
    (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const contrastInk = ratio(bg, INK_LUMINANCE);
  const contrastWhite = ratio(bg, 1);
  return contrastInk >= contrastWhite ? "#0D1B2A" : "#FFFFFF";
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
                    fill={labelFillForLayer(node.layer)}
                  >
                    {node.label}
                    <tspan
                      className="sankey-node-value"
                      fill={labelFillForLayer(node.layer)}
                      fillOpacity={0.78}
                    >
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
