import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

interface ObsPoint { date: string; value: number }

interface MiniSparklineProps {
  data: ObsPoint[];
  color?: string;
  height?: number;
  showTooltip?: boolean;
}

export function MiniSparkline({ data, color = "#60a5fa", height = 40, showTooltip = false }: MiniSparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {showTooltip && (
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "8px", fontSize: 11 }}
            labelFormatter={(label) => formatDate(label)}
            formatter={(val: number) => [val.toFixed(2), ""]}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
