import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  activeColor?: string;
  activeIndex?: number;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  barRadius?: number;
  tooltipFormatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
  layout?: "horizontal" | "vertical";
}

export function BarChart({
  data,
  dataKey,
  xAxisKey = "name",
  height = 300,
  color = "#EAD07D",
  activeColor = "#1A1A1A",
  activeIndex,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  barRadius = 8,
  tooltipFormatter,
  labelFormatter,
  layout = "horizontal",
}: BarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={layout}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5E5E5"
            horizontal={!isVertical}
            vertical={isVertical}
          />
        )}
        {showXAxis && (
          <XAxis
            type={isVertical ? "number" : "category"}
            dataKey={isVertical ? undefined : xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            dy={isVertical ? 0 : 10}
            tickFormatter={isVertical ? (value) => value.toLocaleString() : undefined}
          />
        )}
        {showYAxis && (
          <YAxis
            type={isVertical ? "category" : "number"}
            dataKey={isVertical ? xAxisKey : undefined}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            dx={-10}
            tickFormatter={isVertical ? undefined : (value) => value.toLocaleString()}
            width={isVertical ? 80 : 60}
          />
        )}
        <Tooltip
          content={
            <ChartTooltip
              formatter={tooltipFormatter}
              labelFormatter={labelFormatter}
            />
          }
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        <Bar dataKey={dataKey} radius={barRadius}>
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={activeIndex === index ? activeColor : color}
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
