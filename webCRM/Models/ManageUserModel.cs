using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class PostCRMPersonalRoleRequest
    {
        [JsonPropertyName("role_id")]
        public string? role_id { get; set; }
        [JsonPropertyName("personnel_code")]
        public string? personnel_code { get; set; }
        [JsonPropertyName("create_by")]
        public string? create_by { get; set; }
        [JsonPropertyName("status")]
        public string? status { get; set; }
        [JsonPropertyName("IsActive")]
        public bool IsActive { get; set; }
        
    }

    public class PostPageRoleRequest
    {
        [JsonPropertyName("PageId")]
        public string? PageId { get; set; }
        [JsonPropertyName("RoleId")]
        public string? RoleId { get; set; }
        [JsonPropertyName("RoleName")]
        public string? RoleName { get; set; }
        [JsonPropertyName("CreatedBy")]
        public string? CreatedBy { get; set; }
        [JsonPropertyName("IsActive")]
        public bool IsActive { get; set; }
    }

    public class PostCRMRoleRequest
    {
        [JsonPropertyName("role_name")]
        public string? role_name { get; set; }
        [JsonPropertyName("create_by")]
        public string? create_by { get; set; }
    }

    public class DeleteCRMRoleRequest
    {
        [JsonPropertyName("role_id")]
        public string? role_id { get; set; }
        [JsonPropertyName("update_by")]
        public string? update_by { get; set; }
    }

    public class DeleteCRMPersonalRoleRequest
    {
        [JsonPropertyName("personnel_code")]
        public string? personnel_code { get; set; }
        [JsonPropertyName("role_id")]
        public string? role_id { get; set; }
        [JsonPropertyName("update_by")]
        public string? update_by { get; set; }
    }

    public class UpdateStatusPersonalRoleRequest
    {
        [JsonPropertyName("personnel_code")]
        public string? personnel_code { get; set; }
        [JsonPropertyName("role_id")]
        public string? role_id { get; set; }
        [JsonPropertyName("status")]
        public string? status { get; set; }
        [JsonPropertyName("user")]
        public string? user { get; set; }
    }

    public class UpdateCRMRoleRequest
    {
        [JsonPropertyName("role_id")]
        public string? role_id { get; set; }
        [JsonPropertyName("status")]
        public string? status { get; set; }
        [JsonPropertyName("user")]
        public string? user { get; set; }
    }

}



