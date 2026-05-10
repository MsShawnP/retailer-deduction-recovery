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
const HEIGHT = 700;
const MARGIN = { top: 44, right: 260, bottom: 20, left: 32 };

const LAYER_COLORS = [
  "#6BBFC8", // type
  "#26829A", // dispute readiness
  "#053D52", // outcome — overridden per-node by OUTCOME_COLORS
];

const OUTCOME_GROUP: Record<string, string> = {
  "Never filed":        "never_filed",
  "Lost — evidence":    "losses",
  "Lost — no response": "losses",
  "Lost — other":       "losses",
  "Lost — deadline":    "losses",
  "Abandoned":          "abandoned",
  "Pending":            "pending",
  "Won full":           "wins",
  "Won partial":        "wins",
};

function dollarsCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function nodeColor(node: { layer: number; label: string }): string {
  if (node.layer === 2) {
    return OUTCOME_COLORS[node.label] || LAYER_COLORS[2];
  }
  return LAYER_COLORS[node.layer];
}


export default function SankeyView({ deductions, selection, onSelect }: Props) {
  const operationalDeductions = useMemo(
    () => deductions.filter((d) => d.deduction_type !== "slotting"),
    [deductions]
  );

  const slottingStats = useMemo(() => {
    const slotting = deductions.filter((d) => d.deduction_type === "slotting");
    return { count: slotting.length, total: slotting.reduce((s, d) => s + d.amount, 0) };
  }, [deductions]);

  const layout = useMemo(() => {
    const { nodes, links } = buildSankeyData(operationalDeductions);

    const groupTotals = new Map<string, number>();
    for (const l of links) {
      if (l.target.startsWith("2:")) {
        const label = l.target.slice(2);
        const group = OUTCOME_GROUP[label] || "other";
        groupTotals.set(group, (groupTotals.get(group) || 0) + l.value);
      }
    }

    const nodesCopy = nodes.map((n) => ({ ...n }));
    const linksCopy = links.map((l) => ({
      source: l.source,
      target: l.target,
      value: l.value,
    }));

    const generator = sankey<any, any>()
      .nodeId((d: any) => d.id)
      .nodeAlign(sankeyJustify)
      .nodeSort((a: any, b: any) => {
        if (a.layer === 0 && b.layer === 0)
          return (b.value || 0) - (a.value || 0);
        if (a.layer === 1 && b.layer === 1)
          return (b.value || 0) - (a.value || 0);
        if (a.layer === 2 && b.layer === 2) {
          const gA = OUTCOME_GROUP[a.label] || "other";
          const gB = OUTCOME_GROUP[b.label] || "other";
          if (gA !== gB)
            return (groupTotals.get(gB) || 0) - (groupTotals.get(gA) || 0);
          return (b.value || 0) - (a.value || 0);
        }
        return null as any;
      })
      .linkSort(null)
      .nodeWidth(14)
      .nodePadding(12)
      .extent([
        [MARGIN.left, MARGIN.top],
        [WIDTH - MARGIN.right, HEIGHT - MARGIN.bottom],
      ]);

    const result = generator({ nodes: nodesCopy as any, links: linksCopy as any });

    for (const node of result.nodes as any[]) {
      node.sourceLinks.sort((a: any, b: any) => a.target.y0 - b.target.y0);
      node.targetLinks.sort((a: any, b: any) => a.source.y0 - b.source.y0);

      let y = node.y0;
      for (const link of node.sourceLinks) {
        link.y0 = y + link.width / 2;
        y += link.width;
      }

      let ty = node.y0;
      for (const link of node.targetLinks) {
        link.y1 = ty + link.width / 2;
        ty += link.width;
      }
    }

    const totalIn = result.links
      .filter((l: any) => l.source.layer === 0)
      .reduce((s: number, l: any) => s + l.value, 0);

    return { nodes: result.nodes, links: result.links, total: totalIn };
  }, [operationalDeductions]);

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
      <h2>Deduction flow — type, readiness, outcome</h2>
      <p className="section-description">
        Every deducted dollar flows left to right through three stages: what
        type it was, whether Cinderhaven could realistically dispute it, and
        what happened. Band width is proportional to dollars. Click any node
        or band to isolate that path; click again to reset.
      </p>

      {slottingStats.count > 0 && (
        <div className="sankey-slotting-callout">
          {slottingStats.count} placement fees · {dollarsCompact(slottingStats.total)} · negotiated cost of access — not disputable
        </div>
      )}

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
            const stroke = LAYER_COLORS[sourceLayer];

            return (
              <path
                key={i}
                d={linkPath(link) || ""}
                stroke={stroke}
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
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
