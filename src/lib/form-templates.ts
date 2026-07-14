// تعريفات النماذج الرسمية - Official Form Template Definitions

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  | "email"
  | "phone"
  | "tel"
  | "signature"
  | "divider"
  | "info"

export interface FormField {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: string[]
  width?: "full" | "half" | "third"
  info?: string
  defaultValue?: string
}

export interface FormSection {
  title: string
  description?: string
  fields: FormField[]
}

export interface FormSchema {
  sections: FormSection[]
  /// حقول الاعتماد والتوقيع
  approvals?: ApprovalBlock[]
}

export interface ApprovalBlock {
  role: string
  label: string
  description?: string
}

export interface TemplateDefinition {
  code: string
  name: string
  description: string
  category: string
  icon: string
  schema: FormSchema
}

// ============================================================
// نموذج 9 - الطلب الرسمي الشامل (النموذج الرئيسي)
// ============================================================
const NAMOOTHAJ_9: TemplateDefinition = {
  code: "نموذج 9",
  name: "الطلب الرسمي الشامل",
  description:
    "نموذج رسمي معتمد لرفع الطلبات الإدارية والرسمية الشاملة إلى الجهات المختصة، يشمل بيانات مقدم الطلب وتفاصيل الطلب والاعتمادات اللازمة.",
  category: "نماذج رسمية",
  icon: "file-check-2",
  schema: {
    sections: [
      {
        title: "بيانات الجهة",
        description: "معلومات الجهة الصادر عنها الطلب",
        fields: [
          {
            key: "ministry",
            label: "الجهة / الوزارة",
            type: "text",
            required: true,
            placeholder: "مثال: وزارة التنمية الإدارية",
            width: "half",
          },
          {
            key: "department",
            label: "الإدارة العامة",
            type: "text",
            required: true,
            placeholder: "الإدارة التابع لها مقدم الطلب",
            width: "half",
          },
          {
            key: "section",
            label: "القسم / الوحدة",
            type: "text",
            placeholder: "القسم أو الوحدة التنظيمية",
            width: "half",
          },
          {
            key: "fiscalYear",
            label: "السنة المالية",
            type: "text",
            placeholder: "2025",
            width: "half",
          },
        ],
      },
      {
        title: "بيانات مقدم الطلب",
        description: "المعلومات الشخصية والوظيفية لمقدم الطلب",
        fields: [
          {
            key: "fullName",
            label: "الاسم الكامل",
            type: "text",
            required: true,
            placeholder: "الاسم الرباعي",
            width: "half",
          },
          {
            key: "jobTitle",
            label: "المسمى الوظيفي",
            type: "text",
            required: true,
            placeholder: "المسمى الوظيفي الحالي",
            width: "half",
          },
          {
            key: "employeeId",
            label: "الرقم الوظيفي / الرقم الوطني",
            type: "text",
            required: true,
            placeholder: "الرقم الوظيفي",
            width: "half",
          },
          {
            key: "phone",
            label: "رقم الهاتف",
            type: "tel",
            required: true,
            placeholder: "05XXXXXXXX",
            width: "half",
          },
          {
            key: "email",
            label: "البريد الإلكتروني",
            type: "email",
            placeholder: "name@example.gov",
            width: "half",
          },
          {
            key: "workplace",
            label: "مكان العمل",
            type: "text",
            placeholder: "المدينة / الموقع",
            width: "half",
          },
        ],
      },
      {
        title: "تفاصيل الطلب",
        description: "بيان نوع الطلب وموضوعه وتفاصيله",
        fields: [
          {
            key: "requestType",
            label: "نوع الطلب",
            type: "select",
            required: true,
            width: "half",
            options: [
              "طلب موافقة",
              "طلب إجازة",
              "طلب نقل",
              "طلب ترقية",
              "طلب تعيين",
              "طلب مكافأة",
              "طلب بدل",
              "طلب صرف",
              "طلب مخاطبة جهة",
              "طلب آخر",
            ],
          },
          {
            key: "priority",
            label: "أولوية الطلب",
            type: "select",
            required: true,
            width: "half",
            defaultValue: "عادية",
            options: ["عادية", "عاجلة", "هامة جداً"],
          },
          {
            key: "subject",
            label: "موضوع الطلب",
            type: "text",
            required: true,
            placeholder: "عنوان موجز للطلب",
            width: "full",
          },
          {
            key: "requestDate",
            label: "تاريخ تقديم الطلب",
            type: "date",
            required: true,
            width: "half",
          },
          {
            key: "neededBefore",
            label: "تاريخ الحاجة للإنجاز",
            type: "date",
            width: "half",
          },
          {
            key: "details",
            label: "تفاصيل الطلب",
            type: "textarea",
            required: true,
            placeholder:
              "يرجى كتابة تفاصيل الطلب بشكل واضح ومفصل مع ذكر الأسباب والمبررات...",
            width: "full",
          },
          {
            key: "justification",
            label: "المبررات والأسانيد",
            type: "textarea",
            placeholder: "الأسانيد النظامية والمبررات التي يستند إليها الطلب",
            width: "full",
          },
        ],
      },
      {
        title: "المرفقات",
        description: "المرفقات المطلوبة مع الطلب (حدد ما ينطبق)",
        fields: [
          {
            key: "attachments",
            label: "المرفقات المرفقة",
            type: "checkbox",
            width: "full",
            options: [
              "صورة من الهوية الوطنية",
              "شهادة المؤهل العلمي",
              "كشف الراتب",
              "تقرير الأداء السنوي",
              "خطاب الجهة المعنية",
              "مستندات مالية",
              "أخرى",
            ],
          },
          {
            key: "attachmentsOther",
            label: "بيان المرفقات الأخرى",
            type: "text",
            placeholder: "في حال اختيار (أخرى) اذكر التفاصيل",
            width: "full",
          },
        ],
      },
      {
        title: "الإقرار والتوقيع",
        description: "إقرار مقدم الطلب بصحة المعلومات",
        fields: [
          {
            key: "declaration",
            label: "أقر بأن جميع المعلومات الواردة في هذا الطلب صحيحة ومطابقة للواقع، وأتحمل المسؤولية عن أي معلومات غير دقيقة.",
            type: "checkbox",
            required: true,
            width: "full",
            options: ["موافق على الإقرار"],
          },
          {
            key: "applicantSignature",
            label: "توقيع مقدم الطلب",
            type: "signature",
            width: "half",
          },
          {
            key: "signatureDate",
            label: "تاريخ التوقيع",
            type: "date",
            width: "half",
          },
        ],
      },
    ],
    approvals: [
      { role: "applicant", label: "مقدم الطلب", description: "الاسم والتوقيع" },
      { role: "directManager", label: "الرئيس المباشر", description: "الاسم والتوقيع والتاريخ" },
      { role: "departmentManager", label: "مدير الإدارة", description: "الاسم والتوقيع والتاريخ" },
      { role: "concernedParty", label: "الجهة المختصة", description: "الاسم والتوقيع والختم" },
    ],
  },
}

