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
        [JsonPropertyName("id")]
        public string? Id { get; set; }

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

        [JsonPropertyName("createrd_by_name")]
        public string? CreaterdByName { get; set; }

        [JsonPropertyName("updated_by")]
        public string? UpdatedBy { get; set; }

        [JsonPropertyName("product_company")]
        public string? ProductCompany { get; set; }

        [JsonPropertyName("offcde")]
        public string? Offcde { get; set; }

        [JsonPropertyName("Objective_code")]
        public string? ObjectiveCode { get; set; }

        [JsonPropertyName("product_status")]
        public string? product_status { get; set; }

        [JsonPropertyName("file_id")]
        [JsonConverter(typeof(FlexibleStringConverter))]
        public string? file_id { get; set; }
    }

    public class FilterInfo
    {
        [JsonPropertyName("fguid")]
        public string? FGuid { get; set; }

        [JsonPropertyName("fcode")]
        public string? FCode { get; set; }

        [JsonPropertyName("fcompany")]
        public string? FCompany { get; set; }
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
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? ProductStart { get; set; }

        [JsonPropertyName("product_end")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
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

        [JsonPropertyName("Objective_code")]
        public string? ObjectiveCode { get; set; }

        [JsonPropertyName("created")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? Created { get; set; }

        [JsonPropertyName("createrd_by")]
        public string? CreatedBy { get; set; }

        [JsonPropertyName("createrd_by_name")]
        public string? CreaterdByName { get; set; }

        [JsonPropertyName("updated")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? Updated { get; set; }

        [JsonPropertyName("updated_by")]
        public string? UpdatedBy { get; set; }

        [JsonPropertyName("file_id")]
        [JsonConverter(typeof(FlexibleStringConverter))]
        public string? file_id { get; set; }

        [JsonPropertyName("IsImport")]
        public bool IsImport { get; set; }
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

    public class MasterFilter
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("fcode")]
        public string? FCode { get; set; }

        [JsonPropertyName("fname")]
        public string? FName { get; set; }

        [JsonPropertyName("fremark")]
        public string? FRemark { get; set; }

        [JsonPropertyName("ftype")]
        public string? FType { get; set; }

        [JsonPropertyName("fcompany")]
        public string? FCompany { get; set; }

        [JsonPropertyName("fstatus")]
        public string? FStatus { get; set; }

        [JsonPropertyName("fremark2")]
        public string? FRemark2 { get; set; }
    }

    public class PostFilter
    {
        [JsonPropertyName("fguid")]
        public string? fguid { get; set; }

        [JsonPropertyName("fcode")]
        public string? fcode { get; set; }

        [JsonPropertyName("fcompany")]
        public string? fcompany { get; set; }
    }

    public class GetFilterByGuid
    {
        [JsonPropertyName("fguid")]
        public string? fguid { get; set; }
        [JsonPropertyName("fcode")]
        public string? fcode { get; set; }
        [JsonPropertyName("fname")]
        public string? fname { get; set; }
        [JsonPropertyName("fremark")]
        public string? fremark { get; set; }
        [JsonPropertyName("fremark2")]
        public string? fremark2 { get; set; }
        [JsonPropertyName("ftype")]
        public string? ftype { get; set; }
        [JsonPropertyName("fcompany")]
        public string? fcompany { get; set; }
        [JsonPropertyName("subOptions")]
        public List<subOptions>? subOptions { get; set; }
    }

    public class subOptions
    {
        [JsonPropertyName("cde")]
        public string? cde { get; set; }
        [JsonPropertyName("name")]
        public string? name { get; set; }
        [JsonPropertyName("fname")]
        public string? fname { get; set; }
        [JsonPropertyName("company")]
        public string? company { get; set; }
    }

    public class CampainPagedResult
    {
        [JsonPropertyName("page")]
        public int Page { get; set; }

        [JsonPropertyName("pageSize")]
        public int PageSize { get; set; }

        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonPropertyName("data")]
        public List<ProductGet> Data { get; set; } = new List<ProductGet>();
    }

    public class PostFile
    {
        [JsonPropertyName("name")]
        public string? name { get; set; }

        [JsonPropertyName("path")]
        public string? path { get; set; }
        
        [JsonPropertyName("created_by")]
        public string? created_by { get; set; }
    }

    public class FlexibleStringConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetInt64(out long l))
                    return l.ToString();
                if (reader.TryGetDouble(out double d))
                    return d.ToString();
            }
            if (reader.TokenType == JsonTokenType.String)
            {
                return reader.GetString();
            }
            if (reader.TokenType == JsonTokenType.True) return "true";
            if (reader.TokenType == JsonTokenType.False) return "false";
            if (reader.TokenType == JsonTokenType.Null) return null;

            using var doc = JsonDocument.ParseValue(ref reader);
            return doc.RootElement.ToString();
        }

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value);
        }
    }

}

