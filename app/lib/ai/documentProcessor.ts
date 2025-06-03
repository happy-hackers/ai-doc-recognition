// Mistral extractors
import {
    extractPlanOfSubdivisionDirect as mistralPOS,
    extractLetterOfAcquisitionDirect as mistralLOA,
    extractManagingAuthorityFormDirect as mistralMAF,
    extractInsuranceInvoiceDirect as mistralInv,
    extractInsuranceCoCDirect as mistralCoC,
    extractInsuranceValuationReportDirect as mistralValuation,
    extractOwnerListDirectmistral,
    ocrPdfBuffer,
  } from "@/app/lib/ai/mistralClient";
  
  // OpenAI extractors
  import {
    extractPlanOfSubdivisionDirect as openaiPOS,
    extractLetterOfAcquisitionDirect as openaiLOA,
    extractManagingAuthorityFormDirect as openaiMAF,
    extractInsuranceInvoiceDirect as openaiInv,
    extractInsuranceCoCDirect as openaiCoC,
    extractInsuranceValuationReportDirect as openaiValuation,
    extractOwnerListDirectopenai,
  } from "@/app/lib/ai/openAiFileClient";
  
  // Prompts and post-processing utils
  import { filePrompts } from "@/app/lib/ai/Prompt";
  import {
    fixLetterOfAcquisitionLots,
    processOwnerList,
  } from "@/app/lib/ai/postValidators";
  import { mergeBuildingData } from "@/app/lib/ai/mergeBuildingData";
  
  // Extractor function type
  type ExtractFn = (buf: Buffer, prompt: string) => Promise<any>;
  
  // Config for each document type
  interface DocConfig {
    promptKey: keyof typeof filePrompts;
    extractor: ExtractFn;
    post?: (parsed: any) => void;
  }
  
  // Mapping of field name to extractor logic and optional post-processor
  const DOC_CONFIG: Record<string, DocConfig> = {
    planOfSubDivision: {
      promptKey: "planOfSubDivision",
      extractor: mistralPOS,
    },
    letterOfAcquisition: {
      promptKey: "letterOfAcquisition",
      extractor: mistralLOA,
      post: fixLetterOfAcquisitionLots,
    },
    managingAuthorityForm: {
      promptKey: "managingAuthorityForm",
      extractor: mistralMAF,
    },
    insuranceInvoice: {
      promptKey: "insuranceInvoice",
      extractor: mistralInv,
    },
    insuranceCoC: {
      promptKey: "insuranceCoC",
      extractor: openaiCoC,
    },
    insuranceValuationReport: {
      promptKey: "insuranceValuationReport",
      extractor: mistralValuation,
    },
    ownerlist: {
      promptKey: "ownerlist",
      // Preprocess markdown chunks and parse via LLM
      extractor: async (buf, prompt) => {
        const { parsed } = await processOwnerList(
          buf,
          prompt,
          filePrompts.ownerlist_chunk
        );
        return parsed;
      },
    },
    contractOfAppointment: {
      promptKey: "",
      // OCR-only, return raw markdown
      extractor: async (buf) => {
        const markdown = await ocrPdfBuffer(buf);
        return { __markdown: markdown };
      },
    },
  };
  
  // Simple delay between processing files
  const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
  
  // Main processing function for uploaded documents
  export async function processUploadedDocuments(
    formData: FormData
  ): Promise<{
    results: Record<string, { parsed: any; markdown?: string }[]>;
    mergedResult: any;
  }> {
    // Filter out non-file fields
    const fieldNames = Array.from(new Set(formData.keys())).filter(
      (k) => !k.endsWith("-url") && !k.endsWith("-uid")
    );
  
    const entries = await Promise.all(
      fieldNames.map(async (field) => {
        const config = DOC_CONFIG[field];
        if (!config) throw new Error(`Unknown field type: ${field}`);
  
        const files = formData.getAll(field) as File[];
  
        const fileResults = await Promise.all(
          files.map(async (file) => {
            const buf = Buffer.from(await file.arrayBuffer());
            const prompt = config.promptKey
              ? filePrompts[config.promptKey]
              : "";
  
            const parsed = await config.extractor(buf, prompt);
  
            // Optional post-processing
            if (parsed && config.post) config.post(parsed);
  
            await delay();
  
            // Try to attach OCR markdown for raw display if needed
            const markdown =
              parsed && parsed.__markdown
                ? parsed.__markdown
                : await ocrPdfBuffer(buf).catch(() => undefined);
  
            return { parsed, markdown };
          })
        );
  
        return [field, fileResults] as const;
      })
    );
  
    const results = Object.fromEntries(entries);
  
    // Filter structured fields that are not markdown-only
    const STRUCTURED_FIELDS = Object.keys(DOC_CONFIG).filter(
      (k) => !results[k]?.[0]?.parsed?.__markdown
    );
  
    // Build input for merging step
    const mergeInput: Record<string, any[]> = {};
    STRUCTURED_FIELDS.forEach((k) => {
      mergeInput[k] =
        results[k]?.map((x: any) => x.parsed).filter(Boolean) || [];
    });
  
    // Merge structured results
    const mergedResult = mergeBuildingData(mergeInput as any);
  
    return { results, mergedResult };
  }
  