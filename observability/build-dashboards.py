#!/usr/bin/env python3
"""
Builds the dashboards in grafana/dashboards/ .

The JSON is what Grafana reads; this file is what a human reads. Hand-editing a 600-line dashboard
export is how a panel quietly ends up pointing at the wrong metric, so the queries live here, once,
next to a comment saying what they answer.

    ./build-dashboards.py         # rewrites grafana/dashboards/*.json

Experiment in the Grafana UI freely - `allowUiUpdates` is on. But put a change you want to KEEP
back into this file, because Grafana reloads from disk and will overwrite it.
"""
import json, pathlib

M = "loki_process_custom_"                 # Alloy's prefix for a stage.metrics metric
APP = '{service="quotemy-api", env=~"$env"}'
PROM = {"type": "prometheus", "uid": "prometheus"}
LOKI = {"type": "loki", "uid": "loki"}

OUT = pathlib.Path(__file__).parent / "grafana" / "dashboards"


# ── panel helpers ────────────────────────────────────────────────────────────────────────────────
_y = {}

def _pos(dash, w, h):
    """Lays panels out left to right, wrapping at 24 columns. Saves counting gridPos by hand."""
    st = _y.setdefault(dash, {"x": 0, "y": 0, "rowh": 0})
    if st["x"] + w > 24:
        st["x"], st["y"] = 0, st["y"] + st["rowh"]
        st["rowh"] = 0
    pos = {"x": st["x"], "y": st["y"], "w": w, "h": h}
    st["x"] += w
    st["rowh"] = max(st["rowh"], h)
    return pos


def stat(dash, title, expr, unit="short", ds=PROM, decimals=None, desc="", w=6, h=4, thresholds=None):
    return {
        "type": "stat", "title": title, "description": desc, "datasource": ds,
        "gridPos": _pos(dash, w, h),
        "targets": [{"refId": "A", "expr": expr, "datasource": ds,
                     **({"queryType": "range"} if ds is LOKI else {"instant": True})}],
        "fieldConfig": {"defaults": {
            "unit": unit, **({"decimals": decimals} if decimals is not None else {}),
            "color": {"mode": "thresholds"},
            "thresholds": {"mode": "absolute", "steps": thresholds or [{"color": "text", "value": None}]},
        }, "overrides": []},
        "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
                    "textMode": "auto", "colorMode": "value", "graphMode": "area", "justifyMode": "auto"},
    }


def ts(dash, title, targets, unit="short", ds=PROM, desc="", w=12, h=8, stack=False, fill=0):
    return {
        "type": "timeseries", "title": title, "description": desc, "datasource": ds,
        "gridPos": _pos(dash, w, h),
        "targets": [{"refId": chr(65 + i), "expr": e, "legendFormat": lf, "datasource": ds,
                     **({"queryType": "range"} if ds is LOKI else {})}
                    for i, (e, lf) in enumerate(targets)],
        "fieldConfig": {"defaults": {
            "unit": unit,
            "custom": {"drawStyle": "line", "lineWidth": 2, "fillOpacity": fill, "showPoints": "never",
                       "spanNulls": True, "stacking": {"mode": "normal" if stack else "none", "group": "A"},
                       "axisSoftMin": 0},
            "color": {"mode": "palette-classic"},
        }, "overrides": []},
        "options": {"legend": {"displayMode": "list", "placement": "bottom", "showLegend": True,
                               "calcs": ["mean", "max"]},
                    "tooltip": {"mode": "multi", "sort": "desc"}},
    }


def logs(dash, title, expr, desc="", w=24, h=10):
    return {
        "type": "logs", "title": title, "description": desc, "datasource": LOKI,
        "gridPos": _pos(dash, w, h),
        "targets": [{"refId": "A", "expr": expr, "queryType": "range", "datasource": LOKI}],
        "options": {"showTime": True, "wrapLogMessage": True, "sortOrder": "Descending",
                    "enableLogDetails": True, "dedupStrategy": "none", "prettifyLogMessage": True},
    }


