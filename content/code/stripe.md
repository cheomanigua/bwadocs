+++
date = '2025-12-14T00:10:47+01:00'
draft = false
title = 'Stripe'
section = 'code'
weight = 725
+++

# General

### List customers

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe customers list
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.CustomerListParams{}
result := customer.List(params)
```
{{% /tab %}}
{{< /tabs >}}

### Retrieve customer

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe customers retrieve customerid
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.CustomerParams{}
result, err := customer.Get("customerid", params)
```
{{% /tab %}}
{{< /tabs >}}

### Search customer (Option 1)

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe customers list --email="customer@mail.com"
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.CustomerListParams{Email: stripe.String("customer@mail.com")}
result := customer.List(params)
```
{{% /tab %}}
{{< /tabs >}}

### Search customer (Option 2)

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe customers search --query="email:'customer@mail.com'"
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.CustomerSearchParams{
  SearchParams: stripe.SearchParams{Query: "email:'customer@mail.com'"},
}
result := customer.Search(params)
```
{{% /tab %}}
{{< /tabs >}}

### Delete customer

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe customers delete customerid
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.CustomerParams{}
result, err := customer.Del("customerid", params)
```
{{% /tab %}}
{{< /tabs >}}

### List subscriptions

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe subscriptions list --customer="customerid"
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.SubscriptionListParams{Customer: stripe.String("customerid")}
result := subscription.List(params)
```
{{% /tab %}}
{{< /tabs >}}

### Cancel subscription

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe subscriptions cancel subscriptionid
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.SubscriptionCancelParams{}
result, err := subscription.Cancel("subscriptionid", params)
```
{{% /tab %}}
{{< /tabs >}}

### List invoices

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe invoices list --customer="customerid"
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.InvoiceListParams{Customer: stripe.String("customerid")}
result := invoice.List(params)
```
{{% /tab %}}
{{< /tabs >}}

### Delete invoice

{{< tabs >}}
{{% tab "CLI" %}}
```
stripe invoices delete invoicedid
```
{{% /tab %}}
{{% tab "Go" %}}
```
stripe.Key = "{{TEST_SECRET_KEY}}"

params := &stripe.InvoiceParams{}
result, err := invoice.Del("invoicedid", params)
```
{{% /tab %}}
{{< /tabs >}}
