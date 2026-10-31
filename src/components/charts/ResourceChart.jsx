// src/components/charts/ResourceChart.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export default function ResourceChart({ data }) {
  const { isDark } = useTheme();

  const chartData = data && data.length > 0 ? data : [
    { type: 'Classrooms', total: 2, inUse: 2 },
    { type: 'Labs', total: 2, inUse: 1 },
    { type: 'Seminar Hall', total: 1, inUse: 1 },
    { type: 'Projector', total: 1, inUse: 0 },
    { type: 'GPU Rig', total: 1, inUse: 1 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#334155' : '#e2e8f0'}
            vertical={false}
          />
          <XAxis
            dataKey="type"
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              borderColor: isDark ? '#334155' : '#e2e8f0',
              borderRadius: '12px',
              fontSize: '12px',
              color: isDark ? '#f8fafc' : '#0f172a',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="total" name="Total Allocated" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="inUse" name="Currently Booked" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

