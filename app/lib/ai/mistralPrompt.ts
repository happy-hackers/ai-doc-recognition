export const filePrompts: Record<string, string> = {
    planOfSubDivision: `
  ### Objective
  Extract structured information from a "Plan of Subdivision" (POS) document and return **strictly valid JSON** containing key details about the subdivision and its lots.
  
  ---
  
  ### Detailed Requirements
  1. **Extract Key Subdivision Information** into an "OCInformation" object:
     - Plan of subdivision (PS) number
     - **Address**:
        - Only extract the address that appears **immediately after** the **"Postal Address:"** label under the subdivision heading.
        - **Ignore** any addresses in sections titled **"Postal Address for Service of Notices:"** or similar.
        - The **address must include**:
          - Street number and street name
          - Suburb
          - State
          - **Postcode (usually a 4-digit number at the end, e.g., VIC 3123)**
        - If postcode is on the next line or at the end of the address block, still include it.
        - Always return the **full address** as one single string.
     - End of financial year
     - Total number of lots
     - TotalLiability: 
        - Refers to the sum of all liability values listed for individual lots in the document.
        - It is usually shown at the bottom of the liability table, often labeled with "Total", "Total Liability", or similar.
        - This value may appear in the last row of the table that lists liabilities for each lot.
        
  2. **Extract Lot-Specific Details** into a "Lots" array:
     - Each lot must be a separate object in the "Lots" array.
     - Each lot should contain:
       - "LotNumber"
       - "UnitNumber"
       - "Liability"
     - **If neither "LotNumber" nor "UnitNumber" is found, omit the lot.**
  
  3. **Output Constraints:**
     - Omit missing fields entirely (do not return empty strings or null values).
     - Ensure **strictly valid JSON** with no extra text, markdown, or explanations.
  
  ---        
  
  ### Expected JSON Output Format
  
    {
      "OCInformation": {
        "PSNumber": "",
        "Address": {
          "State": "",
          "Street": "",
          "City": "",
          "postCode": "",
        },
        "NumberOfLots": "",
        "TotalLiability": ""
      },
      "Lots": [
        {
          "LotInformation": {
            "LotNumber": "",
            "UnitNumber": "",
            "Liability": ""
          }
        },
        {
          "LotInformation": {
            "LotNumber": "",
            "UnitNumber": "",
            "Liability": ""
          }
        },
        ...
      ]
    }
`,
  
    letterOfAcquisition: ` 
  ### Objective
  Extract structured information from a "Letter of Acquisition" document and return **strictly valid JSON** containing the relevant owner (transferee) details and associated lot information.
  
  ---
  
  ### Detailed Requirements
  1. **Transferee is the Owner**:
     - Only extract the transferee's details (the new owner's information).
     - Do not extract Transferor or Transferee solicitor information, if no transferee is found, skip the page entirely.
     - **Transferee can be either**:
       - A **Person** (e.g., "John Doe").  
       - An **Organization** (e.g., "BAJWAT PTY LTD", trustee of a trust).
     - If the transferee is an **organization**, extract:
       - "FullName" as the **Organization Name** (e.g., "FullName": "BAJWAT PTY LTD")
       - **All other "OwnerInformation" fields (e.g., "AccountEmail", "OwnerMobileNumber", "OwnerPostalAddress") belong to the organization and must be extracted accordingly.**
     - Ignore any information related to the **Transferee's solicitor or legal representative**.
  
  2. **Unit Number Extraction Rules:**
     - You must see a **"Details of Title"** section (or synonyms like "Details of the Title", "Details of Title:") to extract UnitNumber.
     - If "Details of Title" is absent, do **not** extract any UnitNumber.
      -   If **UnitNumber** is **explicitly mentioned**, extract it directly.
      -   If 'UnitNumber' is embedded in an address, ensure it is **not the street number**:
          -   If formatted as 'Unit 7, 100 ABC St', extract '7' as 'UnitNumber'.
          -   If formatted as '7/100 ABC St', extract '7' as 'UnitNumber' (not '100').
     - If no UnitNumber is explicitly found in "Details of Title", omit it.
  
  3. **LotNumber Extraction Rules**:
  
     - Only extract LotNumber from within or near **"Details of Title"** section.
     - If "Details of Title" does not appear, skip any lot extraction.
     - Look for phrases such as:
       - Lot 5 on Plan of Subdivision 723193E
       - Lot 12 on PS543211W
     - From such patterns, extract only the **"Lot" + number part**, e.g.:
       - Lot 5 on Plan of Subdivision 723193E → "LotNumber": "Lot 5"
       - Lot 12 on PS543211W → "LotNumber": "Lot 12"
     - Extract format must be strictly: Lot X (e.g., Lot 10, Lot 23)
     - Ignore the plan details after "on Plan..." or "on PS...".
     - If you do not see a valid pattern in "Details of Title", do not generate a LotNumber.
  
  4. **Email Address Extraction Rules**:
     - Extract **only the Transferee's (new owner's)** email address.
     - Do **not** extract any emails that appear under or near Transferor (previous owner) or legal representatives.
     - If there is uncertainty or if an email appears closer to Transferor details, DO NOT extract it.
     - If multiple emails are found under the Transferee, assign the first to AccountEmail, and up to 3 additional ones to OtherContactEmails1~3.
     - If no email address is provided for the transferee, omit the AccountEmail field and any OtherContactEmails entirely. Do not insert empty fields or placeholders.

  5. Multiple Owners for a Single Lot
  
  A common indicator of multiple owners is when the **"Share Holding" is NOT 1/1** — for example, 1/2, 1/3, or 2/5.
  In such cases, **each share holder listed is a distinct owner**. Ensure all their details are extracted.
  
  -   **FullName**: Concatenate the names of all owners using &.
      -   Example: "Owner A" and "Owner B" → "FullName": "Owner A & Owner B"
  -   **AccountEmail**: Use the email of the first owner (if multiple exist).
  -   **OtherContactEmails1/2/3**: Store the remaining owners' emails in "OtherContactEmails1", "OtherContactEmails2", and "OtherContactEmails3" respectively (up to 3 additional emails).
  -   **OwnerMobileNumber**: If multiple mobile numbers exist, join them using &.
      - Example: "0412345678" and "0422333444" → "OwnerMobileNumber": "0412345678 & 0422333444"
    
  **IMPORTANT**:
     - **Only extract what is present in the document.**
     - **Do NOT fabricate or infer missing phone numbers or email addresses.**
     - If an owner has no phone/email, skip that field. Do not insert empty strings or placeholders.
  
  6. **OwnerPostalAddress**:
     Only extract "OwnerPostalAddress" if the document includes the phrase **"address for future correspondence"**.
     - The address must appear immediately after this phrase.
     - If the phrase is not present, **do not extract or return any OwnerPostalAddress**.
     - OwnerPostalAddress may contain:
       - "Street", "Level", "City", "State", "PostalCode"
       - "Level" is the level number or unit number of the OwnerPostalAddress
  
  7. **OwnerInformation** may include:
     - "LotNumber"
     - "UnitNumber"
     - "AccountEmail"
     - "FullName"
     - "OwnerMobileNumber"
     - "OtherContactEmails1"
     - "OtherContactEmails2"
     - "OtherContactEmails3"
     - "OwnerPostalAddress" (which can contain "Street", "Level", "City", "State", "PostalCode")
  
  8. **Output Constraints**:
     - Omit missing fields entirely (do not return empty strings or null values).
     - Ensure **strictly valid JSON** with no extra text, markdown, or explanations.
  
  ---
  
  ### Expected JSON Output Format
  
  {
    "Lots": [
      {
        "OwnerInformation": {
          "LotNumber": "",
          "UnitNumber": "",
          "AccountEmail": "",
          "FullName": "",
          "OwnerMobileNumber": "",
          "OtherContactEmails1": "",
          "OtherContactEmails2": "",
          "OtherContactEmails3": "",
          "OwnerPostalAddress": {
            "Street": "",
            "Level": "",
            "City": "",
            "State": "",
            "PostalCode": ""
          }
        }
      },
      ...
    ]
  }
  `,
  
    managingAuthorityForm: `
  ### Objective
  Extract structured information from a "Managing Authority Form" document and return **strictly valid JSON** containing key details about the managing agent and associated lot information.
  
  ---
  
  ### Detailed Requirements
  1. **Extract Agent and Agency Details** into an "AgentInformation" object inside each lot:
     - "UnitNumber"
     - "AgentName"
        - Look for lines near or following keywords such as **"Attention"**.
        - The name usually appears after these keywords, either on the same line or the following one.
     - "AgentContactNumber"
     - "AgentContactEmail"
     - "AgencyName"
     - "AgencyABN"
     - "AgencyAddress", which must include (if available):
      - "Level": The level number or unit number of the agency's office.
      - "Street": Must contain **only** the actual **street number and street name**, excluding unit or level numbers.
        - Avoid merging numbers like "1 88 ABC Street" into "188 ABC Street". If there's a space between them, treat them as **separate fields**:
      - "City"
      - "State"
      - "PostalCode"
  
  2. **Unit Number Extraction Rules**:
  
  - Extract 'UnitNumber' **only from the target property address referenced in this 'Managing Authority Form'**.
  - Do **not** extract 'UnitNumber' from Client, Agent, or Agency details.
  - If 'UnitNumber' is explicitly mentioned as part of the property details, extract it directly.
  - If 'UnitNumber' is embedded in an address, follow these rules:
    - If formatted as 'Unit 7, 100 ABC St', extract '7' as 'UnitNumber'.
    - If formatted as '7/100 ABC St', extract '7' as 'UnitNumber' (not '100').
    - If formatted as '1809/605 Lonsdale St', extract '1809' as 'UnitNumber' (not '605').
  - If no valid 'UnitNumber' is found, omit the field.
  
  3. **Output Constraints**:
     - Omit missing fields entirely (do not return empty strings or null values).
     - Ensure **strictly valid JSON** with no extra text, markdown, or explanations.
  
  ---
  
  ### Expected JSON Output Format
  
  {
    "Lots": [
      {
        "AgentInformation": {
          "UnitNumber": "",
          "AgentName": "",
          "AgentContactNumber": "",
          "AgentContactEmail": "",
          "AgencyName": "",
          "AgencyABN": "",
          "AgencyAddress": {
            "Street": "",
            "Level": "",
            "City": "",
            "State": "",
            "PostalCode": ""
          }
        }
      },
      ...
    ]
  }
  
  ---
  
  ### Example JSON Output
  
  {
    "Lots": [
      {
        "AgentInformation": {
          "UnitNumber": "1",
          "AgentName": "John Doe",
          "AgentContactNumber": "0432833666",
          "AgentContactEmail": "agentemail123@gmail.com",
          "AgencyName": "Real Estate Solutions",
          "AgencyABN": "12345678910",
          "AgencyAddress": {
            "Street": "123 Collins Street",
            "Level": "5",
            "City": "Melbourne",
            "State": "VIC",
            "PostalCode": "3000"
          }
        }
      },
    ]
  }
  `,
  
    insuranceInvoice: `
    ### Objective
    Extract structured information from an "Insurance Invoice" document and return **strictly valid JSON** containing key details about the insurance policy.
  
    ---
  
    ### Detailed Requirements
    1. **Extract Insurance Policy Details** into an "InsuranceInformation" object:
       - "PolicyNumber"
       - "InsuranceProvider"
       - "PolicyType"
       - "StartDate"
       - "EndDate"
       - "TotalPayable"
       - "TotalInsurableValue"
       - "Commission"
    
    2. **InsuranceProvider Extraction Rules**:
     - The "InsuranceProvider" must be **extracted only if it appears directly next to or under a label like "Insurer"**.
     - If no such label (e.g., "Insurer:") is found, **omit** the "InsuranceProvider" field entirely.
     
    3. **Extract "TotalInsurableValue" Based on Context**:
       - The relevant field may appear as or be similar to:
         - "Insured Property - Building"
         - "Building Sum Insured"
       - This value is typically found under:
         - "Policy Details" in "Section 1" or "Policy 1"
         
    4. **Extract "TotalPayable" Based on Context**:
     - Prioritize numeric values that appear directly next to or under labels such as:
       - **"TOTAL PREMIUM DUE"**
       - **"Total"**

    5. **Output Constraints**:
       - Omit missing fields entirely (do not return empty strings or null values).
       - Ensure **strictly valid JSON** with no extra text, markdown, or explanations.
    
    ---
    
    ### Expected JSON Output Format
    
    {
      "InsuranceInformation": {
        "PolicyNumber": "",
        "InsuranceProvider": "",
        "PolicyType": "",
        "StartDate": "",
        "EndDate": "",
        "TotalPayable": "",
        "TotalInsurableValue": "",
        "Commission": ""
      }
    }
    
    ---
    
    ### Example JSON Output
    
    {
      "InsuranceInformation": {
        "PolicyNumber": "POL12345678",
        "InsuranceProvider": "XYZ Insurance",
        "PolicyType": "Strata Building Insurance",
        "StartDate": "01/01/2024",
        "EndDate": "01/01/2025",
        "TotalPayable": "50000.00",
        "TotalInsurableValue": "1000000.00",
        "Commission": "500.00"
      }
    }
    `,
    insuranceCoC: `
    ### Objective
    Extract structured information from a "Certificate of Compliance (CoC)" document and return **strictly valid JSON** containing key details about the insurance policy.
    
    ---
    
    ### Detailed Requirements
    
    1. **Extract Insurance Policy Details** into an "InsuranceInformation" object:
       - "PolicyNumber"
       - "InsuranceProvider"
       - "PolicyType"
       - "StartDate"
       - "EndDate"
       - "TotalInsurableValue"
    
    2. **StartDate / EndDate Extraction Rules**:
       - Only extract dates if they appear near or under:
         - "Period of Insurance:"
         - "Period of Cover"
         - "Inception Date: ... Expiry Date:"
       - Dates may appear in various formats (e.g., "1 Jan 2024", "4.00pm on 01 January 2024, Local Standard Time", "January 1, 2024", "2024-01-01", etc).
       - **Convert all date formats to "dd/mm/yyyy"**.
       - If no valid format or label found, omit both fields.
    
    3. **InsuranceProvider Extraction Rules**:
       - Only extract if it appears directly next to or under labels like "Insurer", "Insurance Provider", or "Underwriter".
       - Omit if label not found.
    
    4. **TotalInsurableValue Extraction Rules**:
       - Only extract values near or under phrases such as:
         - "Buildings and Common Property"
         - "Section 1 - Buildings"
         - "Policy 1 - Insured Property Building"
         - "Section 1 Insured Property Building Sum Insured"
       - These usually represent the total insured value for the building.
    
    5. **Output Constraints**:
       - Omit any field that is not explicitly found or does not meet the above rules.
       - Do not guess or fabricate values.
       - Ensure **strictly valid JSON**. Do **not** include any explanations, markdown, or comments.
    
    ---
    
    ### Expected JSON Output Format
    
    {
      "InsuranceInformation": {
        "PolicyNumber": "",
        "InsuranceProvider": "",
        "PolicyType": "",
        "StartDate": "",
        "EndDate": "",
        "TotalInsurableValue": "",
      }
    }
    `,    
  
    insuranceValuationReport: `### Objective
  Extract structured information from an "Insurance Valuation Report" document and return **strictly valid JSON** containing key details about the report.
  
  ---
  
  ### Detailed Requirements
  1. **Extract Valuation Report Details** into an "InsuranceValuationInformation" object:
     - "InspectionDate"
  
  2. **Extract "InspectionDate" Based on Context**:
     - The relevant field may appear as or be similar to:
       - "Date of Inspection"
       - "Inspection Conducted On"
     - **Do not extract any date** if such labeling is **not explicitly found**.
     - The extracted date must be valid and formatted as "dd/mm/yyyy".
  
  3. **Output Constraints**:
     - Omit missing fields entirely (do not return empty strings or null values).
     - Ensure **strictly valid JSON** with no extra text, markdown, or explanations.
  
  ---
  
  ### Expected JSON Output Format
  
  {
    "InsuranceInformation": {
      "InspectionDate": ""
    }
  }
  
  ---
  
  ### Example JSON Output
  
  {
    "InsuranceInformation": {
      "InspectionDate": "15/12/2024"
    }
  }`,
  
  ownerlist: `
  ### Objective
  Extract structured information from an "Owner List" document presented as a table and return **strictly valid JSON** containing key details about each owner and their associated lot information.
  
  ---
  
  ### Detailed Requirements
  1. **Extract Owner Information** for each lot into an "OwnerInformation" object. Each object should include:
     - **PSNumber:** The plan of subdivision:
        - Capture any code that starts with "PS", "OC", "SP", "RP", "PR", followed by alphanumeric characters (e.g., PS841794R, SP723193E, OC849299J).
        - Prioritize "PS" if other codes are present.
     - **LotNumber:** The lot number.
     - **UnitNumber:** The unit number.
       **Important: DO NOT confuse UnitNumber with CRN.**
       - CRN (Council Reference Number) is usually printed on a **separate row** and consists of a **4-digit number**.
       - **Ignore any row that contains only a CRN (a 4-digit number)**.
       - Unit Number is typically listed in the **same row or directly adjacent** to the Lot Number.
       - **Do not** extract unit numbers from postal addresses or street addresses
     - **FullName:** The owner's full name.
     - **AccountEmail** and **OtherContactEmails1~3**:
       - Only extract email addresses explicitly listed under the **Owner**.
       - **Ignore** emails belonging to **General Correspondence** or **Levy Recipient**.
       - Assign the **first valid email** as 'AccountEmail'.
       - Remaining emails should go into 'OtherContactEmails1', 'OtherContactEmails2', and 'OtherContactEmails3', in order.
       - **Do not skip AccountEmail** or misplace all emails under the "other contact" fields.
       - **Do NOT extract** any email addresses that appear under or near the **"Levy Delivery Method"** section, even if the email format is valid.
          - This includes emails on the same line, the following line, or adjacent to the "Levy Delivery Method" field.
          - These emails typically do **not** belong to the owner and must be **ignored**.
     - **OwnerMobileNumber:** The owner's phone number.
       - Extract **all phone numbers** listed under the Owner, including **mobile, home, work, M, H, W, or general "Phone" numbers**.
       - Join multiple numbers using '&' with a space on both sides.
       - Example: "0412345678", "0398765432", and "0422333444" → "OwnerMobileNumber": "0412345678 & 0398765432 & 0422333444"
     - **OwnerPostalAddress**:
       - If multiple addresses are present for an owner, **only extract the address listed under **"General Correspondence"** or **"Notice Address"** **.
       - **Ignore other addresses** such as "Levy Recipient Address" or agency addresses.
       - The extracted address should contain:
         - "Level": The level number or unit number of the agency's office.
         - "Street": Must contain **only** the actual **street number and street name**, excluding unit or level numbers.
         - "City"
         - "State"
         - "PostalCode"
    - **Levy Delivery Method:**  
        - Only extract if the value is **explicitly stated** in the document as either **"Email"** or **"Print"**.  
        - **Do not infer, assume, guess, or default to any value.**  
        - If the value is not explicitly stated in the text (e.g. "Levy Delivery Method - Email"), then leave the field empty as "".
        - Do NOT infer from context, nearby lines, or repeated values.
        - Do NOT reuse similar values like "Meeting Delivery Method".

    - **Correspondence Method:**  
        - Only extract if the value is **clearly listed** in the document as either **"Email"** or **"Print"**.  
        - **Do not fabricate, assume, or provide a default value.**  
        - If not clearly mentioned as "Correspondence Method - Email" or "Correspondence Method - Print", leave the field as an empty string "".
        - Do NOT default to any value, and do NOT copy from other delivery methods.
  
  2. **Output Constraints:**
     - Do not assume or fabricate values for fields that are not explicitly provided.
     - Omit missing fields entirely (do not return empty strings or null values).
     - Ensure **strictly valid JSON** with no extra text, markdown, or explanations.
  
  ---
  
  ### Expected JSON Output Format
  
  {
    "Lots": [
      {
        "OwnerInformation": {
          "PSNumber": "",
          "LotNumber": "",
          "UnitNumber": "",
          "AccountEmail": "",
          "OtherContactEmails1": "",
          "OtherContactEmails2": "",
          "OtherContactEmails3": "",
          "FullName": "",
          "OwnerMobileNumber": "",
          "OwnerPostalAddress": {
            "Street": "",
            "Level": "",
            "City": "",
            "State": "",
            "PostalCode": ""
          },
          "Levy Delivery Method": "",
          "Correspondence Method": ""
        }
      },
      ...
    ]
  }
  `,
  ownerlist_chunk: ` 

### Input Format

Each owner record always consists of two rows in the markdown table:

1. The first row begins with a Lot number (e.g., '101') and includes the main information.
2. The second row begins with 'CRN' followed by a number (e.g., '1409') and includes extended contact details.
3. These two rows represent one and only one owner. You must never combine fields from different owner records.
4. Only process and merge the values from each owner’s two dedicated rows.

---

### Absolute Source Restrictions

To ensure correctness, follow these hard rules for extracting values. Violating these will result in invalid output.

1. PSNumber: Always use the PS number from the document heading (e.g., 'PS738178R').

2. LotNumber and UnitNumber: Extract directly from the first row's 'Lot' and 'Unit' columns. Never infer or guess values.

3. FullName: Extract from the first row's 'Owner' column only.  

4. Emails (AccountEmail & Others):  
   - Only extract emails from the 'Owner' column of both rows.  
   - Do not extract emails from 'General Correspondence' or 'Levy Recipient' columns.  
   - The first email found is assigned to 'AccountEmail'.  
   - Additional emails go into 'OtherContactEmails1', 'OtherContactEmails2', and 'OtherContactEmails3' in order.  
   - If no email is found in the 'Owner' column, all email-related fields must be left blank.  
   - Never fill with data from other owners or other columns.

5. OwnerMobileNumber:  
   - Extract only from the 'Phone' column across both rows.  
   - If multiple mobile numbers are present, concatenate them using ' & ' (e.g., '0416409655 & 0398900708').

6. OwnerPostalAddress:  
   - Only extract the address from the 'General Correspondence' column of the two rows.  
   - Never extract addresses from the 'Owner' or 'Levy Recipient' columns.  
   - Parse the address into:  
     - 'Street': full street address (including unit/lot if any)  
     - 'Level': if applicable (e.g., 'Level 2', 'G01')  
     - 'City', 'State', 'PostalCode' (4-digit or overseas full postcode)  
   - Do not include any emails from this column.

   ---

  ### Output Requirements
  - Do not fabricate or guess any values.  
  `
  };
  
  export const integrationPromptWithLots = `
  ### **Integration Instructions**
  You will receive multiple JSON fragments extracted from different document types. Your task is to merge these fragments into a single structured JSON object, ensuring proper **logical grouping** of data. Each field must only be populated from the correct document type as described below.
  
  ### **Critical Rule**
  You must output **only** the information present in the provided raw results.  
  - If any section (e.g., OCInformation, OwnerInformation) does **not** appear in the raw results, do **not** include it in the final JSON.
  - Ignore the example values if no corresponding raw data is provided.
  
  ---
  
  ## **Data Source Rules**
  1. **OCInformation**
     - **Only extracted from**: **planOfSubdivision**
     - Merge OCInformation fields only from this source.
     - Ignore any OCInformation data from other sources.
     - However, the field **"NumberOfLots" must be validated**:
       - Count the total number of distinct "LotInformation" entries extracted from "planOfSubdivision".
       - Find the **largest LotNumber** among them (e.g., "Lot 82" → number = 82).
       - If this number is greater than the provided "NumberOfLots" from the planOfSubdivision source, **override "NumberOfLots" with that highest lot number**.
       - This ensures the final "NumberOfLots" reflects the actual number of lots described.
  
  
  2. **InsuranceInformation** (Insurance Data)
     - **Only extracted from**: **insuranceInvoice, insuranceCoC, insuranceValuationReport**
     - Extract only the **first identified** 'TotalInsurableValue'.
     - Extract **only the first identified** 'InspectionDate'.
     - Merge InsuranceInformation fields only from these sources.
     - Ignore any InsuranceInformation data from other sources.
  
  3. **Lots (Lot-Specific Data)**
     - **The number of 'LotInformation' entries in the final output must match** "NumberOfLots" **from** "OCInformation" (planOfSubdivision).
     - **Construct the 'Lots' array with three distinct subcategories:**
       - **LotInformation** (Derived from "planOfSubdivision").
       - **OwnerInformation** (Derived from "letterOfAcquisition").
       - **AgentInformation** (Derived from "managingAuthorityForm").
  
     ### **Lot Information**
     - Extract all "LotNumber", "UnitNumber"and "Liability" entries from "planOfSubdivision".
     - Each lot must contain "LotInformation" with "LotNumber", "UnitNumber", and "Liability".
  
     ### **Owner Information Integration**
     - Extract all "OwnerInformation" records from "letterOfAcquisition".
     - Do **not** deduplicate 'OwnerInformation' based on 'LotNumber' or 'UnitNumber'—each record is stored separately.
  
     ### **Agent Information Integration**
     - Extract all "AgentInformation" records from "managingAuthorityForm".
     - Do **not** deduplicate 'AgentInformation' based on 'UnitNumber'—each record is stored separately.
     - If 'UnitNumber' is missing, **omit that AgentInformation record entirely**.
  
  ---
  
  ## **Key Normalization Rules**
  1. **LotNumber Standardization** 
     - If a LotNumber is explicitly found, ensure it follows the format **"Lot 1"**, **"Lot 2"**, etc. (3-digit padded).  
     - If a document shows "Lot 3" or "Lot 15", normalize to **"Lot 3"** or **"Lot 15"**, etc.  
     - If no LotNumber is provided or it cannot be matched, **do not generate one** from the UnitNumber; simply leave LotNumber out.
  
  2. **PS Number Standardization**  
     - 'PS Number' must follow the format: **"PS 73193 E"** (or as specified, e.g. "PS 812590 X").  
     - All lots under the same Building share the same 'PS Number' from planOfSubdivision.
  
  3. **Liability Standardization**
     - Ensure "Liability" follows the **"XX/TOTAL"** format, where:
       - **XX** represents the individual lot's liability.
       - **TOTAL** represents the **total liability** for the subdivision, which must be extracted from **planOfSubdivision**.
     - If a "Liability" value appears as a single number (e.g., "20"), assume it represents **XX** and append the **TOTAL liability** from planOfSubdivision (e.g., "20/TOTAL").
     - If multiple Liability values conflict for the same Lot, keep the most complete or most recently provided.
  
  4. **TotalInsurableValue Extraction**
     - Extract from **insuranceInvoice** or **insuranceCoC**.
     -  Use **only the first identified** 'TotalInsurableValue' and discard all subsequent occurrences.
  
  5. **InspectionDate Extraction**
     - Extract from **insuranceValuationReport**.
     - If multiple valid InspectionDate values exist, **only include the first valid one**.
  
  ---
  
  ## **Final JSON Output Format**
  {
    "OCInformation": {
      "BuildingNumber": "",
      "BodyCorporateName": "",
      "PSNumber": "",
      "Status": "",
      "Address": {
        "State": "",
        "Street": "",
        "City": "",
        "postCode": "",
      },
      "EndOfFinancialYear": "",
      "Branch": "",
      "NumberOfLots": ""
    },
    "InsuranceInformation": {
      "PolicyNumber": "",
      "InsuranceProvider": "",
      "PolicyType": "",
      "StartDate": "",
      "EndDate": "",
      "TotalPayable": "",
      "TotalInsurableValue": "",
      "Commission": "",
      "InspectionDate": ""
    },
    "Lots": [
      {
        "LotInformation": {
          "LotNumber": "",
          "UnitNumber": "",
          "Liability": ""
        }
      },
      {
        "OwnerInformation": {
          "LotNumber": "",
          "UnitNumber": "",
          "AccountEmail": "",
          "FullName": "",
          "ReferenceName": "",
          "OwnerMobileNumber": "",
          "OwnerHomeNumber": "",
          "OwnerBusinessNumber": "",
          "OtherContactEmails1": "",
          "OtherContactEmails2": "",
          "OtherContactEmails3": "",
          "ReceivePaperNotifications": "",
          "OwnerPostalAddress": {
            "Street": "",
            "Level": "",
            "City": "",
            "State": "",
            "PostalCode": ""
          },
          "Levy Delivery Method": "",
          "Correspondence Method": ""
        }
      },
      {
        "AgentInformation": {
          "UnitNumber": "",
          "AgentName": "",
          "AgentContactNumber": "",
          "AgentContactEmail": "",
          "AgencyName": "",
          "AgencyABN": "",
          "AgencyAddress": {
            "Street": "",
            "Level": "",
            "City": "",
            "State": "",
            "PostalCode": ""
          }
        }
      }
    ]
  }
  
  ---
  
  ### Example JSON Output
  {
    "OCInformation": {
      "BuildingNumber": "BUD0000001",
      "BodyCorporateName": "LILYDALE GROVE 10-16",
      "PSNumber": "PS 812590 X",
      "Status": "Active",
      "Address": {
        "State": "VIC",
        "Street": "10-16 Lilydale Grove",
        "City": "Hawthorn East",
        "postCode": "3123"
      },
      "EndOfFinancialYear": "30/06/2024",
      "Branch": "Melbourne",
      "NumberOfLots": "91"
    },
    "InsuranceInformation": {
      "PolicyNumber": "POL12345678",
      "InsuranceProvider": "XYZ Insurance",
      "PolicyType": "Strata Building Insurance",
      "StartDate": "01/01/2024",
      "EndDate": "01/01/2025",
      "TotalPayable": "50000.00",
      "TotalInsurableValue": "1000000.00",
      "Commission": "500.00",
      "InspectionDate": "15/12/2024"
    },
    "Lots": [
      {
        "LotInformation": {
          "LotNumber": "Lot 1",
          "UnitNumber": "101",
          "Liability": "10/100"
        }
      },
      {
        "LotInformation": {
          "LotNumber": "Lot 2",
          "UnitNumber": "102",
          "Liability": "20/100"
        }
      },
      {
        "OwnerInformation": {
          "LotNumber": "Lot 1",
          "UnitNumber": "101",
          "AccountEmail": "owner1@example.com",
          "FullName": "John Doe",
          "ReferenceName": "John D.",
          "OwnerMobileNumber": "123456789",
          "OwnerHomeNumber": "987654321",
          "OwnerBusinessNumber": "111222333",
          "OtherContactEmails1": "john.doe@example.com",
          "OtherContactEmails2": "",
          "OtherContactEmails3": "",
          "ReceivePaperNotifications": "Yes",
          "OwnerPostalAddress": {
            "Street": "123 Example Street",
            "Level": "5",
            "City": "Melbourne",
            "State": "VIC",
            "PostalCode": "3000"
          }
        }
      },
      {
        "OwnerInformation": {
          "LotNumber": "Lot 2",
          "UnitNumber": "102",
          "AccountEmail": "owner2@example.com",
          "FullName": "Jane Smith",
          "ReferenceName": "Jane S.",
          "OwnerMobileNumber": "987654321",
          "OwnerHomeNumber": "123456789",
          "OwnerBusinessNumber": "444555666",
          "OtherContactEmails1": "jane.smith@example.com",
          "OtherContactEmails2": "",
          "OtherContactEmails3": "",
          "ReceivePaperNotifications": "No",
          "OwnerPostalAddress": {
            "Street": "456 Example Road",
            "Level": "2",
            "City": "Sydney",
            "State": "NSW",
            "PostalCode": "2000"
          }
        }
      },
      {
        "AgentInformation": {
          "UnitNumber": "101",
          "AgentName": "Agent A",
          "AgentContactNumber": "999888777",
          "AgentContactEmail": "agentA@example.com",
          "AgencyName": "Real Estate Solutions",
          "AgencyABN": "12345678910",
          "AgencyAddress": {
            "Street": "789 Business St",
            "Level": "3",
            "City": "Melbourne",
            "State": "VIC",
            "PostalCode": "3000"
          }
        }
      },
      {
        "AgentInformation": {
          "UnitNumber": "102",
          "AgentName": "Agent B",
          "AgentContactNumber": "777888999",
          "AgentContactEmail": "agentB@example.com",
          "AgencyName": "Premium Realty",
          "AgencyABN": "98765432100",
          "AgencyAddress": {
            "Street": "555 Agency Road",
            "Level": "10",
            "City": "Sydney",
            "State": "NSW",
            "PostalCode": "2000"
          }
        }
      }
    ]
  }
  `;
  
  export const insuranceIntegrationPrompt = `
  ### **Integration Instructions (Insurance Only)**
  You will receive multiple JSON fragments extracted from different insurance-related document types. Your task is to merge these fragments into a single structured JSON object under the key "InsuranceInformation". Each field must only be populated from the correct document type as described below.
  
  ---
  
  ## **Data Source Rules**
  1. **InsuranceInformation** (Insurance Data)
     - **Only extracted from**: **insuranceInvoice, insuranceCoC, insuranceValuationReport**
     - Extract only the **first identified** 'TotalInsurableValue'.
     - Extract only the **first identified** 'InspectionDate'.
     - Merge all other InsuranceInformation fields only from these sources.
     - Ignore any data from other sources that may appear.
  
  ---
  
  ## **Key Normalization Rules**
  1. **TotalInsurableValue Extraction**
     - Extract from **insuranceInvoice** or **insuranceCoC**.
     - Use **only the first identified** 'TotalInsurableValue' and discard all subsequent occurrences.
  ---
  
  ## **Final JSON Output Format (Insurance Only)**
  {
    "InsuranceInformation": {
      "PolicyNumber": "",
      "InsuranceProvider": "",
      "PolicyType": "",
      "StartDate": "",
      "EndDate": "",
      "TotalPayable": "",
      "TotalInsurableValue": "",
      "Commission": ""
    }
  }
  
  Return ONLY this final merged JSON object, with no extra text.
  `;
  
  export const noaIntegrationPrompt = `
  ### **Integration Instructions (Letter Of Acquisition)**
  You will receive multiple JSON fragments extracted from different sections of a Letter Of Acquisition document. Your task is to merge these fragments into a single structured JSON object under the key "OwnerInformation" (or an array of "OwnerInformation" objects if multiple entries exist). Each field must only be populated from the raw fragments as extracted from the document.
  
  ---
  
  ## **Data Source Rules**
  1. **OwnerInformation** (Letter Of Acquisition Data)
     - **Only extracted from**: **letterOfAcquisition**
     - Extract the transferee's details (i.e. the new owner's information).
     - In cases where multiple owners exist for the same lot, concatenate names using "&", use the first valid email as "AccountEmail" and assign additional emails to "OtherContactEmails1/2/3".
     - Do not infer or guess values for missing fields.
  
  ---
  
  ## **Final JSON Output Format (Letter Of Acquisition Only)**
  {
    "OwnerInformation": {
      "LotNumber": "",
      "UnitNumber": "",
      "AccountEmail": "",
      "FullName": "",
      "ReferenceName": "",
      "OwnerMobileNumber": "",
      "OwnerHomeNumber": "",
      "OwnerBusinessNumber": "",
      "OtherContactEmails1": "",
      "OtherContactEmails2": "",
      "OtherContactEmails3": "",
      "OwnerPostalAddress": {
        "Street": "",
        "Level": "",
        "City": "",
        "State": "",
        "PostalCode": ""
      }
    }
  }
  
  Return ONLY this final merged JSON object, with no extra text.
  `;
  
  export const agentIntegrationPrompt = `
  ### **Integration Instructions (Managing Authority Form)**
  You will receive multiple JSON fragments extracted from different sections of a Managing Authority Form document. Your task is to merge these fragments into a single structured JSON object under the key "AgentInformation" (or an array of "AgentInformation" objects if multiple entries exist). Each field must only be populated from the raw fragments as extracted from the document.
  
  ---
  
  ## **Data Source Rules**
  1. **AgentInformation** (Managing Authority Data)
     - **Only extracted from**: **managingAuthorityForm**
     - Extract the managing agent and agency details including "UnitNumber", "AgentName", "AgentContactNumber", "AgentContactEmail", "AgencyName", "AgencyABN", and "AgencyAddress".
     - The "UnitNumber" should be extracted only from the target property address (ignore any numbers from client or other details).
     - Omit any field that is not present in the raw fragments.
  
  ---
  
  ## **Final JSON Output Format (Managing Authority Form Only)**
  {
    "AgentInformation": {
      "UnitNumber": "",
      "AgentName": "",
      "AgentContactNumber": "",
      "AgentContactEmail": "",
      "AgencyName": "",
      "AgencyABN": "",
      "AgencyAddress": {
        "Street": "",
        "Level": "",
        "City": "",
        "State": "",
        "PostalCode": ""
      }
    }
  }
  
  Return ONLY this final merged JSON object, with no extra text.
  `;
  
  
  export const invoicePrompt = `
  You are a professional invoice data extraction AI. Please extract the following fields from the invoice and return a strictly valid JSON object. Do not include any extra text.
  
  Important Notes:
  1. "creditor" must be the entity receiving payment (the payee or billing party), not the payer.
  
  2. "invoiceDate" is the issue date printed on the invoice (do not confuse it with due date or payment terms).
     - Format: Always return as "dd/mm/yyyy".
     - Example formats you may encounter and how to convert:
       - "2024-09-18" → "18/09/2024"
       - "18 Sep 2024" → "18/09/2024"
       - "20 Apr 2023" → "20/04/2023"
  
  3. "dueDate" is the invoice's due date.
     - Same formatting: "dd/mm/yyyy".
     - Example:
       - "2024/09/30" → "30/09/2024"
       - "30 Sept 2024" → "30/09/2024"
  
  4. "reference" refers to the bank transfer reference number.
     - If no clear bank transfer reference exists, or if the only candidate appears to be an address (e.g., street information), leave this field empty.
  
  5. "psNumber" refers to property identification numbers:
     - Capture any code that starts with "PS", "OC", "SP", "PR", followed by alphanumeric characters (e.g., PS841794R, SP723193E, OC849299J).
     - If both "PS" and "OC" numbers are present, prioritize "PS".
     - If only "OC" exists, use "OC" as psNumber.
  
  6. "address" must be extracted **exclusively** from the text immediately following the keywords "Bill To" or "Description", as these indicate the creditor's address.
     - Do not extract addresses from any other part of the invoice.
     - Only extract the primary address block; if the text contains delimiters like "c/o", "Attn", etc., include only the part before these markers.
  
  7. "bsb" should be exactly 6 digits, including leading zeros.
  
  8. If "gst" is not available or only contains non-meaningful symbols like "-", return it as an empty string.
  
  9. "description" refers to the purpose of the invoice, found in the "Description" section of the invoice.
     - Extract the main purpose or service description of the invoice, e.g., "Regular mowing and gardening 22/09/2024", or "Lawn mowing and gardening services".
     - Do **not** include unrelated information such as addresses, payment amounts, or totals.
     - Focus only on the service or product description.
     - If the description is not clearly defined, leave this field empty.
  
  Extract and return only the following fields:
  - invoiceNumber
  - creditor
  - amount
  - gst
  - invoiceDate
  - dueDate
  - reference
  - psNumber
  - address
  - accountName
  - bsb
  - accountNumber
  - paymentReference
  - bpayBillerCode
  - bpayReferenceNumber
  - description
  - abn
  `;
  
  
  export const insuranceQuotationPrompt = `
  You are a professional insurance quotation data extraction AI. Please extract from the document the insurance provider(s) and their corresponding premium amounts, and return a JSON object with a property "results" that is an array. Each item in the array should be an object containing the following keys:
  - insuranceProvider: the name of the insurer.
  - premium: the premium amount, or "declined" if no premium is provided.
  
  Notes:
  1. "insuranceProvider" refers to the insurer's name and should be extracted even if no premium amount is provided.
    - If the document shows both the broker and an “On behalf of the Insurers” line (e.g.  
     “Strata Unit Underwriting Agency Pty Ltd  
      On behalf of the Insurers: Insurance Australia Limited t/as CGU Insurance Limited”),  
     then **only** extract the first line (“Strata Unit Underwriting Agency Pty Ltd”) as the **insuranceProvider**.  
    - Do **not** include any text starting with “On behalf of the Insurers” or similar qualifiers.

  2. "premium" refers to the total premium amount. Look for text cues such as "Total Payable including all Fees and Charges", "Total Amount Payable by Insured", "Total Premium Payable", or similar descriptions. If no clear premium amount is present for an insurer, set its value to "declined".
    - **Do not** extract amounts from a “GST included in above premium” line.

  3. There may be multiple insurers in the document; for each insurer found, extract its corresponding premium amount (or "declined" if missing).
  4. Only extract values that are clearly related to the premium amounts.
  
  Return the result as a JSON object in the following format:
  {
    "results": [
      {
        "insuranceProvider": "Example Insurer",
        "premium": "100.00" // or "declined" if not provided
      },
      ...
    ]
  }
  `;