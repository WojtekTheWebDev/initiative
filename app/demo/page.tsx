import { readWorld } from "@/lib/store";
import { Board } from "@/components/Board";

export const dynamic = "force-dynamic";

// Temporary page for checking the Board by hand (T3/T5). Remove in T9.
export default async function DemoPage() {
  const world = await readWorld();
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Board world={world} />
    </main>
  );
}
