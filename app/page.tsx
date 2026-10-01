import { alive, unfought } from "@/lib/domain";
import { readWorld } from "@/lib/store";
import { ActionsTestPanel } from "./_dev/ActionsTestPanel";

// The world is read from YAML on every request, never prerendered.
export const dynamic = "force-dynamic";

export default async function Home() {
  const world = await readWorld();

  // TODO(T5): replace this placeholder with <Board world={world} /> and remove app/_dev/.
  const living = alive(world.monsters);
  const gaps = unfought(world);
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-semibold tracking-tight">Initiative</h1>
      <ul className="text-sm" data-testid="counts">
        <li>Living monsters: {living.length}</li>
        <li>Heroes: {world.heroes.length}</li>
        <li>Unfought: {gaps.length}</li>
      </ul>
      <ActionsTestPanel world={world} />
    </main>
  );
}
