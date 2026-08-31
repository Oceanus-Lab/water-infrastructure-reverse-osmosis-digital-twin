import { ArrowLeftRight } from "lucide-react";

/**
 * States plainly that the user's assumptions reverse the default advice (FR-017).
 *
 * Driven by the server's `recommendation_flipped`, not by comparing recommendations on the
 * client: the server recomputes the default case alongside the overridden one, so it is the
 * only place that can tell a genuine reversal from a differently-worded same answer.
 */
export function RecommendationFlipNotice({ flipped }: { flipped: boolean }) {
  if (!flipped) return null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
      <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
      Recommendation changed — your assumptions reverse the default advice.
    </p>
  );
}
