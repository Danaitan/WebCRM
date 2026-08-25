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
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? DateSugges { get; set; }

        [JsonPropertyName("timeSugges")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
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
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? UpDate { get; set; }

        [JsonPropertyName("createdDate")]
        [JsonConverter(typeof(FlexibleNullableDateTimeConverter))]
        public DateTime? CreatedDate { get; set; }

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

        [JsonPropertyName("ccMail")]
        public string? ccMail { get; set; }

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

    public class SendEmailRequest
    {
        [JsonPropertyName("from")]
        public string? From { get; set; }
        [JsonPropertyName("to")]
        public string? To { get; set; }
        [JsonPropertyName("cc")]
        public List<string>? Cc { get; set; }
        [JsonPropertyName("bcc")]
        public List<string>? Bcc { get; set; }
        [JsonPropertyName("subject")]
        public string? Subject { get; set; }
        [JsonPropertyName("content")]
        public string? Content { get; set; }
        [JsonPropertyName("contentType")]
        public string? ContentType { get; set; }
        [JsonPropertyName("attachments")]
        public List<string>? Attachments { get; set; }
    }

    public class PostNotiRequest
    {
        [JsonPropertyName("header")]
        public string? Header { get; set; }
        [JsonPropertyName("title")]
        public string? Title { get; set; }
        [JsonPropertyName("message")]
        public string? Message { get; set; }
        [JsonPropertyName("receiver")]
        public string? Receiver { get; set; }
        [JsonPropertyName("sender")]
        public string? Sender { get; set; }
        [JsonPropertyName("create_by")]
        public string? CreateBy { get; set; }
        [JsonPropertyName("end_date")]
        public DateTime? EndDate { get; set; }
        [JsonPropertyName("receiver_email")]
        public string? ReceiverEmail { get; set; }
    }


}
