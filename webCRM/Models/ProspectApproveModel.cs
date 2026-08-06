using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class GetProspectCustomerViewResponse
    {
        [JsonPropertyName("customer")]
        public List<ProspectCustomer>? Customer { get; set; }
        [JsonPropertyName("filterValues")]
        public List<FilterValues>? FilterValues { get; set; }
    }

    public class ProspectCustomer
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("prospect_batch")]
        public string? ProspectBatch { get; set; }

        [JsonPropertyName("idno")]
        public string? IdNo { get; set; }

        [JsonPropertyName("contno")]
        public string? ContNo { get; set; }

        [JsonPropertyName("assigner")]
        public string? Assigner { get; set; }

        [JsonPropertyName("assign_to")]
        public string? AssignTo { get; set; }

        [JsonPropertyName("assign_date")]
        public DateTime? AssignDate { get; set; }

        [JsonPropertyName("assign_expire")]
        public DateTime? AssignExpire { get; set; }

        [JsonPropertyName("assign_remark")]
        public string? AssignRemark { get; set; }

        [JsonPropertyName("assign_status")]
        public string? AssignStatus { get; set; }

        [JsonPropertyName("assign_case")]
        public string? AssignCase { get; set; }

        [JsonPropertyName("created")]
        public DateTime? Created { get; set; }

        [JsonPropertyName("created_by")]
        public string? CreatedBy { get; set; }

        [JsonPropertyName("updated")]
        public DateTime? Updated { get; set; }

        [JsonPropertyName("updated_by")]
        public string? UpdatedBy { get; set; }

        [JsonPropertyName("nameCus")]
        public string? NameCus { get; set; }

        [JsonPropertyName("provinceUsecar")]
        public string? ProvinceUsecar { get; set; }

        [JsonPropertyName("mobile")]
        public string? Mobile { get; set; }

        [JsonPropertyName("company")]
        public string? Company { get; set; }

        [JsonPropertyName("contractoffcde")]
        public string? ContractOffCde { get; set; }

        [JsonPropertyName("custype")]
        public string? CusType { get; set; }

        [JsonPropertyName("occupation")]
        public string? Occupation { get; set; }

        [JsonPropertyName("staffName")]
        public string? StaffName { get; set; }

        [JsonPropertyName("isCallTime")]
        public DateTime? IsCallTime { get; set; }

        [JsonPropertyName("isCallLock")]
        public bool? IsCallLock { get; set; }

        [JsonPropertyName("isCallLockTime")]
        public DateTime? IsCallLockTime { get; set; }

        [JsonPropertyName("isCallRemark")]
        public string? IsCallRemark { get; set; }

        [JsonPropertyName("isCallCase")]
        public string? IsCallCase { get; set; }

        [JsonPropertyName("isCallBy")]
        public string? IsCallBy { get; set; }

        [JsonPropertyName("isCallId")]
        public string? IsCallId { get; set; }
    }

    public class FilterValues
    {
        [JsonPropertyName("fname")]
        public string? FName { get; set; }
        [JsonPropertyName("fvalue")]
        public string? FValue { get; set; }
        [JsonPropertyName("fremark")]
        public string? FRemark { get; set; }
        [JsonPropertyName("fcompany")]
        public string? FCompany { get; set; }
    }
    
}
