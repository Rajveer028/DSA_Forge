"use client";

import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Picks a problem at random on click rather than during render, so the server
 * and client agree on the markup and the choice changes on every press.
 */
export function RandomProblemButton({ slugs }: { slugs: string[] }) {
  const router = useRouter();
  if (slugs.length === 0) return null;

  return (
    <Button
      onClick={() => router.push(`/practice/${slugs[Math.floor(Math.random() * slugs.length)]}`)}
    >
      <Shuffle className="size-4" />
      Random problem
    </Button>
  );
}
