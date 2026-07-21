using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class PostCampaign
    {
        [JsonPropertyName("productInfo")]
        public ProductInfo? ProductInfo { get; set; }

        [JsonPropertyName("filtersInfo")]
        public List<FilterInfo>? FiltersInfo { get; set; }
    }

    public class ProductInfo
    {
        [JsonPropertyName("product_code")]
        public string? ProductCode { get; set; }

        [JsonPropertyName("product_name")]
        public string? ProductName { get; set; }

        [JsonPropertyName("product_start")]
        public string? ProductStart { get; set; }

        [JsonPropertyName("product_end")]
        public string? ProductEnd { get; set; }

        [JsonPropertyName("product_remark")]
        public string? ProductRemark { get; set; }

        [JsonPropertyName("product_guid")]
        public Guid ProductGuid { get; set; }

        [JsonPropertyName("createrd_by")]
        public string? CreatedBy { get; set; }

        [JsonPropertyName("product_company")]
        public string? ProductCompany { get; set; }

        [JsonPropertyName("offcde")]
        public string? Offcde { get; set; }
    }

    public class FilterInfo
    {
        [JsonPropertyName("fcode")]
        public string? FCode { get; set; }
    }

    public class ProductGet
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("product_code")]
        public string? ProductCode { get; set; }

        [JsonPropertyName("product_name")]
        public string? ProductName { get; set; }

        [JsonPropertyName("product_start")]
        public DateTime? ProductStart { get; set; }

        [JsonPropertyName("product_end")]
        public DateTime? ProductEnd { get; set; }

        [JsonPropertyName("product_remark")]
        public string? ProductRemark { get; set; }

        [JsonPropertyName("product_guid")]
        public Guid ProductGuid { get; set; }

        [JsonPropertyName("product_status")]
        public string? ProductStatus { get; set; }

        [JsonPropertyName("product_company")]
        public string? ProductCompany { get; set; }

        [JsonPropertyName("offcde")]
        public string? Offcde { get; set; }

        [JsonPropertyName("created")]
        public DateTime? Created { get; set; }

        [JsonPropertyName("createrd_by")]
        public string? CreatedBy { get; set; }

        [JsonPropertyName("updated")]
        public DateTime? Updated { get; set; }

        [JsonPropertyName("updated_by")]
        public string? UpdatedBy { get; set; }
    }

    public class Branch
    {
        [JsonPropertyName("offcde")]
        public string? Offcde { get; set; }

        [JsonPropertyName("branch_name")]
        public string? BranchName { get; set; }

        [JsonPropertyName("Hub")]
        public string? Hub { get; set; }

        [JsonPropertyName("Bname")]
        public string? Bname { get; set; }
    }

}
