import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "./ChartTooltip";

interface AreaChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  color?: string;
  gradientId?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  tooltipFormatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
}

export function AreaChart({
  data,
  dataKey,
  xAxisKey = "name",
  height = 300,
  color = "#EAD07D",
  gradientId = "areaGradient",
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  tooltipFormatter,
  labelFormatter,
}: AreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
        )}
        {showXAxis && (
          <XAxis
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            dy={10}
          />
        )}
        {showYAxis && (
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#666", fontSize: 12 }}
            dx={-10}
            tickFormatter={(value) => value.toLocaleString()}
          />
        )}
        <Tooltip
          content={
            <ChartTooltip
              formatter={tooltipFormatter}
              labelFormatter={labelFormatter}
            />
          }
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
