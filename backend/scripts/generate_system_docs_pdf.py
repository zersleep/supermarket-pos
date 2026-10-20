import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages after cover page)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Supermarket POS System • Technical Architecture, Dual-Currency & SOP Guide")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.75)
            self.line(54, 744, 558, 744)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential • Supermarket POS Enterprise Edition 2026")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def create_system_documentation_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=23,
        leading=28,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#1e293b')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # ==========================================
    # COVER / HEADER SECTION
    # ==========================================
    story.append(Spacer(1, 10))
    story.append(Paragraph("SUPERMARKET POS SYSTEM — ENTERPRISE EDITION", subtitle_style))
    story.append(Paragraph("System Architecture, Dual-Currency Engine, Khmer Localization & 3-Role SOP Manual", title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563eb'), spaceBefore=4, spaceAfter=12))

    meta_text = (
        "<b>Document Version:</b> 2.5.0 (Enterprise Production Build)<br/>"
        "<b>Scope:</b> Technical Architecture, Relational Database Schema, Dual-Currency (USD/KHR), Bilingual Engine, Staff SOPs<br/>"
        "<b>Core Roles Defined:</b> Store Owner, Inventory Manager, Cashier<br/>"
        "<b>Target Platforms:</b> Web POS, 80mm Thermal Receipt Printers, KHQR Digital Payments, Mobile Telegram Handbooks<br/>"
        "<b>Updated:</b> October 2026"
    )
    story.append(Paragraph(meta_text, body_style))
    story.append(Spacer(1, 12))

    # ==========================================
    # SECTION 1: SYSTEM OVERVIEW & THE 3 CORE ROLES
    # ==========================================
    story.append(Paragraph("1. Core System Roles & Standard Operating Procedures (SOP)", h1_style))
    story.append(Paragraph(
        "To ensure uncompromising accountability, fast checkout speed, and strict fraud prevention, "
        "the supermarket operates on <b>strictly three core differentiated roles</b>. "
        "The Store Owner acts as the chief administrative authority, eliminating redundant intermediate tiers.",
        body_style
    ))

    roles_data = [
        [
            Paragraph("System Role", table_header),
            Paragraph("Purpose & Profile", table_header),
            Paragraph("Key Responsibilities", table_header),
            Paragraph("Access Scope & Restrictions", table_header)
        ],
        [
            Paragraph("<b>1. STORE OWNER</b><br/>(Executive / Admin)", table_cell_bold),
            Paragraph("System Administrator & Executive.<br/>Full business oversight, profit analytics, store settings, and user access control.", table_cell),
            Paragraph(
                "• Monitor gross profit margins, daily revenue, and discount costs<br/>"
                "• Configure store details (Name, Phone, Address, VAT TIN)<br/>"
                "• Set official exchange rates between USD ($) and Cambodian Riel (KHR)<br/>"
                "• Create and manage staff accounts for Cashiers and Inventory Managers<br/>"
                "• Export full store database backups (JSON) for disaster recovery<br/>"
                "• Review security audit logs and financial discrepancies",
                table_cell
            ),
            Paragraph("<font color='#16a34a'><b>Access Scope:</b></font><br/>Full unrestricted access to all system modules.<br/><br/><font color='#16a34a'><b>Restrictions:</b></font><br/>None.", table_cell)
        ],
        [
            Paragraph("<b>2. INVENTORY MANAGER</b><br/>(Stock Specialist)", table_cell_bold),
            Paragraph("Stock & Warehouse Specialist.<br/>Maintain accurate stock levels, manage suppliers, and prevent product expiration.", table_cell),
            Paragraph(
                "• Manage product catalog, SKUs, barcode mappings, and categories<br/>"
                "• Supervise FEFO (First Expired, First Out) batches and shelf expiry<br/>"
                "• Create Purchase Orders (POs) and record wholesale receipts<br/>"
                "• Perform stock adjustments and authorize damaged/expired write-offs<br/>"
                "• Monitor low-stock alerts to maintain optimal inventory levels",
                table_cell
            ),
            Paragraph("<font color='#d97706'><b>Access Scope:</b></font><br/>Products, Categories, Batches, Suppliers, POs, Goods Receipts, Stock Reports.<br/><br/><font color='#dc2626'><b>Restrictions:</b></font><br/>Cannot operate POS register, open cashier shifts, or view revenue/profit margins.", table_cell)
        ],
        [
            Paragraph("<b>3. CASHIER</b><br/>(Frontline Staff)", table_cell_bold),
            Paragraph("Customer Checkout & Frontline Staff.<br/>Fast, accurate customer checkout, barcode scanning, and register balancing.", table_cell),
            Paragraph(
                "• Open cashier shifts with an accurate opening cash float<br/>"
                "• Execute high-speed barcode and camera scanning at checkout<br/>"
                "• Apply item promotional discounts and cart-wide special pricing<br/>"
                "• Process dual-currency payments in USD and KHR with auto change<br/>"
                "• Confirm digital KHQR mobile banking QR-code payments<br/>"
                "• Print 80mm standard thermal customer receipts<br/>"
                "• Balance cash drawer upon shift closure (Cash In / Out tracking)",
                table_cell
            ),
            Paragraph("<font color='#2563eb'><b>Access Scope:</b></font><br/>POS Register, Active Register Shifts, Order Cart, Customer Receipts.<br/><br/><font color='#dc2626'><b>Restrictions:</b></font><br/>Cannot modify retail prices, edit stock batches, access supplier POs, or view store settings.", table_cell)
        ]
    ]

    roles_table = Table(roles_data, colWidths=[95, 100, 175, 134])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(roles_table)
    story.append(Spacer(1, 12))

    # ==========================================
    # SECTION 2: DUAL-CURRENCY ENGINE & PRIMARY CURRENCY SWITCHING
    # ==========================================
    story.append(Paragraph("2. Dual-Currency Engine (USD & KHR) and Dynamic Currency Switching", h1_style))
    story.append(Paragraph(
        "Supermarkets in Cambodia operate in a dual-currency financial environment where both United States Dollars (USD $) "
        "and Cambodian Riel (KHR) are exchanged seamlessly. The system incorporates a reactive currency engine with the following guarantees:",
        body_style
    ))

    currency_points = (
        "• <b>Base Normalization:</b> All product cost prices and retail selling prices are stored as high-precision decimals in base USD. "
        "This maintains consistent accounting ledgers and simplifies vendor purchasing calculations.<br/>"
        "• <b>Dynamic Primary Currency Switching:</b> Store Owners and Cashiers can toggle the <b>Primary Display Currency</b> between USD and KHR with one click. "
        "When Primary Currency is set to KHR: product cards, cart line totals, and the checkout grand total display prominently in KHR (e.g. 24,600 KHR) "
        "with secondary USD subtitles ($6.00 USD). When set to USD, the inverse formatting is displayed.<br/>"
        "• <b>Configurable Exchange Rate:</b> The Owner defines the official store exchange rate (e.g. 1 USD = 4,100 KHR). "
        "All checkout calculations, cash tendered inputs, change calculations, and QR amounts automatically sync to this rate.<br/>"
        "• <b>Multi-Currency Cash Tender & Change Preview:</b> Cashiers can accept cash in USD or KHR. "
        "The system instantly computes change due in both currencies simultaneously (e.g., Shortage warnings, USD Change, and KHR Change). "
        "Quick cash chips automatically present relevant denominations ($5, $10, $20, $50, $100 or 10k, 20k, 50k, 100k, 200k KHR).<br/>"
        "• <b>Bakong KHQR Dual-Currency Integration:</b> Digital QR payments can be generated in either USD or KHR payloads, "
        "allowing customers to scan with any local mobile banking app."
    )
    story.append(Paragraph(currency_points, body_style))
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 3: KHMER LANGUAGE LOCALIZATION (BILINGUAL FRAMEWORK)
    # ==========================================
    story.append(Paragraph("3. Khmer Language Support (ភាសាខ្មែរ) & Internationalization (i18n)", h1_style))
    story.append(Paragraph(
        "To ensure all supermarket staff can operate the POS efficiently, the system features a built-in bilingual localization engine "
        "supporting instantaneous switching between English and Khmer (ភាសាខ្មែរ):",
        body_style
    ))

    i18n_table_data = [
        [Paragraph("Category / Context", table_header), Paragraph("English UI Term", table_header), Paragraph("Khmer Localization (ភាសាខ្មែរ)", table_header), Paragraph("Operational Function", table_header)],
        [Paragraph("<b>Navigation</b>", table_cell_bold), Paragraph("Checkout Register", table_cell), Paragraph("កន្លែងគិតប្រាក់ (POS)", table_cell), Paragraph("Main frontline barcode scanning terminal", table_cell)],
        [Paragraph("<b>Navigation</b>", table_cell_bold), Paragraph("Cashier Shifts", table_cell), Paragraph("វេនគិតប្រាក់", table_cell), Paragraph("Opening float & drawer balancing", table_cell)],
        [Paragraph("<b>Navigation</b>", table_cell_bold), Paragraph("Products Catalog", table_cell), Paragraph("បញ្ជីទំនិញ", table_cell), Paragraph("Catalog items, barcodes, SKUs", table_cell)],
        [Paragraph("<b>Navigation</b>", table_cell_bold), Paragraph("Store Settings", table_cell), Paragraph("ការកំណត់ហាង", table_cell), Paragraph("Store info, exchange rate, VAT TIN", table_cell)],
        [Paragraph("<b>POS Actions</b>", table_cell_bold), Paragraph("Grand Total", table_cell), Paragraph("សរុបទាំងអស់", table_cell), Paragraph("Final payable amount after discounts", table_cell)],
        [Paragraph("<b>POS Actions</b>", table_cell_bold), Paragraph("Tendered Cash", table_cell), Paragraph("ប្រាក់ទទួលពីអតិថិជន", table_cell), Paragraph("Cash entered by cashier", table_cell)],
        [Paragraph("<b>POS Actions</b>", table_cell_bold), Paragraph("Change Due", table_cell), Paragraph("ប្រាក់អាប់ត្រូវជូន", table_cell), Paragraph("Automatic change returned to customer", table_cell)],
        [Paragraph("<b>POS Actions</b>", table_cell_bold), Paragraph("Hold Order", table_cell), Paragraph("ផ្អាកការលក់", table_cell), Paragraph("Temporarily parks cart for another customer", table_cell)],
        [Paragraph("<b>Shift Control</b>", table_cell_bold), Paragraph("Opening Cash Float", table_cell), Paragraph("ប្រាក់ដើមវេន", table_cell), Paragraph("Physical cash placed in drawer at shift start", table_cell)]
    ]

    i18n_table = Table(i18n_table_data, colWidths=[90, 110, 134, 170])
    i18n_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#047857')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(i18n_table)
    story.append(Spacer(1, 10))

    # Page Break for clean Architecture & Database section
    story.append(PageBreak())

    # ==========================================
    # SECTION 4: TECHNICAL ARCHITECTURE & STACK
    # ==========================================
    story.append(Paragraph("4. Technical Architecture & Technology Stack", h1_style))
    story.append(Paragraph(
        "The system utilizes a modern, resilient full-stack architecture tailored for high transaction throughput and zero-latency barcode scanning:",
        body_style
    ))

    tech_data = [
        [Paragraph("Architecture Layer", table_header), Paragraph("Technology & Framework", table_header), Paragraph("Key Features & Responsibilities", table_header)],
        [
            Paragraph("<b>Frontend Client</b>", table_cell_bold),
            Paragraph("React 18, Vite, Lucide Icons, Plus Jakarta Sans", table_cell),
            Paragraph("High-speed Single Page Application (SPA), touch-optimized POS checkout grid, hardware & camera barcode scanner integration, live thermal receipt preview, and bilingual context.", table_cell)
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell_bold),
            Paragraph("Node.js 20+, Express REST API, Zod Validation", table_cell),
            Paragraph("Stateless JWT authentication, strict role-based access control (RBAC), idempotency key protection to prevent duplicate checkouts, and security audit log interceptors.", table_cell)
        ],
        [
            Paragraph("<b>Data Access Layer</b>", table_cell_bold),
            Paragraph("Prisma ORM 5.x", table_cell),
            Paragraph("Type-safe database operations, multi-table atomic transactions ensuring stock deduction and financial sales records commit together without race conditions.", table_cell)
        ],
        [
            Paragraph("<b>Database</b>", table_cell_bold),
            Paragraph("PostgreSQL on Neon Cloud", table_cell),
            Paragraph("Serverless relational PostgreSQL with SSL transport encryption, foreign-key relational integrity, decimal money precision, and automated backups.", table_cell)
        ]
    ]

    tech_table = Table(tech_data, colWidths=[95, 140, 269])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f172a')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 5: COMPLETE RELATIONAL DATABASE SCHEMA (20 MODELS)
    # ==========================================
    story.append(Paragraph("5. Complete Relational Database Schema & Domain Models", h1_style))
    story.append(Paragraph(
        "The relational database schema is structured into 6 clear functional domains comprising 20 interconnected models. "
        "Strict FEFO (First Expired, First Out) rules and double-entry stock movement tracking are enforced throughout.",
        body_style
    ))

    schema_tables = [
        ("Domain A: Identity, Security & Business Settings", [
            ("User", "id, username, email, passwordHash, fullName, role (OWNER, INVENTORY_MANAGER, CASHIER), isActive, phone, createdAt, updatedAt", "Staff accounts with bcrypt hashed passwords and role authorization."),
            ("Setting", "id, key, value, description, updatedAt", "Store identity (NAME, PHONE, ADDRESS), VAT TIN, primary currency code, USD/KHR exchange rate, tax %, and warning days."),
            ("AuditLog", "id, userId, action, entityType, entityId, details (JSON), ipAddress, userAgent, createdAt", "Immutable tamper-proof log recording user creations, price updates, write-offs, settings changes, and logins.")
        ]),
        ("Domain B: Product Catalog & Category Taxonomy", [
            ("Category", "id, name, description, createdAt, updatedAt", "Taxonomic categorization of merchandise (Produce, Beverages, Snacks, Dairy, etc.)."),
            ("Supplier", "id, name, contactPerson, phone, email, address, notes, createdAt, updatedAt", "Wholesale vendor directory with procurement history and lead times."),
            ("Product", "id, name, sku, barcode, description, categoryId, costPrice, sellingPrice, unit, reorderLevel, trackExpiry, imageUrl, isActive", "Master item catalog tracking unit prices, barcodes, reorder thresholds, and active status.")
        ]),
        ("Domain C: Inventory, FEFO Batches & Stock Movements", [
            ("InventoryBatch", "id, batchNumber, productId, initialQuantity, currentQuantity, costPrice, receivedAt, expiryDate, isWriteOff", "Heart of FEFO inventory. Tracks individual shipments with specific manufacturing/expiration dates and wholesale cost."),
            ("StockMovement", "id, productId, batchId, movementType (RECEIPT, SALE, ADJUSTMENT, WRITE_OFF, RETURN), quantity, previousStock, newStock, reason, referenceId, createdAt", "Double-entry inventory audit ledger recording all physical stock changes.")
        ]),
        ("Domain D: Purchasing & Goods Receipt", [
            ("PurchaseOrder", "id, poNumber, supplierId, status (DRAFT, SUBMITTED, APPROVED, FULLY_RECEIVED), orderDate, expectedDate, totalCost", "Replenishment purchase orders dispatched to commercial suppliers."),
            ("PurchaseOrderItem", "id, poId, productId, quantityOrdered, quantityReceived, unitCost, lineTotal", "Individual line items with wholesale unit pricing and order quantities."),
            ("GoodsReceipt", "id, receiptNumber, poId, receivedByUserId, receivedAt, notes", "Official warehouse delivery receiving document with supervisor sign-off."),
            ("GoodsReceiptItem", "id, receiptId, poItemId, productId, batchId, quantityReceived, unitCost, lineTotal", "Directly binds delivered inventory units into newly created InventoryBatches.")
        ]),
        ("Domain E: Cash Register Shifts & Cash Movements", [
            ("CashierShift", "id, cashierId, openedAt, closedAt, status (OPEN, CLOSED), openingCash, cashSalesTotal, cashInTotal, cashOutTotal, expectedClosingCash, actualClosingCash, difference", "Audited cashier register shifts tracking opening cash float, total cash collected, and closing physical count variances."),
            ("CashMovement", "id, shiftId, userId, type (CASH_IN, CASH_OUT), amount, reason, createdAt", "Authorized cash drawer insertions (change addition) and removals (bank drops, petty expenses).")
        ]),
        ("Domain F: POS Sales, Discounts, Payments & Refunds", [
            ("Sale", "id, saleNumber, receiptNumber, cashierId, shiftId, customerId, subtotal, discountTotal, taxTotal, grandTotal, paymentStatus, idempotencyKey", "Primary transaction record capturing cart items, promotional discounts, tax, and unique idempotency token."),
            ("SaleItem", "id, saleId, productId, batchId, quantity, unitPriceSnapshot, costPriceSnapshot, productNameSnapshot, discountAmount, lineTotal", "Immutable snapshot of sold items recording exact unit prices, cost of goods, and deducted inventory batches."),
            ("Payment", "id, saleId, method (CASH, QR_PAYMENT), currency (USD, KHR), amount, exchangeRate, transactionRef, cashReceived, changeGiven, status", "Records tender details for USD Cash, KHR Cash, or Bakong KHQR digital QR scans."),
            ("Refund / RefundItem", "id, refundNumber, saleId, totalRefundAmount, reason, processedByUserId / saleItemId, quantity, refundAmount, restock", "Audit trail for customer returns with restock decisions and drawer balancing.")
        ])
    ]

    for domain_title, tables in schema_tables:
        story.append(Paragraph(domain_title, h2_style))
        table_rows = [
            [Paragraph("Table / Model", table_header), Paragraph("Key Fields & Schema Types", table_header), Paragraph("Business Purpose & Rules", table_header)]
        ]
        for tname, fields, desc in tables:
            table_rows.append([
                Paragraph(f"<b>{tname}</b>", table_cell_bold),
                Paragraph(f"<font color='#475569'>{fields}</font>", table_cell),
                Paragraph(desc, table_cell)
            ])

        dom_table = Table(table_rows, colWidths=[90, 180, 234])
        dom_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(dom_table)
        story.append(Spacer(1, 6))

    # Page Break for Workflows
    story.append(PageBreak())

    # ==========================================
    # SECTION 6: OPERATIONAL WORKFLOWS
    # ==========================================
    story.append(Paragraph("6. Operational Workflows & Business Logic", h1_style))
    story.append(Paragraph(
        "The system coordinates real-time supermarket activities across front-of-house checkout and back-of-house warehousing:",
        body_style
    ))

    # Workflow 1
    story.append(Paragraph("Workflow A: POS Checkout, FEFO Batch Deduction & Thermal Receipt", h2_style))
    story.append(Paragraph(
        "<b>Step 1 — Shift Authorization:</b> The cashier opens a register shift with physical opening cash float (USD or KHR).<br/>"
        "<b>Step 2 — Barcode Item Scan:</b> Cashier scans item barcodes or inputs SKU. System queries active batch stock and prevents overselling.<br/>"
        "<b>Step 3 — Promotional Pricing:</b> Item promotions (e.g., $0.50 off) or whole-cart order discounts ($ or %) are applied.<br/>"
        "<b>Step 4 — Dual-Currency Calculation:</b> Grand total is computed in primary currency with instant live exchange rate conversion to secondary currency.<br/>"
        "<b>Step 5 — Payment & Tender:</b> Cashier selects Cash (USD or KHR with dual change preview) or KHQR digital bank scan.<br/>"
        "<b>Step 6 — Atomic FEFO Deduction:</b> In a Prisma atomic transaction, stock is deducted from the oldest active <code>InventoryBatch</code> (earliest expiry date). A <code>StockMovement</code> record is created.<br/>"
        "<b>Step 7 — Receipt Issuance:</b> 80mm thermal receipt prints with bilingual store branding, TIN, item breakdown, and dual totals.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Workflow 2
    story.append(Paragraph("Workflow B: Purchasing, Goods Receipt & FEFO Ingestion", h2_style))
    story.append(Paragraph(
        "<b>Step 1 — Reorder Warning:</b> Automated telemetry highlights items falling below <code>reorderLevel</code>.<br/>"
        "<b>Step 2 — Purchase Order (PO):</b> Inventory Manager creates a PO with the preferred supplier with negotiated wholesale cost.<br/>"
        "<b>Step 3 — Receiving Delivery:</b> Delivery is inspected. A <code>GoodsReceipt</code> is created linking delivered counts to a new <code>InventoryBatch</code>.<br/>"
        "<b>Step 4 — Asset Valuation:</b> Double-entry <code>StockMovement</code> records log incoming assets, updating total store stock valuation.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Workflow 3
    story.append(Paragraph("Workflow C: Cashier Shift Reconciliation & Anti-Theft Balancing", h2_style))
    story.append(Paragraph(
        "<b>Step 1 — Shift Activity:</b> During the shift, all cash sales automatically increment <code>cashSalesTotal</code>.<br/>"
        "<b>Step 2 — Shift Closure:</b> Cashier counts drawer cash and enters the physical count.<br/>"
        "<b>Step 3 — Variance Computation:</b> The system computes: <code>Expected = OpeningFloat + CashSales + CashIn - CashOut</code>.<br/>"
        "<b>Step 4 — Audit Record:</b> Mathematical discrepancy (Over / Short) is permanently saved for executive audit by the Store Owner.",
        body_style
    ))
    story.append(Spacer(1, 12))

    # ==========================================
    # SECTION 7: TELEGRAM-READY STAFF MANUAL & SOP QUICK CARD
    # ==========================================
    story.append(Paragraph("7. Mobile & Telegram-Ready Staff Manual Quick Card", h1_style))
    story.append(Paragraph(
        "The following clean, structured summary can be forwarded directly via Telegram or printed for staff onboarding handbooks:",
        body_style
    ))

    telegram_sop_text = (
        "<b>🛒 SUPERMARKET POS SYSTEM — CORE ROLES & SOP</b><br/><br/>"
        "<b>1. STORE OWNER (System Administrator & Executive)</b><br/>"
        "<b>Purpose:</b> Full business oversight, profit analytics, store settings, and user access control.<br/>"
        "<b>Key Responsibilities:</b><br/>"
        "• Monitor gross profit margins, daily revenue, and promotional discount costs.<br/>"
        "• Configure store details (Name, Phone, Address, VAT TIN).<br/>"
        "• Set official exchange rates between USD ($) and Cambodian Riel (KHR ៛).<br/>"
        "• Create and manage staff accounts for Cashiers and Inventory Managers.<br/>"
        "• Export full store database backups (JSON) for disaster recovery and audits.<br/>"
        "• Review security audit logs and financial discrepancies.<br/>"
        "<b>Access Scope:</b> Full unrestricted access to all system modules.<br/>"
        "<b>Restrictions:</b> None.<br/><br/>"
        "<b>2. INVENTORY MANAGER (Stock & Warehouse Specialist)</b><br/>"
        "<b>Purpose:</b> Maintain accurate stock levels, manage suppliers, and prevent product expiration.<br/>"
        "<b>Key Responsibilities:</b><br/>"
        "• Manage the product catalog, SKUs, barcode mappings, and categories.<br/>"
        "• Supervise FEFO (First Expired, First Out) inventory batches and expiration dates.<br/>"
        "• Create Purchase Orders (POs) and record wholesale goods delivery receipts.<br/>"
        "• Perform stock adjustments and authorize damaged/expired write-offs.<br/>"
        "• Monitor low-stock alerts to maintain optimal inventory levels.<br/>"
        "<b>Access Scope:</b> Products, Categories, Stock Batches, Suppliers, POs, Goods Receipts, and Stock Reports.<br/>"
        "<b>Restrictions:</b> Cannot operate the POS checkout register, open cashier shifts, or view business revenue/profit margins.<br/><br/>"
        "<b>3. CASHIER (Customer Checkout & Frontline Staff)</b><br/>"
        "<b>Purpose:</b> Fast, accurate customer checkout, barcode scanning, and register balancing.<br/>"
        "<b>Key Responsibilities:</b><br/>"
        "• Open cashier shifts with an accurate opening cash float.<br/>"
        "• Execute high-speed barcode and camera scanning at checkout.<br/>"
        "• Apply item-level promotional discounts and cart-wide special pricing.<br/>"
        "• Process dual-currency payments in USD and KHR (៛) with automatic change calculation.<br/>"
        "• Confirm digital KHQR mobile banking QR-code payments.<br/>"
        "• Print 80mm standard thermal customer receipts.<br/>"
        "• Balance the cash drawer upon shift closure (Cash In / Cash Out tracking).<br/>"
        "<b>Access Scope:</b> POS Checkout Register, Active Register Shifts, Order Cart, and Customer Receipts.<br/>"
        "<b>Restrictions:</b> Cannot modify retail prices, edit stock batches, access supplier POs, or view store settings."
    )

    sop_table = Table([[Paragraph(telegram_sop_text, body_style)]], colWidths=[504])
    sop_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdf4')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#86efac')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(sop_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF Generator] Successfully generated: {output_path}")

if __name__ == '__main__':
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    target = os.path.join(project_root, "Supermarket_POS_System_Architecture_and_Database_Guide.pdf")
    if len(sys.argv) > 1:
        target = sys.argv[1]
    create_system_documentation_pdf(target)
