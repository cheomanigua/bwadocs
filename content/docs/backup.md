---
title: "Backup"
weight: 73
# bookFlatSection: false
# bookToc: true
# bookHidden: false
# bookCollapseSection: false
# bookComments: false
# bookSearchExclude: false
# bookHref: ''
# bookIcon: ''
---

# Backup

## Code Backup

The code is backed up by using redundancy remote repositories: GitHub, GitLab and BitBucket.

## Firestore Backup

In order to avoid vendor lock on the Firestore database, a backup strategy has to be in place. The average database size is like this:

* ~200 users × 10 fields
* ~200 posts × 5 fields
* Total documents: **~400**
* Total data size: **kilobytes, not megabytes**

At this scale, incremental backups are overkill because they add complexity without benefit. The best strategy for the above dataset is daily **full JSON snapshots**. This gives:

* Maximum reliability
* Zero restore ambiguity
* Zero sync bugs
* Minimal cost
* Extremely simple tooling

---

### Why incremental backups are a bad idea *here*

| Factor             | Your scale | Incremental worth it?     |
| ------------------ | ---------- | ------------------------- |
| Dataset size       | Tiny       |  No                      |
| Change volume      | Low        |  No                      |
| Cost pressure      | None       |  No                      |
| Restore simplicity | Important  |  Incrementals complicate |
| Risk tolerance     | Low        |  Avoid                   |

Incrementals shine at **millions of documents**, not hundreds.

---

# Recommended Architecture

```
Firestore
   ↓ (daily pull)
Cloud Run Job (Go)
   ↓
Full JSON snapshot
   ↓
MongoDB (immutable backups)
   ↓
Object Storage (cold archive)
```

---

### Schedule

#### Daily

* **Full snapshot**
* Retain 30–90 days

#### Optional

* Weekly snapshot marked as `long_term`
* Retain 6–12 months

---

### Snapshot structure (simple & portable)

```json
{
  "backup_id": "2026-01-09T00:00:00Z",
  "version": 1,
  "collections": {
    "users": [
      { "id": "u1", "...": "..." }
    ],
    "posts": [
      { "id": "p1", "...": "..." }
    ]
  },
  "stats": {
    "users": 198,
    "posts": 203
  }
}
```

- Human-readable
- One-file restore
- No dependency chain

---

### MongoDB storage model

One document per snapshot:

```json
{
  "_id": "2026-01-09",
  "data": { ... },
  "created_at": ISODate("2026-01-09T00:00:00Z"),
  "checksum": "sha256"
}
```

Or:

* One collection per snapshot date
* Or JSON file per snapshot (even simpler)

---

### Restore process (minutes)

* Pick snapshot
* Import JSON
* Restore to:

  * Firestore
  * MongoDB
  * Any DB

No replay.
No ordering issues.
No partial restores.

---

### Cost impact (negligible)

Rough estimate:

* 400 docs × ~1 KB ≈ **400 KB/day**
* 365 days ≈ **~150 MB/year**
* Storage cost ≈ **pennies per year**

MongoDB + object storage costs will be **noise**.

---

### Extra safety (optional but recommended)

* SHA-256 checksum per snapshot
* Immutable object storage (WORM)
* Store one copy **outside GCP**
* Periodic restore test (quarterly)

---

# What NOT to do

- Incremental snapshots
- Event-based replication
- Real-time sync
- Partial backups
- Complex retention logic

---

# Final Recommendation (Short)

**Daily full JSON snapshot. Period.**

* Simple
* Safe
* Portable
* Cheap
* Zero lock-in

Incrementals would *reduce reliability* for your use case.

---

If you want, I can:

* Write the **Go Cloud Run Job**
* Provide **MongoDB schema**
* Create **restore scripts**
* Design **off-cloud archival**

Just tell me what you want next 👌

