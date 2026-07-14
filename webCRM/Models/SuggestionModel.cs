using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class RequestSuggestionsModel
    {
        [JsonPropertyName("guid")]
        public string? Guid { get; set; }

        [JsonPropertyName("reply")]
        public string? Reply { get; set; }

        [JsonPropertyName("updBy")]
        public string? UpdBy { get; set; }
    }

    public class ResponseSuggestion
    {
        [JsonPropertyName("suggestion_title")]
        public string? SuggestionTitle { get; set; }

        [JsonPropertyName("company")]
        public string? Company { get; set; }

        [JsonPropertyName("departCde")]
        public string? DepartCde { get; set; }

        [JsonPropertyName("department")]
        public string? Department { get; set; }

        [JsonPropertyName("sendTo")]
        public string? SendTo { get; set; }

        [JsonPropertyName("nameProvider")]
        public string? NameProvider { get; set; }

        [JsonPropertyName("phoneProvider")]
        public string? PhoneProvider { get; set; }

        [JsonPropertyName("addressProvider")]
        public string? AddressProvider { get; set; }

        [JsonPropertyName("chanelProvider")]
        public string? ChanelProvider { get; set; }

        [JsonPropertyName("emailProvider")]
        public string? EmailProvider { get; set; }

        [JsonPropertyName("lineProvider")]
        public string? LineProvider { get; set; }

        [JsonPropertyName("suggestion")]
        public string? Suggestion { get; set; }

        [JsonPropertyName("dateSugges")]
        public DateTime? DateSugges { get; set; }

        [JsonPropertyName("timeSugges")]
        public DateTime? TimeSugges { get; set; }

        [JsonPropertyName("idno")]
        public string? Idno { get; set; }

        [JsonPropertyName("guid")]
        public string? Guid { get; set; }

        [JsonPropertyName("statusTask")]
        public string? StatusTask { get; set; }

        [JsonPropertyName("reply")]
        public string? Reply { get; set; }

        [JsonPropertyName("updBy")]
        public string? UpdBy { get; set; }

        [JsonPropertyName("upDate")]
        public DateTime? UpDate { get; set; }

        [JsonPropertyName("personalName")]
        public string? PersonalName { get; set; }

        [JsonPropertyName("detail")]
        public List<RequestSuggestionDetailModel>? Detail { get; set; }
    }

    public class RequestSuggestionDetailModel
    {
        [JsonPropertyName("guid")]
        public string? Guid { get; set; }

        [JsonPropertyName("reply")]
        public string? Reply { get; set; }

        [JsonPropertyName("updBy")]
        public string? UpdBy { get; set; }

        [JsonPropertyName("updByName")]
        public string? UpdByName { get; set; }

        [JsonPropertyName("upDate")]
        public string? UpDate { get; set; }
    }

    public class RequestPostSuggestion
    {
        [JsonPropertyName("idno")]
        public string? Idno { get; set; }

        [JsonPropertyName("company")]
        public string? Company { get; set; }

        [JsonPropertyName("department")]
        public string? Department { get; set; }

        [JsonPropertyName("sendTo")]
        public string? SendTo { get; set; }

        [JsonPropertyName("suggesCde")]
        public string? SuggesCde { get; set; }

        [JsonPropertyName("nameProvider")]
        public string? NameProvider { get; set; }

        [JsonPropertyName("phoneProvider")]
        public string? PhoneProvider { get; set; }

        [JsonPropertyName("addressProvider")]
        public string? AddressProvider { get; set; }

        [JsonPropertyName("chanelProvider")]
        public string? ChanelProvider { get; set; }

        [JsonPropertyName("emailProvider")]
        public string? EmailProvider { get; set; }

        [JsonPropertyName("lineProvider")]
        public string? LineProvider { get; set; }

        [JsonPropertyName("suggestion")]
        public string? Suggestion { get; set; }

        [JsonPropertyName("cc")]
        public string? Cc { get; set; }

        [JsonPropertyName("dateSugges")]
        public DateOnly? DateSugges { get; set; }

        [JsonPropertyName("timeSugges")]
        public TimeOnly? TimeSugges { get; set; }

        [JsonPropertyName("updBy")]
        public string? UpdBy { get; set; }

        [JsonPropertyName("updDate")]
        public DateOnly? UpdDate { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("guid")]
        public string? Guid { get; set; }
    }

}
