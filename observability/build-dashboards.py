#!/usr/bin/env python3
"""
Builds the dashboards in grafana/dashboards/ .

The JSON is what Grafana reads; this file is what a human reads. Hand-editing a 600-line dashboard
export is how a panel quietly ends up pointing at the wrong metric, so the queries live here, once,
next to a comment saying what they answer.

    ./build-dashboards.py                    rewrites grafana/dashboards/*.json
    docker compose restart grafana           a NEW file needs this; an edit does not

Experiment in the Grafana UI freely - `allowUiUpdates` is on. But put a change you want to KEEP
back into this file, because Grafana reloads from disk and will overwrite it.
"""
import json
import pathlib

M = "loki_process_custom_"                 # Alloy's prefix for a stage.metrics metric
APP = '{service="quotemy-api", env=~"$env"}'
PROM = {"type": "prometheus", "uid": "prometheus"}
LOKI = {"type": "loki", "uid": "loki"}

OUT = pathlib.Path(__file__).parent / "grafana" / "dashboards"


# ── layout ───────────────────────────────────────────────────────────────────────────────────────
# Panels are placed by hand into rows that add up to exactly 24 columns. An earlier version let a
# helper wrap automatically and five 6-wide stats came out as a row of four and an orphan with a
# hole beside it. Rows are cheap to count and the result is worth counting.

def row(panels, y, h):
    """Places panels left to right across the full width, at height h."""
    total = sum(p.pop("_w") for p in panels)
    assert total == 24, f"row at y={y} is {total} columns wide, must be 24"
    x = 0
    for p in panels:
        w = p["gridPos"]["w"]
        p["gridPos"] = {"x": x, "y": y, "w": w, "h": p["gridPos"].get("h", h)}
        x += w
    return panels


def lay(*rows):
    """rows is a sequence of (height, [panels]). Returns one flat panel list with gridPos filled."""
    out, y = [], 0
    for h, panels in rows:
        for p in panels:
            p["gridPos"] = {"w": p["_w"], "h": h}
        out += row(panels, y, h)
        y += h
    return out


# ── panels ───────────────────────────────────────────────────────────────────────────────────────

def stat(title, expr, unit="short", ds=PROM, decimals=None, desc="", w=6, thresholds=None,
         spark=True):
    """One number, with a sparkline behind it.

    The sparkline is the point: a stat showing 412 tells you nothing about whether that is normal.
    The same stat with a shape behind it shows the spike without anyone opening a graph.
    """
    return {
        "_w": w,
        "type": "stat", "title": title, "description": desc, "datasource": ds,
        "targets": [{"refId": "A", "expr": expr, "datasource": ds,
                     **({"queryType": "range"} if ds is LOKI else {})}],
        "fieldConfig": {"defaults": {
            "unit": unit, **({"decimals": decimals} if decimals is not None else {}),
            "color": {"mode": "thresholds"},
            "thresholds": {"mode": "absolute", "steps": thresholds or [{"color": "text", "value": None}]},
        }, "overrides": []},
        "options": {
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "textMode": "auto", "colorMode": "value",
            "graphMode": "area" if spark else "none",
            "justifyMode": "auto", "wideLayout": True,
        },
    }


def ts(title, targets, unit="short", ds=PROM, desc="", w=12, stack=False, fill=18, bars=False):
    """A time series. `fill` carries a gradient, which is what makes a spike read as a spike."""
    return {
        "_w": w,
        "type": "timeseries", "title": title, "description": desc, "datasource": ds,
        "targets": [{"refId": chr(65 + i), "expr": e, "legendFormat": lf, "datasource": ds,
                     **({"queryType": "range"} if ds is LOKI else {})}
                    for i, (e, lf) in enumerate(targets)],
        "fieldConfig": {"defaults": {
            "unit": unit,
            "custom": {
                "drawStyle": "bars" if bars else "line",
                "lineWidth": 1 if bars else 2,
                "fillOpacity": 70 if bars else fill,
                "gradientMode": "none" if bars else "opacity",
                "showPoints": "never", "spanNulls": True,
                "stacking": {"mode": "normal" if stack else "none", "group": "A"},
                "axisSoftMin": 0, "barAlignment": 0,
                "lineInterpolation": "linear",
                "scaleDistribution": {"type": "linear"},
                "thresholdsStyle": {"mode": "off"},
            },
            "color": {"mode": "palette-classic"},
        }, "overrides": []},
        "options": {
            "legend": {"displayMode": "list", "placement": "bottom", "showLegend": True,
                       "calcs": ["mean", "max"]},
            "tooltip": {"mode": "multi", "sort": "desc"},
        },
    }


