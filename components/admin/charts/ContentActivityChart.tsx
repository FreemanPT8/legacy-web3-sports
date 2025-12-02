'use client';

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

type Props = {
  data: {
    date: string;
    lessons: number;
    blog: number;
    courses: number;
  }[];
};

export function ContentActivityChart({ data }: Props) {
  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />

          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />

          <Tooltip />
          <Legend />

          <Bar dataKey="lessons" fill="#3b82f6" name="Lessons" />
          <Bar dataKey="blog" fill="#8b5cf6" name="Blog Posts" />
          <Bar dataKey="courses" fill="#10b981" name="Courses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
