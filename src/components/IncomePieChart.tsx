import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper } from '@mantine/core';
import type { Mule } from '../types';
import { getMuleIncome } from '../modules/income';

const COLORS = [
  '#228be6', '#40c057', '#fab005', '#fd7e14', '#be4bdb',
  '#15aabf', '#e64980', '#7950f2', '#82c91e', '#f76707',
  '#4dabf7', '#69db7c', '#ffd43b', '#ff922b', '#cc5de8',
  '#3bc9db', '#f06595', '#9775fa', '#a9e34b', '#e8590c',
];

interface ChartDataItem {
  name: string;
  value: number;
  formatted: string;
  muleId: string;
  fill: string;
}

interface IncomePieChartProps {
  mules: Mule[];
  abbreviated: boolean;
  onSliceClick?: (muleId: string) => void;
}

export function IncomePieChart({ mules, abbreviated, onSliceClick }: IncomePieChartProps) {
  const data: ChartDataItem[] = mules
    .filter((m) => m.selectedBosses.length > 0)
    .map((m, i) => {
      const { raw, formatted } = getMuleIncome(m.selectedBosses, abbreviated)
      return {
        name: m.name || 'Unnamed Mule',
        value: raw,
        formatted,
        muleId: m.id,
        fill: COLORS[i % COLORS.length],
      }
    });

  if (data.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <div style={{ textAlign: 'center', color: 'var(--mantine-color-dimmed)' }}>
          Add mules and select bosses to see the income breakdown
        </div>
      </Paper>
    );
  }

  return (
    <Paper p="md" radius="md" withBorder>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            innerRadius={60}
            paddingAngle={2}
            onClick={(_event, index) => {
              if (onSliceClick && data[index]) {
                onSliceClick(data[index].muleId);
              }
            }}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            formatter={(_value, _name, entry) => {
              const item = data.find((d) => d.muleId === entry?.payload?.muleId)
              return item?.formatted ?? String(_value)
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Paper>
  );
}