def logs(title, expr, desc="", w=24):
    return {
        "_w": w,
        "type": "logs", "title": title, "description": desc, "datasource": LOKI,
        "targets": [{"refId": "A", "expr": expr, "queryType": "range", "datasource": LOKI,
                     "maxLines": 500}],
        "options": {"showTime": True, "showLabels": False, "showCommonLabels": False,
                    "wrapLogMessage": True, "sortOrder": "Descending",
                    "enableLogDetails": True, "dedupStrategy": "none", "prettifyLogMessage": True},
    }


def alert_table(title, desc="", w=24):
    """Alerts as Prometheus itself sees them.

    `ALERTS` is a series Prometheus synthesises for every pending or firing rule, so this needs no
    Alertmanager and no contact point. It is not a substitute for delivery - a page nobody has open
    tells nobody anything - but it puts alert state beside the graphs instead of on its own URL.
    """
    return {
        "_w": w,
        "type": "table", "title": title, "description": desc, "datasource": PROM,
        "targets": [{"refId": "A", "datasource": PROM, "instant": True, "format": "table",
                     "expr": 'ALERTS{alertstate=~"firing|pending"}'}],
        "transformations": [{"id": "organize", "options": {
            "excludeByName": {"Time": True, "Value": True, "__name__": True, "job": True,
                              "instance": True, "monitor": True},
            "renameByName": {"alertname": "Alert", "alertstate": "State", "severity": "Severity",
                             "trade": "Trade", "stage": "Stage"},
            "indexByName": {"alertstate": 0, "severity": 1, "alertname": 2},
        }}],
        "fieldConfig": {"defaults": {"custom": {"align": "left",
                                                "cellOptions": {"type": "color-text"}}},
                        "overrides": []},
        "options": {"showHeader": True, "footer": {"show": False}},
    }


def alerts_stat(w=6):
    return stat("Alerts firing", 'count(ALERTS{alertstate="firing"}) or vector(0)', decimals=0, w=w,
                desc="Prometheus rules currently firing; the Telemetry pipe page lists which. "
                     "These do not notify anyone yet - see prometheus/rules/quotemy.yml.",
                spark=False,
                thresholds=[{"color": "green", "value": None}, {"color": "red", "value": 1}])


def dashboard(uid, title, description, panels, refresh="30s", frm="now-24h"):
    return {
        "uid": uid, "title": title, "description": description,
        "tags": ["quotemy"], "timezone": "browser", "editable": True,
        "schemaVersion": 39, "version": 1, "refresh": refresh,
        "time": {"from": frm, "to": "now"},
        "templating": {"list": [{
            # A CUSTOM variable, not a query.
            #
            # It used to be `label_values()` against a Prometheus metric, and that was wrong twice
            # over: the options came from Prometheus while the filter is also used by Loki, which
            # knows about environments Prometheus has never seen; and an Alloy restart empties those
            # metrics, so the dropdown could come back with nothing at all. When it resolved to
            # empty, `env=~""` matched nothing and every Loki panel on every page went blank while
            # the data sat there perfectly intact.
            #
            # The values are regexes, so `local` also covers `local-test`.
            # PLAIN VALUES, no "key : value" pairs. Grafana parses a custom variable's query as
            # `display : value`, and an earlier version here had those the wrong way round - so the
            # first option's VALUE became the literal string "All", every panel asked for
            # env=~"All", and every page went blank while the data sat in Loki untouched. Plain
            # values cannot be written backwards.
            #
            # `All` comes from includeAll/allValue rather than from an option of our own, which is
            # also what makes a stale `var-env=$__all` in somebody's bookmarked URL still resolve.
            "name": "env", "label": "Environment", "type": "custom",
            "query": "production,preview,development,local",
            "includeAll": True, "allValue": ".*", "multi": False,
            "current": {"selected": True, "text": "All", "value": "$__all"},
            "options": [
                {"selected": True, "text": "All", "value": "$__all"},
                {"selected": False, "text": "production", "value": "production"},
                {"selected": False, "text": "preview", "value": "preview"},
                {"selected": False, "text": "development", "value": "development"},
                {"selected": False, "text": "local", "value": "local"},
            ],
            "queryValue": "", "skipUrlSync": False, "hide": 0,
        }]},
        "panels": panels,
    }


