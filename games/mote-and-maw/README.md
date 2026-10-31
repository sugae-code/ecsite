# Mote & Maw

A completely original, self-contained HTML5 arcade game. Steer a luminous creature to graze smaller motes and creatures, avoid larger hunters, and spend 13% of your mass on a defensive pulse. Grow through five stages to bloom. Supports mouse, touch, keyboard and optional generated sound; no external assets, account, analytics or ads.

## Run / test

Serve this folder with any static HTTP server (ES modules require HTTP): `python3 -m http.server 8000` then open `/`. Run simulation tests: `node --test engine.test.mjs`. The production bundle is `index.html`, `style.css`, `game.mjs`, `engine.mjs`.

## Commercial distribution gate

This game is **not approved** by CrazyGames or GameDistribution and currently has **no advertising revenue**. Do not insert third-party ads. CrazyGames Basic Launch disables ads; Full Launch requires platform SDK and QA. GameDistribution requires its SDK, account and QA. No payout or payment details have been supplied or fabricated.

Official requirements and commercial sources (checked 2026-10-31):

- CrazyGames: https://docs.crazygames.com/requirements/gameplay/ ; https://docs.crazygames.com/requirements/technical/ ; https://docs.crazygames.com/requirements/ads/ ; https://docs.crazygames.com/payouts/ ; https://docs.crazygames.com/
- GameDistribution: https://gamedistribution.com/developers/partnership/ ; https://gamedistribution.com/developers/quality-guidelines/ ; https://static.gamedistribution.com/terms/developer.html ; https://gamedistribution.com/developers/faq/general-questions/when-will-i-get-paid/

GameDistribution's published FAQ says PayPal €50 / bank €100, while its 2025-06-19 contract says €100 regardless of payment method. **Treat €100 as the conservative threshold until clarified in an actual agreement.** CrazyGames requires €100. Both require actual payment information before funds can be received. CrazyGames Basic Launch runs 7–21 days without monetization and Full Launch is performance-gated; do not count Basic Launch as income. No user testing or retention evidence yet, and no acceptance is guaranteed.

## Originality and privacy

All code, graphics and sounds were created for this game; no copied third-party assets or algorithm implementations. Local best score uses `localStorage` only. The game does not request, transmit or store personally identifying information. Copyright 2026 the repository owner. All rights reserved.
