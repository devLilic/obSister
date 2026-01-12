// FILE: electron/main/features/autoStop/decisionEngine.ts
import { logAction } from "../../config/logger";

export class DecisionEngine {
    private hits: number[] = [];
    private cooldownUntil = 0;

    constructor(
        private maxDistance: number, // <= this means "match"
        private requiredHits: number,
        private windowSec: number,
        private cooldownSec: number
    ) {}

    register(distance: number): boolean {
        const now = Date.now();
        if (now < this.cooldownUntil) return false;

        if (distance <= this.maxDistance) {
            this.hits.push(now);
            this.hits = this.hits.filter(t => now - t <= this.windowSec * 1000);
            logAction("autostop_decision_engine_hit", { 
                hitsCount: this.hits.length, 
                requiredHits: this.requiredHits 
            });
        }

        if (this.hits.length >= this.requiredHits) {
            this.hits = [];
            this.cooldownUntil = now + this.cooldownSec * 1000;
            return true;
        }

        return false;
    }
}
