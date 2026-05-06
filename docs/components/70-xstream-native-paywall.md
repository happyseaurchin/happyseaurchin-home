# xstream-Native Paywall — Protocol & Reference Build Spec

**Target builders:** Claude Code (reference ticketing agent + verifier daemon), xstream-play maintainers (client affordance)
**Status:** v0.1 — ready for execution
**Companion to:** `protocol-xstream-frame.md`, `protocol-pscale-beach-v2.md`

---

## 0. What this is

A protocol convention plus reference implementation that lets any frame-owner on the beach paywall participation in their `sed:` collectives — without any central authority.

The pattern: payment buys a *grain* from a frame-owner-chosen ticketing agent. Registration in a paywalled `sed:` collective requires the new member to reference a valid grain. From that point on, the existing `bsp()` face-and-tier authorisation does the rest. No new substrate primitives. No central toll-booth. No platform fees.

This spec covers (a) the protocol convention itself, (b) the reference ticketing agent service that anyone can fork and deploy, (c) the verifier daemon contract, (d) the xstream-play affordance contract, and (e) frame-owner onboarding.

---

## 1. Design constraints

These are non-negotiable. They distinguish a paywall *primitive* from a paywall *platform*:

1. **No central issuer.** Every frame-owner picks their own ticketing agent. Running our own is one option; running yours is equally valid and equally well-supported.
2. **No central client.** xstream-play reads `_tickets` metadata per collective and routes to whatever issuer that collective specifies. It does not prefer, rank, badge, or default any issuer.
3. **No protocol-level fees.** The substrate enforces sed: membership and grain validity. It charges nothing. Fees, if any, are between the frame-owner and their payment processor.
4. **No special-cased issuers in bsp-mcp.** A grain from `agent:machus-tickets` is structurally identical to a grain from `agent:alice-tickets`. The substrate cannot tell them apart and must not try.
5. **Forkable in an afternoon.** The reference ticketing agent must be small enough that anyone with a Stripe account and a $5 VPS can stand up their own. If we make it fancy, we lose this.

If a future feature would violate any of the above, it doesn't ship.

---

## 2. Protocol additions

### 2.1 The `_tickets` field on a `sed:` collective

A `sed:` collective that requires payment for membership declares this in a top-level `_tickets` field on its own pscale block. The field is metadata; it does not change how `bsp()` reads or writes the collective.

```json
{
  "_": "sed: cast for thornkeep scene 001",
  "_tickets": {
    "issuer": "agent:machus-tickets",
    "purchase_url": "https://machus.ai/tickets/thornkeep-001/character",
    "face": "character",
    "scope": "frame:thornkeep-001",
    "verifier": "agent:thornkeep-verifier"
  },
  "1": "<member 1 entry>",
  "2": "<member 2 entry>",
  ...
}
```

| Field | Purpose | Required |
|---|---|---|
| `issuer` | Agent whose grains this collective honours as tickets | yes |
| `purchase_url` | Where prospective members go to obtain a ticket | yes |
| `face` | Which CADO face this collective represents (`character`, `author`, `designer`) | yes |
| `scope` | What the ticket authorises — a single frame, a frame pattern (`frame:thornkeep-*`), or a beach (`beach:cyrus.gm.example`) | yes |
| `verifier` | Agent that confirms registrations after grain check; defaults to `issuer` if omitted | no |

A collective without `_tickets` is open — anyone can register. This is the existing default and stays unchanged.

### 2.2 The ticket grain envelope

A ticket is an ordinary grain established via `pscale_grain_reach` from the issuer to the buyer. What makes it a *ticket* is the envelope text. Convention:

```
[ticket face=<face> scope=<scope> expires=<iso8601>]
```

Examples:

```
[ticket face=character scope=frame:thornkeep-001 expires=2026-06-01T00:00:00Z]
[ticket face=author scope=beach:cyrus.gm.example expires=2026-09-01T00:00:00Z]
[ticket face=designer scope=frame:* expires=2026-12-31T23:59:59Z tier=hard]
```

Optional fields:
- `tier=<soft|medium|hard>` — narrows or widens the SMH aperture beyond the face default
- `seats=<n>` — for collectives where one ticket admits multiple agent_ids (rare, but useful for guild-style purchases)
- `nonce=<id>` — for issuer's own deduplication / refund tracking

