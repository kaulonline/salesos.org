interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; [key: string]: any }>;
  label?: string | number;
  formatter?: (value: number, name: string) => string;
  labelFormatter?: (label: string) => string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const formattedLabel = labelFormatter ? labelFormatter(label as string) : label;
  const value = payload[0].value as number;
  const name = payload[0].name as string;
  const formattedValue = formatter ? formatter(value, name) : value.toLocaleString();

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-xl px-4 py-3 shadow-lg border border-white/50">
      <p className="text-xs text-[#666] mb-1">{formattedLabel}</p>
      {payload.map((entry: any, index: number) => {
        const entryValue = entry.value as number;
        const entryName = entry.name as string;
        const displayValue = formatter ? formatter(entryValue, entryName) : entryValue.toLocaleString();
        return (
          <p key={index} className="text-lg font-semibold text-[#1A1A1A]">
            {displayValue}
          </p>
        );
      })}
    </div>
  );
}
