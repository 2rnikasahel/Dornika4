import type { Locale } from "./config";

/**
 * Dictionary type kept as `Record<string, any>` to avoid TypeScript
 * literal-type friction when adding new keys across locales.
 */
export type Dictionary = Record<string, any>;

/* ------------------------------------------------------------------ */
/* Persian (fa)                                                       */
/* ------------------------------------------------------------------ */

const fa: Dictionary = {
  nav: {
    home: "خانه",
    shop: "فروشگاه",
    blog: "بلاگ",
    contact: "تماس با ما",
    cart: "سبد خرید",
    wishlist: "علاقه‌مندی‌ها",
    search: "جستجو",
    login: "ورود",
    register: "ثبت‌نام",
    account: "حساب کاربری",
    about: "درباره ما",
    categories: "دسته‌بندی‌ها",
    products: "محصولات",
    all: "همه",
  },
  hero: {
    badge: "صنعت، طراحی، کیفیت",
    title: "درنیکا ساحل",
    subtitle:
      "پلتفرم تخصصی تأمین مواد اولیه و تجهیزات صنعتی با فناوری هوش مصنوعی",
    cta1: "مشاهده محصولات",
    cta2: "درخواست مشاوره",
  },
  features: {
    title: "چرا درنیکا ساحل؟",
    subtitle: "راهکار هوشمند برای خرید صنعتی",
    items: {
      variants: {
        title: "تنوع گسترده",
        desc: "هزاران محصول صنعتی با مشخصات فنی دقیق و قابل مقایسه",
      },
      ai: {
        title: "هوش مصنوعی",
        desc: "دستیار هوشمند برای یافتن بهترین محصول و قیمت به‌روزرسانی شده",
      },
      b2b: {
        title: "پذیرش B2B",
        desc: "حساب سازمانی، کد اقتصادی و صورت‌حساب رسمی برای شرکت‌ها",
      },
      secure: {
        title: "پرداخت امن",
        desc: "اتصال به درگاه‌های معتبر و رمزنگاری کامل اطلاعات سفارش",
      },
    },
  },
  search: {
    placeholder: "جستجوی محصول، دسته یا کد SKU...",
    noResults: "نتیجه‌ای یافت نشد",
    results: "نتایج جستجو",
  },
  product: {
    addToCart: "افزودن به سبد",
    addToWishlist: "افزودن به علاقه‌مندی",
    selectVariant: "لطفاً یک گزینه انتخاب کنید",
    outOfStock: "ناموجود",
    inStock: "موجود",
    description: "توضیحات",
    specifications: "مشخصات فنی",
    related: "محصولات مرتبط",
    sku: "کد محصول",
    unit: "واحد",
    price: "قیمت",
    quantity: "تعداد",
    requestQuote: "درخواست استعلام قیمت",
  },
  cart: {
    title: "سبد خرید",
    empty: "سبد خرید شما خالی است",
    subtotal: "جمع کل",
    shipping: "هزینه ارسال",
    total: "مبلغ نهایی",
    checkout: "تسویه حساب",
    continueShopping: "ادامه خرید",
    remove: "حذف",
    item: "کالا",
    items: "کالا",
  },
  wishlist: {
    title: "علاقه‌مندی‌ها",
    empty: "لیست علاقه‌مندی‌های شما خالی است",
    moveToCart: "انتقال به سبد خرید",
  },
  auth: {
    loginTitle: "ورود به حساب کاربری",
    registerTitle: "ساخت حساب جدید",
    username: "نام کاربری / ایمیل / تلفن",
    password: "رمز عبور",
    name: "نام و نام خانوادگی",
    phone: "شماره تلفن",
    email: "ایمیل",
    companyName: "نام شرکت",
    economicCode: "کد اقتصادی",
    loginButton: "ورود",
    registerButton: "ثبت‌نام",
    logout: "خروج",
    noAccount: "حساب کاربری ندارید؟",
    haveAccount: "قبلاً ثبت‌نام کرده‌اید؟",
    invalidCredentials: "اطلاعات ورود نادرست است",
    welcome: "خوش آمدید",
  },
  checkout: {
    title: "تسویه حساب",
    shippingAddress: "آدرس ارسال",
    paymentMethod: "روش پرداخت",
    orderSummary: "خلاصه سفارش",
    placeOrder: "ثبت سفارش",
    success: "سفارش شما با موفقیت ثبت شد",
  },
  ai: {
    title: "دستیار هوشمند",
    placeholder: "چه سوالی دارید؟",
    welcome: "سلام! چطور می‌توانم کمکتان کنم؟",
    send: "ارسال",
  },
  footer: {
    about: "درباره درنیکا ساحل",
    contact: "تماس با ما",
    rights: "تمامی حقوق محفوظ است",
    quickLinks: "دسترسی سریع",
    support: "پشتیبانی",
  },
  common: {
    loading: "در حال بارگذاری...",
    error: "خطایی رخ داد",
    retry: "تلاش مجدد",
    save: "ذخیره",
    cancel: "انصراف",
    confirm: "تأیید",
    delete: "حذف",
    edit: "ویرایش",
    close: "بستن",
    back: "بازگشت",
    next: "بعدی",
    previous: "قبلی",
    yes: "بله",
    no: "خیر",
  },
};

