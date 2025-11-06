export default function GlobalError({ error }: { error: unknown }) {
  return (
    <div className="p-4">
      <h1>全局出错啦 🚨</h1>
      <pre>{String(error)}</pre>
    </div>
  );
}
