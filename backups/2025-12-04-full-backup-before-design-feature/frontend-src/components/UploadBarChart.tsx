// src/components/UploadBarChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Contract {
  uploadedAt?: string;
}

interface Props {
  contracts: Contract[];
}

export default function UploadBarChart({ contracts }: Props) {
  const monthlyCounts: { [month: string]: number } = {};

  contracts.forEach((c) => {
    if (!c.uploadedAt) return;
    const date = new Date(c.uploadedAt);
    const month = date.toLocaleString("default", { month: "short", year: "numeric" });
    monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
  });

  const data = Object.entries(monthlyCounts).map(([month, count]) => ({
    month,
    count,
  }));

  return (
    <div style={{ width: "100%", height: 300 }}>
      <h3 style={{ textAlign: "center", marginBottom: "0.5rem" }}>📈 Uploads pro Monat</h3>
      <ResponsiveContainer>
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#4f46e5" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
