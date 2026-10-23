using System.Text.Json.Serialization;

namespace webCRM.Models
{
    // Request body ที่ใช้เรียก callDashboard ผ่าน POST
    // ย้ายจาก query string มาเป็น body เพื่อรองรับค่าที่ยาว (เช่น branch หลายสาขา)
    public class CallDashboardRequest
    {
        [JsonPropertyName("startdate")]
        public string? Startdate { get; set; }

        [JsonPropertyName("enddate")]
        public string? Enddate { get; set; }

        [JsonPropertyName("call_type")]
        public string? CallType { get; set; }

        [JsonPropertyName("branch")]
        public string? Branch { get; set; }

        [JsonPropertyName("call_by")]
        public string? CallBy { get; set; }

        [JsonPropertyName("call_result")]
        public string? CallResult { get; set; }

        [JsonPropertyName("campaign_name")]
        public string? CampaignName { get; set; }

        [JsonPropertyName("is_creater")]
        public string? IsCreater { get; set; }
    }
}
