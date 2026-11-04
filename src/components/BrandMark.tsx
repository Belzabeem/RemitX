export default function BrandMark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size * (16 / 18)}
      height={size}
      viewBox="0 0 16 18"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M9 9c-3-1-5-4-6-9H0c1 5 3 8 6 9-3 1-5 4-6 9h3c1-5 3-8 6-9zM7 9c3-1 5-4 6-9h3c-1 5-3 8-6 9 3 1 5 4 6 9h-3c-1-5-3-8-6-9z" />
    </svg>
  );
}
