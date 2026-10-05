import { readFileSync } from "node:fs";
import path from "node:path";
import { Game } from "@/components/game/Game";
import { parseSave } from "@/lib/save/file";

// The example table, read when the page is built. Your own table lives in the browser.
const example = parseSave(readFileSync(path.join(process.cwd(), "data.example", "initiative.yaml"), "utf8")).world;

export default function Home() {
  return <Game example={example} />;
}
