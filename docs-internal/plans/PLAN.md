# Payment System Implementation Plan

## Overview
Build a comprehensive end-to-end payment system integrating Stripe (US/Global) and Razorpay (India) with billing, invoicing, plan management, and discount coupons.

---

## Phase 1: Database Schema Extensions

### New Prisma Models

```prisma
// Payment Gateway Configuration
model PaymentGateway {
  id            String   @id @default(cuid())
  provider      String   @unique // 'stripe' | 'razorpay'
  isActive      Boolean  @default(true)
  isDefault     Boolean  @default(false)
  publicKey     String?
  // secretKey stored in env, not DB
  webhookSecret String?
  supportedCurrencies String[] @default(["USD"])
  supportedCountries  String[] @default(["US"])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Customer billing profile
model BillingCustomer {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id])
  stripeCustomerId    String?  @unique
  razorpayCustomerId  String?  @unique
  billingEmail        String?
  billingName         String?
  billingAddress      Json?
  taxId               String?
  defaultPaymentMethod String?
  preferredGateway    String?  // 'stripe' | 'razorpay'
  country             String?
  currency            String   @default("USD")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  subscriptions       Subscription[]
  invoices            Invoice[]
  paymentMethods      PaymentMethod[]
}

// Subscription management
model Subscription {
  id                    String   @id @default(cuid())
  customerId            String
  customer              BillingCustomer @relation(fields: [customerId], references: [id])
  licenseTypeId         String
  licenseType           LicenseType @relation(fields: [licenseTypeId], references: [id])

  status                String   // 'active' | 'past_due' | 'canceled' | 'trialing' | 'paused'
  billingCycle          String   // 'monthly' | 'yearly'

  stripeSubscriptionId  String?  @unique
  razorpaySubscriptionId String? @unique

  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAtPeriodEnd     Boolean  @default(false)
  canceledAt            DateTime?
  trialEnd              DateTime?

  quantity              Int      @default(1)
  unitAmount            Int      // in cents
  discount              Int      @default(0) // discount amount in cents
  couponId              String?
  coupon                Coupon?  @relation(fields: [couponId], references: [id])

  metadata              Json?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  invoices              Invoice[]
}

// Invoice system
model Invoice {
  id                  String   @id @default(cuid())
  invoiceNumber       String   @unique
  customerId          String
  customer            BillingCustomer @relation(fields: [customerId], references: [id])
  subscriptionId      String?
  subscription        Subscription? @relation(fields: [subscriptionId], references: [id])

  stripeInvoiceId     String?  @unique
  razorpayInvoiceId   String?  @unique

  status              String   // 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  currency            String   @default("USD")

  subtotal            Int      // in cents
  discount            Int      @default(0)
  tax                 Int      @default(0)
  total               Int
  amountPaid          Int      @default(0)
  amountDue           Int

  dueDate             DateTime?
  paidAt              DateTime?

  billingReason       String?  // 'subscription_create' | 'subscription_cycle' | 'manual'
  description         String?
  notes               String?

  lineItems           InvoiceLineItem[]
  payments            Payment[]

  pdfUrl              String?
  hostedUrl           String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model InvoiceLineItem {
  id            String   @id @default(cuid())
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])
  description   String
  quantity      Int      @default(1)
  unitAmount    Int      // in cents
  amount        Int      // total in cents
  periodStart   DateTime?
  periodEnd     DateTime?
  createdAt     DateTime @default(now())
}

// Payment records
model Payment {
  id                  String   @id @default(cuid())
  invoiceId           String?
  invoice             Invoice? @relation(fields: [invoiceId], references: [id])

  stripePaymentIntentId String? @unique
  razorpayPaymentId     String? @unique

  gateway             String   // 'stripe' | 'razorpay'
  status              String   // 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'

  amount              Int      // in cents
  currency            String

  paymentMethod       String?  // 'card' | 'upi' | 'netbanking' | 'wallet'
  last4               String?
  cardBrand           String?

  failureCode         String?
  failureMessage      String?

  refundedAmount      Int      @default(0)
  refundedAt          DateTime?

  metadata            Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

// Payment methods
model PaymentMethod {
  id                    String   @id @default(cuid())
  customerId            String
  customer              BillingCustomer @relation(fields: [customerId], references: [id])

  stripePaymentMethodId String?  @unique
  razorpayTokenId       String?

  type                  String   // 'card' | 'upi' | 'netbanking'
  isDefault             Boolean  @default(false)

  // Card details (masked)
  cardBrand             String?
  cardLast4             String?
  cardExpMonth          Int?
  cardExpYear           Int?

  billingDetails        Json?

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

// Discount coupons
model Coupon {
  id              String   @id @default(cuid())
  code            String   @unique
  name            String
  description     String?

  discountType    String   // 'percentage' | 'fixed_amount'
  discountValue   Int      // percentage (0-100) or cents
  currency        String?  // required for fixed_amount

  duration        String   // 'once' | 'repeating' | 'forever'
  durationMonths  Int?     // for 'repeating'

  maxRedemptions  Int?
  timesRedeemed   Int      @default(0)

  appliesToPlans  String[] // license type IDs, empty = all plans
  minPurchaseAmount Int?   // minimum amount in cents

  startsAt        DateTime?
  expiresAt       DateTime?
  isActive        Boolean  @default(true)

  stripeCouponId  String?  @unique

  subscriptions   Subscription[]
  redemptions     CouponRedemption[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model CouponRedemption {
  id          String   @id @default(cuid())
  couponId    String
  coupon      Coupon   @relation(fields: [couponId], references: [id])
  userId      String
  redeemedAt  DateTime @default(now())

  @@unique([couponId, userId])
}

// Webhook event log
model WebhookEvent {
  id            String   @id @default(cuid())
  gateway       String   // 'stripe' | 'razorpay'
  eventId       String   @unique
  eventType     String
  payload       Json
  processed     Boolean  @default(false)
  processedAt   DateTime?
  error         String?
  createdAt     DateTime @default(now())
}
```

