using System.Text.Json.Serialization;

namespace webCRM.Models
{
    public class CustomerDetailApiResponse
    {
        public List<ResponseCustomerDetail>? Customer { get; set; }
    }

    public class ResponseCustomerDetail
    {
        [JsonPropertyName("idno")]
        public string? Idno { get; set; }

        [JsonPropertyName("contno")]
        public string? Contno { get; set; }

        [JsonPropertyName("companyCde")]
        public string? CompanyCde { get; set; }

        [JsonPropertyName("nameCus")]
        public string? NameCus { get; set; }

        [JsonPropertyName("custyp")]
        public string? Custyp { get; set; }

        [JsonPropertyName("gender")]
        public string? Gender { get; set; }

        [JsonPropertyName("birdte")]
        public string? Birdte { get; set; }

        [JsonPropertyName("mobile")]
        public string? Mobile { get; set; }

        [JsonPropertyName("phone1")]
        public string? Phone1 { get; set; }

        [JsonPropertyName("phone2")]
        public string? Phone2 { get; set; }

        [JsonPropertyName("occupation")]
        public string? Occupation { get; set; }

        [JsonPropertyName("mail")]
        public string? Mail { get; set; }

        [JsonPropertyName("marcde")]
        public string? Marcde { get; set; }

        [JsonPropertyName("address01")]
        public string? Address01 { get; set; }

        [JsonPropertyName("address02")]
        public string? Address02 { get; set; }

        [JsonPropertyName("address03")]
        public string? Address03 { get; set; }

        [JsonPropertyName("BLWL")]
        public string? BLWL { get; set; }

        [JsonPropertyName("suggestion")]
        public string? Suggestion { get; set; }

        [JsonPropertyName("countMicro")]
        public string? CountMicro { get; set; }

        [JsonPropertyName("countMfin")]
        public string? CountMfin { get; set; }

        [JsonPropertyName("countMib")]
        public string? CountMib { get; set; }

        [JsonPropertyName("cusImage")]
        public string? CusImage { get; set; }

        [JsonPropertyName("pdpaCheck")]
        public string? PdpaCheck { get; set; }

        [JsonPropertyName("licno")]
        public string? Licno { get; set; }

        [JsonPropertyName("dateCheckNCB")]
        public string? DateCheckNCB { get; set; }
    }

    public class ResponseContactList
    {
        public long contactMicroCount { get; set; }
        public long contactMFINCount { get; set; }
        public long contactMIBCount { get; set; }
        public List<ResponseContact>? contactMicro { get; set; }
        public List<ResponseContact>? contactMFIN { get; set; }
        public List<ResponseContact>? contactMIB { get; set; }
    }

    public class ResponseContact
    {
        [JsonPropertyName("contno")]
        public string? ContractNo { get; set; }

        [JsonPropertyName("company")]
        public string? CompanyCode { get; set; }

        [JsonPropertyName("applno")]
        public string? ApplicationNo { get; set; }

        [JsonPropertyName("idno")]
        public string? IdNo { get; set; }

        [JsonPropertyName("conttype")]
        public string? ContractType { get; set; }

        [JsonPropertyName("loantype")]
        public string? LoanType { get; set; }

        [JsonPropertyName("contsts")]
        public string? ContractStatus { get; set; }

        [JsonPropertyName("trackingMIB")]
        public string? TrackingMIB { get; set; }

        [JsonPropertyName("Tracking_Ins")]
        public string? TrackingIns { get; set; }
    }

    public class RequestCustomerDetail
    {
        public string? Idno { get; set; }
    }

    public class CustomerDetailViewModel
    {
        public List<ResponseCustomerDetail>? Customers { get; set; }
    }

    public class ResponseContactInfo<TContractInfo>
        where TContractInfo : ContractInfo
    {
        [JsonPropertyName("contractInfo")]
        public List<TContractInfo>? ContractInfo { get; set; }

        [JsonPropertyName("guarantorsInfo")]
        public List<GuarantorsInfo>? GuarantorsInfo { get; set; }

        [JsonPropertyName("receivceInfo")]
        public List<ReciebeInfo>? ReceivceInfo { get; set; }
    }

    public abstract class ContractInfo
    {
    }

    public class ContractInfoMicro : ContractInfo
    {
        [JsonPropertyName("contno")]
        public string? Contno { get; set; }

        [JsonPropertyName("companyCde")]
        public string? CompanyCde { get; set; }

        [JsonPropertyName("custyp")]
        public string? Custyp { get; set; }

        [JsonPropertyName("contnoOld")]
        public int? ContnoOld { get; set; }

        [JsonPropertyName("applno")]
        public string? Applno { get; set; }

        [JsonPropertyName("conttype")]
        public string? Conttype { get; set; }

        [JsonPropertyName("loantype")]
        public string? Loantype { get; set; }

        [JsonPropertyName("chanel")]
        public string? Chanel { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("year")]
        public int? Year { get; set; }

        [JsonPropertyName("brand")]
        public string? Brand { get; set; }

        [JsonPropertyName("plateNo")]
        public string? PlateNo { get; set; }

