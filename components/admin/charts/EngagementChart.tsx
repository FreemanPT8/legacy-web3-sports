'use client';

import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type Props = {
  data: {
    week: string;
    lessons: number;
    courses: number;
    blog: number;
    xp: number;
  }[];
};

export function EngagementChart({ data }: Props) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

          <XAxis dataKey="week" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />

          <Tooltip />
          <Legend />

          <Line
            type="monotone"
            dataKey="lessons"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Lessons Completed"
            dot={{ r: 3 }}
          />

          <Line
            type="monotone"
            dataKey="courses"
            stroke="#10b981"
            strokeWidth={2}
            name="Courses Started"
            dot={{ r: 3 }}
          />

          <Line
            type="monotone"
            dataKey="blog"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Blog Reads"
            dot={{ r: 3 }}
          />

          <Line
            type="monotone"
            dataKey="xp"
            stroke="#f59e0b"
            strokeWidth={2}
            name="XP Earned"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
