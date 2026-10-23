using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class UpdateNotificationRequest
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("is_active")]
        public bool? is_active { get; set; }

        [JsonPropertyName("is_read")]
        public bool? is_read { get; set; }
    }

    public class DeleteNotificationRequest
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("isReaded")]
        public bool? IsReaded { get; set; }

        [JsonPropertyName("receiver")]
        public long receiver { get; set; }
    }

}