---

## Phase 2: Backend Implementation

### 2.1 Install Dependencies

```bash
# Stripe SDK
npm install stripe @stripe/stripe-js

# Razorpay SDK
npm install razorpay

# PDF generation for invoices
npm install @react-pdf/renderer pdfkit
```

### 2.2 Backend Module Structure

```
api/src/
├── payments/
│   ├── payments.module.ts
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── gateways/
│   │   ├── stripe.service.ts
│   │   ├── razorpay.service.ts
│   │   └── gateway.interface.ts
│   ├── webhooks/
│   │   ├── webhooks.controller.ts
│   │   ├── stripe-webhook.service.ts
│   │   └── razorpay-webhook.service.ts
│   ├── subscriptions/
│   │   ├── subscriptions.controller.ts
│   │   └── subscriptions.service.ts
│   ├── invoices/
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   └── invoice-pdf.service.ts
│   └── coupons/
│       ├── coupons.controller.ts
│       └── coupons.service.ts
├── billing/
│   ├── billing.module.ts
│   ├── billing.controller.ts
│   └── billing.service.ts
```

### 2.3 API Endpoints

#### Payment Gateway Configuration (Admin)
- `GET /api/payments/gateways` - List payment gateways
- `PUT /api/payments/gateways/:provider` - Update gateway config
- `POST /api/payments/gateways/:provider/test` - Test gateway connection

#### Customer Billing
- `GET /api/billing/customer` - Get current user's billing profile
- `PUT /api/billing/customer` - Update billing profile
- `POST /api/billing/customer/portal` - Create Stripe customer portal session

#### Payment Methods
- `GET /api/billing/payment-methods` - List saved payment methods
- `POST /api/billing/payment-methods` - Add payment method
- `DELETE /api/billing/payment-methods/:id` - Remove payment method
- `PUT /api/billing/payment-methods/:id/default` - Set default

#### Checkout & Subscriptions
- `POST /api/checkout/session` - Create checkout session (Stripe/Razorpay)
- `GET /api/subscriptions` - List user's subscriptions
- `GET /api/subscriptions/:id` - Get subscription details
- `POST /api/subscriptions/:id/cancel` - Cancel subscription
- `POST /api/subscriptions/:id/resume` - Resume canceled subscription
- `POST /api/subscriptions/:id/change-plan` - Upgrade/downgrade

#### Invoices
- `GET /api/invoices` - List user's invoices
- `GET /api/invoices/:id` - Get invoice details
- `GET /api/invoices/:id/pdf` - Download invoice PDF
- `POST /api/invoices/:id/pay` - Pay open invoice

#### Coupons (Admin)
- `GET /api/coupons` - List all coupons
- `POST /api/coupons` - Create coupon
- `PUT /api/coupons/:id` - Update coupon
- `DELETE /api/coupons/:id` - Deactivate coupon
- `POST /api/coupons/validate` - Validate coupon code (public)

#### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook endpoint
- `POST /api/webhooks/razorpay` - Razorpay webhook endpoint

#### Admin Reports
- `GET /api/admin/payments/dashboard` - Payment analytics
- `GET /api/admin/payments/transactions` - All transactions
- `GET /api/admin/payments/revenue` - Revenue reports

---

## Phase 3: Frontend Implementation

### 3.1 New Files Structure

```
src/
├── api/
│   ├── payments.ts         # Payment API client
│   └── billing.ts          # Billing API client
├── hooks/
│   ├── usePayments.ts      # Payment hooks
│   ├── useBilling.ts       # Billing hooks
│   └── useCheckout.ts      # Checkout flow hooks
├── components/
│   └── billing/
│       ├── PricingTable.tsx
│       ├── CheckoutForm.tsx
│       ├── PaymentMethodCard.tsx
│       ├── InvoiceList.tsx
│       ├── SubscriptionCard.tsx
│       └── CouponInput.tsx
pages/
├── billing/
│   ├── Checkout.tsx        # Checkout page
│   ├── Success.tsx         # Payment success
│   ├── BillingPortal.tsx   # User billing management
│   └── Invoices.tsx        # Invoice history
├── admin/
│   └── (existing Admin.tsx billing tab enhancements)
```

### 3.2 Key Components

