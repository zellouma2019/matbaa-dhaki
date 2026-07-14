// أنواع مشتركة لطلبات الطباعة (نسخة خفيفة للواجهة)

export interface SmartAnalysis {
  detectedService: string;
  detectedServiceName: string;
  pageCount: number;
  suggestedColor: string;
  suggestedPaperSize: string;
  suggestedPaperType: string;
  suggestedBinding: string;
  confidence: number;
  insights: string[];
}

export interface PrintOrderCustomer {
  name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  deliveryMethod: string;
  address?: string;
}

export interface PrintOrderDelivery {
  mode: string;
  date: string;
}

export interface PrintOrderOptions {
  pages: number;
  copies: number;
  color: string;
  paperSize: string;
  sides: string;
  binding: string;
  paperType: string;
  notes?: string;
  printRange: string; // "all" | "custom"
  pageRange?: string; // "1-5, 8, 10-12" إذا كان custom
  totalPages?: number; // إجمالي صفحات الملف الأصلي
}

export interface PrintOrderPricing {
  perPage: number;
  pagesCost: number;
  copiesCost: number;
  sidesSaving: number;
  // حقول نظام التسعير القديم
  paperTypeSurcharge?: number;
  bindingCost?: number;
  // حقول نظام التسعير الجديد
  extrasCost?: number;
  finishingCost?: number;
  breakdown?: { label: string; amount: number }[];
  appliedOfferNote?: string;
  // حقول مشتركة
  deliveryCost: number;
  discount: number;
  total: number;
}

export interface PrintOrderLite {
  id: string;
  reference: string;
  serviceType: string;
  serviceName: string;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  fileData: string | null;
  filePreview: string | null;
  smartAnalysis: SmartAnalysis | null;
  options: PrintOrderOptions;
  customer: PrintOrderCustomer;
  delivery: PrintOrderDelivery;
  pricing: PrintOrderPricing;
  estimatedHours: number;
  status: string;
  pages: number;
  copies: number;
  total: number;
  cost: number;
  tags: string[];
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  deliveredAt: string | null;
  startedPrintingAt: string | null;
  completedPrintingAt: string | null;
}
