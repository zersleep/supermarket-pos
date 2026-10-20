import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
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
            self.drawString(54, 750, "Supermarket POS System • Technical Architecture & Database Specification")
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
        fontSize=24,
        leading=30,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=10
    )

    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#2563eb'),
        spaceAfter=20
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e40af'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a')
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
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1e293b')
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#0f172a')
    )

    story = []

    # ==========================================
    # COVER / HEADER SECTION
    # ==========================================
    story.append(Spacer(1, 15))
    story.append(Paragraph("SUPERMARKET POS SYSTEM", subtitle_style))
    story.append(Paragraph("System Architecture, Database Schema & Operational Workflow Guide", title_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#2563eb'), spaceBefore=5, spaceAfter=15))

    meta_text = (
        "<b>Document Version:</b> 2.4.0 (Enterprise Production Build)<br/>"
        "<b>Target Audience:</b> Store Owner, Tech Leads, Cashier Trainers, Database Admins<br/>"
        "<b>Technology Stack:</b> React 18, Node.js REST API, Prisma ORM, PostgreSQL (Neon Cloud DB)<br/>"
        "<b>Date Generated:</b> October 2026"
    )
    story.append(Paragraph(meta_text, body_style))
    story.append(Spacer(1, 15))

    # ==========================================
    # SECTION 1: SYSTEM OVERVIEW & THREE ROLES
    # ==========================================
    story.append(Paragraph("1. System Overview & The 3 Core Roles", h1_style))
    story.append(Paragraph(
        "The Supermarket POS System is specifically tailored for high-volume grocery and supermarket operations. "
        "It eliminates redundant multi-tier complexity by establishing strictly <b>three clearly differentiated roles</b>. "
        "The Store Owner serves as the master administrator, removing the ambiguity of separate 'admin' and 'owner' accounts.",
        body_style
    ))

    roles_data = [
        [
            Paragraph("System Role", table_header),
            Paragraph("Target User", table_header),
            Paragraph("Primary Responsibilities", table_header),
            Paragraph("Access Scope & Restrictions", table_header)
        ],
        [
            Paragraph("<b>OWNER</b><br/>(Store Owner / Executive)", table_cell_bold),
            Paragraph("Business Owner, General Manager, Store Director", table_cell),
            Paragraph(
                "• Complete financial control & profit margin monitoring<br/>"
                "• Store settings, VAT TIN, USD/KHR exchange rates<br/>"
                "• Staff account creation, credential reset & role assignment<br/>"
                "• Data backup export (JSON) & disaster recovery<br/>"
                "• Audit logs & security event investigations",
                table_cell
            ),
            Paragraph("<font color='#16a34a'><b>Full Unrestricted Access:</b></font><br/>All modules, reports, system settings, inventory, cash shifts, and audit logs.", table_cell)
        ],
        [
            Paragraph("<b>INVENTORY_MANAGER</b><br/>(Warehouse Lead)", table_cell_bold),
            Paragraph("Stock Controller, Warehouse Manager, Purchasing Officer", table_cell),
            Paragraph(
                "• Product catalog, SKUs, and barcode configurations<br/>"
                "• FEFO inventory batch management with shelf expiry dates<br/>"
                "• Supplier relationships & purchase orders (POs)<br/>"
                "• Receiving goods, stock adjustments & write-offs",
                table_cell
            ),
            Paragraph("<font color='#d97706'><b>Restricted Access:</b></font><br/>Products, Stock, Suppliers, POs, and Inventory Reports. Cannot access POS checkout, cashier shifts, or store financial settings.", table_cell)
        ],
        [
            Paragraph("<b>CASHIER</b><br/>(Frontline Staff)", table_cell_bold),
            Paragraph("Checkout Cashier, Register Operator, Counter Staff", table_cell),
            Paragraph(
                "• Opening and closing cash register shifts<br/>"
                "• Barcode scanning & high-speed item search<br/>"
                "• Applying item discounts and whole-cart promotions<br/>"
                "• Dual-currency payments in USD Cash and KHR (៛)<br/>"
                "• Digital KHQR QR-code payment confirmation<br/>"
                "• Thermal receipt generation & cash in/out drawer tracking",
                table_cell
            ),
            Paragraph("<font color='#2563eb'><b>Frontline POS Access Only:</b></font><br/>Checkout terminal, Register Shifts, and Customer Receipts. Cannot modify product prices, edit stock, or see store profit margins.", table_cell)
        ]
    ]

    roles_table = Table(roles_data, colWidths=[100, 95, 175, 134])
    roles_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(roles_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 2: ARCHITECTURE & DATA FLOW
    # ==========================================
    story.append(Paragraph("2. Technical Architecture & Technology Stack", h1_style))
    story.append(Paragraph(
        "The system employs a client-server cloud architecture optimized for low-latency barcode scanning and real-time ledger consistency:",
        body_style
    ))

    tech_data = [
        [Paragraph("Tier", table_header), Paragraph("Technology", table_header), Paragraph("Key Features & Responsibilities", table_header)],
        [
            Paragraph("<b>Frontend Client</b>", table_cell_bold),
            Paragraph("React 18, Vite, Lucide Icons, Plus Jakarta Sans", table_cell),
            Paragraph("Single Page Application (SPA), touch-friendly POS grid, instant camera barcode scanner, live 80mm thermal receipt preview, responsive layout.", table_cell)
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell_bold),
            Paragraph("Node.js 20+, Express REST API, Zod Validation", table_cell),
            Paragraph("Stateless JWT authentication, role authorization middleware, strict input validation, idempotency key checkout protection, audit trail service.", table_cell)
        ],
        [
            Paragraph("<b>Data Access Layer</b>", table_cell_bold),
            Paragraph("Prisma ORM 5.x", table_cell),
            Paragraph("Type-safe database queries, atomic ACID multi-table transactions for sales checkout and inventory deduction, automated migrations.", table_cell)
        ],
        [
            Paragraph("<b>Database</b>", table_cell_bold),
            Paragraph("PostgreSQL on Neon Cloud", table_cell),
            Paragraph("High availability serverless Postgres with SSL encryption, decimal precision money math, foreign key constraints, and performance indexes.", table_cell)
        ]
    ]

    tech_table = Table(tech_data, colWidths=[90, 140, 274])
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

    # Page Break for clean Database Schema section
    story.append(PageBreak())

    # ==========================================
    # SECTION 3: DATABASE SCHEMA & ENTITY MODELS
    # ==========================================
    story.append(Paragraph("3. Complete Database Schema & Entity Specification", h1_style))
    story.append(Paragraph(
        "The relational database schema consists of 20 interconnected models structured into 6 operational domains. "
        "Every monetary transaction is audited and inventory batches are managed under strict FEFO (First Expired First Out) rules.",
        body_style
    ))

    schema_tables = [
        # Domain 1
        ("Domain A: Identity, Security & System Settings", [
            ("User", "id, username, email, passwordHash, fullName, role, isActive, phone, createdAt, updatedAt", "Staff accounts with encrypted passwords (bcrypt) and role assignment (OWNER, INVENTORY_MANAGER, CASHIER)."),
            ("Setting", "id, key, value, description, updatedAt", "Key-value store for store profile (STORE_NAME, PHONE, ADDRESS), TIN, currency rates, tax %, and thresholds."),
            ("AuditLog", "id, userId, action, entityType, entityId, details (JSON), ipAddress, userAgent, createdAt", "Immutable tamper-evident security audit log tracking user creations, price updates, stock write-offs, and logins.")
        ]),
        # Domain 2
        ("Domain B: Product Catalog & Suppliers", [
            ("Category", "id, name, description, createdAt, updatedAt", "Hierarchical classification of supermarket merchandise (Beverages, Dairy, Produce, etc.)."),
            ("Supplier", "id, name, contactPerson, phone, email, address, notes, createdAt, updatedAt", "Vendor directory with lead time tracking and contact details for procurement."),
            ("Product", "id, name, sku, barcode, description, categoryId, costPrice, sellingPrice, unit, reorderLevel, trackExpiry, imageUrl, isActive", "Central product catalog. Tracks selling price, cost price, reorder thresholds, and camera-scannable EAN/UPC barcodes.")
        ]),
        # Domain 3
        ("Domain C: Inventory, FEFO Batches & Stock Movements", [
            ("InventoryBatch", "id, batchNumber, productId, initialQuantity, currentQuantity, costPrice, receivedAt, expiryDate, isWriteOff", "Heart of FEFO inventory. Tracks individual physical shipments with their distinct expiration dates and cost bases."),
            ("StockMovement", "id, productId, batchId, movementType, quantity, previousStock, newStock, reason, referenceId, createdAt", "Double-entry inventory audit ledger recording receipts, sales, shrinkage, adjustments, and customer returns.")
        ]),
        # Domain 4
        ("Domain D: Purchasing & Goods Receipt", [
            ("PurchaseOrder", "id, poNumber, supplierId, status (DRAFT, SUBMITTED, APPROVED, FULLY_RECEIVED), orderDate, expectedDate, totalCost", "Commercial purchase orders issued to suppliers for wholesale merchandise replenishment."),
            ("PurchaseOrderItem", "id, poId, productId, quantityOrdered, quantityReceived, unitCost, lineTotal", "Line item details specifying contracted unit wholesale prices and quantities ordered."),
            ("GoodsReceipt", "id, receiptNumber, poId, receivedByUserId, receivedAt, notes", "Official warehouse delivery receiving record with staff sign-off."),
            ("GoodsReceiptItem", "id, receiptId, poItemId, productId, batchId, quantityReceived, unitCost, lineTotal", "Links physical delivered quantities directly to newly instantiated InventoryBatches.")
        ]),
        # Domain 5
        ("Domain E: Cash Register Shifts & Cash Movements", [
            ("CashierShift", "id, cashierId, openedAt, closedAt, status (OPEN, CLOSED), openingCash, cashSalesTotal, cashInTotal, cashOutTotal, expectedClosingCash, actualClosingCash, difference", "Audited cashier shifts tracking opening cash float, daily cash drawer receipts, and end-of-day cash reconciliation variances."),
            ("CashMovement", "id, shiftId, userId, type (CASH_IN, CASH_OUT), amount, reason, createdAt", "Authorized cash drawer insertions (change addition) and removals (bank drops, petty cash expenses).")
        ]),
        # Domain 6
        ("Domain F: POS Sales, Discounts, Payments & Refunds", [
            ("Sale", "id, saleNumber, receiptNumber, cashierId, shiftId, customerId, subtotal, discountTotal, taxTotal, grandTotal, paymentStatus, idempotencyKey", "Primary transaction record. Encapsulates item discounts, special order promotions, VAT calculation, and unique idempotency keys."),
            ("SaleItem", "id, saleId, productId, batchId, quantity, unitPriceSnapshot, costPriceSnapshot, productNameSnapshot, discountAmount, lineTotal", "Immutable snapshot of sold items capturing exact unit prices, cost of goods, promotional discounts, and deducted inventory batches."),
            ("Payment", "id, saleId, method (CASH, QR_PAYMENT), currency (USD, KHR), amount, exchangeRate, amountInUSD, reference, status", "Payment records handling USD cash, Cambodian Riel (KHR), and digital KHQR payments with converted USD equivalents."),
            ("Refund / RefundItem", "id, refundNumber, saleId, totalRefundAmount, reason, processedByUserId / saleItemId, quantity, refundAmount, restock", "Customer refund audit trail supporting item restock decisions into batches and cashier drawer adjustments.")
        ])
    ]

    for domain_title, tables in schema_tables:
        story.append(Paragraph(domain_title, h2_style))
        table_rows = [
            [Paragraph("Table / Model", table_header), Paragraph("Key Fields & Types", table_header), Paragraph("Business Purpose", table_header)]
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
        story.append(Spacer(1, 8))

    # Page Break for Workflows
    story.append(PageBreak())

    # ==========================================
    # SECTION 4: STEP-BY-STEP WORKFLOWS
    # ==========================================
    story.append(Paragraph("4. Operational Workflows & Business Logic", h1_style))
    story.append(Paragraph(
        "The system automates critical supermarket business operations, minimizing cashier error and eliminating inventory shrinkage:",
        body_style
    ))

    # Workflow 1
    story.append(Paragraph("Workflow A: POS Checkout, FEFO Batch Deduction & Accounting", h2_style))
    story.append(Paragraph(
        "<b>Step 1 — Shift Validation:</b> The cashier must have an active <code>OPEN</code> shift with a recorded cash float before checkouts can begin.<br/>"
        "<b>Step 2 — Item Entry:</b> Cashier scans item barcode via scanner/camera or searches name/SKU. System loads current retail price and checks batch stock.<br/>"
        "<b>Step 3 — Promotional Discounts:</b> Item-level discounts (e.g. promo tag) or whole-order special sale discounts ($ or %) are applied. Discounts are recorded into <code>discountTotal</code>.<br/>"
        "<b>Step 4 — Dual-Currency Calculation:</b> Subtotal and tax are calculated. Grand total is computed in USD and converted to Cambodian Riel (KHR) at the live configured rate (e.g. 4,100 KHR).<br/>"
        "<b>Step 5 — Payment Execution:</b> Customer pays via Cash (USD/KHR with automatic change computation) or KHQR digital bank scan.<br/>"
        "<b>Step 6 — Atomic FEFO Stock Deduction:</b> In a Prisma atomic transaction, inventory is decremented from the oldest active <code>InventoryBatch</code> (earliest expiry date). A <code>StockMovement</code> record of type <code>SALE</code> is written.<br/>"
        "<b>Step 7 — Receipt Printing:</b> An 80mm thermal receipt prints with Store Name, Phone, Address, VAT TIN, item lines, promotional savings, and return policy.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Workflow 2
    story.append(Paragraph("Workflow B: Purchasing, Goods Receipt & FEFO Ingestion", h2_style))
    story.append(Paragraph(
        "<b>Step 1 — Reorder Trigger:</b> Products whose total quantity across all batches drops below <code>reorderLevel</code> trigger a reorder alert on the dashboard.<br/>"
        "<b>Step 2 — Purchase Order (PO):</b> Inventory Manager creates a PO with the chosen supplier, specifying quantity and negotiated unit cost.<br/>"
        "<b>Step 3 — Goods Delivery & Inspection:</b> Upon physical arrival, warehouse staff verifies package condition and item counts against the PO.<br/>"
        "<b>Step 4 — Batch Ingestion:</b> A <code>GoodsReceipt</code> is logged. For each product, a new <code>InventoryBatch</code> is created containing <code>batchNumber</code>, <code>costPrice</code>, and <code>expiryDate</code>.<br/>"
        "<b>Step 5 — Stock Ledger Update:</b> A <code>StockMovement</code> of type <code>RECEIPT</code> is automatically committed, increasing store inventory asset valuation.",
        body_style
    ))
    story.append(Spacer(1, 8))

    # Workflow 3
    story.append(Paragraph("Workflow C: Cashier Shift Reconciliation & Anti-Theft Balancing", h2_style))
    story.append(Paragraph(
        "<b>Step 1 — Register Opening:</b> Cashier inputs starting cash float (e.g. $100.00). Shift status changes to <code>OPEN</code>.<br/>"
        "<b>Step 2 — Shift Operations:</b> During the shift, all cash sales automatically increment <code>cashSalesTotal</code>. Any petty cash expense or cash drop is recorded via <code>CashMovement</code>.<br/>"
        "<b>Step 3 — Shift Closure:</b> Cashier counts physical cash in drawer and enters the actual amount.<br/>"
        "<b>Step 4 — Variance Calculation:</b> System computes: <code>Expected = Opening + CashSales + CashIn - CashOut</code>. The mathematical difference (Over / Short) is permanently recorded for owner audit.",
        body_style
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 5: OWNER EXECUTIVE CHECKLIST & COPYABLE SUMMARY
    # ==========================================
    story.append(Paragraph("5. Copy-Ready Staff Training & Role Summary", h1_style))
    story.append(Paragraph(
        "Below is a clean, structured summary ready to be copied into store standard operating procedure (SOP) manuals or employee onboarding handbooks:",
        body_style
    ))

    summary_box_text = (
        "<b>SUPERMARKET POS ROLES AT A GLANCE:</b><br/><br/>"
        "<b>1. STORE OWNER (System Administrator & Executive)</b><br/>"
        "• Purpose: Full business oversight, profit analytics, store settings, and staff access.<br/>"
        "• Can Access: Everything in system. Exclusively manages Store Name, Phone, Address, VAT TIN, Exchange Rates (USD/KHR), Staff Accounts, Data Backups, and Gross Profit Reports.<br/>"
        "• Cannot Do: No restrictions.<br/><br/>"
        "<b>2. INVENTORY MANAGER (Warehouse & Procurement Specialist)</b><br/>"
        "• Purpose: Maintains healthy stock levels, stops shelf expiration, and manages suppliers.<br/>"
        "• Can Access: Products, Categories, Stock Batches (FEFO), Expiry Warnings, Suppliers, Purchase Orders, Goods Receipts, and Stock Valuations.<br/>"
        "• Cannot Do: Cannot operate the POS checkout register, open cash shifts, or view store revenue/profit margins.<br/><br/>"
        "<b>3. CASHIER (Customer Checkout & Register Operator)</b><br/>"
        "• Purpose: Serves supermarket customers quickly, scans barcodes, collects payments, and balances the cash drawer.<br/>"
        "• Can Access: Cashier Shifts (Open/Close), POS Checkout Register, Barcode Scanning, Promotional Discounts, USD/KHR Cash, KHQR QR-code payments, and Customer Thermal Receipts.<br/>"
        "• Cannot Do: Cannot change product prices, edit supplier information, adjust inventory stocks, or view business settings."
    )

    summary_table = Table([[Paragraph(summary_box_text, body_style)]], colWidths=[504])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#eff6ff')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(summary_table)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[PDF Generator] Successfully generated: {output_path}")

if __name__ == '__main__':
    target = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Supermarket_POS_System_Architecture_and_Database_Guide.pdf")
    if len(sys.argv) > 1:
        target = sys.argv[1]
    create_system_documentation_pdf(target)
