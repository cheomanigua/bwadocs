---
title: "Email"
weight: 70
# bookFlatSection: false
# bookToc: true
# bookHidden: false
# bookCollapseSection: false
# bookComments: false
# bookSearchExclude: false
# bookHref: ''
# bookIcon: ''
---

TODO

Create an email service to notify users and to receive system messages.

Excellent list. This is exactly the right moment to **draw a hard line** between:

* **Stripe-owned billing emails**
* **Your app’s member notifications**
* **Your internal admin alerts**

Below is a **clear, production-grade classification** of *every item you listed*, with **who should send it, how, and why** — specifically for **Stripe + Google Workspace + your Go backend**.

---

## 1. Member notices — what sends what

##### 🟢 = Stripe should send

##### 🔵 = Your app should send (Workspace SMTP)

##### ⚠️ = Stripe sends, app may *supplement*

---

### Member Notices (recommended setup)

##### 🔵 Welcome Email

- **Sender:** Your app
- **Why:** Branding, onboarding, dashboard links
- **Trigger:** `checkout.session.completed` (new user)

---

##### 🟢 Payment Receipt Notice

- **Sender:** Stripe
- **Why:** Legal, tax, invoice PDF, retries
- **Stripe setting:** Enable “Successful payment” emails
- **Do NOT send yourself**

---

##### 🔵 Cancelled Subscription

- **Sender:** Your app
- **Why:** Explain *access end date*, retention messaging
- **Trigger:** `customer.subscription.deleted`

Stripe may also send invoice/refund confirmation → that’s fine.

---

##### 🔵 Upgraded Subscription Notice

- **Sender:** Your app
- **Why:** Feature explanation, immediate value
- **Trigger:** `customer.subscription.updated` (plan ↑)

---

##### 🔵 Downgraded Subscription Notice

- **Sender:** Your app
- **Why:** Explain when downgrade takes effect
- **Trigger:** `customer.subscription.updated` (plan ↓)

---

##### 🔵 Paused Subscription Notice

- **Sender:** Your app
- **Trigger:** `customer.subscription.updated` (`pause_collection`)

---

##### 🔵 Resumed Subscription Notice

- **Sender:** Your app
- **Trigger:** `customer.subscription.updated`

---

##### 🟢 Refunded Transaction Notice

- **Sender:** Stripe
- **Why:** Official refund confirmation
- **Stripe setting:** Enable refund emails

Optional app email if you want human context, but not required.

---

##### ⚠️ Failed Transaction Notice

- **Primary sender:** Stripe
- **Why:** Retry logic, payment links
- **Optional app email:**
“Action required: update your card”
Triggered by `invoice.payment_failed`

---

##### 🟢 Credit Card Expiring Notice

- **Sender:** Stripe
- **Why:** Stripe auto-detects card expiration
- **Stripe setting:** Enable “Card expiring” emails

Do **not** implement this yourself.

---

##### 🟢 Stripe Failed Payment Notice

- **Sender:** Stripe
This is already covered by Stripe’s retry & dunning system.

---

## 2. Admin Emails & Notices (ALL YOUR APP)

Stripe **never** emails your admins by default — this is entirely on you.

All admin emails should:

* Use **Google Workspace SMTP**
* Be sent to: `johndoe@mail.com`
* Be **short, factual, no HTML needed** (but allowed)

---

### Admin notices — ownership

##### 🔵 New Signup Notice

- **Trigger:** First successful checkout
- **Includes:** Email, plan, Stripe customer ID

---

##### 🔵 New One-Time Subscription Notice

- **Trigger:** `checkout.session.completed` (mode=payment)

---

##### 🔵 New Recurring Subscription Notice

- **Trigger:** `checkout.session.completed` (mode=subscription)

---

##### 🔵 Payment Receipt Notice (Admin copy)

- **Trigger:** `invoice.payment_succeeded`
- **Why:** Bookkeeping visibility
- **Do NOT attach invoices** — Stripe dashboard is source of truth

---

##### 🔵 Cancelled Subscription Notice

- **Trigger:** `customer.subscription.deleted`

---

##### 🔵 Upgraded Subscription Notice

- **Trigger:** `customer.subscription.updated`

---

##### 🔵 Downgraded Subscription Notice

- **Trigger:** `customer.subscription.updated`

---

##### 🔵 Paused Subscription Notice

- **Trigger:** `customer.subscription.updated`

---

##### 🔵 Resumed Subscription Notice

- **Trigger:** `customer.subscription.updated`

---

##### 🔵 Refunded Transaction Notice

- **Trigger:** `charge.refunded` or `refund.created`

---

##### 🔵 Failed Transaction Notice

- **Trigger:** `invoice.payment_failed`

---

##### 🔵 Credit Card Expiring Notice

- **Trigger:** `customer.source.expiring` (Stripe webhook)

Stripe notifies the customer — *you notify admins*.

---

## 3. Clean implementation model (important)

##### One Stripe event → multiple emails

Example: `invoice.payment_failed`

| Recipient | Sender              | Purpose              |
| --------- | ------------------- | -------------------- |
| Customer  | Stripe              | Payment retry / link |
| Customer  | Your app (optional) | Friendly reminder    |
| Admin     | Your app            | Visibility           |

This avoids:

* Duplicate customer spam
* Compliance mistakes
* Missed payments

---

## 4. Email responsibility matrix (summary)

| Category              | Sender   |
| --------------------- | -------- |
| Legal billing docs    | Stripe   |
| Receipts & invoices   | Stripe   |
| Payment retries       | Stripe   |
| App UX messaging      | Your app |
| Admin alerts          | Your app |
| Card expiry detection | Stripe   |
| Account lifecycle     | Your app |

---

## 5. Why this setup is *correct*

✔ Stripe handles compliance
✔ Workspace handles branding
✔ Admins get visibility
✔ No double emails
✔ Minimal code
✔ Scales cleanly

This is exactly how **Stripe itself recommends** production SaaS systems be structured.

---

## 6. Next steps (if you want)

I can:

* Map **each Stripe webhook → email event enum**
* Give you a **single Go switch** covering all cases
* Design **member vs admin templates**
* Show how to **prevent duplicate emails on webhook retries**
* Add **email preferences per user**

Just tell me what you want next.

