// FILE: tools/autostop-lab/src/cli.ts
// #!/usr/bin/env node
import { parseArgs } from "./args";
import { runScan } from "./scan";
import "dotenv/config";


async function main() {
    const argv = process.argv.slice(2);

    const { cmd, opts } = parseArgs(argv);

    if (cmd !== "scan") {
        console.error(`Unknown command: ${cmd ?? "(none)"}`);
        console.error(`Usage: npm run scan -- --video "path/to/video.mp4"`);
        process.exit(1);
    }

    await runScan(opts);
}

main().catch((e: any) => {
    console.error(`Fatal: ${e?.message ?? String(e)}`);
    process.exit(1);
});