def alert_table(dash, title, desc="", w=24, h=7):
    """Alerts as Prometheus itself sees them.

    `ALERTS` is a series Prometheus synthesises for every pending or firing rule, so this needs no
    Alertmanager and no contact point. It is not a substitute for delivery - a page nobody has open
    tells nobody anything - but it means alert state lives beside the graphs rather than on a
    separate URL nobody visits.
    """
    return {
        "type": "table", "title": title, "description": desc, "datasource": PROM,
        "gridPos": _pos(dash, w, h),
        "targets": [{"refId": "A", "datasource": PROM, "instant": True, "format": "table",
                     "expr": 'ALERTS{alertstate=~"firing|pending"}'}],
        "transformations": [
            {"id": "organize", "options": {
                "excludeByName": {"Time": True, "Value": True, "__name__": True, "job": True,
                                  "instance": True, "monitor": True},
                "renameByName": {"alertname": "Alert", "alertstate": "State", "severity": "Severity",
                                 "trade": "Trade", "stage": "Stage"},
                "indexByName": {"alertstate": 0, "severity": 1, "alertname": 2},
            }},
        ],
        "fieldConfig": {"defaults": {"custom": {"align": "left", "cellOptions": {"type": "color-text"}}},
                        "overrides": [
                            {"matcher": {"id": "byName", "options": "State"},
                             "properties": [{"id": "mappings", "value": [
                                 {"type": "value", "options": {
                                     "firing": {"color": "red", "index": 0, "text": "FIRING"},
                                     "pending": {"color": "orange", "index": 1, "text": "pending"}}}]}]},
                        ]},
        "options": {"showHeader": True, "footer": {"show": False}},
    }


def alert_stat(dash, w=6, h=4):
    """One number, on the pages where a firing alert most needs to interrupt what you were reading."""
    return stat(dash, "Alerts firing", 'count(ALERTS{alertstate="firing"}) or vector(0)', decimals=0,
                desc="Prometheus rules currently firing. The Telemetry pipe dashboard lists which. "
                     "These do not notify anyone yet - see prometheus/rules/quotemy.yml.",
                w=w, h=h,
                thresholds=[{"color": "green", "value": None}, {"color": "red", "value": 1}])


def text(dash, title, content, w=24, h=3):
    return {"type": "text", "title": title, "gridPos": _pos(dash, w, h),
            "options": {"mode": "markdown", "content": content}}


def dashboard(uid, title, description, panels, refresh="30s", frm="now-6h"):
    return {
        "uid": uid, "title": title, "description": description,
        "tags": ["quotemy"], "timezone": "browser", "editable": True,
        "schemaVersion": 39, "version": 1, "refresh": refresh,
        "time": {"from": frm, "to": "now"},
        "templating": {"list": [{
            "name": "env", "label": "Environment", "type": "query", "datasource": PROM,
            "query": {"qryType": 1, "query": f"label_values({M}http_requests_total, env)", "refId": "env"},
            "definition": f"label_values({M}http_requests_total, env)",
            "includeAll": True, "allValue": ".*", "multi": False, "refresh": 1,
            "current": {"text": "All", "value": "$__all"}, "options": [], "hide": 0,
        }]},
        "panels": panels,
    }


