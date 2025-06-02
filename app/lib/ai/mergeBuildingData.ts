import {
    PlanOfSubdivisionResult,
    LetterOfAcquisitionResult,
    ManagingAuthorityFormResult,
    InsuranceInvoiceResult,
    InsuranceCoCResult,
    InsuranceValuationReportResult,
    OwnerListResult,
  } from "@/app/lib/ai/schemas";
  
  export interface ParsedBundleArrays {
    planOfSubDivision?: PlanOfSubdivisionResult[];
    letterOfAcquisition?: LetterOfAcquisitionResult[];
    managingAuthorityForm?: ManagingAuthorityFormResult[];
    insuranceInvoice?: InsuranceInvoiceResult[];
    insuranceCoC?: InsuranceCoCResult[];
    insuranceValuationReport?: InsuranceValuationReportResult[];
    ownerlist?: OwnerListResult[];
  }
  
  export function mergeBuildingData({
    planOfSubDivision = [],
    letterOfAcquisition = [],
    managingAuthorityForm = [],
    insuranceInvoice = [],
    insuranceCoC = [],
    insuranceValuationReport = [],
    ownerlist = [],
  }: ParsedBundleArrays) {
    const merged: any = {};
  
    /* ---------- OCInformation ---------- */
    if (planOfSubDivision.length > 0) {
      const firstPOS = planOfSubDivision[0];
      const oc = firstPOS.OCInformation;
      merged.OCInformation = {
        PSNumber: oc.PSNumber ?? "",
        Address: {
          State: oc.Address?.State ?? "",
          Street: oc.Address?.Street ?? "",
          City: oc.Address?.City ?? "",
          postCode: oc.Address?.postCode ?? "",
        },
        NumberOfLots: oc.NumberOfLots ?? "",
        TotalLiability: oc.TotalLiability ?? "",
      };
    }
  
    /* ---------- InsuranceInformation ---------- */
    const hasIns =
      insuranceInvoice.length > 0 ||
      insuranceCoC.length > 0 ||
      insuranceValuationReport.length > 0;
    if (hasIns) {
      // 初始化
      merged.InsuranceInformation = {
        PolicyNumber: "",
        InsuranceProvider: "",
        PolicyType: "",
        StartDate: "",
        EndDate: "",
        TotalPayable: "",
        TotalInsurableValue: "",
        Commission: "",
        InspectionDate: "",
      };
  
      // 按顺序覆盖
      const allInvoiceInfos = insuranceInvoice.map((r) => r.InsuranceInformation);
      const allCoCInfos = insuranceCoC.map((r) => r.InsuranceInformation);
      const allValInfos = insuranceValuationReport.map(
        (r) => r.InsuranceInformation
      );
      [allInvoiceInfos, allCoCInfos, allValInfos].forEach((infoArr) => {
        infoArr.forEach((info) => {
          merged.InsuranceInformation = {
            ...merged.InsuranceInformation,
            ...info,
          };
        });
      });
    }
  
    /* ---------- Lots ---------- */
    const lots: any[] = [];
  
    // PlanOfSubdivision 的 LotInformation
    if (planOfSubDivision.length > 0) {
      planOfSubDivision.forEach((pos) => {
        pos.Lots?.forEach((l) => lots.push({ LotInformation: l.LotInformation }));
      });
    }
  
    // LetterOfAcquisition 的 OwnerInformation
    letterOfAcquisition.forEach((loa) => {
      loa.Lots?.forEach((l) =>
        lots.push({ OwnerInformation: l.OwnerInformation })
      );
    });
  
    // OwnerList 的 OwnerInformation
    ownerlist.forEach((ol) => {
      ol.Lots?.forEach((l) =>
        lots.push({ OwnerInformation: l.OwnerInformation })
      );
    });
  
    // ManagingAuthorityForm 的 AgentInformation
    managingAuthorityForm.forEach((maf) => {
      maf.Lots?.forEach((l) =>
        lots.push({ AgentInformation: l.AgentInformation })
      );
    });
  
    if (lots.length > 0) {
      merged.Lots = lots;
    }
  
    return merged;
  }
  