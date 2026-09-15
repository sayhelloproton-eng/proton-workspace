# Benchmark Case｜Canonical ChatGPT Composer

Goal: replay the historical fix `d40d37101ce75ab0a81be1faf0f40a8d7151bd3e` from its parent baseline without reading the final implementation.

Authoritative product requirement: `acceptance/upstream-requirement.md`.

Public verification contract:
- prefer the canonical `#prompt-textarea` ChatGPT composer over earlier fallback textarea/contenteditable nodes;
- the pure selection seam is `export function selectChatGptComposerElement(document: Document)` so selection can be verified without submitting a message;
- query `#prompt-textarea` first; only if it is absent may the implementation query the fallback selector `textarea, [contenteditable="true"]`;
- when the canonical composer exists, fallback lookup must not occur;
- preserve the existing controlled-composer commit/readback/submit-readiness safety behavior.

Measured Decision scope:
- REPLACE `target/packages/execution-browser-extension/src/chatgpt-runtime-adapter.ts`
- REPLACE `target/packages/execution-browser-extension/tests/chatgpt-composer.test.ts`
- `composer-submit.ts` and `carrier-permission.ts` are read-only dependencies.

Constraints:
- no repository clone, install, dependency materialization, browser mutation, release/version change, network work, or Git-history browsing;
- do not read `.hidden-oracle-chatgpt-composer.test.ts` before candidate Apply;
- historical final source/oracle implementation is intentionally absent from this clean replay package;
- reason from acceptance + baseline source, generate complete next-version files, self-review, then use one streaming multi-file envelope and one guarded Apply;
- Verify starts once and runs the candidate test plus hidden oracle together.

Target: ordinary semantic task, 2 changed files, `USER_PERCEIVED_WALL <= 180s`.
