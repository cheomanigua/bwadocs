+++
date = '2025-12-14T00:10:47+01:00'
draft = false
title = 'Stripe'
section = 'code'
weight = 725
+++

# Custom CLI tool

### Invoice

It will list the invoices of a customer

```
myprog invoce johndoe@gmail

Invoices for johndoe@mail.com (customer_id=cus_ABC123):
ID: in_001 | Amount Due: 20.00 usd | Status: paid | Period End: 2025-12-01 00:00:00 +0000 UTC
ID: in_002 | Amount Due: 20.00 usd | Status: paid | Period End: 2026-01-01 00:00:00 +0000 UTC
```

…and it will show what would be canceled/deleted.


---

### Delete

It will delete the subscription and the customer

```
myprog delete johndoe@mail.com
```

##### ✅ Usage with Dry Run

**“dry-run” mode** simulates deletions without touching live data. Users can type, for example:

```bash
# Dry run deletion (safe, does not cancel anything)
./myprog delete --dry-run johndoe@mail.com
```

Output example:

```
Customer johndoe@mail.com (ID: cus_ABC123) subscriptions:
ID: sub_001 | Status: active | Current Period End: 2025-12-31 00:00:00 +0000 UTC

-- Dry run mode --
Would cancel 1 subscription(s) and delete customer johndoe@mail.com (cus_ABC123)
```

* Nothing is deleted.
* Useful for support staff to **preview effects** before acting in live mode.

---

This gives you a **full-featured, safe CLI**:

* List invoices
* Delete customers + subscriptions
* Dry-run support
* Handles multiple customers with same email
* Confirmation prompt
---

### Code

### `main.go`

```go
package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/customer"
	"github.com/stripe/stripe-go/v74/sub"
)

func main() {
	if len(os.Args) < 3 {
		fmt.Println("Usage:")
		fmt.Println("  myprog invoice <customer-email>")
		fmt.Println("  myprog delete [--dry-run] <customer-email>")
		os.Exit(1)
	}

	command := os.Args[1]
	email := ""
	dryRun := false

	// Parse args
	if command == "delete" && os.Args[2] == "--dry-run" {
		dryRun = true
		if len(os.Args) < 4 {
			fmt.Println("Please provide customer email for delete command")
			os.Exit(1)
		}
		email = os.Args[3]
	} else {
		email = os.Args[2]
	}

	apiKey := os.Getenv("STRIPE_API_KEY")
	if apiKey == "" {
		log.Fatal("Please set STRIPE_API_KEY environment variable")
	}
	stripe.Key = apiKey

	// Find all customers matching email
	cusList := findCustomers(email)
	if len(cusList) == 0 {
		fmt.Printf("No customers found with email %s\n", email)
		os.Exit(0)
	}

	switch command {
	case "invoice":
		for _, c := range cusList {
			listInvoices(c.ID, c.Email)
		}
	case "delete":
		for _, c := range cusList {
			deleteCustomerWithConfirmation(c.ID, c.Email, dryRun)
		}
	default:
		fmt.Println("Unknown command:", command)
		os.Exit(1)
	}
}

// findCustomers returns all customers matching email
func findCustomers(email string) []*stripe.Customer {
	params := &stripe.CustomerSearchParams{
		Query: stripe.String(fmt.Sprintf("email:'%s'", email)),
		Limit: stripe.Int64(100),
	}
	iter := customer.Search(params)

	var customers []*stripe.Customer
	for iter.Next() {
		cus := iter.Customer()
		customers = append(customers, cus)
	}
	if err := iter.Err(); err != nil {
		log.Fatalf("Error searching customers: %v", err)
	}
	return customers
}

// listInvoices lists invoices for a customer
func listInvoices(cusID, email string) {
	fmt.Printf("\nInvoices for %s (customer_id=%s):\n", email, cusID)
	invParams := &stripe.InvoiceListParams{
		Customer: stripe.String(cusID),
		Limit:    stripe.Int64(10),
	}
	invoices := stripeInvoicesList(invParams)
	for _, inv := range invoices {
		fmt.Printf("ID: %s | Amount Due: %.2f %s | Status: %s | Period End: %v\n",
			inv.ID, float64(inv.AmountDue)/100, inv.Currency, inv.Status, inv.PeriodEnd)
	}
}

// deleteCustomerWithConfirmation cancels subscriptions and deletes customer
func deleteCustomerWithConfirmation(cusID, email string, dryRun bool) {
	// List subscriptions
	subParams := &stripe.SubscriptionListParams{
		Customer: stripe.String(cusID),
		Limit:    stripe.Int64(100),
	}
	subIter := sub.List(subParams)

	var subs []*stripe.Subscription
	fmt.Printf("\nCustomer %s (ID: %s) subscriptions:\n", email, cusID)
	for subIter.Next() {
		s := subIter.Subscription()
		fmt.Printf("ID: %s | Status: %s | Current Period End: %v\n", s.ID, s.Status, s.CurrentPeriodEnd)
		subs = append(subs, s)
	}
	if err := subIter.Err(); err != nil {
		log.Fatalf("Error listing subscriptions: %v", err)
	}

	if dryRun {
		fmt.Println("\n-- Dry run mode --")
		fmt.Printf("Would cancel %d subscription(s) and delete customer %s (%s)\n", len(subs), email, cusID)
		return
	}

	// Ask for confirmation
	reader := bufio.NewReader(os.Stdin)
	fmt.Printf("\nAre you sure you want to cancel all subscriptions and delete customer %s? (yes/no): ", email)
	answer, _ := reader.ReadString('\n')
	answer = strings.TrimSpace(strings.ToLower(answer))
	if answer != "yes" {
		fmt.Println("Aborted.")
		return
	}

	// Cancel subscriptions
	for _, s := range subs {
		_, err := sub.Cancel(s.ID, nil)
		if err != nil {
			log.Printf("Failed to cancel subscription %s: %v\n", s.ID, err)
		} else {
			fmt.Printf("Cancelled subscription %s\n", s.ID)
		}
	}

	// Delete customer
	cus, err := customer.Del(cusID, nil)
	if err != nil {
		log.Fatalf("Failed to delete customer %s: %v", cusID, err)
	}
	if cus.Deleted {
		fmt.Printf("Customer %s (%s) deleted successfully\n", email, cusID)
	} else {
		fmt.Printf("Customer %s (%s) could not be deleted\n", email, cusID)
	}
}

// stripeInvoicesList helper
func stripeInvoicesList(params *stripe.InvoiceListParams) []*stripe.Invoice {
	iter := invoice.List(params)
	var invoices []*stripe.Invoice
	for iter.Next() {
		invoices = append(invoices, iter.Invoice())
	}
	if err := iter.Err(); err != nil {
		log.Fatalf("Error listing invoices: %v", err)
	}
	return invoices
}
```
