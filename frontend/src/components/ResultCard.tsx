// src/components/ResultCard.tsx
export default function ResultCard({
    title,
    content,
  }: {
    title: string;
    content: string;
  }) {
    return (
      <div
        style={{
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
          background: "#1a1a1a",
        }}
      >
        <h3 style={{ color: "#00bcd4" }}>{title}</h3>
        <p>{content}</p>
      </div>
    );
  }
  