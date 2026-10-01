---
name: grill
description: Interview the user relentlessly about a plan, decision, or design they hold until every branch of the decision tree is resolved. Use when the user wants to stress-test their thinking, mentions "grill", or a plan needs its gaps and assumptions resolved before work starts. Not for open-ended idea generation - grilling needs a position to attack, so a problem with no position yet goes to the brainstorm skill first.
argument-hint: "[topic | plan | issue URL]"
---

<!-- Repo's version of https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md skill -->

Interview the user relentlessly until you reach a shared understanding. Map the plan as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled - the questions you can ask *now* without guessing at answers you haven't heard yet. Ask the frontier via AskUserQuestion, your recommended answer as the first option; split a large frontier across consecutive calls, each call grouping correlated questions. A question whose answer depends on another question still open in this round belongs to a later round, not this one.

Each round the user answers reshapes the tree - settled decisions push the frontier outward and unblock the questions that depended on them. Recompute the frontier and ask the next round.

Finding *facts* is your job, never the user's. When a frontier question needs a fact from the environment - the codebase, the linked issue, the docs of whatever the plan touches - dispatch a sub-agent to find it rather than asking. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report - ask the rest of the frontier now. The *decisions* are the user's - put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on the plan until the user confirms shared understanding. Then close with a self-contained summary - decisions taken, options ruled out, remaining unknowns, and the key facts you found - so a fresh session can pick the plan up without this conversation.