Revocation is an additional envelope written *to the same grain* later by the issuer:

```
[ticket-revoked at=<iso8601> reason=<short>]
```

A grain with both a `ticket` envelope and a later `ticket-revoked` envelope is **invalid** for verification purposes. Verifiers MUST honour revocation.

### 2.3 The registration ritual extension

Today, registration in a `sed:` collective is a write to the next available position in the collective block, performed by the registering agent. This stays the same for open collectives.

For paywalled collectives, the ritual gains two steps:

**Step A (registrant):** the registering agent writes their entry as usual, including a reference to the grain they hold from the collective's `issuer`:

```json
{
  "_": "I am Brisa, joining as character",
  "agent_id": "agent:brisa",
  "ticket_grain": "*:agent:machus-tickets:grain:abcd1234"
}
```

**Step B (verifier):** the verifier daemon (default: the issuer agent) observes new registrations, walks the referenced grain, checks the envelope (face matches, scope matches, not expired, not revoked), and writes a confirmation envelope onto the registration:

```
[ticket-verified by=agent:thornkeep-verifier at=<iso8601>]
```

If the grain check fails, the verifier writes:

```
[ticket-rejected by=agent:thornkeep-verifier at=<iso8601> reason=<short>]
```

The synthesis daemon (and any face-authorised reader) MUST treat unconfirmed registrations as inert — they do not contribute liquid, do not appear in disc reads, do not gain write authority. This is the substrate enforcement: not "you cannot register" but "your registration is not honoured by the daemon contract until verified."

This two-step ritual lives entirely in `bsp()` writes. No new MCP primitive.

### 2.4 What this means in practice

A user wanting to play a character in `frame:thornkeep-001`:

1. xstream-play loads the collective `sed:thornkeep-001-cast`, sees `_tickets`.
2. User hasn't registered. xstream-play surfaces "Get character ticket" → opens `purchase_url`.
3. User pays through whatever rail the issuer accepts.
4. Issuer's webhook fires. Issuer's webhook handler establishes a grain to the user's `agent_id` with the appropriate `[ticket ...]` envelope.
5. User's xstream-play polls and sees the new grain.
6. xstream-play performs Step A registration on the user's behalf, including the `ticket_grain` reference.
7. Verifier daemon picks up the registration, walks the grain, writes `[ticket-verified]`.
8. User now has a position in the collective. The synthesis daemon honours their liquid. Write affordances unlock.

Total elapsed time when everything is working: under a minute.

---

## 3. Reference ticketing agent — service spec

This is the deployable artefact. CC builds this. Anyone can fork it.

### 3.1 What it is

A small HTTP service that:
- Operates as a pscale agent (its own `agent_id`, secret, keys)
- Accepts purchase requests for one or more configured `sed:` collectives
- Routes payment through a configured rail (Stripe is the reference driver)
- On payment success, establishes a grain to the buyer's agent_id with the correct ticket envelope
- Surfaces a public catalogue page so buyers can see what's on offer
- Handles refunds by writing `[ticket-revoked]` envelopes

### 3.2 Stack

- **Runtime:** Node 22
- **HTTP:** Hono
- **Payment driver interface:** abstract; ship Stripe as the reference driver, leave room for Lightning, manual-bank-transfer, signed-message (gift) drivers
- **pscale access:** HTTP client to a pscale MCP server endpoint (configurable; defaults to the public production instance)
- **Storage:** SQLite via `better-sqlite3` for purchase records, idempotency keys, refund tracking
- **Logging:** pino with secret redaction

### 3.3 Configuration

A single TOML or YAML file declares which collectives this agent issues for. Example:

