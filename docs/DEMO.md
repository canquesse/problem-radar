# First demo: three behaviors on real data

The pilot has to prove three things before it collects more data. Each one is covered by an automated test **and** can be checked on the live site against real GitHub data. Card links open the live card; the state may have moved on since this was written, and the card's history will show why.

## 1. Two independent reports land on the right card

**Test:** `two independent reports of the same failure merge into one card` and `explicit "duplicate of" links merge clusters` in [`test/scenarios.test.js`](../test/scenarios.test.js). Unrelated failures that only share an error template stay apart (`generic error templates do not merge unrelated failures`).

**Live:** [Popular checkpoints are rejected for assistant-only loss](https://canquesse.github.io/problem-radar/#card/c-3a39ffa4e119). Two people filed separate TRL issues, [#7962](https://github.com/huggingface/trl/issues/7962) and [#8095](https://github.com/huggingface/trl/issues/8095), with the same `ValueError: The chat template is not training-compatible…`. The radar merged them on the shared error signature, and the card reads "2 first-hand cases, 0 verified teams". Neither reporter linked a project of their own, so the radar does not claim a team.

The first live run also showed why this rule needs care: three *different* `AttributeError`s were merged because quoted class names were stripped from the signature. That was fixed the same day, and a regression test now guards it.

## 2. A released fix closes the card at the right moment, and not before

**Test:** `merged but unreleased fix is "Fix coming"…` walks one card through every trap: a release published before the merge, a later release that does not contain the merge commit, and a pre-release. None of them resolves the card. Only the stable release whose tag contains the merge commit does, and it does so exactly once. Related tests cover beta tags without the pre-release flag, partial fixes, reopened issues and "still happening" reports.

**Live:**
- [MiniMax-M3.1-Flash fails on nightly with transformers 5.23.0](https://canquesse.github.io/problem-radar/#card/c-e31cb8b28f32) is in **Fix coming**. A comment on [vllm#67911](https://github.com/vllm-project/vllm/issues/67911) names the fix, [vllm#67215](https://github.com/vllm-project/vllm/pull/67215), which is merged, but no vLLM release contains it yet. The hourly sync checks each new release with the compare API and resolves the card when a release does.
- [Chat API call violates the OpenAI specification if the tool has no parameters](https://canquesse.github.io/problem-radar/#card/c-dd3136cbc353) moved **Fix coming → Resolved** on a later sync, once the compare API confirmed that a llama_index release tag contains the merge commit of [llama_index#21389](https://github.com/run-llama/llama_index/pull/21389).
- The TRL card from behavior 1 is **Resolved** because the [v1.18.2 release notes](https://github.com/huggingface/trl/releases/tag/v1.18.2) reference the fixing PR [trl#8467](https://github.com/huggingface/trl/pull/8467).

## 3. You can see why you were notified by opening the source

**Test:** `notifications fire only on state transitions and explain themselves`. A new card is not a notification, new evidence that leaves the state unchanged is not one either, and a transition carries a reason plus the URL of the exact record that caused it.

**Live:** open any card and look at **Why it is in this state** and **State history**. For the llama_index card above, the transition links straight to the release that proved the fix. Follow a card (☆) and the *Following* tab lists only its transitions since your last visit, each with an *Open source ↗* link. The [Changelog](https://canquesse.github.io/problem-radar/#changes) shows every transition across all cards.
