// FILE: tools/autostop-lab/src/cli.ts
// #!/usr/bin/env node
import "dotenv/config";
import { parseArgs } from "./args";
import { runScan } from "./scan";
import { runValidate } from "./validate";

async function main() {
    const argv = process.argv.slice(2);
    const { cmd, opts } = parseArgs(argv);

    if (cmd === "scan") {
        await runScan(opts);
        return;
    }

    if (cmd === "validate") {
        await runValidate(opts);
        return;
    }

    console.error(`Unknown command: ${cmd ?? "(none)"}`);
    console.error(`Usage:`);
    console.error(`  npm run scan -- --video "path/to/video.mp4"`);
    console.error(`  npm run validate -- --video "path/to/video.mp4" --stopframe "path/to/stop.png"`);
    process.exit(1);
}

main().catch((e: any) => {
    console.error(`Fatal: ${e?.message ?? String(e)}`);
    process.exit(1);
});
