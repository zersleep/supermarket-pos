import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

export const TRANSLATIONS = {
  en: {
    // Navigation & Sections
    'nav.operations': 'Operations',
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'Checkout Register',
    'nav.shifts': 'Cashier Shifts',
    'nav.sales': 'Sales History',
    'nav.inventory_supply': 'Inventory & Supply',
    'nav.products': 'Products Catalog',
    'nav.categories': 'Categories',
    'nav.inventory': 'Inventory & Batches',
    'nav.suppliers': 'Suppliers',
    'nav.purchasing': 'Purchase Orders',
    'nav.administration': 'Administration',
    'nav.reports': 'Reports & Analytics',
    'nav.users': 'Staff & Roles',
    'nav.audit': 'Audit Trail',
    'nav.settings': 'Store Settings',
    'nav.exit': 'Exit',
    'brand.title': 'Supermarket POS',
    'brand.subtitle': 'Retail & Inventory',

    // TopBar
    'topbar.register': 'Register #01',
    'topbar.shift_open': 'Shift Open',
    'topbar.no_shift': 'No Open Shift',
    'topbar.primary_currency': 'Primary Currency',

    // Roles
    'role.owner': 'Store Owner',
    'role.inventory_manager': 'Inventory Manager',
    'role.cashier': 'Cashier',

    // POS & Checkout
    'pos.search_placeholder': 'Search product by name, barcode, or SKU (Press /)...',
    'pos.barcode_placeholder': 'Enter barcode or scan...',
    'pos.all_categories': 'All Categories',
    'pos.in_stock': 'In Stock',
    'pos.out_of_stock': 'Out of Stock',
    'pos.cart_title': 'Order Cart',
    'pos.cart_empty': 'Cart is currently empty',
    'pos.cart_empty_sub': 'Scan a barcode or click any item to begin checkout',
    'pos.subtotal': 'Subtotal',
    'pos.item_discount': 'Item Discounts',
    'pos.order_discount': 'Order Promotion',
    'pos.total_savings': 'Total Savings',
    'pos.tax': 'Tax',
    'pos.grand_total': 'Grand Total',
    'pos.tendered_cash': 'TENDERED CASH',
    'pos.change_due': 'Change Due',
    'pos.complete_payment': 'Complete Payment',
    'pos.clear_cart': 'Clear',
    'pos.hold_order': 'Hold',
    'pos.camera_scan': 'Camera Scan',
    'pos.add_to_cart': 'Add to Cart',
    'pos.scan_barcode_btn': 'Scan',
    'pos.unit': 'unit',
    'pos.cash': 'Cash Payment',
    'pos.khqr': 'KHQR Digital Scan',
    'pos.quick_cash': 'Quick Cash',
    'pos.exact': 'Exact',
    'pos.discount_btn': 'Discount',
    'pos.parked_orders': 'Hold Orders',
    'pos.resume': 'Resume',
    'pos.remove': 'Remove',
    'pos.tender_currency': 'Tender Currency',
    'pos.order_discount_title': 'Whole-Cart Special Discount',
    'pos.parked_title': 'Parked Customer Orders',
    'pos.custom_rate': 'Custom Exchange Rate',

    // Dashboard & Reports
    'dashboard.title': 'Dashboard & Telemetry',
    'dashboard.today_revenue': "Today's Revenue",
    'dashboard.today_sales': "Today's Orders",
    'dashboard.low_stock': 'Low Stock Items',
    'dashboard.expiring_soon': 'Expiring Soon',
    'dashboard.active_shift_title': 'Active Register Shift',
    'dashboard.recent_sales': 'Recent Sales Transactions',
    'dashboard.grand_total_usd': 'Grand Total (USD)',
    'dashboard.grand_total_khr': 'Grand Total (KHR)',

    // Products
    'products.title': 'Products Catalog',
    'products.add_product': 'Add New Product',
    'products.sku': 'SKU',
    'products.barcode': 'Barcode',
    'products.selling_price': 'Selling Price',
    'products.cost_price': 'Cost Price',
    'products.category': 'Category',
    'products.stock': 'Stock Available',
    'products.reorder': 'Reorder Level',

    // Cash Movements & Shifts
    'shift.cash_in': 'Cash In (+)',
    'shift.cash_out': 'Cash Out (-)',
    'shift.open_shift': 'Open Register Shift',
    'shift.close_shift': 'Close Shift & Balance Drawer',
    'shift.opening_float': 'Opening Cash Float',
    'shift.expected_cash': 'Expected Drawer Cash',
    'shift.actual_cash': 'Counted Physical Cash',
    'shift.difference': 'Variance (Over / Short)',
    'shift.on_duty': 'On Duty',
    'shift.off_duty': 'Off Duty',

    // Common Actions
    'common.save': 'Save Changes',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.actions': 'Actions',
    'common.status': 'Status',
    'common.active': 'Active',
    'common.disabled': 'Disabled',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.export': 'Export CSV',
    'common.language': 'Language',
    'common.english': 'English',
    'common.khmer': 'ភាសាខ្មែរ',

    // Settings
    'settings.business_profile': 'Business Profile & Branding',
    'settings.store_name': 'Supermarket Display Name',
    'settings.phone': 'Contact Phone Number',
    'settings.address': 'Store Location Address',
    'settings.tax_tin': 'Tax / TIN Identification Number',
    'settings.currency_tax': 'Dual-Currency & Exchange Rate',
    'settings.primary_currency': 'Primary Store Currency',
    'settings.exchange_rate': 'Exchange Rate: 1 USD to KHR (៛)',
    'settings.tax_percent': 'Default Tax / VAT Percentage (%)',
    'settings.receipt_layout': 'Thermal Receipt Layout & Policies',
    'settings.receipt_header': 'Receipt Header Welcome Greeting',
    'settings.receipt_footer': 'Receipt Footer Return Policy',
    'settings.inventory_thresholds': 'Inventory Warning Thresholds',
    'settings.expiry_alert_days': 'Shelf Expiry Alert Warning (Days)',
    'settings.low_stock_threshold': 'Default Low Stock Reorder Threshold',
    'settings.live_preview': 'Live Receipt Preview',
    'settings.export_backup': 'Export Backup (JSON)'
  },

  km: {
    // Navigation & Sections
    'nav.operations': 'ប្រតិបត្តិការ',
    'nav.dashboard': 'ផ្ទាំងគ្រប់គ្រង',
    'nav.pos': 'កន្លែងគិតប្រាក់',
    'nav.shifts': 'វេនគិតប្រាក់',
    'nav.sales': 'ប្រវត្តិលក់',
    'nav.inventory_supply': 'ស្តុក & ការផ្គត់ផ្គង់',
    'nav.products': 'បញ្ជីទំនិញ',
    'nav.categories': 'ប្រភេទមុខទំនិញ',
    'nav.inventory': 'ស្តុក & កញ្ចប់ទំនិញ',
    'nav.suppliers': 'អ្នកផ្គត់ផ្គង់',
    'nav.purchasing': 'បញ្ជាទិញទំនិញ',
    'nav.administration': 'ការគ្រប់គ្រង',
    'nav.reports': 'របាយការណ៍ & វិភាគ',
    'nav.users': 'បុគ្គលិក & តួនាទី',
    'nav.audit': 'កំណត់ហេតុប្រព័ន្ធ',
    'nav.settings': 'ការកំណត់ហាង',
    'nav.exit': 'ចាកចេញ',
    'brand.title': 'ប្រព័ន្ធ POS ផ្សារទំនើប',
    'brand.subtitle': 'លក់រាយ & គ្រប់គ្រងស្តុក',

    // TopBar
    'topbar.register': 'បញ្ជរលេខ ០១',
    'topbar.shift_open': 'វេនកំពុងដំណើរការ',
    'topbar.no_shift': 'គ្មានវេនបើកទេ',
    'topbar.primary_currency': 'រូបិយប័ណ្ណគោល',

    // Roles
    'role.owner': 'ម្ចាស់ហាង',
    'role.inventory_manager': 'អ្នកគ្រប់គ្រងស្តុក',
    'role.cashier': 'អ្នកគិតប្រាក់',

    // POS & Checkout
    'pos.search_placeholder': 'ស្វែងរកទំនិញតាមឈ្មោះ បាកូដ ឬកូដទំនិញ (ចុច /)...',
    'pos.barcode_placeholder': 'បញ្ចូលបាកូដ ឬស្កេន...',
    'pos.all_categories': 'គ្រប់ប្រភេទទាំងអស់',
    'pos.in_stock': 'មានក្នុងស្តុក',
    'pos.out_of_stock': 'អស់ពីស្តុក',
    'pos.cart_title': 'កន្ត្រកទំនិញ',
    'pos.cart_empty': 'មិនទាន់មានទំនិញក្នុងកន្ត្រកទេ',
    'pos.cart_empty_sub': 'សូមស្កេនបាកូដ ឬចុចលើទំនិញដើម្បីចាប់ផ្តើមគិតប្រាក់',
    'pos.subtotal': 'សរុបរង',
    'pos.item_discount': 'បញ្ចុះតម្លៃលើទំនិញ',
    'pos.order_discount': 'បញ្ចុះតម្លៃពិសេសលើវិក្កយបត្រ',
    'pos.total_savings': 'ប្រាក់ចំណេញសរុប',
    'pos.tax': 'ពន្ធអាករ',
    'pos.grand_total': 'សរុបទាំងអស់',
    'pos.tendered_cash': 'ប្រាក់ទទួលពីអតិថិជន',
    'pos.change_due': 'ប្រាក់អាប់ត្រូវជូន',
    'pos.complete_payment': 'បញ្ចប់ការទូទាត់ប្រាក់',
    'pos.clear_cart': 'សម្អាត',
    'pos.hold_order': 'ផ្អាកការលក់',
    'pos.camera_scan': 'ស្កេនកាមេរ៉ា',
    'pos.add_to_cart': 'ដាក់ក្នុងកន្ត្រក',
    'pos.scan_barcode_btn': 'ស្កេន',
    'pos.unit': 'ឯកតា',
    'pos.cash': 'ទូទាត់សាច់ប្រាក់',
    'pos.khqr': 'ស្កេន KHQR ធនាគារ',
    'pos.quick_cash': 'លុយរហ័ស',
    'pos.exact': 'លុយគត់',
    'pos.discount_btn': 'បញ្ចុះតម្លៃ',
    'pos.parked_orders': 'វិក្កយបត្រផ្អាក',
    'pos.resume': 'បន្តការលក់',
    'pos.remove': 'លុបចេញ',
    'pos.tender_currency': 'រូបិយប័ណ្ណទូទាត់',
    'pos.order_discount_title': 'បញ្ចុះតម្លៃពិសេសលើវិក្កយបត្រទាំងមូល',
    'pos.parked_title': 'បញ្ជីវិក្កយបត្រផ្អាកទុក',
    'pos.custom_rate': 'អត្រាប្តូរប្រាក់ជាក់ស្តែង',

    // Dashboard & Reports
    'dashboard.title': 'ផ្ទាំងព័ត៌មាន និងទិន្នន័យ',
    'dashboard.today_revenue': 'ចំណូលថ្ងៃនេះ',
    'dashboard.today_sales': 'ការលក់ថ្ងៃនេះ',
    'dashboard.low_stock': 'ទំនិញជិតអស់ពីស្តុក',
    'dashboard.expiring_soon': 'ទំនិញជិតផុតកំណត់',
    'dashboard.active_shift_title': 'វេនគិតប្រាក់កំពុងដំណើរការ',
    'dashboard.recent_sales': 'ប្រតិបត្តិការលក់ថ្មីៗ',
    'dashboard.grand_total_usd': 'សរុប (USD)',
    'dashboard.grand_total_khr': 'សរុប (KHR)',

    // Products
    'products.title': 'បញ្ជីទំនិញ',
    'products.add_product': 'បន្ថែមទំនិញថ្មី',
    'products.sku': 'កូដទំនិញ',
    'products.barcode': 'បាកូដ',
    'products.selling_price': 'តម្លៃលក់',
    'products.cost_price': 'តម្លៃដើម',
    'products.category': 'ប្រភេទ',
    'products.stock': 'ស្តុកក្នុងដៃ',
    'products.reorder': 'កម្រិតបញ្ជាទិញឡើងវិញ',

    // Cash Movements & Shifts
    'shift.cash_in': 'ដាក់ប្រាក់បន្ថែម (+)',
    'shift.cash_out': 'ដកប្រាក់ចេញ (-)',
    'shift.open_shift': 'បើកដំណើរការវេនគិតប្រាក់',
    'shift.close_shift': 'បិទវេន & ផ្ទៀងផ្ទាត់ថតប្រាក់',
    'shift.opening_float': 'ប្រាក់ដើមវេន',
    'shift.expected_cash': 'ប្រាក់រំពឹងទុកក្នុងថត',
    'shift.actual_cash': 'ប្រាក់រាប់បានជាក់ស្តែង',
    'shift.difference': 'គម្លាតខ្វះ/លើស',
    'shift.on_duty': 'កំពុងបំពេញការងារ',
    'shift.off_duty': 'ក្រៅវេនការងារ',

    // Common Actions
    'common.save': 'រក្សាទុកការផ្លាស់ប្តូរ',
    'common.cancel': 'បោះបង់',
    'common.delete': 'លុប',
    'common.edit': 'កែប្រែ',
    'common.actions': 'សកម្មភាព',
    'common.status': 'ស្ថានភាព',
    'common.active': 'សកម្ម',
    'common.disabled': 'អសកម្ម',
    'common.loading': 'កំពុងដំណើរការ...',
    'common.confirm': 'បញ្ជាក់',
    'common.close': 'បិទ',
    'common.export': 'ទាញយក CSV',
    'common.language': 'ភាសា',
    'common.english': 'English',
    'common.khmer': 'ភាសាខ្មែរ',

    // Settings
    'settings.business_profile': 'ព័ត៌មាន និងប្រវត្តិអាជីវកម្ម',
    'settings.store_name': 'ឈ្មោះផ្សារទំនើបបង្ហាញលើបង្កាន់ដៃ',
    'settings.phone': 'លេខទូរស័ព្ទទាក់ទង',
    'settings.address': 'អាសយដ្ឋានទីតាំងផ្សារ',
    'settings.tax_tin': 'លេខសម្គាល់សារពើពន្ធ (TIN)',
    'settings.currency_tax': 'រូបិយប័ណ្ណ និងអត្រាប្តូរប្រាក់',
    'settings.primary_currency': 'រូបិយប័ណ្ណចម្បងរបស់ហាង',
    'settings.exchange_rate': 'អត្រាប្តូរប្រាក់៖ 1 ដុល្លារ (USD) = រៀល (៛)',
    'settings.tax_percent': 'អត្រាពន្ធលំនាំដើម (%)',
    'settings.receipt_layout': 'ទម្រង់វិក្កយបត្រ និងគោលការណ៍ប្តូរទំនិញ',
    'settings.receipt_header': 'ពាក្យជូនពរផ្នែកខាងលើបង្កាន់ដៃ',
    'settings.receipt_footer': 'គោលការណ៍ប្តូរទំនិញផ្នែកខាងក្រោមបង្កាន់ដៃ',
    'settings.inventory_thresholds': 'កម្រិតព្រមានស្តុក និងកាលបរិច្ឆេទផុតកំណត់',
    'settings.expiry_alert_days': 'ការព្រមានមុនពេលផុតកំណត់ (ចំនួនថ្ងៃ)',
    'settings.low_stock_threshold': 'កម្រិតព្រមានស្តុកទាបសម្រាប់បញ្ជាទិញឡើងវិញ',
    'settings.live_preview': 'ការមើលវិក្កយបត្រផ្ទាល់ក្នុងពេលជាក់ស្តែង',
    'settings.export_backup': 'ទាញយកទិន្នន័យបម្រុងទុក (JSON)'
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem('pos_language') || 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang) => {
    if (lang !== 'en' && lang !== 'km') return;
    setLanguageState(lang);
    try {
      localStorage.setItem('pos_language', lang);
      document.documentElement.lang = lang;
    } catch {}
  };

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'km' : 'en';
    setLanguage(nextLang);
  };

  const t = (key, fallback = '') => {
    const currentDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (currentDict && currentDict[key]) {
      return currentDict[key];
    }
    // Fallback to English dictionary if missing in Khmer
    if (TRANSLATIONS.en && TRANSLATIONS.en[key]) {
      return TRANSLATIONS.en[key];
    }
    return fallback || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Provide a safe fallback if accessed outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key, fallback = '') => TRANSLATIONS.en[key] || fallback || key
    };
  }
  return context;
}

export default LanguageContext;