```yaml
agent:
  id: agent:machus-tickets
  secret_env: TICKET_AGENT_SECRET
  pscale_mcp_url: https://pscale-mcp-server-production.up.railway.app/mcp/v2

products:
  - id: thornkeep-character-30d
    sed: sed:thornkeep-001-cast
    face: character
    scope: frame:thornkeep-001
    duration_days: 30
    price:
      driver: stripe
      stripe_price_id: price_1xxxxx
    description: "Play a character in the Thornkeep scene for 30 days"

  - id: thornkeep-author-90d
    sed: sed:thornkeep-001-authors
    face: author
    scope: beach:machus.ai
    duration_days: 90
    price:
      driver: stripe
      stripe_price_id: price_1yyyyy
    description: "Author content in the Thornkeep world for 90 days"

  - id: thornkeep-character-gift
    sed: sed:thornkeep-001-cast
    face: character
    scope: frame:thornkeep-001
    duration_days: 30
    price:
      driver: gift
      gifters:
        - agent:machus
        - agent:cyrus
    description: "Gifted character access (free, by invitation)"
```

The agent comes up, validates config, and starts serving. Adding a new product is a config edit + restart. No code change.

### 3.4 Repository layout

```
ticketing-agent/
├── src/
│   ├── server.ts                # Hono app
│   ├── routes/
│   │   ├── catalogue.ts         # GET / — public list of products
│   │   ├── purchase.ts          # GET /buy/:product_id — initiates payment
│   │   ├── webhook.ts           # POST /webhook/:driver — payment provider callbacks
│   │   ├── refund.ts            # POST /admin/refund — issues ticket-revoked
│   │   └── health.ts
│   ├── drivers/
│   │   ├── driver.ts            # interface: PaymentDriver
│   │   ├── stripe.ts            # Stripe driver (reference)
│   │   ├── gift.ts              # Gift driver (free, signature-gated)
│   │   └── manual.ts            # Manual driver (bank transfer, marks paid via admin endpoint)
│   ├── lib/
│   │   ├── pscale.ts            # bsp() client
│   │   ├── grain.ts             # establish, revoke, walk
│   │   ├── envelope.ts          # build/parse ticket envelopes
│   │   ├── purchases.ts         # SQLite purchase records
│   │   └── config.ts            # YAML loader + zod validation
│   └── index.ts
├── config/
│   └── agent.yaml               # the config file
├── data/
│   └── purchases.sqlite         # gitignored
├── public/
│   └── (catalogue page styling)
├── .env.example
├── package.json
└── README.md
```

### 3.5 Endpoints

```
GET /
  → HTML catalogue: list of all products, descriptions, prices, "Buy" buttons.

GET /buy/:product_id?agent_id=<buyer_agent_id>
  → Validates agent_id is a well-formed pscale agent reference.
  → Creates a purchase record (status: pending) with idempotency key.
  → Calls product.driver.initiate(purchase) — for Stripe, returns 302 to checkout URL.

POST /webhook/:driver
  → Driver-specific webhook handler.
  → Verifies signature, looks up purchase record, marks paid.
  → Calls grain.establish(buyer_agent_id, envelope) — issues the ticket.
  → Stores grain reference in purchase record.

POST /admin/refund
  body: { purchase_id, reason }
  Auth: admin token (env-configured)
  → Triggers driver.refund(purchase) (for Stripe, calls Stripe refund API).
  → Calls grain.revoke(purchase.grain_ref, reason) — writes [ticket-revoked] envelope.

GET /admin/purchases
  Auth: admin token
  → JSON listing of all purchases for this agent.
```

### 3.6 Payment driver interface

```typescript
interface PaymentDriver {
  name: string;
  initiate(purchase: Purchase): Promise<InitiateResult>;
  // Returns either { redirectUrl } or { instructions } (e.g. for manual transfer).

  verifyWebhook(req: Request): Promise<WebhookResult>;
  // Returns { purchase_id, status: "paid" | "failed" | "ignored" }.
  // Driver is responsible for signature verification.

  refund(purchase: Purchase): Promise<RefundResult>;
  // For drivers that don't support automated refunds, return { manual: true }.
}
```

Three drivers in the reference build:

- **Stripe** — full automation. Initiate creates a Checkout Session, webhook handles `checkout.session.completed`, refund calls the Stripe refund API.
- **Gift** — initiate accepts a signed message from one of the configured `gifters`; no webhook (instant); refund just revokes the grain.
- **Manual** — initiate returns bank transfer instructions; webhook is replaced by an `/admin/mark-paid/:purchase_id` endpoint operated by the agent owner.

Adding a Lightning driver, a Coil driver, or a chain-specific driver is a new file in `drivers/` plus a config entry. No core changes.

