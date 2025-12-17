// src/components/StatusPieChart.tsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Contract {
  status?: string;
}

interface Props {
  contracts: Contract[];
}

const COLORS = ["#4caf50", "#ffc107", "#f44336"];

export default function StatusPieChart({ contracts }: Props) {
  const statusCounts = contracts.reduce(
    (acc, curr) => {
      if (curr.status === "Aktiv") acc.aktiv += 1;
      else if (curr.status === "Bald ablaufend") acc.bald += 1;
      else if (curr.status === "Abgelaufen") acc.abgelaufen += 1;
      return acc;
    },
    { aktiv: 0, bald: 0, abgelaufen: 0 }
  );

  const data = [
    { name: "✅ Aktiv", value: statusCounts.aktiv },
    { name: "⚠️ Bald ablaufend", value: statusCounts.bald },
    { name: "❌ Abgelaufen", value: statusCounts.abgelaufen },
  ];

  return (
    <div style={{ width: "100%", height: 300, marginTop: "2rem" }}>
      <h3 style={{ textAlign: "center" }}>📊 Vertragsstatus-Verteilung</h3>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            dataKey="value"
            label
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
