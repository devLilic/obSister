// electron/main/stream/streamEvents.ts
import { EventEmitter } from "node:events";
import type { StreamContext } from "../../types/types";

type StreamContextListener = (ctx: StreamContext) => void | Promise<void>;

const emitter = new EventEmitter();

// We expect exactly one "stream context bus" for runtime.
const EVENT_STREAM_CONTEXT_CHANGED = "streamContextChanged";

export function emitStreamContext(ctx: StreamContext): void {
    // Fire-and-forget: we do not await listeners (keeps current behavior semantics)
    emitter.emit(EVENT_STREAM_CONTEXT_CHANGED, ctx);
}

export function onStreamContext(listener: StreamContextListener): () => void {
    emitter.on(EVENT_STREAM_CONTEXT_CHANGED, listener);
    return () => emitter.off(EVENT_STREAM_CONTEXT_CHANGED, listener);
}
