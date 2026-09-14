# The `services_provided` cleanup — the project, the four rows, and the one to leave

Paste below the line. This is not an audit; it is the exact list, so nobody has to go looking.

---

## The project is `quotemy-ai`

Not `quotemyfence-flutter-and-webap`, which is this repo's default. The backend's service account
authenticates as:

```
project_id : quotemy-ai
```

`quotemy-ai` is the database the customer search actually reads and the one the live businesses are
in — it is also the CLI's current project, so `firebase use` is already right. **Check the project
before any write.** A cleanup pointed at the repo default will either fail or edit a different
database, and neither failure says so out loud.

## The four rows to remove

A read-only pass over `businesses` in `quotemy-ai`. Two businesses, four entries — both have real,
confirmed **fencing** pricing, so they are working businesses that were listed for trades they never
priced:

Two businesses, four entries. **The uids and names are not written here on purpose** - live
identifiers do not belong in a repository that gets cloned and shared. They were sent separately;
ask for them again if you need them rather than copying them into a file.

| business | remove from `services_provided` |
|---|---|
| first  | `decking`, `tiling` |
| second | `retaining-wall`, `decking` |

Each of those four has **no `businesses/{uid}/services/{trade}` document at all** — not an empty one,
not an unconfirmed one. Nothing is lost by removing them.

Note the second one's is spelled **`retaining-wall`, with a hyphen** — the old frontend spelling. Match on both
spellings or you will remove three of four and think you are done.

Leave `fencing` on both. It is live.

## ⚠ The one that must survive

One account's `fencing` sits at status `verified` - the uid was sent separately.

**Do not touch this.** `verified` means the prices were approved and the business has not pressed
Confirm yet. That is the product working — no price goes live without a human confirming it — and
waiting is a legitimate state that can last weeks.

This is the whole reason not to write a blanket "remove trades with no confirmed pricing" script.
The rule is **"no `services/{trade}` document at all"**, not "not confirmed". A script that cannot
tell those apart deletes a business's real, approved work.

That account also carries `landscaping`, which is not a backend trade. Harmless — the customer search
only ever queries the five real slugs, so it is never matched. Leave it unless you are removing the
chip's leftovers anyway.

## Doing it

Four edits on two documents. Do them by hand in the console, or with a script that names the two
uids explicitly (they were sent to you separately). Do not iterate the collection and decide per row — the decision is already made
above, and re-deriving it is how `verified` gets swept up.

Afterwards, re-read both documents and confirm `fencing` is still on each.

## Permit and warranty

Confirmed received. Nothing further from this side on those two.
