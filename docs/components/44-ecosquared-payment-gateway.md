# 44 — Ecosquared Payment Gateway

**Category:** K. SAND Mechanics  
**Products:** MAGI/Hermitcrab

---

## Description

The ecosquared payment gateway enables humans (or bots) to fund xstream infrastructure with real money. It is operational at G~1 (pre-credit-economy) and precedes the G~2 reputation/credit system. Money flows one direction: in. There is no payout mechanism, no promise of returns. Every transaction is logged from day one in rider-format JSON, creating a data trail that the future G~2 credit economy can reference and build upon. The gateway uses Stripe Checkout (hosted by Stripe, zero PCI compliance burden) to collect payments. A Supabase edge function receives webhooks and logs transactions to a database table structured as riders. Contributors can optionally provide a name/handle for ledger attribution, and a "referred by" field capturing the share-forward chain. The ledger is public and read-only, showing every contribution with full transparency. Amount tiers are suggested (Seed £5, Grow £20, Root £50, Custom) with the framing "Your judgement of value" — core ecosquared principle that the giver determines worth.

---

## Standalone Use

A contributor funds xstream by selecting an amount tier, optionally naming themselves, optionally indicating who referred them. They are redirected to Stripe Checkout (hosted by Stripe, secure), confirm payment, and return to a confirmation page. Their contribution is recorded in a transparent, permanent ledger showing who contributed what amount on what date. The ledger grows publicly, visible to anyone. This provides radical transparency about funding while eliminating infrastructure burden (Stripe handles all card data) and creating the historical record for future credit economies.

---

## How It Works

**Architecture**:
```
User clicks Fund → Stripe Checkout session created → Payment processed
  → Stripe webhook fires → Supabase edge function receives webhook
  → Transaction logged to ecosquared_transactions table (rider format)
  → User sees confirmation page
```

**Three components**:

**1. Static page (`fund.html`)**:
- Served at `xstream.machus.ai/ecosquared/fund`
- Brief explanation of xstream and what funding supports
- Amount selection (tiers or custom)
- Optional name/handle field for attribution
- Optional "who referred you?" field (captures share-forward chain)
- "Fund" button → redirects to Stripe Checkout session
- Link to transparent ledger

**2. Edge function endpoints**:
- **POST `/ecosquared-checkout`**: User clicks Fund → creates Stripe Checkout session → returns session URL. Input: amount (pence/cents), currency (gbp/usd), optional name, optional referred_by. Output: Stripe checkout URL.
- **POST `/ecosquared-webhook`**: Stripe calls this when payment completes → verify signature → extract data → write to database → return 200 OK.

**3. Database table (`ecosquared_transactions`)**:
```sql
id (UUID), stripe_session_id, amount_cents, currency,
status, rider (JSONB), created_at
```
The rider field stores: v ("0.2"), from (contributor name or "anonymous"), ts (timestamp), amount, currency, referred_by, dir ("future"), note (optional).

RLS policy: public can read, only edge function (via service role) can write.

**Transparent ledger page (`ledger.html`)**:
- Served at `xstream.machus.ai/ecosquared/ledger`
- Reads ecosquared_transactions via Supabase publishable key
- Displays total funded to date
- Lists all contributions with name (if provided), amount, date, referred_by chain
- No personal data beyond what contributor chose to provide

**Share-forward chain**:
The `referred_by` field creates a chain: Alice funds (referred_by: "david") → Alice shares → Bob funds (referred_by: "alice") → etc. The ledger visualizes these chains. At G~2, this data becomes input to credit/reputation calculation: "who shared this and with what multiplier effect?"

**Stripe integration**:
- Stripe account required (David's decision: new or existing)
- Webhook endpoint: `https://[supabase-project].supabase.co/functions/v1/ecosquared-webhook`
- Listen for: `checkout.session.completed`
- Two secrets: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` stored in Supabase

**Future integration points** (not built yet, documented for G~2):
- Credit conversion: £1 → X boost credits (rate TBD)
- Bot funding: operator funds their bot's credit allocation
- Pscale logging: transaction written to coordinates (T: when, S: xstream.machus.ai, I: contributor)
- sqale.co bridge: if available, connect SQ computation to funding history

**Implementation**: ~90 minutes total. Stripe setup + Supabase edge functions + static pages + database migration. David provides: Stripe account setup, webhook URL configuration, live mode switch.

---

*Key files: `ecosquared-payment-gateway-spec.md`*