### 3.7 Grain establishment

When a webhook confirms payment, the agent issues a grain:

```typescript
const envelope =
  `[ticket face=${product.face} ` +
  `scope=${product.scope} ` +
  `expires=${expiry.toISOString()}` +
  (product.tier ? ` tier=${product.tier}` : '') +
  `]`;

await pscale.bsp({
  agent_id: agent.id,
  block: `grain:${purchase.id}`,
  spindle: '_envelope',
  content: envelope,
});

await pscale.grain_reach({
  from: agent.id,
  to: purchase.buyer_agent_id,
  grain_ref: `grain:${purchase.id}`,
});
```

(Exact MCP tool names and parameter shapes to be confirmed via `tool_search` against `pscale-mcp` at build time. Treat the above as logical pseudocode.)

### 3.8 Idempotency

Every purchase record has an idempotency key (UUID generated at `/buy` time). Webhook handlers check whether the purchase has already been settled before issuing a grain. Re-delivered webhooks must not result in double grants. Payment driver SDK retries are common; this is non-negotiable.

### 3.9 Environment variables

```
TICKET_AGENT_SECRET=          # pscale agent secret
TICKET_AGENT_CONFIG=./config/agent.yaml
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ADMIN_TOKEN=                  # for refunds and mark-paid
PORT=8080
PUBLIC_URL=https://machus.ai/tickets
LOG_LEVEL=info
PURCHASES_DB_PATH=./data/purchases.sqlite
```

### 3.10 Deployment

Same shape as the Macus runtime: Railway / Fly / any VPS with Node and a writable volume. Stripe webhook points at `https://<domain>/webhook/stripe`. Catalogue page is the agent's public face — frame-owners link to specific `/buy/:product_id` URLs from their `_tickets.purchase_url`.

The whole thing fits in a single small container. A frame-owner running their own paywalled collective for the first time should be able to deploy this in an evening.

---

## 4. Verifier daemon — contract

The verifier is a small loop. It watches a configured set of paywalled `sed:` collectives, picks up new unverified registrations, walks the referenced grain, and writes either a `[ticket-verified]` or `[ticket-rejected]` envelope.

### 4.1 Why not let the issuer auto-verify?

The issuer agent and the verifier agent CAN be the same — and `_tickets.verifier` defaults to `_tickets.issuer` if omitted. We split them in spec for two reasons:

- A frame-owner may run multiple paywalled collectives that all accept tickets from a single issuer (their own, or a shared service), but want their *own* verifier so verification trust is local to the frame.
- Verification logic might evolve (require additional checks — e.g. age verification, rate-limit, geographic restrictions) that belong to the frame-owner, not to the issuer.

For the simple case (one frame-owner, their own issuer, their own verifier), it's all one process.

### 4.2 The loop

```
loop:
  for sed_block in watched_collectives:
    registrations = bsp_walk(sed_block, looking_for_unverified_entries)
    for reg in registrations:
      grain = bsp_walk(reg.ticket_grain)
      result = verify(grain, expected_face, expected_scope, now)
      if result.ok:
        bsp_write(sed_block, reg.position, "_envelope",
                  f"[ticket-verified by={verifier.id} at={now}]")
      else:
        bsp_write(sed_block, reg.position, "_envelope",
                  f"[ticket-rejected by={verifier.id} at={now} reason={result.reason}]")
  sleep(poll_interval)
```

Polling interval default: 5 seconds. Realtime substrate notifications (Supabase realtime on `pscale_blocks`) are a faster alternative if available.

### 4.3 Verification rules

A grain is valid as a ticket for a registration iff all of the following hold:

1. The grain is established (returned by `pscale_walk` on the referenced address).
2. The envelope contains a `[ticket ...]` clause.
3. `face` in the envelope matches the collective's `_tickets.face`.
4. `scope` in the envelope is compatible with the collective's `_tickets.scope`. Compatibility:
   - exact match: equal
   - frame pattern (`frame:thornkeep-*`): collective's scope must match the pattern
   - beach scope (`beach:X`): collective's frame must be hosted at agent X
5. `expires` is in the future relative to `now`.
6. There is no later `[ticket-revoked]` envelope on the grain.
7. The grain was established by the agent listed as `_tickets.issuer`.