# ══ 1 · Overview ═════════════════════════════════════════════════════════════════════════════════
# The page to open first, and the only one that tries to answer "is everything all right" in one
# screen. Everything here is also somewhere else in more detail; nothing here is only here.
overview = dashboard(
    "quotemy-overview", "QuoteMy · Overview",
    "One screen: is anything firing, is traffic normal, did submissions and chats go through, and "
    "what did the service complain about.",
    lay(
        (5, [
            alerts_stat(),
            stat("Requests", f'sum(increase({M}http_requests_total{{env=~"$env"}}[$__range]))',
                 decimals=0, desc="Everything the API answered in the selected range."),
            stat("Server errors",
                 f'sum(increase({M}http_requests_total{{env=~"$env", status=~"5.."}}[$__range])) or vector(0)',
                 decimals=0,
                 desc="A rejected price list is a 200 - this is only the service itself failing.",
                 thresholds=[{"color": "green", "value": None}, {"color": "red", "value": 1}]),
            stat("Model spend", f'sum(increase({M}model_cost_usd_total{{env=~"$env"}}[$__range])) or vector(0)',
                 unit="currencyUSD", decimals=4),
        ]),
        (9, [
            ts("Traffic", [
                (f'sum by (status) (rate({M}http_requests_total{{env=~"$env"}}[$__rate_interval])) * 60',
                 "{{status}}"),
            ], unit="short", stack=True, w=24,
               desc="Requests per minute, stacked by status. Drawn as bars so a burst reads as a "
                    "burst rather than as a line that happens to be steep."),
        ]),
        (8, [
            ts("Business side · submissions", [
                (f'sum by (outcome) (increase({M}submissions_total{{env=~"$env"}}[$__rate_interval]))',
                 "{{outcome}}"),
            ], stack=True, bars=True, w=12,
               desc="approved · rejected · not_a_price_list."),
            ts("Customer side · chat turns", [
                (f'sum by (type) (increase({M}chat_turns_total{{env=~"$env"}}[$__rate_interval]))',
                 "{{type}}"),
            ], stack=True, bars=True, w=12,
               desc="A conversation that never reaches `result` never reached a price."),
        ]),
        (11, [
            logs("What the service complained about",
                 '{service="quotemy-api", env=~"$env", level=~"warn|error|fatal"}',
                 desc="Warn and above, newest first. When a number above looks wrong, this is why."),
        ]),
    ),
)


