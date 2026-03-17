# Analysis passthrough and bottleneck learnings

- Non-recipe logistics passthrough nodes should distribute resource supply across all outgoing edges that can carry that resource, not per output port, or multi-output nodes can duplicate throughput.
- External-cap bottleneck detection should be evaluated at machine input demand points with upstream traversal, so capped terminal limits are still reported when flow passes through intermediate logistics nodes.
