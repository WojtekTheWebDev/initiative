import { Board } from "@/components/Board";
import { readWorld } from "@/lib/store";

// The world is read from YAML on every request, never prerendered.
export const dynamic = "force-dynamic";

export default async function Home() {
  const world = await readWorld();
  return <Board world={world} />;
}
