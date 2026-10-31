// src/components/charts/TaskProgressChart.jsx
import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function TaskProgressChart({ data }) {
  const { isDark } = useTheme();

  const chartData = data && data.length > 0 ? data : [
    { name: 'Completed', count: 1, color: '#10b981' },
    { name: 'In Progress', count: 2, color: '#f59e0b' },
    { name: 'Under Review', count: 1, color: '#6366f1' },
    { name: 'Pending', count: 1, color: '#ef4444' },
  ];

  return (
    <div className="w-full h-72 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '12px',
              fontSize: '12px',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
            formatter={(value) => [`${value} Tasks`]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