# ══ 2 · Model & Money ════════════════════════════════════════════════════════════════════════════
# Every number here comes from the `model call` line ai.ts has always written.
money = dashboard(
    "quotemy-money", "QuoteMy · Model & Money",
    "What the model costs, by pipeline stage. Counters live in Alloy's memory and reset when it "
    "restarts - right for rates, wrong for lifetime totals. The ledger is chatSpend/{day} in Firestore.",
    lay(
        (5, [
            stat("Spent", f'sum(increase({M}model_cost_usd_total{{env=~"$env"}}[$__range])) or vector(0)',
                 unit="currencyUSD", decimals=4, w=4),
            stat("Model calls", f'sum(increase({M}model_calls_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, w=4),
            stat("Cost per call",
                 f'sum(increase({M}model_cost_usd_total{{env=~"$env"}}[$__range])) / '
                 f'clamp_min(sum(increase({M}model_calls_total{{env=~"$env"}}[$__range])), 1)',
                 unit="currencyUSD", decimals=5, w=4,
                 desc="Divided, not averaged - a stage with more calls weighs more, which is what a bill does."),
            stat("Output tokens",
                 f'sum(increase({M}model_tokens_out_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, w=4,
                 desc="Output costs several times input, so this is the half that moves the bill."),
            stat("Schema violations",
                 f'sum(increase({M}model_schema_violations_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, w=4,
                 desc="Replies that arrived and did not fit the schema. One is a bad day; a run is a broken prompt.",
                 thresholds=[{"color": "green", "value": None}, {"color": "orange", "value": 1},
                             {"color": "red", "value": 5}]),
            alerts_stat(w=4),
        ]),
        (8, [
            ts("Spend per hour, by stage",
               [(f'sum by (stage) (rate({M}model_cost_usd_total{{env=~"$env"}}[$__rate_interval])) * 3600',
                 "{{stage}}")],
               unit="currencyUSD", stack=True,
               desc="Stacked, because the question is usually 'what is the total, and which stage moved it'."),
            ts("Calls per minute, by stage",
               [(f'sum by (stage) (rate({M}model_calls_total{{env=~"$env"}}[$__rate_interval])) * 60',
                 "{{stage}}")]),
        ]),
        (8, [
            ts("Tokens per minute",
               [(f'sum by (stage) (rate({M}model_tokens_in_total{{env=~"$env"}}[$__rate_interval])) * 60',
                 "in · {{stage}}"),
                (f'sum by (stage) (rate({M}model_tokens_out_total{{env=~"$env"}}[$__rate_interval])) * 60',
                 "out · {{stage}}")]),
            ts("How long a model call took",
               [(f'histogram_quantile(0.95, sum by (le, stage) (rate({M}model_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))',
                 "p95 · {{stage}}"),
                (f'histogram_quantile(0.50, sum by (le, stage) (rate({M}model_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))',
                 "p50 · {{stage}}")],
               unit="ms", desc="Including any retry, because that is what the caller waited for."),
        ]),
        (9, [
            ts("Retries folded into a successful call",
               [(f'sum by (stage) (increase({M}model_retries_total{{env=~"$env"}}[$__rate_interval]))',
                 "{{stage}}")],
               bars=True,
               desc="The call succeeded on the second attempt. Invisible in the response, and the "
                    "earliest sign a prompt is drifting."),
            logs("Recent model calls", f'{APP} | json | msg=`model call`', w=12),
        ]),
    ),
)


# ══ 3 · Traffic & Errors ═════════════════════════════════════════════════════════════════════════
traffic = dashboard(
    "quotemy-traffic", "QuoteMy · Traffic & Errors",
    "Rate, errors, duration. Vercel's own Observability tab shows invocations and a 0% error rate; "
    "this shows what the service itself said happened.",
    lay(
        (5, [
            stat("Requests", f'sum(increase({M}http_requests_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0),
            stat("Server errors (5xx)",
                 f'sum(increase({M}http_requests_total{{env=~"$env", status=~"5.."}}[$__range])) or vector(0)',
                 decimals=0,
                 thresholds=[{"color": "green", "value": None}, {"color": "red", "value": 1}]),
            stat("Rejected (4xx)",
                 f'sum(increase({M}http_requests_total{{env=~"$env", status=~"4.."}}[$__range])) or vector(0)',
                 decimals=0,
                 desc="Not a fault. A rejected price list is a 200 here - these are bad requests and rate limits."),
            stat("p95 latency",
                 f'histogram_quantile(0.95, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__range])))',
                 unit="ms", decimals=0),
        ]),
        (9, [
            ts("Requests per minute, by status",
               [(f'sum by (status) (rate({M}http_requests_total{{env=~"$env"}}[$__rate_interval])) * 60',
                 "{{status}}")],
               stack=True, bars=True, w=24,
               desc="The spike panel. Bars rather than a line: at this volume a line between two "
                    "sparse points invents traffic that never happened."),
        ]),
        (8, [
            ts("Latency",
               [(f'histogram_quantile(0.50, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50"),
                (f'histogram_quantile(0.95, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95"),
                (f'histogram_quantile(0.99, sum by (le) (rate({M}http_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p99")],
               unit="ms"),
            ts("Requests by route",
               [(f'sum by (path) (count_over_time({APP} | json | msg=`request` [$__auto]))', "{{path}}")],
               ds=LOKI, stack=True, bars=True,
               desc="From Loki, not Prometheus: `path` is deliberately not a metric label - too many "
                    "values for one."),
        ]),
        (9, [
            ts("Slowest routes (p95)",
               [(f'quantile_over_time(0.95, {APP} | json | msg=`request` | unwrap ms [$__auto]) by (path)',
                 "{{path}}")],
               ds=LOKI, unit="ms", w=24),
        ]),
        (11, [
            logs("Everything the service complained about",
                 '{service="quotemy-api", env=~"$env", level=~"warn|error|fatal"}'),
        ]),
    ),
    frm="now-6h",
)


# ══ 4 · Business onboarding ══════════════════════════════════════════════════════════════════════
# The page that could not exist before pipeline.ts logged anything. CLAUDE.md records a prompt
# change that rejected a fully compliant price list; nobody could have seen that here, because
# there was no here.
onboarding = dashboard(
    "quotemy-onboarding", "QuoteMy · Business onboarding",
    "What happens to the price lists businesses send. The reject rate is the number to watch after "
    "any change to the review prompt.",
    lay(
        (5, [
            stat("Submissions", f'sum(increase({M}submissions_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, w=4),
            stat("Approved",
                 f'sum(increase({M}submissions_total{{env=~"$env", outcome="approved"}}[$__range])) / '
                 f'clamp_min(sum(increase({M}submissions_total{{env=~"$env"}}[$__range])), 1)',
                 unit="percentunit", decimals=1, w=4,
                 desc="A rejected price list is not a fault - it is incomplete. But a reject rate that "
                      "MOVES after a prompt change is the thing to catch.",
                 thresholds=[{"color": "red", "value": None}, {"color": "orange", "value": 0.4},
                             {"color": "green", "value": 0.6}]),
            stat("Rates stored", f'sum(increase({M}rates_saved_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, w=4, desc="Rates that survived verification - not rates the model read."),
            stat("Rates per submission",
                 f'sum(increase({M}rates_saved_total{{env=~"$env"}}[$__range])) / '
                 f'clamp_min(sum(increase({M}submissions_total{{env=~"$env", outcome="approved"}}[$__range])), 1)',
                 decimals=1, w=4,
                 desc="A published profile with two rates answers almost no customer. This is how much "
                      "of a price list actually makes it through."),
            stat("Figures dropped",
                 f'sum(increase({M}figures_not_used_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, w=4,
                 desc="Each one was reported to the business. Rising means the model and the verifier "
                      "are disagreeing more often."),
            alerts_stat(w=4),
        ]),
        (8, [
            ts("Submissions by outcome",
               [(f'sum by (outcome) (increase({M}submissions_total{{env=~"$env"}}[$__rate_interval]))',
                 "{{outcome}}")],
               stack=True, bars=True,
               desc="not_a_price_list is caught twice over - by code for a keyboard mash, by the review otherwise."),
            ts("Approved, but nothing left standing",
               [(f'sum(increase({M}submissions_total{{env=~"$env", outcome="approved", status="verified"}}[$__rate_interval]))',
                 "kept something"),
                (f'sum(increase({M}submissions_total{{env=~"$env", outcome="approved", status="unverified"}}[$__rate_interval]))',
                 "nothing verified")],
               bars=True,
               desc="The review let it through and then every figure failed verification. Rare, and the "
                    "worst experience the onboarding can give."),
        ]),
        (8, [
            ts("Rates stored per hour, by trade",
               [(f'sum by (trade) (rate({M}rates_saved_total{{env=~"$env"}}[$__rate_interval])) * 3600',
                 "{{trade}}")]),
            ts("How long a business waited",
               [(f'histogram_quantile(0.95, sum by (le) (rate({M}submission_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95"),
                (f'histogram_quantile(0.50, sum by (le) (rate({M}submission_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50")],
               unit="ms",
               desc="End to end, including reading any attached document. Vercel's ceiling is in vercel.json."),
        ]),
        (9, [
            # Grouped HERE and not in app code, on purpose. See `logNotUsed` in pipeline.ts: if a
            # message is reworded this panel goes flat where somebody can see it, instead of the
            # application quietly counting the wrong thing.
            ts("Why a figure could not be used",
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
                # The reference line. If the grouped series do not add up to it, something is being
                # dropped for a reason none of the filters knows about - which is exactly the signal
                # that a message has been reworded. Without this the gap would be invisible.
                (f'sum(count_over_time({APP} | json | msg=`not used` [$__auto]))',
                 "— all drops (the rest should add up to this) —")],
               ds=LOKI, w=24,
               desc="Grouped by the text the BUSINESS was shown. 'Not in the vocabulary' should sit at "
                    "zero - strict json_schema is supposed to make it impossible, so anything there is "
                    "worth reading."),
        ]),
        (10, [
            logs("What businesses were told we could not use", f'{APP} | json | msg=`not used`', w=12),
            logs("Recent submissions", f'{APP} | json | msg=`submission`', w=12),
        ]),
    ),
)


# ══ 5 · Customer chat ════════════════════════════════════════════════════════════════════════════
chat = dashboard(
    "quotemy-chat", "QuoteMy · Customer chat",
    "The customer side: how many conversations ran, how many reached a price, and how many turns "
    "needed the model at all.",
    lay(
        (5, [
            stat("Chat turns", f'sum(increase({M}chat_turns_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0),
            stat("Resolved without the model",
                 f'sum(increase({M}chat_turns_total{{env=~"$env", tapped="true"}}[$__range])) / '
                 f'clamp_min(sum(increase({M}chat_turns_total{{env=~"$env"}}[$__range])), 1)',
                 unit="percentunit", decimals=1,
                 desc="A tapped option comes off a list this code generated last turn, so it is resolved "
                      "in code: no model, no money, no three-second spinner. It is the commonest turn in "
                      "the conversation, and this is the number that says the shortcut still works.",
                 thresholds=[{"color": "red", "value": None}, {"color": "orange", "value": 0.3},
                             {"color": "green", "value": 0.5}]),
            stat("Quotes shown", f'sum(increase({M}chat_quotes_shown_total{{env=~"$env"}}[$__range])) or vector(0)',
                 decimals=0, desc="Priced quotes actually put in front of a customer."),
            stat("Cost", f'sum(increase({M}chat_cost_usd_total{{env=~"$env"}}[$__range])) or vector(0)',
                 unit="currencyUSD", decimals=4),
        ]),
        (8, [
            ts("Turns by what we replied with",
               [(f'sum by (type) (increase({M}chat_turns_total{{env=~"$env"}}[$__rate_interval]))',
                 "{{type}}")],
               stack=True, bars=True,
               desc="question · confirmation · result · message. A conversation that never reaches "
                    "`result` never reached a price."),
            ts("Did the turn need the model?",
               [(f'sum(increase({M}chat_turns_total{{env=~"$env", tapped="true"}}[$__rate_interval]))',
                 "tapped · free"),
                (f'sum(increase({M}chat_turns_total{{env=~"$env", tapped="false"}}[$__rate_interval]))',
                 "free text · model")],
               stack=True, bars=True),
        ]),
        (8, [
            ts("How long a customer waited",
               [(f'histogram_quantile(0.95, sum by (le) (rate({M}chat_turn_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p95"),
                (f'histogram_quantile(0.50, sum by (le) (rate({M}chat_turn_duration_ms_bucket{{env=~"$env"}}[$__rate_interval])))', "p50")],
               unit="ms"),
            ts("Turns by trade",
               [(f'sum by (trade) (increase({M}chat_turns_total{{env=~"$env"}}[$__rate_interval]))',
                 "{{trade}}")],
               stack=True, bars=True),
        ]),
        (8, [
            ts("How long matching took",
               [(f'quantile_over_time(0.95, {APP} | json | msg=`matcher` | unwrap ms [$__auto])', "p95"),
                (f'quantile_over_time(0.50, {APP} | json | msg=`matcher` | unwrap ms [$__auto])', "p50")],
               ds=LOKI, unit="ms",
               desc="The one step whose cost grows with the number of businesses - a service document "
                    "is read per candidate."),
            ts("Businesses considered vs businesses that covered them",
               [(f'avg_over_time({APP} | json | msg=`matcher` | unwrap candidates [$__auto])', "candidates"),
                (f'avg_over_time({APP} | json | msg=`matcher` | unwrap matched [$__auto])', "covering")],
               ds=LOKI,
               desc="A gap that widens means the trade is growing in places customers are not asking from."),
        ]),
        (8, [
            ts("Which trade, and how we knew",
               [(f'sum(count_over_time({APP} | json | msg=`trade read from the message` [$__auto]))',
                 "read from their words"),
                (f'sum(count_over_time({APP} | json | msg=`asking which trade` [$__auto]))',
                 "had to ask")],
               ds=LOKI, bars=True,
               desc="Asking is a worse experience. If that line climbs, the routing keywords need a look."),
            ts("Customers asking their own questions",
               [(f'sum(count_over_time({APP} |= `looked up pictures` [$__auto]))', "pictures"),
                (f'sum(count_over_time({APP} | json | msg=`voice turn` [$__auto]))', "voice turns")],
               ds=LOKI, bars=True,
               desc="Pictures cost about a tenth of a cent each; a rates question costs cents. Both are "
                    "capped per conversation."),
        ]),
        (10, [
            logs("Recent chat turns", f'{APP} | json | msg=`chat turn`', w=12),
            logs("Turns that failed",
                 f'{APP} |~ `chat turn failed|voice turn failed|could not save the quote result`', w=12),
        ]),
    ),
)


# ══ 6 · Telemetry pipe ═══════════════════════════════════════════════════════════════════════════
pipe = dashboard(
    "quotemy-pipe", "QuoteMy · Telemetry pipe",
    "Is the observability stack itself alive? A quiet dashboard and a broken pipe look identical "
    "from anywhere else, which is the whole reason this page exists.",
    lay(
        (5, [
            stat("Alloy", 'up{job="alloy"}', spark=False,
                 desc="0 means nothing from the app is arriving, whatever the other pages show.",
                 thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
            stat("Loki", 'up{job="loki"}', spark=False,
                 thresholds=[{"color": "red", "value": None}, {"color": "green", "value": 1}]),
            stat("Lines received",
                 f'sum(count_over_time({{service="quotemy-api", env=~"$env"}} [$__range]))',
                 ds=LOKI, decimals=0),
            stat("Alloy memory", 'alloy_resources_process_resident_memory_bytes', unit="bytes",
                 decimals=0),
        ]),
        (7, [
            alert_table("Alerts",
                        "Pending and firing rules, straight from Prometheus. Empty is what this "
                        "should look like."),
        ]),
        (8, [
            ts("Log lines per minute, by environment",
               [(f'sum by (env) (count_over_time({{service="quotemy-api"}} [$__auto]))', "{{env}}")],
               ds=LOKI, bars=True,
               desc="`production` and `local` side by side. A production line that stops is the thing "
                    "to notice, and it is invisible on every other page."),
            ts("Lines per minute, by level",
               [(f'sum by (level) (count_over_time({{service="quotemy-api", env=~"$env"}} [$__auto]))',
                 "{{level}}")],
               ds=LOKI, stack=True, bars=True,
               desc="`unknown` means something that is not this service's pino output is pushing to "
                    "the gate."),
        ]),
        (10, [
            # A real warning found in this project's own production logs while building these pages.
            logs("The chat and the extractor disagreeing about a trade",
                 f'{APP} |~ `differs from vocab.ts|published field spec is unusable|could not load trade`',
                 desc="`schema/{trade}` is what the customer chat builds its questions from, and "
                      "vocab.ts is what the extractor enforces. When they drift apart, a customer can "
                      "be offered something no business can be matched on - and nothing else reports it."),
        ]),
    ),
    refresh="1m",
)


# ── write ────────────────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, d in [("overview", overview), ("money", money), ("traffic", traffic),
                    ("onboarding", onboarding), ("chat", chat), ("pipe", pipe)]:
        (OUT / f"{name}.json").write_text(json.dumps(d, indent=2) + "\n")
        print(f"  {name+'.json':<18} {len(d['panels']):>2} panels")
