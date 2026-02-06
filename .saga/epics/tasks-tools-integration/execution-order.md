# Execution Order

1. **SAGA Types Migration** (`saga-types-json-migration`) — Foundation types
2. **Story and Epic JSON Storage** (`story-epic-json-storage`) — Read/write utilities
3. **Hydration and Sync Layer** (`hydration-sync-layer`) — Task conversion + sync hooks
4. **Worker Script and Execution Pipeline** (`worker-execution-pipeline`) — End-to-end execution
5. **Skills Migration** (`skills-migration`) — Update all skills/agents
6. **Dashboard Adaptation** (`dashboard-adaptation`) — UI for new format
