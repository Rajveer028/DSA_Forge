"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Shared chart primitives.
 *
 * One palette, one grid treatment, one tooltip across every analytics surface,
 * so the dashboard, progress page and faculty analytics read as one system.
 */

export const CHART_COLORS = {
  forge: "#3b82f6",
  ai: "#8b5cf6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#f43f5e",
  muted: "#64748b",
} as const;

export const DIFFICULTY_COLORS = {
  EASY: CHART_COLORS.success,
  MEDIUM: CHART_COLORS.warning,
  HARD: CHART_COLORS.danger,
} as const;

const axisProps = {
  stroke: "currentColor",
  tick: { fontSize: 11, fill: "currentColor" },
  tickLine: false,
  axisLine: false,
} as const;

function ForgeTooltip({
  active,
  payload,
  label,
  suffix,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 text-xs shadow-xl">
      {label !== undefined && (
        <p className="mb-1 font-medium text-text-primary">{String(label)}</p>
      )}
      {payload.map((entry, index) => (
        <p key={index} className="flex items-center gap-2 text-text-muted">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
            aria-hidden
          />
          {entry.name}: <span className="font-medium text-text-primary">{entry.value}{suffix}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ActivityChart({
  data,
  height = 220,
}: {
  data: Array<{ date: string; solved: number; minutes: number }>;
  height?: number;
}) {
  return (
    <div className="text-text-subtle" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="forgeSolvedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.forge} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.forge} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
          <XAxis dataKey="date" {...axisProps} minTickGap={24} />
          <YAxis {...axisProps} allowDecimals={false} width={40} />
          <Tooltip content={<ForgeTooltip />} cursor={{ stroke: CHART_COLORS.forge, strokeOpacity: 0.25 }} />
          <Area
            type="monotone"
            dataKey="solved"
            name="Solved"
            stroke={CHART_COLORS.forge}
            strokeWidth={2}
            fill="url(#forgeSolvedFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DifficultyDonut({
  data,
  height = 200,
}: {
  data: Array<{ name: string; value: number; key: keyof typeof DIFFICULTY_COLORS }>;
  height?: number;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div className="relative text-text-subtle" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={DIFFICULTY_COLORS[entry.key]} />
            ))}
          </Pie>
          <Tooltip content={<ForgeTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-text-primary">{total}</span>
        <span className="text-xs text-text-subtle">solved</span>
      </div>
    </div>
  );
}

export function TopicMasteryChart({
  data,
  height = 260,
}: {
  data: Array<{ topic: string; mastery: number }>;
  height?: number;
}) {
  if (data.length < 3) {
    return (
      <div className="text-text-subtle" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} {...axisProps} />
            <YAxis type="category" dataKey="topic" width={110} {...axisProps} />
            <Tooltip content={<ForgeTooltip suffix="%" />} cursor={{ fill: CHART_COLORS.forge, fillOpacity: 0.08 }} />
            <Bar dataKey="mastery" name="Mastery" fill={CHART_COLORS.forge} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="text-text-subtle" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="currentColor" opacity={0.2} />
          <PolarAngleAxis dataKey="topic" tick={{ fontSize: 10, fill: "currentColor" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Mastery"
            dataKey="mastery"
            stroke={CHART_COLORS.forge}
            fill={CHART_COLORS.forge}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip content={<ForgeTooltip suffix="%" />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreDistributionChart({
  data,
  height = 240,
}: {
  data: Array<{ bucket: string; students: number }>;
  height?: number;
}) {
  return (
    <div className="text-text-subtle" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
          <XAxis dataKey="bucket" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} width={40} />
          <Tooltip content={<ForgeTooltip />} cursor={{ fill: CHART_COLORS.forge, fillOpacity: 0.08 }} />
          <Bar dataKey="students" name="Students" fill={CHART_COLORS.forge} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function QuestionSuccessChart({
  data,
  height = 260,
}: {
  data: Array<{ question: string; solved: number; attempted: number }>;
  height?: number;
}) {
  return (
    <div className="text-text-subtle" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} vertical={false} />
          <XAxis dataKey="question" {...axisProps} />
          <YAxis {...axisProps} allowDecimals={false} width={40} />
          <Tooltip content={<ForgeTooltip />} cursor={{ fill: CHART_COLORS.forge, fillOpacity: 0.08 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="solved" name="Fully solved" stackId="a" fill={CHART_COLORS.success} radius={[0, 0, 0, 0]} />
          <Bar dataKey="attempted" name="Attempted only" stackId="a" fill={CHART_COLORS.warning} radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Year-in-pixels heatmap. Rendered as a plain grid — no chart library needed. */
export function ActivityHeatmap({
  data,
  weeks = 26,
}: {
  data: Array<{ date: string; solved: number }>;
  weeks?: number;
}) {
  const byDate = new Map(data.map((d) => [d.date, d.solved]));
  const days: Array<{ date: string; solved: number }> = [];
  const today = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    days.push({ date: key, solved: byDate.get(key) ?? 0 });
  }

  const columns: Array<typeof days> = [];
  for (let i = 0; i < days.length; i += 7) columns.push(days.slice(i, i + 7));

  function level(solved: number) {
    if (solved === 0) return "bg-surface-hover";
    if (solved === 1) return "bg-forge/30";
    if (solved <= 3) return "bg-forge/55";
    if (solved <= 5) return "bg-forge/75";
    return "bg-forge";
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-1">
        {columns.map((column, index) => (
          <div key={index} className="flex flex-col gap-1">
            {column.map((day) => (
              <div
                key={day.date}
                className={`size-2.5 rounded-[3px] ${level(day.solved)}`}
                title={`${day.date}: ${day.solved} solved`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[0.68rem] text-text-subtle">
        <span>Less</span>
        <span className="size-2.5 rounded-[3px] bg-surface-hover" />
        <span className="size-2.5 rounded-[3px] bg-forge/30" />
        <span className="size-2.5 rounded-[3px] bg-forge/55" />
        <span className="size-2.5 rounded-[3px] bg-forge/75" />
        <span className="size-2.5 rounded-[3px] bg-forge" />
        <span>More</span>
      </div>
    </div>
  );
}
