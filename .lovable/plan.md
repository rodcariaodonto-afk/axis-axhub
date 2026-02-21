

# AXHUB - Phase 1: ERP Foundation

## Overview
Build the operational core of AXHUB — the ERP engine that manages money after it enters the business. Professional dark theme with subtle cyan accents (not full neon glow). Real database with Lovable Cloud from day one.

---

## 1. Foundation & Auth
- Enable Lovable Cloud with authentication (email login)
- Create the multi-tenant core: `tenants`, `users`, `roles`, `user_roles` tables with RLS
- Build login/signup flow with tenant creation on first signup
- Sidebar navigation layout with collapsible menu (dark theme, 250px width)
- Professional dark color scheme: dark navy backgrounds, subtle cyan highlights, clean typography

## 2. Products & Inventory
- **Products page**: List with filters (category, active/inactive), create/edit forms with SKU, name, price, cost, type (product/service)
- **Stock dashboard**: Total stock value, low-stock alerts, stock by warehouse
- **Stock movements**: Record inbound, outbound, adjustments, transfers with reason tracking
- **Warehouses**: Manage multiple warehouses
- Database tables: `products`, `warehouses`, `product_stock`, `stock_movements`

## 3. Customers & Orders
- **Customers page**: List and manage customers with CPF/CNPJ, address, contact info
- **Orders page**: Create orders with line items, automatic total calculation, status workflow (draft → approved → shipped → completed)
- **Order detail**: Items, customer info, payment status, notes
- Database tables: `customers`, `orders`, `order_items`

## 4. Financial Module
- **Accounts Receivable**: Track incoming payments, mark as paid with one click, overdue highlighting
- **Accounts Payable**: Track expenses and supplier payments, due date alerts
- **Bank Accounts**: Register accounts, track balances
- **Financial Dashboard**: Cash flow chart (income vs expenses), balance by account, summary cards
- Database tables: `receivables`, `payables`, `bank_accounts`, `bank_transactions`

## 5. Suppliers & Purchases
- **Suppliers page**: Manage supplier directory
- **Purchase Orders**: Create POs, track item receiving, auto-update stock on receipt
- Database tables: `suppliers`, `purchase_orders`, `po_items`

## 6. Dashboard & Polish
- **Main dashboard**: Key metrics cards (total revenue, pending orders, low stock alerts, overdue receivables)
- **Charts**: Revenue over time, orders by status, cash flow projection
- Global search across products, customers, orders
- Audit log table for tracking critical changes
- Sample data for one demo tenant

---

## Design Direction
- Dark navy/charcoal backgrounds (#0F1729 range)
- Subtle cyan accents for active states and key metrics
- Clean card-based layouts with soft borders
- Professional typography, no heavy glow effects
- Smooth 200-300ms transitions on interactions

## What's NOT in Phase 1 (Future Phases)
- CRM module (leads, pipeline, deals, activities)
- Fiscal/invoice integration (NF-e)
- N8N automation & webhooks
- Projects module
- SaaS billing/plans
- Cadences, forecasting, proposals
- WhatsApp/email integrations

