# Pointing the deployed backend at this stack

Phases 0–3 built and proved everything that can be built and proved from here. What is left needs
two things only you can do: **open a door on this machine**, and **put two variables into Vercel**.

Nothing in this file changes the application. `TELEMETRY_URL` and `TELEMETRY_SECRET` are read at
startup by `app/src/telemetry.ts`; without them the API ships nothing and logs exactly as it does
today.

---

## Why a tunnel at all

Vercel has to reach your laptop, and your laptop has no public address. So one door is opened, and
the Caddy gate checks a secret before anything gets through it.

```
Vercel (Hobby)  ──►  tunnel  ──►  gate :8080  ──►  Alloy  ──►  Loki + Prometheus  ──►  Grafana
                                  (secret)
```

**What is exposed is the gate and only the gate.** Grafana, Prometheus, Loki and Alloy are all bound
to `127.0.0.1` and are not part of the tunnel. The gate answers exactly two things: `/healthz`, and —
with the right `X-Telemetry-Key` — a Loki push.

---

## Step 1 · Open the door

### Option A — quick tunnel (no account, 10 seconds)

```bash
cd observability
./tunnel.sh
```

It prints a public URL and the exact two values to paste into Vercel. **Leave it running.**

The URL is random and a new one is issued every time you restart it, so Vercel's variable has to be
updated each time. Fine for proving this works today; annoying as a permanent arrangement.

### Option B — a URL that stays put

Pick this once you have seen it working and want to keep it.

**Tailscale Funnel** — free, no domain needed:

```bash
brew install --cask tailscale-app     # asks for your password; a GUI install
```

Then open Tailscale, sign in, and:

```bash
tailscale funnel 8080
```

The first run prints a link to enable Funnel for your tailnet. You get a stable
`https://your-machine.your-tailnet.ts.net`, and Vercel's variable is then set once and left alone.

**Cloudflare named tunnel** — free, but needs a domain on Cloudflare. `cloudflared` is already
installed here; `cloudflared tunnel login` starts it.

---

## Step 2 · Check the door from outside

```bash
./verify-remote.sh https://whatever-tunnel.sh-printed
```

It checks the URL answers from the public internet, that it refuses a push without the key, that it
accepts one with the key, and that the line actually lands in Loki having gone out to the internet
and back.

Do this **before** touching Vercel. A failure here is a tunnel problem, and it is much easier to
diagnose without a deployment in the middle.

---

## Step 3 · Two variables in Vercel

Vercel → **quote-my-ai** → Settings → Environment Variables → **Production**:

| Name | Value |
|---|---|
| `TELEMETRY_URL` | the tunnel URL, no trailing slash |
| `TELEMETRY_SECRET` | the value `./tunnel.sh` printed (it is in `observability/.env`) |

The secret must match exactly, or every push comes back 401 and nothing arrives.

Optional: `LOG_PRETTY=false`. Not needed — Vercel already gets JSON — but harmless and explicit.

---

## Step 4 · Redeploy

**Environment variables only reach a NEW deployment.** Setting them changes nothing about the build
already running. Either push a commit, or use Deployments → ⋯ → Redeploy on the latest one.

This is the step that is most often missed, and it fails silently: everything looks configured and
no data arrives.

---

## Step 5 · Watch it arrive

Hit the deployed API once so there is something to report, then:

```bash
./verify-remote.sh https://whatever-tunnel.sh-printed
```

The last check counts lines from `env="production"` in the last hour. When that passes, open Grafana
and set the **Environment** dropdown to `production` — every dashboard is now showing the deployed
service and its real users.

---

## When nothing arrives

Work through it in this order; each step rules out the one before.

| | |
|---|---|
| `./smoke-test.sh` fails | The local stack is the problem, not Vercel. Start there. |
| `verify-remote.sh` fails at "the door" | The tunnel is down, or the URL is wrong. Is `./tunnel.sh` still running? |
| Fails at "locked without the key" | The gate is not in front of Alloy. Check `docker compose ps gate`. |
| Push rejected **with** the key | The secret in Vercel does not match `observability/.env`. |
| Everything passes, no `production` lines | Almost always no redeploy — see Step 4. Then: has anyone actually hit the API since? |
| Lines arrive but panels are empty | Check the **Environment** dropdown at the top of the dashboard. |

`docker compose logs -f alloy` shows pushes as they land, which settles "is it them or us" quickly.

---

## Two things to be honest about

**Your laptop asleep is a gap in the graphs.** The tunnel closes and Vercel's pushes fail. The app
does not care — it drops the batch after one 3-second attempt and carries on, and every one of those
lines is still in Vercel's own log view. Nothing is lost that matters: the durable records are
`chatSpend/{day}` and the `submissions` subcollection in Firestore. Grafana is for seeing, not for
accounting.

**The tunnel URL is public.** That is why the gate exists. Do not disable it, do not put the secret
in a commit, and do not add other services to the tunnel. If the secret is ever exposed, generate a
new one (`openssl rand -hex 32`), update `observability/.env` and Vercel, restart the gate, redeploy.

---

## When local stops being enough

Everything here keeps working; only the destination changes, and it is one environment variable.

- **Grafana Cloud** — free tier, always on, no tunnel and no laptop dependency. Point Alloy's
  `loki.write` at their endpoint instead of the local Loki.
- **A $5 VPS** — the same `docker-compose.yml`, a real address, no tunnel.

That is why the destination was never hardcoded.
