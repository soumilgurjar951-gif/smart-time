// src/components/charts/AttendanceChart.jsx
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

export default function AttendanceChart({ data }) {
  const { isDark } = useTheme();

  const chartData = data && data.length > 0 ? data : [
    { subject: 'TOC', secA: 93.3, secB: 91.5 },
    { subject: 'DBMS', secA: 90.0, secB: 88.4 },
    { subject: 'DAA', secA: 94.2, secB: 95.0 },
    { subject: 'SE', secA: 89.5, secB: 92.1 },
    { subject: 'WTC', secA: 91.0, secB: 89.8 },
    { subject: 'Labs', secA: 96.5, secB: 95.2 },
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
            dataKey="subject"
            tick={{ fill: isDark ? '#8FABCE' : '#3D6398', fontSize: 11 }}
            axisLine={{ stroke: isDark ? '#1E3A64' : '#DCE5F0' }}
          />
          <YAxis
            domain={[60, 100]}
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
            formatter={(value) => [`${value}% Attendance`]}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          <Bar
            dataKey="secA"
            name="Section A"
            fill="#2563EB"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="secB"
            name="Section B"
            fill="#60A5FA"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

