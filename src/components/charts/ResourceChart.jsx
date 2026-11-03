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
            stroke={isDark ? '#1E3A64' : '#DCE5F0'}
            vertical={false}
          />
          <XAxis
            dataKey="type"
            tick={{ fill: isDark ? '#8FABCE' : '#3D6398', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#1E3A64' : '#DCE5F0' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: isDark ? '#8FABCE' : '#3D6398', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#1E3A64' : '#DCE5F0' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#0B1F3A' : '#ffffff',
              borderColor: isDark ? '#1E3A64' : '#DCE5F0',
              borderRadius: '12px',
              fontSize: '12px',
              color: isDark ? '#f8fafc' : '#0B1F3A',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <Bar dataKey="total" name="Total Allocated" fill="#8FABCE" radius={[4, 4, 0, 0]} />
          <Bar dataKey="inUse" name="Currently Booked" fill="#2563EB" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

