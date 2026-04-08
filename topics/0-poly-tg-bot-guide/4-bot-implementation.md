---
title: "Bot Implementation"
summary: "Walk through the high-level bot architecture and message flow."
ascii_seed: null
---
## Flow
```mermaid
flowchart LR
  U[Telegram user] --> T[Telegram update]
  T --> B[Bot runtime]
  B --> P[Prompt + policy layer]
  P --> M[Market data]
  M --> B
  B --> R[Reply back to user]
```

## Implementation Notes
- keep the transport layer thin
- isolate prompt policy from integration code
- add validation around external data before answering
