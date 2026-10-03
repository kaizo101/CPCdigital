# Browser storage inventory — 3 October 2026

Status: technical inventory and project self-assessment for the public GitHub
Pages demo. This is not a legal guarantee. The question under
[Section 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html) must be
answered **per storage operation and requested function**, not for Local Storage
as a whole; see the [German data protection authorities' guidance](https://www.datenschutzkonferenz-online.de/media/oh/OH_Digitale_Dienste.pdf).
Processing of personal data, if any, is a separate GDPR question.

| Local Storage data | When written | Retention and current cleanup | Open review question |
|---|---|---|---|
| `cpcdigital:browser-persistence-choice` | User actively enables cross-visit storage on the browser setup screen | Removed on opt-out or by the delete control | Keep the wording and control aligned with the exact stored categories. |
| `cpcdigital:bot-roster` | Generated or migrated on game-session setup only after browser opt-in | No age limit; removed on opt-out or by the delete control | Verify that no other browser path writes it without opt-in. |
| `cpcdigital:session-log` | Session starts only after browser opt-in | Last 50 entries; no age limit; removed on opt-out or by the delete control | Verify that no other browser path writes it without opt-in. |
| `cpcdigital-hand-history` | A replay is appended after each completed hand only after browser opt-in | Last 200 hands; no age limit; removed on opt-out or by the delete control | Verify that current-session replays work without persistence. |
| `cpcdigital:debug-mode` | User toggles debug mode | Persists until changed or browser storage is cleared | Is persistence across visits part of the user-requested setting? |
| `replay-session`, `replay-start-index`, `replay-debug` | User opens a separate replay window | Removed on normal close, opt-out/deletion, or when opening falls back to an in-app overlay; interrupted windows can leave data until the next cleanup | Check interrupted-window cleanup in the browser smoke. |

The current client does not use `sessionStorage`. A legacy `replay-${handNum}`
key is read and removed by the replayer, but no current write to it was found;
opt-out/deletion also removes any remaining legacy keys of that form.
The relevant implementation is in
[`bot-roster-store.ts`](../../../packages/client/src/bot-roster-store.ts),
[`hand-replay.ts`](../../../packages/client/src/session/hand-replay.ts),
[`TableScreen.tsx`](../../../packages/client/src/screens/TableScreen.tsx) and
[`App.tsx`](../../../packages/client/src/App.tsx).

## One-pass risk assessment

This is a product/implementation inference against the authorities' criteria,
not a legal determination. Opening the replayer and toggling debug mode are
observable user actions tied to those functions. Their storage still needs
minimal content and reliable cleanup, especially for the replay bridge.

The former automatic, indefinite cross-session writes for bot identities,
session history and replay archive were not confidently indispensable to
playing a hand or viewing the current session's replay. The project owner
chose an explicit browser opt-in instead. Without it, the runner keeps these
data in memory for the open app instance. With it, the choice and future
history are stored; opting out removes the persisted categories, including
legacy data. Existing data are not read when the choice is off and can be
deleted from setup. Electron/Android retain their previous persistence path.

The [privacy notice](../../../packages/client/public/datenschutz.html) now
describes that choice and the separate, user-triggered replay/debug storage.
Code and notice must be verified together in the browser smoke before public
deployment. A generic tracking banner is not implied by this design.