        [JsonPropertyName("province")]
        public string? Province { get; set; }

        [JsonPropertyName("finamt")]
        public string? Finamt { get; set; }

        [JsonPropertyName("outsbal")]
        public string? Outsbal { get; set; }

        [JsonPropertyName("instamt")]
        public string? Instamt { get; set; }

        [JsonPropertyName("term")]
        public int? Term { get; set; }

        [JsonPropertyName("termpaid")]
        public int? Termpaid { get; set; }

        [JsonPropertyName("totalOvd")]
        public int? TotalOvd { get; set; }

        [JsonPropertyName("rateFlat")]
        public string? RateFlat { get; set; }

        [JsonPropertyName("aging")]
        public int? Aging { get; set; }

        [JsonPropertyName("contsts")]
        public string? Contsts { get; set; }

        [JsonPropertyName("aprvdte")]
        public string? Aprvdte { get; set; }

        [JsonPropertyName("firstdte")]
        public string? Firstdte { get; set; }

        [JsonPropertyName("enddte")]
        public string? Enddte { get; set; }

        [JsonPropertyName("settledte")]
        public string? Settledte { get; set; }

        [JsonPropertyName("branch")]
        public string? Branch { get; set; }

        [JsonPropertyName("colcde")]
        public string? Colcde { get; set; }

        [JsonPropertyName("conobj")]
        public string? Conobj { get; set; }

        [JsonPropertyName("insurancedte")]
        public string? Insurancedte { get; set; }

        [JsonPropertyName("taxdte")]
        public string? Taxdte { get; set; }

        [JsonPropertyName("estimatePrice")]
        public decimal? EstimatePrice { get; set; }

        [JsonPropertyName("ltv")]
        public decimal? Ltv { get; set; }

        [JsonPropertyName("DPD")]
        public int? DPD { get; set; }

        [JsonPropertyName("aprvsts")]
        public string? Aprvsts { get; set; }

        [JsonPropertyName("dateCheckNCB")]
        public string? DateCheckNCB { get; set; }
    }

    public class ContractInfoMIB : ContractInfo
    {
        [JsonPropertyName("Cust_Name")]
        public string? CustName { get; set; }

        [JsonPropertyName("Tracking_Ins")]
        public string? TrackingIns { get; set; }

        [JsonPropertyName("policyNo")]
        public string? PolicyNo { get; set; }

        [JsonPropertyName("product")]
        public string? Product { get; set; }

        [JsonPropertyName("commDesc")]
        public string? CommDesc { get; set; }

        [JsonPropertyName("insComp")]
        public string? InsComp { get; set; }

        [JsonPropertyName("coverAmount")]
        public string? CoverAmount { get; set; }

        [JsonPropertyName("premiumAmount")]
        public string? PremiumAmount { get; set; }

        [JsonPropertyName("terminstall")]
        public int? TermInstall { get; set; }

        [JsonPropertyName("startDate")]
        public string? StartDate { get; set; }

        [JsonPropertyName("endDate")]
        public string? EndDate { get; set; }

        [JsonPropertyName("statusInstall")]
        public string? StatusInstall { get; set; }

        [JsonPropertyName("payDesc")]
        public string? PayDesc { get; set; }

        [JsonPropertyName("cancel")]
        public string? Cancel { get; set; }

        [JsonPropertyName("claimCount")]
        public string? ClaimCount { get; set; }

        [JsonPropertyName("chanel")]
        public string? Chanel { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("year")]
        public string? Year { get; set; }

        [JsonPropertyName("brand")]
        public string? Brand { get; set; }

        [JsonPropertyName("Register")]
        public string? Register { get; set; }
    }

    public class ContractInfoMFIN : ContractInfo
    {
        [JsonPropertyName("contno")]
        public string? Contno { get; set; }

        [JsonPropertyName("companyCde")]
        public string? CompanyCde { get; set; }

        [JsonPropertyName("custyp")]
        public string? Custyp { get; set; }

        [JsonPropertyName("contnoOld")]
        public string? ContnoOld { get; set; }

        [JsonPropertyName("applno")]
        public string? Applno { get; set; }

        [JsonPropertyName("conttype")]
        public string? Conttype { get; set; }

        [JsonPropertyName("loantype")]
        public string? Loantype { get; set; }

        [JsonPropertyName("chanel")]
        public string? Chanel { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }

        [JsonPropertyName("year")]
        public int? Year { get; set; }

        [JsonPropertyName("brand")]
        public string? Brand { get; set; }

        [JsonPropertyName("plateNo")]
        public string? PlateNo { get; set; }

        [JsonPropertyName("province")]
        public string? Province { get; set; }

        [JsonPropertyName("finamt")]
        public string? Finamt { get; set; }

        [JsonPropertyName("estimatePrice")]
        public string? EstimatePrice { get; set; }

        [JsonPropertyName("ltv")]
        public string? Ltv { get; set; }

        [JsonPropertyName("outsbal")]
        public string? Outsbal { get; set; }

        [JsonPropertyName("instamt")]
        public string? Instamt { get; set; }

