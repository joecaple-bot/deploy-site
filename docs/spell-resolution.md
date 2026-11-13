# Spell resolution

The app uses its existing 2014-style rules. Spell data imported from the spreadsheet is descriptive, not a reliable executable rules definition: it includes default damage dice on utility spells and incorrectly classified spells. Automatic resolution therefore uses explicit definitions in `gameplay_rules.js`.

## Automatic spells

Magic Missile, Fire Bolt, Sacred Flame, Healing Word, Cure Wounds, Burning Hands, Fireball, Shield, Counterspell, Poison Spray, Inflict Wounds, Ray of Frost, Chill Touch, Guiding Bolt, Eldritch Blast, Scorching Ray, and Cone of Cold.

Definitions are normalized before checking action costs, choosing slots, targeting and casting. Cantrip damage scales with character level. Eldritch Blast and Scorching Ray allocate targets and roll each beam separately, spending the casting action and slot once. Each beam has its own reaction window; Counterspell applies to the first window. Canceling target allocation spends nothing. Counterspell or canceling an already-cast effect does not refund casting resources.

Ray of Frost applies a temporary movement penalty, Chill Touch prevents healing, and Guiding Bolt grants and consumes advantage on the next attack. Conditions tied to the caster expire through the shared turn-boundary system. These definitions follow the [2014 spell rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/spells), including the corrected Chill Touch damage and separate Scorching Ray attacks.

## DM outcomes

Other ordinary spells are labeled **DM outcome**. After the caster confirms resource expenditure, the DM opens **Enter spell outcome**, chooses affected creatures and enters damage after saves, healing, a condition and duration, or a narrative ruling. The app applies damage resistance, HP changes and condition markers. Each target may have a different amount. The caster applies a validated ruling once; the DM receives the resulting state.

This is adjudication, not full automation of the remaining catalogue. Summoning, teleportation, forced movement, complex ongoing effects, mixed damage types and additional spell-specific rules still need DM handling. Custom condition labels are markers, not automatic implementations of arbitrary rules. Other reactions beyond Shield and Counterspell retain their existing manual handling. Enemy spell slots retain the existing DM-managed resource model.

## Synchronization and checks

Reaction windows and outcomes travel over both the campaign cloud channel and the legacy relay. Packet IDs prevent duplicate application, per-actor versions reject older state, and ordered cast-window metadata prevents a delayed close from hiding the next beam. These transient commands are not queued for reconnect replay. In-flight casts are not persisted across a page reload or caster disconnection.

`node --test tests/*.test.cjs` includes regression coverage for saves, healing, costs, Counterspell, Shield, enemy casts, multi-beam spells, adjudication validation, duplicate and reordered delivery, and transport failure. Browser smoke testing uses two isolated local clients with a simulated message bridge; it does not verify the production hosting or live network service.