#### PricingTable.tsx
- Display all active license types with pricing
- Monthly/Yearly toggle
- Feature comparison
- "Subscribe" CTA buttons
- Coupon code input

#### CheckoutForm.tsx
- Gateway selection (auto-detect by country or manual)
- Stripe Elements or Razorpay checkout
- Billing address form
- Order summary with coupon
- Payment processing

#### BillingPortal.tsx
- Current subscription status
- Payment method management
- Invoice history
- Cancel/upgrade subscription
- Update billing info

### 3.3 Admin Billing Tab Enhancements

Add to existing Admin.tsx billing section:
- Payment gateway configuration panel
- Coupon management CRUD
- Plan pricing editor
- Revenue analytics dashboard
- Transaction history table
- Refund processing

---

## Phase 4: Implementation Order

### Step 1: Database & Basic Setup
1. Add Prisma schema extensions
2. Run migrations
3. Install npm dependencies (stripe, razorpay)
4. Create environment variables

### Step 2: Backend Payment Services
1. Create PaymentGateway abstract interface
2. Implement StripeService
3. Implement RazorpayService
4. Create PaymentsModule with DI

### Step 3: Backend Subscription Flow
1. Implement SubscriptionsService
2. Create checkout session endpoints
3. Handle subscription lifecycle

### Step 4: Backend Webhooks
1. Implement Stripe webhook handler
2. Implement Razorpay webhook handler
3. Process payment events
4. Update subscription/invoice status

### Step 5: Backend Invoices
1. Implement InvoicesService
2. Invoice PDF generation
3. Email invoice delivery

### Step 6: Backend Coupons
1. Implement CouponsService
2. Coupon validation logic
3. Apply to subscriptions

### Step 7: Frontend API & Hooks
1. Create payments.ts API client
2. Create billing.ts API client
3. Create useCheckout, useBilling hooks

### Step 8: Frontend Checkout Flow
1. Build PricingTable component
2. Build CheckoutForm with Stripe/Razorpay
3. Build success/cancel pages

### Step 9: Frontend Billing Portal
1. Build BillingPortal page
2. Payment method management
3. Subscription management
4. Invoice viewing

### Step 10: Admin Enhancements
1. Gateway configuration UI
2. Coupon management UI
3. Plan pricing editor
4. Revenue dashboard
5. Transaction history

---

## Environment Variables Required

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# App
APP_URL=https://app.salesos.org
BILLING_EMAIL=billing@salesos.org
```

---

## Files to Create/Modify

### Backend (api/src/)
- [ ] `prisma/schema.prisma` - Add payment models
- [ ] `payments/payments.module.ts` - New module
- [ ] `payments/payments.controller.ts` - Main controller
- [ ] `payments/payments.service.ts` - Main service
- [ ] `payments/gateways/gateway.interface.ts` - Interface
- [ ] `payments/gateways/stripe.service.ts` - Stripe impl
- [ ] `payments/gateways/razorpay.service.ts` - Razorpay impl
- [ ] `payments/webhooks/webhooks.controller.ts` - Webhook endpoints
- [ ] `payments/webhooks/stripe-webhook.service.ts` - Stripe events
- [ ] `payments/webhooks/razorpay-webhook.service.ts` - Razorpay events
- [ ] `payments/subscriptions/subscriptions.controller.ts`
- [ ] `payments/subscriptions/subscriptions.service.ts`
- [ ] `payments/invoices/invoices.controller.ts`
- [ ] `payments/invoices/invoices.service.ts`
- [ ] `payments/invoices/invoice-pdf.service.ts`
- [ ] `payments/coupons/coupons.controller.ts`
- [ ] `payments/coupons/coupons.service.ts`
- [ ] `app.module.ts` - Register PaymentsModule

### Frontend (src/)
- [ ] `api/payments.ts` - Payment API client
- [ ] `api/billing.ts` - Billing API client
- [ ] `hooks/usePayments.ts` - Payment hooks
- [ ] `hooks/useBilling.ts` - Billing hooks
- [ ] `hooks/useCheckout.ts` - Checkout hooks
- [ ] `components/billing/PricingTable.tsx`
- [ ] `components/billing/CheckoutForm.tsx`
- [ ] `components/billing/PaymentMethodCard.tsx`
- [ ] `components/billing/InvoiceList.tsx`
- [ ] `components/billing/SubscriptionCard.tsx`
- [ ] `components/billing/CouponInput.tsx`

### Frontend Pages
- [ ] `pages/billing/Checkout.tsx`
- [ ] `pages/billing/Success.tsx`
- [ ] `pages/billing/BillingPortal.tsx`
- [ ] `pages/billing/Invoices.tsx`

### Modifications
- [ ] `pages/dashboard/Admin.tsx` - Enhanced billing tab
- [ ] `App.tsx` - Add billing routes
- [ ] `api/index.ts` - Export new APIs

---

## Estimated Scope
- **New Prisma models**: 10
- **New backend files**: ~20
- **New frontend files**: ~15
- **Modified files**: ~5
- **Total new endpoints**: ~25

This is a comprehensive implementation covering all payment scenarios for both US/Global (Stripe) and India (Razorpay) markets.
