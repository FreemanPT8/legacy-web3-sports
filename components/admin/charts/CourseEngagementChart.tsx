'use client';

import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type Props = {
  data: {
    course: string;
    completions: number;
  }[];
};

export function CourseEngagementChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Sem dados de envolvimento em cursos.
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="course" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar
            dataKey="completions"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