# ── 1. Money ─────────────────────────────────────────────────────────────────────────────────────
# The question this answers: what is the model costing, where, and is that changing?
# Every number here comes from the `model call` line ai.ts has always written.
D = "money"
money = dashboard("quotemy-money", "QuoteMy · Model & Money",
    "What the model costs, by pipeline stage. Counters live in Alloy's memory and reset when it "
    "restarts - fine for rates, wrong for lifetime totals. The ledger is chatSpend/{day} in Firestore.",
    [
        stat(D, "Spent (selected range)", f'sum(increase({M}model_cost_usd_total{{env=~"$env"}}[$__range]))',
             unit="currencyUSD", decimals=4, desc="Model spend over the dashboard's time range."),
        stat(D, "Model calls", f'sum(increase({M}model_calls_total{{env=~"$env"}}[$__range]))', decimals=0),
        stat(D, "Cost per call",
             f'sum(increase({M}model_cost_usd_total{{env=~"$env"}}[$__range])) / '
             f'clamp_min(sum(increase({M}model_calls_total{{env=~"$env"}}[$__range])), 1)',
             unit="currencyUSD", decimals=5,
             desc="Divided rather than averaged, so a stage with more calls weighs more - which is what a bill does."),
        alert_stat(D),
        stat(D, "Schema violations",
             f'sum(increase({M}model_schema_violations_total{{env=~"$env"}}[$__range]))', decimals=0,
             desc="Replies that arrived and did not fit the schema. One is a bad day; a run of them is a broken prompt.",
             thresholds=[{"color": "green", "value": None}, {"color": "orange", "value": 1}, {"color": "red", "value": 5}]),

        ts(D, "Spend per hour, by stage",
           [(f'sum by (stage) (rate({M}model_cost_usd_total{{env=~"$env"}}[$__rate_interval])) * 3600', "{{stage}}")],
           unit="currencyUSD", stack=True, fill=25,
           desc="Stacked, because the question is usually 'what is the total, and which stage moved it'."),
        ts(D, "Calls per minute, by stage",
           [(f'sum by (stage) (rate({M}model_calls_total{{env=~"$env"}}[$__rate_interval])) * 60', "{{stage}}")]),

        ts(D, "Tokens per minute",
           [(f'sum by (stage) (rate({M}model_tokens_in_total{{env=~"$env"}}[$__rate_interval])) * 60', "in · {{stage}}"),
            (f'sum by (stage) (rate({M}model_tokens_out_total{{env=~"$env"}}[$__rate_interval])) * 60', "out · {{stage}}")],
           desc="Output tokens cost several times input. A stage whose output line climbs is the one to look at."),
        ts(D, "Model latency, by stage",
           [(f'histogram_quantile(0.95, sum by (le, stage) (rate({M}model_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95 · {{stage}}"),
            (f'histogram_quantile(0.50, sum by (le, stage) (rate({M}model_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50 · {{stage}}")],
           unit="ms", desc="Includes any retry, because that is what the caller waited for."),

        ts(D, "Schema retries folded into a successful call",
           [(f'sum by (stage) (increase({M}model_retries_total{{env=~"$env"}}[$__rate_interval]))', "{{stage}}")],
           desc="The call succeeded on the second attempt. Invisible in the response, and the earliest sign a prompt is drifting."),
        logs(D, "Recent model calls", f'{APP} | json | msg=`model call`', w=12, h=8),
    ])


# ── 2. Traffic ───────────────────────────────────────────────────────────────────────────────────
D = "traffic"
traffic = dashboard("quotemy-traffic", "QuoteMy · Traffic & Errors",
    "Rate, errors, duration - for the API as a whole. Vercel's own Observability tab shows "
    "invocations and a 0% error rate; this shows what the service itself said happened.",
    [
        stat(D, "Requests", f'sum(increase({M}http_requests_total{{env=~"$env"}}[$__range]))', decimals=0),
        stat(D, "Server errors (5xx)",
             f'sum(increase({M}http_requests_total{{env=~"$env", status=~"5.."}}[$__range]))', decimals=0,
             thresholds=[{"color": "green", "value": None}, {"color": "red", "value": 1}]),
        stat(D, "Rejected (4xx)",
             f'sum(increase({M}http_requests_total{{env=~"$env", status=~"4.."}}[$__range]))', decimals=0,
             desc="Not a fault. A rejected price list is a 200 here - see the README; these are bad requests and rate limits."),
        stat(D, "p95 latency",
             f'histogram_quantile(0.95, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__range])))',
             unit="ms", decimals=0),

        ts(D, "Requests per second, by status",
           [(f'sum by (status) (rate({M}http_requests_total{{env=~"$env"}}[$__rate_interval]))', "{{status}}")],
           unit="reqps", stack=True, fill=25),
        ts(D, "Latency",
           [(f'histogram_quantile(0.50, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50"),
            (f'histogram_quantile(0.95, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95"),
            (f'histogram_quantile(0.99, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p99")],
           unit="ms"),

        ts(D, "Requests by route",
           [(f'sum by (path) (count_over_time({APP} | json | msg=`request` [$__auto]))', "{{path}}")],
           ds=LOKI, desc="From Loki, not Prometheus: `path` is deliberately not a metric label - too many values for one.",
           stack=True, fill=25),
        ts(D, "Slowest routes (p95)",
           [(f'quantile_over_time(0.95, {APP} | json | msg=`request` | unwrap ms [$__auto]) by (path)', "{{path}}")],
           ds=LOKI, unit="ms"),

        logs(D, "Everything the service complained about", '{service="quotemy-api", env=~"$env", level=~"warn|error|fatal"}',
             desc="Warn and above, newest first. This is the panel to read when a number above looks wrong."),
    ])


# ── 3. Customer chat ─────────────────────────────────────────────────────────────────────────────
D = "chat"
chat = dashboard("quotemy-chat", "QuoteMy · Customer chat",
    "The customer side, read from the lines it already logs. Empty until customer traffic arrives - "
    "these panels are built and waiting, not broken.",
    [
        stat(D, "Chat turns", f'sum(increase({M}chat_turns_total{{env=~"$env"}}[$__range]))', decimals=0),
        stat(D, "Resolved without the model",
             f'sum(increase({M}chat_turns_total{{env=~"$env", tapped="true"}}[$__range])) / '
             f'clamp_min(sum(increase({M}chat_turns_total{{env=~"$env"}}[$__range])), 1)',
             unit="percentunit", decimals=1,
             desc="A tapped option comes off a list this code generated last turn, so it is resolved in code and "
                  "costs nothing - no model, no three-second spinner. It is the commonest turn in the "
                  "conversation, and this is the number that says the shortcut still works.",
             thresholds=[{"color": "red", "value": None}, {"color": "orange", "value": 0.3}, {"color": "green", "value": 0.5}]),
        stat(D, "Quotes shown", f'sum(increase({M}chat_quotes_shown_total{{env=~"$env"}}[$__range]))', decimals=0,
             desc="Priced quotes actually put in front of a customer."),
        stat(D, "Cost", f'sum(increase({M}chat_cost_usd_total{{env=~"$env"}}[$__range]))',
             unit="currencyUSD", decimals=4),

        ts(D, "Turns per minute, by what we replied with",
           [(f'sum by (type) (rate({M}chat_turns_total{{env=~"$env"}}[$__rate_interval])) * 60', "{{type}}")],
           stack=True, fill=25,
           desc="question · confirmation · result · message. A conversation that never reaches `result` never reached a price."),
        ts(D, "Did the turn need the model?",
           [(f'sum(rate({M}chat_turns_total{{env=~"$env", tapped="true"}}[$__rate_interval])) * 60', "tapped - free"),
            (f'sum(rate({M}chat_turns_total{{env=~"$env", tapped="false"}}[$__rate_interval])) * 60', "free text - model")]),

        ts(D, "How long a customer waited",
           [(f'histogram_quantile(0.95, sum by (le) (rate({M}chat_turn_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95"),
            (f'histogram_quantile(0.50, sum by (le) (rate({M}chat_turn_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50")],
           unit="ms"),
        ts(D, "Turns by trade",
           [(f'sum by (trade) (rate({M}chat_turns_total{{env=~"$env"}}[$__rate_interval])) * 60', "{{trade}}")]),

        ts(D, "How long matching took",
           [(f'quantile_over_time(0.95, {APP} | json | msg=`matcher` | unwrap ms [$__auto])', "p95"),
            (f'quantile_over_time(0.50, {APP} | json | msg=`matcher` | unwrap ms [$__auto])', "p50")],
           ds=LOKI, unit="ms",
           desc="The one step whose cost grows with the number of businesses - a service document is read per candidate."),
        ts(D, "Businesses considered vs businesses that covered them",
           [(f'avg_over_time({APP} | json | msg=`matcher` | unwrap candidates [$__auto])', "candidates"),
            (f'avg_over_time({APP} | json | msg=`matcher` | unwrap matched [$__auto])', "covering")],
           ds=LOKI, desc="A gap that widens means the trade is growing in places customers are not asking from."),

        ts(D, "Which trade, and how we knew",
           [(f'sum(count_over_time({APP} | json | msg=`trade read from the message` [$__auto]))', "read from their words"),
            (f'sum(count_over_time({APP} | json | msg=`asking which trade` [$__auto]))', "had to ask")],
           ds=LOKI, desc="Asking is a worse experience. If this line climbs, the routing keywords need a look."),
        ts(D, "Customers asking their own questions",
           [(f'sum(count_over_time({APP} |= `looked up pictures` [$__auto]))', "pictures"),
            (f'sum(count_over_time({APP} | json | msg=`voice turn` [$__auto]))', "voice turns")],
           ds=LOKI, desc="Pictures cost about a tenth of a cent each; a rates question costs cents. Both are capped per conversation."),

        logs(D, "Chat turns that failed", f'{APP} |~ `chat turn failed|voice turn failed|could not save the quote result`'),
    ])


# ── 4. The pipe itself ───────────────────────────────────────────────────────────────────────────
D = "pipe"
pipe = dashboard("quotemy-pipe", "QuoteMy · Telemetry pipe",
    "Is the observability stack itself alive? A quiet dashboard and a broken pipe look identical "
    "from anywhere else, which is the whole reason this page exists.",
    [
        stat(D, "Alloy", 'up{job="alloy"}', desc="0 means nothing from the app is arriving, whatever the other pages show.",
             thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
        stat(D, "Loki", 'up{job="loki"}',
             thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
        stat(D, "Lines received (range)",
             f'sum(count_over_time({{service="quotemy-api", env=~"$env"}} [$__range]))', ds=LOKI, decimals=0),
        stat(D, "Alloy memory", 'alloy_resources_process_resident_memory_bytes', unit="bytes", decimals=0),

        ts(D, "Log lines per second, by environment",
           [(f'sum by (env) (count_over_time({{service="quotemy-api"}} [$__auto]))', "{{env}}")],
           ds=LOKI, desc="`local` and `production` side by side. A production line that stops is the thing to notice."),
        alert_table(D, "Alerts",
                    "Pending and firing rules, straight from Prometheus. Empty is what this should look like."),

        ts(D, "Lines per second, by level",
           [(f'sum by (level) (count_over_time({{service="quotemy-api", env=~"$env"}} [$__auto]))', "{{level}}")],
           ds=LOKI, stack=True, fill=25,
           desc="`unknown` here means something that is not this service's pino output is pushing to the gate."),
    ], refresh="1m")


# ── 5. Business onboarding ───────────────────────────────────────────────────────────────────────
# The page that could not exist before Phase 3: pipeline.ts logged nothing at all, so what happened
# to submissions was unanswerable. CLAUDE.md records a prompt change that rejected a fully compliant
# price list; nobody could have seen that here, because there was no here.
D = "onboarding"
onboarding = dashboard("quotemy-onboarding", "QuoteMy · Business onboarding",
    "What happens to the price lists businesses send. The reject rate is the number to watch after "
    "any change to the review prompt.",
    [
        stat(D, "Submissions", f'sum(increase({M}submissions_total{{env=~"$env"}}[$__range]))', decimals=0),
        stat(D, "Approved",
             f'sum(increase({M}submissions_total{{env=~"$env", outcome="approved"}}[$__range])) / '
             f'clamp_min(sum(increase({M}submissions_total{{env=~"$env"}}[$__range])), 1)',
             unit="percentunit", decimals=1,
             desc="A rejected price list is not a fault - it is incomplete. But a reject rate that MOVES after a prompt change is the thing to catch.",
             thresholds=[{"color": "red", "value": None}, {"color": "orange", "value": 0.4}, {"color": "green", "value": 0.6}]),
        stat(D, "Rates stored", f'sum(increase({M}rates_saved_total{{env=~"$env"}}[$__range]))', decimals=0,
             desc="Rates that survived verification - not rates the model read."),
        alert_stat(D),
        stat(D, "Figures dropped", f'sum(increase({M}figures_not_used_total{{env=~"$env"}}[$__range]))', decimals=0,
             desc="Each one was reported to the business. A rising line means the model and the verifier are disagreeing more often."),

        ts(D, "Submissions by outcome",
           [(f'sum by (outcome) (increase({M}submissions_total{{env=~"$env"}}[$__rate_interval]))', "{{outcome}}")],
           stack=True, fill=35,
           desc="approved · rejected · not_a_price_list. The third is caught twice over - by code for a keyboard mash, by the review otherwise."),
        ts(D, "Approved but nothing left standing",
           [(f'sum(increase({M}submissions_total{{env=~"$env", outcome="approved", status="verified"}}[$__rate_interval]))', "kept something"),
            (f'sum(increase({M}submissions_total{{env=~"$env", outcome="approved", status="unverified"}}[$__rate_interval]))', "nothing verified")],
           desc="The review let it through and then every figure failed verification. Rare, and the worst experience the product can give - so it is on its own axis."),

        ts(D, "Rates stored per hour, by trade",
           [(f'sum by (trade) (rate({M}rates_saved_total{{env=~"$env"}}[$__rate_interval])) * 3600', "{{trade}}")]),
        ts(D, "How long a business waited",
           [(f'histogram_quantile(0.95, sum by (le) (rate({M}submission_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95"),
            (f'histogram_quantile(0.50, sum by (le) (rate({M}submission_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50")],
           unit="ms", desc="End to end, including reading any attached document. Vercel's ceiling is in vercel.json."),

        # The reason breakdown - grouped HERE and not in app code, on purpose. See `logNotUsed`
        # in pipeline.ts: if a message is reworded, this panel goes flat where somebody can see it,
        # instead of the application quietly counting the wrong thing.
        ts(D, "Why a figure could not be used",
           [(f'sum(count_over_time({APP} | json | msg=`not used` |~ `could not find that figure|could not verify` [$__auto]))',
             "the sentence did not match"),
            (f'sum(count_over_time({APP} | json | msg=`not used` |~ `outside the range we accept|not a height we can store` [$__auto]))',
             "number out of range"),
            (f'sum(count_over_time({APP} | json | msg=`not used` |= `Could not file` [$__auto]))',
             "not in the vocabulary"),
            (f'sum(count_over_time({APP} | json | msg=`not used` |~ `priced .* twice` [$__auto]))',
             "priced twice"),
            (f'sum(count_over_time({APP} | json | msg=`not used` |= `could not read anything from` [$__auto]))',
             "unreadable document"),
            # The reference line. If the stack does not reach it, something is being dropped for a
            # reason none of the filters above knows about - which is precisely the signal that a
            # message has been reworded, or that a new kind of drop exists. Without this the gap
            # would be invisible, and an invisible gap is what this whole stack is built against.
            (f'sum(count_over_time({APP} | json | msg=`not used` [$__auto]))',
             "— all drops (the stack should reach this) —")],
           ds=LOKI, stack=False, fill=0,
           desc="Grouped by the text the BUSINESS was shown. 'Not in the vocabulary' should sit at zero - "
                "strict json_schema is supposed to make it impossible, so anything there is worth reading. "
                "If the grouped lines do not add up to the total line, a message has been reworded and a "
                "filter here needs updating."),

        logs(D, "What businesses were told we could not use", f'{APP} | json | msg=`not used`', w=12, h=9),
        logs(D, "Recent submissions", f'{APP} | json | msg=`submission`', w=12, h=9),
    ])


# ── write ────────────────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, d in [("money", money), ("traffic", traffic), ("chat", chat), ("pipe", pipe), ("onboarding", onboarding)]:
        path = OUT / f"{name}.json"
        path.write_text(json.dumps(d, indent=2) + "\n")
        print(f"  {path.relative_to(OUT.parent.parent)}  ({len(d['panels'])} panels)")
