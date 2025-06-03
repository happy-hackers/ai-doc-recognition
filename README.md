# AI 文档分析工具说明

以下文档简要说明项目中四种分析入口的工作流程。

---

### 文件结构
- **api/ai/**：API
  - **extract**：Strata 多文件解析 (Mistral + OpenAI)  
  - **openai-extract**：GPT-4o OCR → Markdown  
  - **mistral-ocr**：Mistral OCR → Markdown  
  - **mistral-openai**：Mistral OCR → GPT-4o 总结

- **components/**：共用上传与拖拽组件
    - **DocumentUpload.tsx**：Strata 多文件上传 + 结果展示  
    - **OpenaiDrop.tsx**：OpenAI 上传 + 结果展示  
    - **MistralDrop.tsx**：Mistral OCR 上传 + 结果展示
    - **ComboDrop.tsx**：组合分析上传 + 结果展示  

- **lib/ai/**：核心业务逻辑与工具
  - **documentProcessor.ts**：Strata 多文件统一解析入口  
  - **mergeBuildingData.ts**：将多种文件解析结果合并为单一JSON  
  - **mistralClient.ts**：Mistral SDK 封装 & OCR / 解析 
  - **openAiFileClient.ts**：OpenAI 文件 API & OCR / Markdown 分析  
  - **Prompt.ts**：Prompt 文本  
  - **schemas.ts**：Zod Schema 定义  
  - **postValidators.ts**：解析结果后处理 / 数据清洗  

- **strata/**：Strata 多文件解析界面
- **openai/**：OpenAI OCR 界面
- **mistral/**：Mistral OCR 界面
- **combo/**：Mistral → OpenAI 组合分析界面
- **page.tsx**：首页：四个入口导航

---

## 1. Strata 文件类型解析

 **用途**：Strata 项目中新建 OC 时所需的多种文件类型解析。  
 
 **输入**：用户上传多个 PDF 文件（Plan of Subdivision、Letter of Acquisition、Managing Authority Form、Insurance Invoice、Insurance CoC、Insurance Valuation Report、Owner List）。
   
 **流程**：
 1. 前端 “Strata 文件类型分析” 界面中选择并上传对应格式的 PDF 文件。  
 2. 后端统一路由 `/api/ai/extract` 调用：  
    - 根据字段名（如 `planOfSubDivision`、`letterOfAcquisition` 等）分派给不同的解析器：  
        - 使用 Mistral 或 OpenAI 提取 JSON 数据，严格符合各自 Schema。  
        - 抽取后对部分字段进行后处理（如修正 Owner FullName、填充邮寄地址等）。  
    - 每个文件解析后返回 `{ parsed: JSON, markdown?: string }`。  
 3. 后端将同一类型的多个 JSON 结果合并（`mergeBuildingData`），生成一个总的合并 JSON。  

 **输出**：  
 - `results`：各字段对应的数组，每项包含解析后的 JSON 对象和可选 Markdown。  
 - `mergedResult`：合并所有结构化文件后的统一 JSON，包含：  
   - `OCInformation`（Plan of Subdivision 提取）  
   - `InsuranceInformation`（保险相关文件则合并各类 Insurance JSON）  
   - `Lots` 列表（包含 Lot 信息、Owner 信息、Agent 信息等）  



## 2. 通用OpenAI 文件识别

 **用途**：利用 OpenAI GPT-4o 对单个 PDF 进行 OCR 提取，直接返回纯文本内容。  

 **输入**：用户在 “OpenAI OCR 分析” 界面拖拽上传单个或多个 PDF。  

 **流程**：
 1. 前端 `OpenaiDrop` 组件监听上传事件，将文件发送到 `/api/ai/openai-extract`。  
 2. 后端接收后对每个 PDF：  
    - 调用 `uploadPdfAndGetFileId` 上传到 OpenAI 文件 API。  
    - 使用 GPT-4o 模型及系统指令 `openai_ocr_generic`，让模型提取所有可见文字。  
    - 获取并返回字符串。  

 **输出**：  
 - 每个文件返回 `{ fileName: <文件名>, result: <完整文本> }` 数组。  


## 3. Mistral 文件 OCR

 **用途**：使用 Mistral OCR 模型快速将 PDF 转为 Markdown，供人工查看或后续处理。

 **输入**：用户在 “Mistral OCR 分析” 界面拖拽上传单个或多个 PDF。  
 
 **流程**：
 1. 前端 `MistralDrop` 组件将文件上传到后端 `/api/ai/mistral-ocr`。  
 2. 后端对每个 PDF 调用 Mistral 客户端的 `ocrPdfBuffer`：  
    - 上传 PDF 到 Mistral 文件服务，获取临时签名 URL。  
    - 调用 Mistral OCR 模型（`mistral-ocr-latest`），返回每页 Markdown 内容并拼接。

 **输出**：  
 - 每个文件返回 `{ fileName: <文件名>, markdown: <完整 Markdown 文本> }` 数组。  


## 4. Mistral → OpenAI 组合分析

 **用途**：先用 Mistral OCR 将 PDF 转为 Markdown，再用 OpenAI GPT-4o 对该 Markdown 进行分析，生成结构化总结。  

 **输入**：用户在 “Mistral→OpenAI 组合分析” 界面拖拽上传单个或多个 PDF。  

 **流程**：
 1. 前端 `ComboDrop` 组件将文件上传到后端 `/api/ai/mistral-openai`。  
 2. 后端依次对每个 PDF：  
    - **Mistral OCR**：调用 `ocrPdfBuffer`，输出 `markdown`。  
    - **OpenAI 分析**：将上述 `markdown` 传给 GPT-4o，配合系统指令 `openai_markdown_analysis`，要求模型使用以下输出 Schema：  
      ```jsonc
      {
        "Type": "<文档类型>",
        "KeyFacts": ["<关键信息1>", "<关键信息2>", …],
        "Observations": "<简短评述>"
      }
      ```  
    - 获取模型返回的 JSON（符合 `MarkdownAnalysisOutput` Schema）作为 `openai` 字段。  
 3. 后端将每个文件的 `{ fileName, markdown, openai }` 组织成数组返回。

 **输出**：  
 - 每个文件返回结构：  
   ```json
   {
     "fileName": "示例.pdf",
     "markdown": "<Mistral OCR 生成的 Markdown 内容>",
     "openai": {
       "Type": "Invoice",
       "KeyFacts": ["总金额: $1200", "到期日: 2025-07-01", …],
       "Observations": "该发票尚未支付，接近到期。"
     }
   }
   ```  
---

**总结**：  
 **Strata** —— 多种文件类型 → Mistral/OpenAI 结构化提取 → 合并 JSON。  
 **OpenAI** —— PDF → GPT-4o OCR → 文本。  
 **Mistral** —— PDF → Mistral OCR → Markdown 文本。  
 **Mistral+OpenAI** —— PDF → Mistral OCR → Markdown → GPT-4o 分析 → JSON 总结。  

