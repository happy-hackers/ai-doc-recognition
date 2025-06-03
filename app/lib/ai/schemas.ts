import { z } from "zod";

/* ---------- shared address ---------- */
export const OwnerPostalAddress = z
  .object({
    Level: z.string().or(z.null()).optional(),
    Street: z.string().or(z.null()).optional(),
    City: z.string().or(z.null()).optional(),
    State: z.string().or(z.null()).optional(),
    PostalCode: z.string().or(z.null()).optional(),
  })
  .or(z.null())
  .optional();

/* ---------- Letter of Acquisition ---------- */
export const OwnerInformation = z.object({
  LotNumber: z.string().or(z.null()).optional(),
  UnitNumber: z.string().or(z.null()).optional(),
  AccountEmail: z.string().or(z.null()).optional(),
  FullName: z.string(),
  OwnerMobileNumber: z.string().or(z.null()).optional(),
  OtherContactEmails1: z.string().or(z.null()).optional(),
  OtherContactEmails2: z.string().or(z.null()).optional(),
  OtherContactEmails3: z.string().or(z.null()).optional(),
  OwnerPostalAddress,
});

export const LetterOfAcquisitionOutput = z.object({
  Lots: z.array(z.object({ OwnerInformation })),
});
export type LetterOfAcquisitionResult = z.infer<
  typeof LetterOfAcquisitionOutput
>;

/* ---------- Plan of Subdivision ---------- */
export const LotInfoSchema = z.object({
  LotNumber: z.string(),
  UnitNumber: z.string(),
  Liability: z.string(),
});

export const OCAddress = z.object({
  State: z.string(),
  Street: z.string(),
  City: z.string(),
  postCode: z.string(),
});

export const PlanOfSubdivisionOutput = z.object({
  OCInformation: z.object({
    PSNumber: z.string(),
    Address: OCAddress,
    NumberOfLots: z.string(),
    TotalLiability: z.string(),
  }),
  Lots: z.array(z.object({ LotInformation: LotInfoSchema })),
});
export type PlanOfSubdivisionResult = z.infer<typeof PlanOfSubdivisionOutput>;

/* ---------- Managing Authority Form ---------- */
export const ManagingAuthorityFormOutput = z.object({
  Lots: z.array(
    z.object({
      AgentInformation: z.object({
        UnitNumber: z.string().or(z.null()).optional(),
        AgentName: z.string(),
        AgentContactNumber: z.string().or(z.null()).optional(),
        AgentContactEmail: z.string().or(z.null()).optional(),
        AgencyName: z.string().or(z.null()).optional(),
        AgencyABN: z.string().or(z.null()).optional(),
        AgencyAddress: z
          .object({
            Street: z.string().or(z.null()).optional(),
            Level: z.string().or(z.null()).optional(),
            City: z.string().or(z.null()).optional(),
            State: z.string().or(z.null()).optional(),
            PostalCode: z.string().or(z.null()).optional(),
          })
          .or(z.null())
          .optional(),
      }),
    })
  ),
});
export type ManagingAuthorityFormResult = z.infer<
  typeof ManagingAuthorityFormOutput
>;

/* ---------- Insurance Invoice ---------- */
export const InsuranceInvoiceOutput = z.object({
  InsuranceInformation: z.object({
    PolicyNumber: z.string(),
    InsuranceProvider: z.string().or(z.null()).optional(),
    PolicyType: z.string().or(z.null()).optional(),
    StartDate: z.string().or(z.null()).optional(),
    EndDate: z.string().or(z.null()).optional(),
    TotalPayable: z.string().or(z.null()).optional(),
    TotalInsurableValue: z.string().or(z.null()).optional(),
    Commission: z.string().or(z.null()).optional(),
  }),
});
export type InsuranceInvoiceResult = z.infer<typeof InsuranceInvoiceOutput>;

/* ---------- Insurance CoC ---------- */
export const InsuranceCoCOutput = z
  .object({
    InsuranceInformation: z.object({
      PolicyNumber: z.string(),
      InsuranceProvider: z.string().or(z.null()).optional(),
      PolicyType: z.string().or(z.null()).optional(),
      StartDate: z.string().or(z.null()).optional(),
      EndDate: z.string().or(z.null()).optional(),
      TotalInsurableValue: z.string().or(z.null()).optional(),
    }),
  })
  .describe(
    "Insurance CoC schema with fields: PolicyNumber, InsuranceProvider, PolicyType, StartDate, EndDate, and TotalInsurableValue"
  );

export type InsuranceCoCResult = z.infer<typeof InsuranceCoCOutput>;

/* ---------- Insurance Valuation Report ---------- */
export const InsuranceValuationReportOutput = z.object({
  InsuranceInformation: z.object({
    InspectionDate: z.string(),
  }),
});
export type InsuranceValuationReportResult = z.infer<
  typeof InsuranceValuationReportOutput
>;

/* ---------- Owner List ---------- */
export const OwnerListOutput = z
  .object({
    Lots: z.array(
      z.object({
        OwnerInformation: z.object({
          PSNumber: z.string().or(z.null()).optional(),
          LotNumber: z.string().or(z.null()).optional(),
          UnitNumber: z.string().or(z.null()).optional(),
          AccountEmail: z.string().or(z.null()).optional(),
          OtherContactEmails1: z.string().or(z.null()).optional(),
          OtherContactEmails2: z.string().or(z.null()).optional(),
          OtherContactEmails3: z.string().or(z.null()).optional(),
          FullName: z.string(),
          OwnerMobileNumber: z.string().or(z.null()).optional(),
          OwnerPostalAddress,
          "Levy Delivery Method": z
            .enum(["Email", "Print"])
            .or(z.null())
            .optional(),
          "Correspondence Method": z
            .enum(["Email", "Print"])
            .or(z.null())
            .optional(),
        }),
      })
    ),
  })
  .describe(
    "Return a JSON object with a top-level 'Lots' array. Each item has an 'OwnerInformation' object containing fields like PSNumber, LotNumber, UnitNumber, FullName, emails, phone, and address. Omit missing fields. Output must be valid JSON with no nulls or extra text."
  );
export type OwnerListResult = z.infer<typeof OwnerListOutput>;

/* ---------- Invoice ---------- */
export const InvoiceOutput = z
  .object({
    invoiceNumber: z.string(),
    creditor: z.string(),
    amount: z.string(),
    gst: z.string(),
    invoiceDate: z.string(),
    dueDate: z.string(),
    reference: z.string(),
    psNumber: z.string(),
    address: z.string(),
    accountName: z.string(),
    bsb: z.string(),
    accountNumber: z.string(),
    paymentReference: z.string(),
    bpayBillerCode: z.string(),
    bpayReferenceNumber: z.string(),
    description: z.string(),
    abn: z.string(),
  })
  .describe("Invoice schema with required fields");
export type InvoiceResult = z.infer<typeof InvoiceOutput>;

/* ---------- Insurance Quotation ---------- */
export const InsuranceQuotationOutput = z
  .object({
    results: z.array(
      z.object({
        insuranceProvider: z.string(),
        premium: z.string(),
      })
    ),
  })
  .describe("Insurance Quotation schema");
export type InsuranceQuotationResult = z.infer<typeof InsuranceQuotationOutput>;

/* ---------- Markdown Analysis (Mistral ➜ OpenAI) ---------- */
export const MarkdownAnalysisOutput = z.object({
  Type: z.string(),
  KeyFacts: z.array(z.string()),
  Observations: z.string(),
});

export type MarkdownAnalysisResult = z.infer<typeof MarkdownAnalysisOutput>;