// Keep the runtime's lazy-loaded WASM/module assets on the same pinned release.
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
ort.env.wasm.numThreads = 1;
