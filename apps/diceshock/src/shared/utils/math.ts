export const reRange = (progress: number, idx: number, count: number) => {
  const start = (idx - 2) / count;
  const end = (idx - 1) / count;

  if (progress < start) return 0;
  if (progress > end) return 1;

  return (progress - start) / (end - start);
};