// ============================================================
// نموذج طلب إجازة سنوية
// ============================================================
const LEAVE_REQUEST: TemplateDefinition = {
  code: "نموذج إجازة",
  name: "طلب إجازة سنوية",
  description: "نموذج لطلب الإجازة السنوية للموظفين وفق الأنظمة المعتمدة.",
  category: "موارد بشرية",
  icon: "calendar-days",
  schema: {
    sections: [
      {
        title: "بيانات الموظف",
        fields: [
          { key: "fullName", label: "اسم الموظف", type: "text", required: true, width: "half" },
          { key: "employeeId", label: "الرقم الوظيفي", type: "text", required: true, width: "half" },
          { key: "jobTitle", label: "المسمى الوظيفي", type: "text", required: true, width: "half" },
          { key: "department", label: "الإدارة", type: "text", required: true, width: "half" },
        ],
      },
      {
        title: "تفاصيل الإجازة",
        fields: [
          { key: "leaveType", label: "نوع الإجازة", type: "select", required: true, width: "half", options: ["سنوية", "اضطرارية", "مرضية", "أمومة", "استثنائية", "بدون راتب"] },
          { key: "startDate", label: "تاريخ البداية", type: "date", required: true, width: "half" },
          { key: "endDate", label: "تاريخ النهاية", type: "date", required: true, width: "half" },
          { key: "days", label: "عدد الأيام", type: "number", required: true, width: "half" },
          { key: "returnDate", label: "تاريخ العودة للعمل", type: "date", required: true, width: "half" },
          { key: "balance", label: "رصيد الإجازة المتبقي", type: "number", width: "half" },
          { key: "reason", label: "سبب الإجازة (إن وجد)", type: "textarea", width: "full" },
        ],
      },
    ],
    approvals: [
      { role: "applicant", label: "الموظف" },
      { role: "directManager", label: "الرئيس المباشر" },
      { role: "hrManager", label: "مدير الموارد البشرية" },
    ],
  },
}

