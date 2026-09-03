import Link from "nlite/link";
import { cn } from "@/lib/utils";

export function BrandMark({
  href,
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  compact?: boolean;
}) {
  const mark = (
    <span className={cn("track-wordmark text-foreground", compact && "text-sm", className)}>
      Trackr
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex items-baseline text-foreground no-underline">
      {mark}
    </Link>
  );
}
