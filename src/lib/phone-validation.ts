// التحقق من أرقام الهاتف الجزائرية

/**
 * التحقق من صحة رقم الهاتف الجزائري
 * القاعدة الصارمة: يجب أن يكون 10 أرقام بالضبط
 * - 05XXXXXXXX (موبايل) - 10 أرقام
 * - 06XXXXXXXX (موبايل) - 10 أرقام
 * - 07XXXXXXXX (موبايل) - 10 أرقام
 * - 03XXXXXXXX (فاكس/أرضي) - 10 أرقام
 * أي رقم أقل أو أكثر من 10 أرقام يُعتبر وهمي
 */
export function isValidAlgerianPhone(phone: string): boolean {
  // إزالة المسافات والشرطات وعلامة +
  const cleaned = phone.replace(/[\s\-+]/g, "");

  // دعم صيغة +213 أو 213 (دون الصفر الأول)
  // مثال: +213560123456 = 13 رقم بعد إزالة +، أو 213560123456 = 12 رقم
  // لكن الصيغة المحلية القياسية: 0560123456 = 10 أرقام بالضبط
  if (/^0(5|6|7|3)\d{8}$/.test(cleaned)) return true; // 10 أرقام بالضبط

  // صيغة دولية: +213 أو 213 + 9 أرقام (بدون الصفر الأول)
  // 213 + 5/6/7/3 + 8 أرقام = 12 رقم
  if (/^213(5|6|7|3)\d{8}$/.test(cleaned)) return true;

  return false;
}

/**
 * تنسيق رقم الهاتف للعرض
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-+]/g, "");
  if (/^0(5|6|7|3)\d{8}$/.test(cleaned)) {
    return cleaned.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  }
  return phone;
}

/**
 * رسالة خطأ التحقق - صارمة: 10 أرقام بالضبط
 */
export function getPhoneErrorMessage(phone: string): string | null {
  if (!phone.trim()) return "رقم الهاتف مطلوب";

  const cleaned = phone.replace(/[\s\-+]/g, "");

  // تحقق من الطول أولاً
  if (cleaned.length < 10) {
    return `رقم الهاتف قصير جداً (${cleaned.length} أرقام) — يجب أن يكون 10 أرقام بالضبط`;
  }
  if (cleaned.length > 10 && !cleaned.startsWith("213")) {
    return `رقم الهاتف طويل جداً (${cleaned.length} أرقام) — يجب أن يكون 10 أرقام بالضبط`;
  }

  if (!isValidAlgerianPhone(phone)) {
    return "رقم هاتف جزائري غير صحيح — يجب 10 أرقام تبدأ بـ 05 أو 06 أو 07 (موبايل) أو 03 (فاكس)";
  }
  return null;
}
