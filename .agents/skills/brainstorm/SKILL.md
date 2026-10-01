---
name: brainstorm
description: Generate and weigh options for a problem you cannot state as one sentence yet - the divergent counterpart to grill.
argument-hint: "[the problem, or empty: what this session has been circling]"
---

<!-- Repo's version of https://github.com/obra/superpowers/tree/main/skills/brainstorming and https://github.com/EveryInc/compound-engineering-plugin/tree/main/skills/ce-ideate skills -->

A problem has arrived without a solution. **Diverge**: you propose the options, the user reacts and picks one. Who holds the position decides which skill this is - here you talk, in grill the user talks. Litmus test: can the user state what they want to build in one sentence? If yes, there is a position to attack and nothing to generate - say so and use the grill skill instead.

## Ground before generating

Read this codebase before proposing anything: the packages the problem touches, the seam a change would land on, the thing that already exists and nobody remembered. Dispatch sub-agents in parallel where the surface is wide, each reporting back the files it read - that is what an option's basis cites. An option that names no file, package, or constraint from this repo is advice any chat window could have given.

## Generate wide, then cut

Your first options are the obvious ones. Treat them as warm-up, keep generating past them, then kill most of what you have. Only the **survivors** reach the user, each rejection summarised in one line - presenting everything you generated hides the judgement the user came for.

Vary the lens deliberately instead of producing five shades of one idea: remove or invert the painful step rather than easing it, flip a constraint (no budget, ten times the traffic, a single user), borrow the shape from a subsystem here that already solved something structurally similar.

Every survivor carries:

- what changes, in this repo's terms - the package, the seam, the layer
- its **basis**: the file, ticket, or measurement that makes it more than a hunch
- what it costs, and what choosing it rules out

YAGNI ruthlessly - an option carrying a feature the problem didn't ask for is a worse option, not a richer one.

Put the shortlist to the user with AskUserQuestion, your recommendation first and why. Three or four survivors, no more: a shortlist that doesn't fit one call is a cut you stopped halfway. A rejection is information about the problem - fold it in and generate again rather than re-arguing the option.

## Stop at the direction

The deliverable is one sentence the user has agreed to. Building it - code, branch, ticket - belongs to the next skill on the user's next prompt.

## Close

Name where the direction feeds next and let the user run it: the grill skill sharpens it until the ticket writes itself.
