
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
  
  import {
    extractPlanOfSubdivisionDirect as openaiPOS,
    extractLetterOfAcquisitionDirect as openaiLOA,
    extractManagingAuthorityFormDirect as openaiMAF,
    extractInsuranceInvoiceDirect as openaiInv,
    extractInsuranceCoCDirect as openaiCoC,
    extractInsuranceValuationReportDirect as openaiValuation,
    extractOwnerListDirectopenai,
  } from "@/app/lib/ai/openAiFileClient";
  
  import { filePrompts } from "@/app/lib/ai/mistralPrompt";
  import {
    fixLetterOfAcquisitionLots,
    processOwnerList,
  } from "@/app/lib/ai/postValidators";
  import { mergeBuildingData } from "@/app/lib/ai/mergeBuildingData";
  
  /* ---------- 配置区：字段 ↔︎ 解析器 ---------- */
  type ExtractFn = (buf: Buffer, prompt: string) => Promise<any>;
  
  interface DocConfig {
    promptKey: keyof typeof filePrompts;
    extractor: ExtractFn;          // 主解析器
    post?: (parsed: any) => void;  // 可选后处理
  }
  
  const DOC_CONFIG: Record<string, DocConfig> = {
    /* 结构化类 */
    planOfSubDivision: {
      promptKey: "planOfSubDivision",
      extractor: mistralPOS, // 也可切换 openaiPOS
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
      extractor: openaiCoC, // CoC 用 GPT-4o 表现更佳
    },
    insuranceValuationReport: {
      promptKey: "insuranceValuationReport",
      extractor: mistralValuation,
    },
    ownerlist: {
      promptKey: "ownerlist",
      // 两段式：Markdown 预处理 + GPT 解析
      extractor: async (buf, prompt) => {
        const { parsed } = await processOwnerList(
          buf,
          prompt,
          filePrompts.ownerlist_chunk
        );
        return parsed;
      },
    },
  
    /* 非结构化类 —— 仅做 OCR */
    contractOfAppointment: {
      promptKey: "", // 不需要 prompt
      extractor: async (buf) => {
        const markdown = await ocrPdfBuffer(buf);
        return { __markdown: markdown };
      },
    },
  };
  
  /* ---------- 通用 delay ---------- */
  const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));
  
  /* ---------- 主入口 ---------- */
  export async function processUploadedDocuments(
    formData: FormData
  ): Promise<{
    results: Record<string, { parsed: any; markdown?: string }[]>;
    mergedResult: any;
  }> {
    /* 过滤掉 -url / -uid 等额外字段 */
    const fieldNames = Array.from(new Set(formData.keys())).filter(
      (k) => !k.endsWith("-url") && !k.endsWith("-uid")
    );
  
    const entries = await Promise.all(
      fieldNames.map(async (field) => {
        const config = DOC_CONFIG[field];
        if (!config) throw new Error(`未知字段类型: ${field}`);
  
        const files = formData.getAll(field) as File[];
  
        const fileResults = await Promise.all(
          files.map(async (file) => {
            const buf = Buffer.from(await file.arrayBuffer());
            const prompt = config.promptKey
              ? filePrompts[config.promptKey]
              : "";
  
            const parsed = await config.extractor(buf, prompt);
  
            /* 可选后处理 */
            if (parsed && config.post) config.post(parsed);
  
            await delay();
  
            /* 如果解析器只返回 markdown，就透传；否则再补 OCR 结果方便调试 */
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
  
    /* 合并 & 返回 —— 如无需合并可删除此段 */
    const STRUCTURED_FIELDS = Object.keys(DOC_CONFIG).filter(
      (k) => !results[k]?.[0]?.parsed?.__markdown
    );
  
    const mergeInput: Record<string, any[]> = {};
    STRUCTURED_FIELDS.forEach((k) => {
      mergeInput[k] =
        results[k]?.map((x: any) => x.parsed).filter(Boolean) || [];
    });
  
    const mergedResult = mergeBuildingData(mergeInput as any);
  
    return { results, mergedResult };
  }
  