        [JsonPropertyName("term")]
        public int? Term { get; set; }

        [JsonPropertyName("termpaid")]
        public int? Termpaid { get; set; }

        [JsonPropertyName("totalOvd")]
        public int? TotalOvd { get; set; }

        [JsonPropertyName("DPD")]
        public int? DPD { get; set; }

        [JsonPropertyName("rateFlat")]
        public string? RateFlat { get; set; }

        [JsonPropertyName("aging")]
        public int? Aging { get; set; }

        [JsonPropertyName("contsts")]
        public string? Contsts { get; set; }

        [JsonPropertyName("aprvdte")]
        public string? Aprvdte { get; set; }

        [JsonPropertyName("firstdte")]
        public string? Firstdte { get; set; }

        [JsonPropertyName("enddte")]
        public string? Enddte { get; set; }

        [JsonPropertyName("branch")]
        public string? Branch { get; set; }

        [JsonPropertyName("colcde")]
        public string? Colcde { get; set; }

        [JsonPropertyName("IdentityCardId")]
        public string? IdentityCardId { get; set; }

        [JsonPropertyName("insurancedte")]
        public string? Insurancedte { get; set; }

        [JsonPropertyName("taxdte")]
        public string? Taxdte { get; set; }
    }

    public class GuarantorsInfo
    {
        [JsonPropertyName("contno")]
        public string? Contno { get; set; }

        [JsonPropertyName("idno")]
        public string? Idno { get; set; }

        [JsonPropertyName("nameCus")]
        public string? NameCus { get; set; }

        [JsonPropertyName("custno")]
        public string? Custno { get; set; }

        [JsonPropertyName("idno_gty")]
        public string? IdnoGty { get; set; }

        [JsonPropertyName("name_gty")]
        public string? NameGty { get; set; }

        [JsonPropertyName("phone")]
        public string? Phone { get; set; }

        [JsonPropertyName("guarantorAddress")]
        public List<GuarantorAddress>? GuarantorAddress { get; set; }
    }

    public class GuarantorAddress
    {
        [JsonPropertyName("idno_gty")]
        public string? IdnoGty { get; set; }

        [JsonPropertyName("adrtyp")]
        public string? Adrtyp { get; set; }

        [JsonPropertyName("name_gty")]
        public string? NameGty { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }
    }

    public class ReciebeInfo
    {
        [JsonPropertyName("contno")]
        public string? Contno { get; set; }

        [JsonPropertyName("idno")]
        public string? Idno { get; set; }

        [JsonPropertyName("rcpdte")]
        public string? Rcpdte { get; set; }

        [JsonPropertyName("amount")]
        public string? Amount { get; set; }

        [JsonPropertyName("rawPaymer")]
        public string? RawPaymer { get; set; }

        [JsonPropertyName("recType")]
        public string? RecType { get; set; }

        [JsonPropertyName("recTel")]
        public string? RecTel { get; set; }
    }

    public class ReceiveResponse
    {
        [JsonPropertyName("contno")]
        public string? Contno { get; set; }

        [JsonPropertyName("IdentityCardId")]
        public string? IdentityCardId { get; set; }

        [JsonPropertyName("rcpdte")]
        public string? Rcpdte { get; set; }

        [JsonPropertyName("amount")]
        public string? Amount { get; set; }

        [JsonPropertyName("rawPaymer")]
        public string? RawPaymer { get; set; }

        [JsonPropertyName("recType")]
        public string? RecType { get; set; }

        [JsonPropertyName("recTel")]
        public string? RecTel { get; set; }
    }

    public class ResponseClaim
        {
            [JsonPropertyName("Policy_No")]
            public string? PolicyNo { get; set; }

            [JsonPropertyName("Claim_Date")]
            public string? ClaimDate { get; set; }

            [JsonPropertyName("Claim_No")]
            public string? ClaimNo { get; set; }

            [JsonPropertyName("idno")]
            public string? IdNo { get; set; }

            [JsonPropertyName("Cust_Name")]
            public string? CustName { get; set; }

            [JsonPropertyName("companyInsur")]
            public string? CompanyInsur { get; set; }

            [JsonPropertyName("Register")]
            public string? Register { get; set; }

            [JsonPropertyName("Claim_Status")]
            public string? ClaimStatus { get; set; }

            [JsonPropertyName("appNoMicro")]
            public string? AppNoMicro { get; set; }

            [JsonPropertyName("Venue")]
            public string? Venue { get; set; }

            [JsonPropertyName("Cause")]
            public string? Cause { get; set; }

            [JsonPropertyName("Claim_Desc")]
            public string? ClaimDesc { get; set; }

            [JsonPropertyName("Remark")]
            public string? Remark { get; set; }

            [JsonPropertyName("Claim_Total")]
            public string? ClaimTotal { get; set; }

            [JsonPropertyName("Contact_Name")]
            public string? ContactName { get; set; }

            [JsonPropertyName("Contact_Tel")]
            public string? ContactTel { get; set; }

            [JsonPropertyName("Tracking_Ins")]
            public string? TrackingIns { get; set; }
        }

}
