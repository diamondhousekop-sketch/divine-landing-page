// Shared domain types used across client and server.

export type PaymentMethod = "online" | "cod";
export type PaymentStatus = "pending" | "paid" | "failed";
export type OrderStatus = "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[];
  stock_quantity: number;
  is_active: boolean;
  created_at: string;
};

export type Testimonial = {
  id: string;
  customer_name: string;
  customer_city: string | null;
  quote: string;
  vimeo_url: string | null;
  rating: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string;
  customer_pincode: string;
  product_id: string | null;
  quantity: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteContent = Record<string, unknown>;

// Fallback content used when Supabase is empty/unreachable so the landing page
// never breaks. Mirrors the original hardcoded values in index.tsx.
export const FALLBACK_PRODUCT = {
  id: "",
  name: "इच्छापूर्ती लकी स्टोन",
  price: 1100,
  compare_at_price: 2100,
} as const;

export const FALLBACK_TESTIMONIALS: Pick<
  Testimonial,
  "customer_name" | "customer_city" | "quote"
>[] = [
  {
    customer_name: "राजू पाटील",
    customer_city: "कोल्हापूर",
    quote: "दुकानातील अनुभव खूप छान. मनाला शांती मिळाली.",
  },
  {
    customer_name: "सुनिता देशमुख",
    customer_city: "इचलकरंजी",
    quote: "घरातलं वातावरण आता खूप सकारात्मक वाटतं.",
  },
  {
    customer_name: "अमोल कदम",
    customer_city: "सांगली",
    quote: "व्यवसायात नवा उत्साह जाणवतोय. धन्यवाद स्वामी.",
  },
  {
    customer_name: "प्रिया जाधव",
    customer_city: "सातारा",
    quote: "पॅकिंग आणि डिलिव्हरी अगदी सुरक्षित होती.",
  },
];

export const FALLBACK_CONTENT = {
  hero_badge: "ॐ श्री स्वामी समर्थ · Diamond House, कोल्हापूर",
  hero_headline: "स्वामींचा आशीर्वाद, तुमच्या हातात",
  hero_subheadline: "Kolhapur's Trusted Icchapurti Lucky Stone — 25+ Years of Genuine Blessings",
  announcement: "मर्यादित स्टॉक — फक्त कोल्हापूर विभागासाठी · Cash on Delivery व UPI उपलब्ध",
};
