using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{
    using System.Text.Json.Serialization;

    public class NumberToStringConverter : JsonConverter<string?>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => reader.TokenType switch
            {
                JsonTokenType.String => reader.GetString(),
                JsonTokenType.Number => reader.GetDecimal().ToString(),
                JsonTokenType.True => "true",
                JsonTokenType.False => "false",
                JsonTokenType.Null => null,
                _ => reader.GetString()
            };

        public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }

    public class FlexibleNullableDateTimeConverter : JsonConverter<DateTime?>
    {
        private static readonly string[] Formats = new[]
        {
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd HH:mm:ss.fff",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-ddTHH:mm:ss.fff",
            "yyyy-MM-ddTHH:mm:ssZ",
            "yyyy-MM-ddTHH:mm:ss.fffZ",
            "yyyy-MM-dd",
            "dd/MM/yyyy HH:mm:ss",
            "dd/MM/yyyy HH:mm",
            "dd/MM/yyyy",
            "yyyy/MM/dd HH:mm:ss",
            "yyyy/MM/dd HH:mm",
            "yyyy/MM/dd",
            "MM/dd/yyyy HH:mm:ss",
            "MM/dd/yyyy"
        };

        public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
                return null;

            if (reader.TokenType == JsonTokenType.String)
            {
                string? dateStr = reader.GetString();
                if (string.IsNullOrWhiteSpace(dateStr))
                    return null;

                if (DateTime.TryParse(dateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                    return dt;

                if (DateTime.TryParseExact(dateStr, Formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out dt))
                    return dt;

                if (DateTime.TryParse(dateStr, out dt))
                    return dt;

                return null;
            }

            if (reader.TokenType == JsonTokenType.Number)
            {
                if (reader.TryGetInt64(out long unixTime))
                {
                    if (unixTime > 100000000000L)
                        return DateTimeOffset.FromUnixTimeMilliseconds(unixTime).DateTime;
                    else if (unixTime > 0)
                        return DateTimeOffset.FromUnixTimeSeconds(unixTime).DateTime;
                }
            }

            return null;
        }

        public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
        {
            if (value.HasValue)
                writer.WriteStringValue(value.Value.ToString("yyyy-MM-ddTHH:mm:ss"));
            else
                writer.WriteNullValue();
        }
    }

    public class FlexibleDateTimeConverter : JsonConverter<DateTime>
    {
        private static readonly FlexibleNullableDateTimeConverter NullableConverter = new();

        public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return NullableConverter.Read(ref reader, typeof(DateTime?), options) ?? default;
        }

        public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString("yyyy-MM-ddTHH:mm:ss"));
        }
    }

    public class MasterData
    {
        [JsonPropertyName("department")]
        public List<departmentData>? department { get; set; }

        [JsonPropertyName("email")]
        public List<emailData>? email { get; set; }

        [JsonPropertyName("company")]
        public List<companyData>? company { get; set; }
    }

    public class departmentData
    {
        [JsonPropertyName("rid")]
        public int? rid { get; set; }

        [JsonPropertyName("company")]
        public string? company { get; set; }

        [JsonPropertyName("sectionCde")]
        public string? sectionCde { get; set; }

        [JsonPropertyName("section")]
        public string? section { get; set; }

    }

    public class emailData
    {
        [JsonPropertyName("rid")]
        public int? rid { get; set; }

        [JsonPropertyName("company")]
        public string? company { get; set; }

        [JsonPropertyName("groupName")]
        public string? groupName { get; set; }

        [JsonPropertyName("groupAlias")]
        public string? groupAlias { get; set; }

        [JsonPropertyName("groupEmail")]
        public string? groupEmail { get; set; }

        [JsonPropertyName("sectionCde")]
        public string? sectionCde { get; set; }

    }

    public class companyData
    {
        [JsonPropertyName("code")]
        public string? code { get; set; }

        [JsonPropertyName("company")]
        public string? company { get; set; }

        [JsonPropertyName("companyTH")]
        public string? companyTH { get; set; }

        [JsonPropertyName("companyEN")]
        public string? companyEN { get; set; }

    }

}
