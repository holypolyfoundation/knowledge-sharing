---
title: How To Prompt
summary: Explain the role prompt structure plays in consistent bot behavior.
ascii_prompt: Prompt template card stack in command line style
---
<div align="center" data-slide-ascii>
<pre>+-----------------------------+
|  SYSTEM   : role + rules    |
|  CONTEXT  : repo + intent   |
|  TASK     : exact ask       |
|  CHECKS   : tests + limits  |
|  RESULT   : concise output  |
+-----------------------------+</pre>
</div>

## Prompt Pattern
The prompt should tell the bot:
- who it is
- what boundaries matter
- what output shape we expect
- how to verify success

## Why It Works
Better prompts reduce ambiguity, which means less rework and fewer accidental changes outside the intended scope.