/* ------------------------------------------------------------------ */
/* English (en)                                                       */
/* ------------------------------------------------------------------ */

const en: Dictionary = {
  nav: {
    home: "Home",
    shop: "Shop",
    blog: "Blog",
    contact: "Contact",
    cart: "Cart",
    wishlist: "Wishlist",
    search: "Search",
    login: "Login",
    register: "Register",
    account: "Account",
    about: "About",
    categories: "Categories",
    products: "Products",
    all: "All",
  },
  hero: {
    badge: "Industry · Design · Quality",
    title: "Dornika Sahel",
    subtitle:
      "Specialized platform for industrial raw materials and equipment powered by AI",
    cta1: "Browse Products",
    cta2: "Request Consultation",
  },
  features: {
    title: "Why Dornika Sahel?",
    subtitle: "A smart approach to industrial procurement",
    items: {
      variants: {
        title: "Wide Variety",
        desc: "Thousands of industrial products with precise, comparable specs",
      },
      ai: {
        title: "AI Powered",
        desc: "Smart assistant for finding the right product and up-to-date pricing",
      },
      b2b: {
        title: "B2B Ready",
        desc: "Corporate accounts, economic codes and official invoices for businesses",
      },
      secure: {
        title: "Secure Payments",
        desc: "Verified gateways and full encryption of order information",
      },
    },
  },
  search: {
    placeholder: "Search products, categories or SKU...",
    noResults: "No results found",
    results: "Search results",
  },
  product: {
    addToCart: "Add to cart",
    addToWishlist: "Add to wishlist",
    selectVariant: "Please select an option",
    outOfStock: "Out of stock",
    inStock: "In stock",
    description: "Description",
    specifications: "Specifications",
    related: "Related products",
    sku: "SKU",
    unit: "Unit",
    price: "Price",
    quantity: "Quantity",
    requestQuote: "Request a quote",
  },
  cart: {
    title: "Shopping Cart",
    empty: "Your cart is empty",
    subtotal: "Subtotal",
    shipping: "Shipping",
    total: "Total",
    checkout: "Checkout",
    continueShopping: "Continue shopping",
    remove: "Remove",
    item: "item",
    items: "items",
  },
  wishlist: {
    title: "Wishlist",
    empty: "Your wishlist is empty",
    moveToCart: "Move to cart",
  },
  auth: {
    loginTitle: "Sign in to your account",
    registerTitle: "Create a new account",
    username: "Username / email / phone",
    password: "Password",
    name: "Full name",
    phone: "Phone number",
    email: "Email",
    companyName: "Company name",
    economicCode: "Economic code",
    loginButton: "Sign in",
    registerButton: "Register",
    logout: "Sign out",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    invalidCredentials: "Invalid credentials",
    welcome: "Welcome back",
  },
  checkout: {
    title: "Checkout",
    shippingAddress: "Shipping address",
    paymentMethod: "Payment method",
    orderSummary: "Order summary",
    placeOrder: "Place order",
    success: "Your order was placed successfully",
  },
  ai: {
    title: "AI Assistant",
    placeholder: "How can I help?",
    welcome: "Hi there! How can I help you today?",
    send: "Send",
  },
  footer: {
    about: "About Dornika Sahel",
    contact: "Contact us",
    rights: "All rights reserved",
    quickLinks: "Quick links",
    support: "Support",
  },
  common: {
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    yes: "Yes",
    no: "No",
  },
};

/* ------------------------------------------------------------------ */
/* Registry                                                           */
/* ------------------------------------------------------------------ */

const dictionaries: Record<Locale, Dictionary> = { fa, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fa;
}
