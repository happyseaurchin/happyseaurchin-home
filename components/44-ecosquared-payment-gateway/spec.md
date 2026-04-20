# ecosquared Payment Gateway — Technical Spec

**Location**: `xstream.machus.ai/ecosquared/fund`  
**Purpose**: Enable humans (or bots) to fund the xstream experiment with real money  
**Phase**: Operational at `G~1`. Precedes the credit economy (`G~2`).  
**Framing**: "Fund the experiment" — not "participate in an economy"

---

## What This Is

A minimal payment gateway where anyone can contribute money to fund xstream infrastructure and experimentation. Every transaction is logged in rider-format JSON from day one, creating a data trail that the `G~2` reputation/credit system can reference when it becomes operational.

Money flows one direction: **in**. It funds David to build. No payout mechanism. No promise of returns. Transparent ledger of who contributed what and when.

## What This Is Not

- Not a token sale or investment vehicle
- Not a credit economy (that's `G~2`)
- Not distributed revenue sharing (that's `G~3`)
- Not connected to sqale.co (separate system, no API)

---

## Architecture

```
User clicks "Fund" on ecosquared page
        ↓
Stripe Checkout (hosted by Stripe — no card data touches us)
        ↓
Payment succeeds → Stripe webhook fires
        ↓
Supabase edge function receives webhook
        ↓
Logs transaction to `ecosquared_transactions` table
        in rider-format JSON
        ↓
Confirmation page shown to user
```

### Why Stripe Hosted Checkout

- No PCI compliance burden (Stripe handles all card data)
- Works immediately with a Stripe account
- Supports one-time payments and optional recurring
- Mobile-friendly out of the box
- Webhook confirms payment server-side (can't be faked client-side)

---

## Components

### 1. Static Page: `fund.html`

**Location**: `public/ecosquared/fund.html` in `xstream-the-address-of-meaning` repo  
**Serves at**: `xstream.machus.ai/ecosquared/fund`

Content:
- Brief explanation: what xstream is, what the funding supports
- Amount selection (suggested tiers: £5, £20, £50, custom)
- Optional: name/handle field (for ledger attribution — can be anonymous)
- Optional: "who showed you this?" field (captures the share-forward chain)
- "Fund" button → redirects to Stripe Checkout session
- Link to transparent ledger (read-only view of all contributions)

Design: consistent with existing ecosquared page aesthetic (EB Garamond + JetBrains Mono if following rider protocol docs, or match current xstream.machus.ai style).

### 2. Edge Function: `ecosquared-checkout`

**Location**: `supabase/functions/ecosquared-checkout/index.ts` in `happyseaurchin/xstream` repo  
**Deployed to**: xstream Supabase (project `piqxyfmzzywxzqkzmpmm`)

Two endpoints:

#### POST `/ecosquared-checkout` — Create Checkout Session

Called by the fund page when user clicks "Fund".

```typescript
// Input
{
  amount: number,        // in pence/cents
  currency: "gbp",       // or "usd"
  name?: string,         // optional attribution
  referred_by?: string   // optional share-forward chain
}

// Action
// 1. Create Stripe Checkout Session with metadata
// 2. Return session URL

// Output
{
  url: "https://checkout.stripe.com/c/pay/..."
}
```

#### POST `/ecosquared-webhook` — Stripe Webhook Handler

Called by Stripe when payment completes.

```typescript
// 1. Verify Stripe signature (STRIPE_WEBHOOK_SECRET)
// 2. Extract payment data
// 3. Write to ecosquared_transactions table
// 4. Return 200
```

### 3. Database Table: `ecosquared_transactions`

```sql
CREATE TABLE ecosquared_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Payment data
  stripe_session_id TEXT UNIQUE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL DEFAULT 'completed',
  
  -- Rider-format metadata
  rider JSONB NOT NULL,
  -- Structure:
  -- {
  --   "v": "0.2",
  --   "from": "contributor-name-or-anonymous",
  --   "ts": "2026-02-13T12:00:00Z",
  --   "amount": 500,
  --   "currency": "gbp",
  --   "referred_by": "person-who-shared",
  --   "dir": "future",
  --   "note": "optional message"
  -- }
  
  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: public read, no public write (edge function uses service role)
ALTER TABLE ecosquared_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON ecosquared_transactions
  FOR SELECT USING (true);
```

### 4. Transparent Ledger Page: `ledger.html`

**Location**: `public/ecosquared/ledger.html`  
**Serves at**: `xstream.machus.ai/ecosquared/ledger`

Reads `ecosquared_transactions` via Supabase publishable key (RLS allows SELECT). Displays:
- Total funded to date
- List of contributions (name/anonymous, amount, date, referred_by chain)
- No personal data beyond what the contributor chose to provide

---

## Supabase Secrets Required

| Secret | Purpose |
|--------|---------|
| `STRIPE_SECRET_KEY` | Create checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |

Both set via Supabase Dashboard → Edge Functions → Secrets.

## Stripe Setup Required

1. Create Stripe account (or use existing)
2. Add webhook endpoint: `https://piqxyfmzzywxzqkzmpmm.supabase.co/functions/v1/ecosquared-webhook`
3. Listen for event: `checkout.session.completed`
4. Copy webhook signing secret → Supabase secret

---

## Amount Tiers (Suggested)

| Tier | Amount | Framing |
|------|--------|---------|
| Seed | £5 | "Water a seed" |
| Grow | £20 | "Feed the experiment" |
| Root | £50 | "Strengthen the roots" |
| Custom | Any | "Your judgement of value" |

The "your judgement of value" framing is core ecosquared: the giver determines worth, not the market.

---

## Share-Forward Chain

The `referred_by` field captures who shared the link. When someone funds and then shares the fund page with others, the chain builds:

```
David shares → Alice funds (referred_by: "david")
Alice shares → Bob funds (referred_by: "alice")  
Bob shares → Carol funds (referred_by: "bob")
```

The ledger shows these chains. At `G~2`, this data becomes input to the credit/reputation system. For now it's just recorded — a data trail waiting for the coordination layer to activate.

To enable this: the fund page URL accepts a `?ref=name` parameter. The page pre-fills the "referred_by" field. The share button generates a URL with the funder's name as ref.

---

## Integration Points (Future)

These are NOT built now. They're documented so `G~2` knows what's available:

- **Credit conversion**: £1 → X boost credits (rate TBD at `G~2`)
- **Bot funding**: a bot operator funds their bot's credit allocation
- **Pscale logging**: transaction written to pscale coordinates (T: when, S: xstream.machus.ai, I: contributor)
- **sqale.co bridge**: if sqale.co gets an API, connect the SQ computation to this ledger

---

## Implementation Steps

| Step | What | Where | Est. Time |
|------|------|-------|-----------|
| 1 | Create Stripe account + product | stripe.com | 15 min |
| 2 | Apply migration for `ecosquared_transactions` | Supabase `piqxyfmzzywxzqkzmpmm` | 2 min |
| 3 | Deploy `ecosquared-checkout` edge function | Supabase (same project) | 15 min |
| 4 | Deploy `ecosquared-webhook` edge function | Supabase (same project) | 15 min |
| 5 | Set Stripe secrets in Supabase | Dashboard | 2 min |
| 6 | Create `fund.html` | `xstream-the-address-of-meaning` repo | 20 min |
| 7 | Create `ledger.html` | Same repo | 15 min |
| 8 | Add webhook URL in Stripe dashboard | stripe.com | 2 min |
| 9 | Test end-to-end with Stripe test mode | Browser | 10 min |
| 10 | Switch to Stripe live mode | stripe.com | 2 min |

**Total estimate**: ~90 minutes of implementation

---

## Who Implements

**Claude.ai (this project) can do**: Steps 2-5, 6-7 (migration, edge functions, static pages via GitHub commits and Supabase tools).

**Requires David**: Step 1 (Stripe account setup — needs your bank details), Step 8 (webhook URL in Stripe dashboard), Step 10 (live mode switch).

**Claude Code alternative**: Better for step 9 (local testing of the webhook flow with `stripe listen --forward-to`). But not strictly necessary — Stripe test mode works via the live deployed edge function too.

---

## Decision Points for David

1. **Stripe account**: Do you already have one, or create new?
2. **Currency**: GBP primary? USD option?
3. **Tiers**: Happy with the suggested amounts, or different?
4. **Attribution**: Allow anonymous contributions, or require a name?
5. **Page design**: Match existing ecosquared aesthetic, or different?
6. **Recurring option**: Include monthly subscription option, or one-time only for now?

---

*This spec is self-contained. Hand it to Claude Code or use it here. The implementation is small enough to do in one session.*