// ============================================================
// نموذج طلب توظيف
// ============================================================
const RECRUITMENT_REQUEST: TemplateDefinition = {
  code: "نموذج توظيف",
  name: "طلب توظيف / شغل وظيفة",
  description: "نموذج لطلب شغل وظيفة شاغرة وفقاً للهيكل التنظيمي.",
  category: "موارد بشرية",
  icon: "user-plus",
  schema: {
    sections: [
      {
        title: "بيانات الوظيفة المطلوبة",
        fields: [
          { key: "jobTitle", label: "المسمى الوظيفي المطلوب", type: "text", required: true, width: "half" },
          { key: "jobGrade", label: "المرتبة / الدرجة", type: "text", required: true, width: "half" },
          { key: "department", label: "الإدارة الطالبة", type: "text", required: true, width: "half" },
          { key: "headcount", label: "عدد الشواغر", type: "number", required: true, width: "half" },
          { key: "contractType", label: "نوع العقد", type: "select", required: true, width: "half", options: ["دوام كامل", "عقد مؤقت", "عقد محدد المدة", "تعهيد"] },
          { key: "urgency", label: "مدى الإلحاح", type: "select", required: true, width: "half", options: ["عادي", "ملح", "عاجل جداً"] },
        ],
      },
      {
        title: "المؤهلات المطلوبة",
        fields: [
          { key: "qualification", label: "المؤهل العلمي", type: "text", required: true, width: "half" },
          { key: "experience", label: "سنوات الخبرة المطلوبة", type: "number", required: true, width: "half" },
          { key: "skills", label: "المهارات المطلوبة", type: "textarea", required: true, width: "full" },
          { key: "responsibilities", label: "المهام والمسؤوليات", type: "textarea", required: true, width: "full" },
          { key: "justification", label: "مبررات الحاجة للوظيفة", type: "textarea", required: true, width: "full" },
        ],
      },
    ],
    approvals: [
      { role: "requester", label: "مدير الإدارة الطالبة" },
      { role: "hrManager", label: "مدير الموارد البشرية" },
      { role: "director", label: "المدير العام" },
    ],
  },
}