Failure of any rule produces a `[ticket-rejected]` envelope with a short reason string. The registration row remains in the collective but is treated as inert.

### 4.4 Re-verification on expiry

When a ticket's `expires` time passes, the verifier writes a `[ticket-expired at=<iso8601>]` envelope on the registration. The synthesis daemon and read apertures must check for this — an expired registration is also inert.

A buyer can renew by purchasing another ticket; on grain establishment, they re-submit a Step A registration referencing the new grain (or update their existing entry's `ticket_grain` field). The verifier picks it up and writes a fresh `[ticket-verified]`.

### 4.5 Bundling with the synthesis daemon

For most frame-owners, the synthesis daemon and the verifier are sibling daemons in the same process — they share pscale credentials, configuration, and runtime. Reference implementation should ship them as one binary with separate worker classes. A frame-owner running both Macus and Thornkeep on a single host has one process, two configs, several daemons.

---

## 5. xstream-play affordance — interface contract

This section is the contract that xstream-play must implement to support the paywall pattern. It does not specify how xstream-play implements it — that's the maintainers' call.

### 5.1 What xstream-play must do

For each `sed:` collective the user is interacting with:

1. **Read `_tickets`.** If absent, behave as today (open collective).
2. **Check user's grains.** If the user is not registered, search their grain set for any from `_tickets.issuer` matching `face` and `scope`. If found, attempt Step A registration.
3. **Surface the buy affordance.** If the user is not registered and has no matching grain, render an affordance (button, banner, drawer item) with text drawn from a per-product description and a click target of `_tickets.purchase_url`. The visual prominence of the affordance should be proportional to the user's apparent intent — not in the user's face when they're just browsing solid, but obvious when they attempt to write liquid.
4. **Wait gracefully.** After the user clicks buy, xstream-play returns to the frame and polls (or subscribes) for the user's grain set to update. Reasonable poll interval: 2 seconds for the first 30 seconds, then back off.
5. **Register on grain arrival.** When a matching grain appears, perform Step A registration automatically. Then poll for `[ticket-verified]` envelope.
6. **Unlock affordances.** Once verified, the user's write affordances on the collective become active. Liquid input shows. Vapour transport opens. The buy affordance disappears.
7. **Surface verification failures.** If `[ticket-rejected]` lands instead of `[ticket-verified]`, show the user the `reason` field clearly. Provide a contact path (default: `mailto:` link from the collective's frame-owner passport) for support.

### 5.2 What xstream-play must NOT do

1. **MUST NOT prefer any issuer over another.** A `_tickets.issuer` of `agent:machus-tickets` and `agent:alice-tickets` are visually and behaviourally identical to the client.
2. **MUST NOT cache or hardcode any issuer.** Every collective is read fresh.
3. **MUST NOT introduce a "verified" badge tied to a list of approved issuers.** No allowlists.
4. **MUST NOT take a fee, route the purchase through a paywall server, or interpose itself between the buyer and the issuer's `purchase_url`.** The user goes directly to the issuer.
5. **MUST NOT obscure or misrepresent the issuer.** The buy affordance MUST display the issuer's agent_id (and, where available, their passport's display name) so the user knows whom they're paying.

These prohibitions are what keep the system federated. They're easy to violate without realising.

### 5.3 Observer face is unchanged

The Observer face (`5.4` of the frame protocol) does not require `sed:` membership. It reads solid only and is the "civilised mind" generic-browser view. Most frames make Observer free. A frame-owner *can* paywall the Observer face — by giving the frame's solid blocks restricted read aperture and gating it behind a `sed:observers` collective with `_tickets` — but this is unusual and should be discouraged in defaults. The default observer experience is open.

### 5.4 Coordination

xstream-play is maintained by David and collaborators. The implementation of §5.1 and the discipline of §5.2 lives in that codebase. This spec is the contract; the implementation is theirs.

---

## 6. Frame-owner onboarding

How a frame-owner (Macus, Thornkeep GM, document author, design cell) adds a paywall to one of their collectives:

### Step 1 — Pick or deploy a ticketing agent

Either:
- **Use a hosted issuer** — point at someone else's deployed ticketing agent (a friend's, a co-op's, ours-but-as-one-option). They handle the payments; you trust them to issue grains correctly and refund honestly.
- **Run your own** — fork the reference repo, configure `agent.yaml` with your products, point your domain at it, set up Stripe (or whichever driver). One evening's work.

### Step 2 — Configure the product

In `agent.yaml`, define the product corresponding to your collective:

```yaml
products:
  - id: my-frame-character-30d
    sed: sed:my-frame-cast
    face: character
    scope: frame:my-frame
    duration_days: 30
    price:
      driver: stripe
      stripe_price_id: price_xxxxx
    description: "Play a character in My Frame for 30 days"
```

Restart the agent.

### Step 3 — Add `_tickets` to the collective block

Write to your `sed:my-frame-cast` block:

```json
{
  "_tickets": {
    "issuer": "agent:my-tickets",
    "purchase_url": "https://my-tickets.example/buy/my-frame-character-30d",
    "face": "character",
    "scope": "frame:my-frame"
  }
}
```

This is a one-time `bsp()` write.

### Step 4 — Run the verifier

If your ticketing agent is your own and runs on the same host, enable the verifier worker for `sed:my-frame-cast`. If you're using someone else's issuer, run a small verifier of your own — it just needs to watch your collectives and validate grains. (Reference implementation ships a verifier-only mode for this case.)

### Step 5 — Test and announce

Buy a ticket from your own agent (use a Stripe test card). Verify the grain lands, registration verifies, and your xstream-play client unlocks write affordances. Then put the link out into the world.

That's the whole flow. No platform onboarding, no contract signing, no fees other than what your payment processor charges.

---

## 7. Federation & non-centralisation guarantees

This section is the part of the spec that isn't a build instruction — it's the discipline that keeps the system honest. Anyone reviewing changes to bsp-mcp, xstream-play, or the reference ticketing agent should read this first.

### 7.1 The substrate stays neutral

bsp-mcp does not know what a ticket is. From its perspective, a ticket grain is a grain like any other; a `_tickets` field is metadata it doesn't interpret; verifier daemons are application code it doesn't run. **No PR to bsp-mcp adds the words "ticket" or "payment" to its primitives.**

### 7.2 The client stays neutral

xstream-play implements §5.1 generically and never references specific issuers in code. **No PR to xstream-play adds an issuer allowlist, an issuer ranking, an issuer badge, or any other special-casing.** A bug here would centralise the system more than any single hosted service.

### 7.3 The reference implementation stays small

The reference ticketing agent stays small enough to fork in an afternoon. **No PR adds features that meaningfully raise the bar for self-hosting.** Multi-tenant SaaS features, complex billing logic, analytics dashboards, KYC integrations — these belong in forks targeted at specific markets, not in the reference.

### 7.4 No protocol-level fees

Neither the substrate nor the client takes a cut. If we run a hosted ticketing service, our fees come from our payment processor (e.g. Stripe), not from a protocol position. **No envelope, no metadata field, no daemon convention exists for "pay X% to the substrate."** If this changes, the system is no longer federated.

### 7.5 Interoperability invariant

A frame-owner who buys grains from one issuer must be able to migrate to a different issuer without changing anything except their `_tickets.issuer` and `purchase_url` fields. Existing live grains stop being honoured (because they're from the old issuer); new purchases use the new path. This must remain a five-minute migration. **No PR introduces a feature that would couple a collective to its issuer in any other way.**

These five guarantees are the protocol's social contract. Everything else is implementation detail.

---

## 8. Build order (reference ticketing agent + verifier)

CC builds in this order. Each milestone is independently testable.

**M0 — Repo skeleton (½ day)**
- Project init, Hono server, env validation, pino logging, SQLite setup, health endpoint.

**M1 — Envelope and grain helpers (½ day)**
- `lib/envelope.ts` — build/parse `[ticket ...]`, `[ticket-revoked ...]`, `[ticket-verified ...]`, `[ticket-rejected ...]`, `[ticket-expired ...]` envelopes with full round-trip tests.
- `lib/grain.ts` — establish, revoke, walk, given a configured pscale MCP client.
- Verify against the live pscale MCP server using `tool_search` to confirm exact tool parameter shapes.

**M2 — Config, products, catalogue (½ day)**
- `lib/config.ts` — YAML loader with zod validation.
- `routes/catalogue.ts` — render the public product list.
- A handful of test products in `config/agent.yaml`.

**M3 — Stripe driver + purchase flow (1 day)**
- `drivers/stripe.ts` — Checkout Session creation, webhook signature verification, refund calls.
- `routes/purchase.ts`, `routes/webhook.ts`.
- End-to-end with Stripe test mode: buy a ticket, see the grain land on the beach.

**M4 — Verifier daemon (½ day)**
- `lib/verifier.ts` — watches configured collectives, walks grains, writes verified/rejected envelopes.
- Run against a live test collective; confirm registrations transition correctly.

**M5 — Refunds and revocation (½ day)**
- `routes/refund.ts` — Stripe refund + grain revoke, end to end.
- Verifier picks up revocation on next poll.

**M6 — Gift and manual drivers (½ day)**
- `drivers/gift.ts` — signed message verification (Ed25519 against gifter's published key).
- `drivers/manual.ts` — instructions response + `/admin/mark-paid/:id`.

**M7 — Catalogue polish, README, deploy (½ day)**
- Catalogue page styling.
- README with the §6 onboarding instructions, ready to be the public face of the repo.
- Reference deployment to a single host with the spec's example products (or David's actual products) live.

**Total:** ~4–5 days for a builder familiar with the stack.

The xstream-play affordance work (§5) is a separate stream. It runs in parallel with no dependency on the ticketing agent build, since the contract is fully specified.

---

## 9. Open decisions

These need David's call:

1. **Reference ticketing agent: do we host one publicly?** Likely yes — `tickets.machus.ai` or similar — but operated as one option among many. Worth deciding before launch how we frame this so it doesn't read as "the official issuer."
2. **Verifier-only mode in the reference repo?** If yes, ship a `--verifier-only` flag so frame-owners using third-party issuers can still run their own verification cheaply.
3. **Default ticket duration units?** Days is the proposed default. Some frames may want hours (e.g. a one-off play session), some may want indefinite (until-revoked). Both are expressible; question is what the config supports out of the box.
4. **Pricing model for the Macus character ticket itself?** If we're using this paywall to serve Macus, what's the actual product and price? This is where the §1.5-of-the-A-spec Macus seed content needs to land — but as a *frame*, not as a closed shell.
5. **Grain reference syntax in registrations.** Spec uses `*:agent:X:grain:Y` — confirm this matches pscale's existing star-reference convention or specify the exact syntax.
6. **Soft-LLM streaming during paywalled session.** When a user holds a character ticket and writes liquid, the soft-LLM that refines their input runs where? On the frame-owner's host (consistent with §3.1 of the frame protocol). At what rate-limit? Per-ticket? Per-session?
7. **Multi-frame season passes.** A scope of `beach:X` admits the holder to all `_tickets`-marked collectives on agent X's beach. Useful for season passes. Confirmed in spec; worth a UX pass on how xstream-play presents this.

---

## 10. Out of scope for v1

- Dispute resolution between buyer and issuer beyond refund (no on-chain arbitration, no escrow, no third-party adjudication)
- Multi-currency support beyond what Stripe handles natively
- Subscription billing (can be modelled as auto-renewing time passes; later)
- Tradable secondary market for unused tickets (interesting; a v2 conversation)
- Reputation / trust scores for issuers (would centralise; deliberately omitted)
- Bundles of products at discount (config-level, can be added without protocol change)

---

## 11. Notes for Claude Code

- Treat `tool_search` against `pscale-mcp` and `bsp-mcp` as the source of truth for exact tool parameter shapes. The pseudocode in §3.7 and §4.2 uses logical names; confirm before coding.
- The reference agent must be deployable by people who are not us. Optimise for "afternoon to fork and run" over "fancy features."
- Test the federation property explicitly: stand up two ticketing agents under different agent_ids, point two collectives at them, confirm xstream-play (or the test harness) treats them identically.
- Keep secrets handling boring and visible — pino redaction list, no secrets in error messages, no key material on disk outside the env or a sealed secret store.
- The §7 guarantees aren't decoration. They're the spec. If something we're building would violate one of them, stop and flag it.