// ============================================================
// نموذج تقييم أداء موظف
// ============================================================
const PERFORMANCE_EVALUATION: TemplateDefinition = {
  code: "نموذج تقييم",
  name: "تقييم أداء موظف",
  description: "نموذج تقييم الأداء السنوي للموظفين.",
  category: "موارد بشرية",
  icon: "gauge",
  schema: {
    sections: [
      {
        title: "بيانات الموظف",
        fields: [
          { key: "fullName", label: "اسم الموظف", type: "text", required: true, width: "half" },
          { key: "employeeId", label: "الرقم الوظيفي", type: "text", required: true, width: "half" },
          { key: "jobTitle", label: "المسمى الوظيفي", type: "text", required: true, width: "half" },
          { key: "department", label: "الإدارة", type: "text", required: true, width: "half" },
          { key: "evaluationPeriod", label: "فترة التقييم", type: "text", required: true, placeholder: "2025", width: "half" },
          { key: "evaluationDate", label: "تاريخ التقييم", type: "date", required: true, width: "half" },
        ],
      },
      {
        title: "معايير التقييم",
        fields: [
          { key: "qualityOfWork", label: "جودة العمل", type: "select", required: true, width: "half", options: ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"] },
          { key: "productivity", label: "الإنتاجية", type: "select", required: true, width: "half", options: ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"] },
          { key: "teamwork", label: "العمل الجماعي", type: "select", required: true, width: "half", options: ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"] },
          { key: "punctuality", label: "الالتزام بالدوام", type: "select", required: true, width: "half", options: ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"] },
          { key: "initiative", label: "المبادرة والإبداع", type: "select", required: true, width: "half", options: ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"] },
          { key: "overallRating", label: "التقييم العام", type: "select", required: true, width: "half", options: ["ممتاز", "جيد جداً", "جيد", "مقبول", "ضعيف"] },
          { key: "strengths", label: "نقاط القوة", type: "textarea", width: "full" },
          { key: "improvements", label: "نقاط التحسين", type: "textarea", width: "full" },
          { key: "goals", label: "الأهداف للفترة القادمة", type: "textarea", width: "full" },
        ],
      },
    ],
    approvals: [
      { role: "employee", label: "الموظف" },
      { role: "directManager", label: "الرئيس المباشر" },
      { role: "hrManager", label: "مدير الموارد البشرية" },
    ],
  },
}

// ============================================================
// نموذج طلب مشتريات
// ============================================================
const PURCHASE_REQUEST: TemplateDefinition = {
  code: "نموذج مشتريات",
  name: "طلب مشتريات",
  description: "نموذج لطلب شراء احتياجات العمل من معدات أو خدمات.",
  category: "إدارية",
  icon: "shopping-cart",
  schema: {
    sections: [
      {
        title: "بيانات الطلب",
        fields: [
          { key: "requesterName", label: "اسم مقدم الطلب", type: "text", required: true, width: "half" },
          { key: "department", label: "الإدارة", type: "text", required: true, width: "half" },
          { key: "requestDate", label: "تاريخ الطلب", type: "date", required: true, width: "half" },
          { key: "neededBy", label: "تاريخ الحاجة", type: "date", required: true, width: "half" },
          { key: "project", label: "المشروع / النشاط", type: "text", width: "full" },
        ],
      },
      {
        title: "تفاصيل المشتريات",
        fields: [
          { key: "items", label: "بنود المشتريات (الصنف، الكمية، السعر التقديري)", type: "textarea", required: true, width: "full", placeholder: "اكتب كل بند في سطر منفصل" },
          { key: "estimatedTotal", label: "إجمالي القيمة التقديرية", type: "number", required: true, width: "half" },
          { key: "currency", label: "العملة", type: "select", required: true, width: "half", defaultValue: "ريال", options: ["ريال", "دولار", "يورو", "درهم"] },
          { key: "purpose", label: "الغرض من الشراء", type: "textarea", required: true, width: "full" },
          { key: "preferredSupplier", label: "المورد المفضل (إن وجد)", type: "text", width: "full" },
        ],
      },
    ],
    approvals: [
      { role: "requester", label: "مقدم الطلب" },
      { role: "directManager", label: "الرئيس المباشر" },
      { role: "finance", label: "الشؤون المالية" },
      { role: "director", label: "المدير العام" },
    ],
  },
}

// ============================================================
// نموذج محضر اجتماع
// ============================================================
const MEETING_MINUTES: TemplateDefinition = {
  code: "نموذج محضر",
  name: "محضر اجتماع",
  description: "نموذج لتوثيق اجتماعات العمل الرسمية وقراراتها.",
  category: "إدارية",
  icon: "clipboard-list",
  schema: {
    sections: [
      {
        title: "بيانات الاجتماع",
        fields: [
          { key: "title", label: "عنوان الاجتماع", type: "text", required: true, width: "full" },
          { key: "date", label: "تاريخ الاجتماع", type: "date", required: true, width: "third" },
          { key: "time", label: "الوقت", type: "text", required: true, width: "third", placeholder: "10:00 ص" },
          { key: "location", label: "المكان", type: "text", required: true, width: "third" },
          { key: "chairperson", label: "رئيس الاجتماع", type: "text", required: true, width: "half" },
          { key: "secretary", label: "مقرر الاجتماع", type: "text", required: true, width: "half" },
          { key: "attendees", label: "الحضور", type: "textarea", required: true, width: "full", placeholder: "أسماء الحضور..." },
        ],
      },
      {
        title: "محتوى الاجتماع",
        fields: [
          { key: "agenda", label: "جدول الأعمال", type: "textarea", required: true, width: "full" },
          { key: "discussions", label: "محاضر المناقشات", type: "textarea", required: true, width: "full" },
          { key: "decisions", label: "القرارات المتخذة", type: "textarea", required: true, width: "full" },
          { key: "actionItems", label: "المهام الموكلة والمسؤولون", type: "textarea", width: "full" },
          { key: "nextMeeting", label: "موعد الاجتماع القادم", type: "date", width: "half" },
        ],
      },
    ],
    approvals: [
      { role: "secretary", label: "المقرر" },
      { role: "chairperson", label: "رئيس الاجتماع" },
    ],
  },
}

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  NAMOOTHAJ_9,
  LEAVE_REQUEST,
  RECRUITMENT_REQUEST,
  PERFORMANCE_EVALUATION,
  PURCHASE_REQUEST,
  MEETING_MINUTES,
]

export const TEMPLATE_BY_CODE: Record<string, TemplateDefinition> = Object.fromEntries(
  TEMPLATE_DEFINITIONS.map((t) => [t.code, t]),
)
