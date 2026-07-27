using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{
    using System.Text.Json.Serialization;

    public class ProfileData
    {
        [JsonPropertyName("personnel_id")]
        public string? personalId { get; set; }

        [JsonPropertyName("personnel_code")]
        public string? personalCode { get; set; }

        [JsonPropertyName("personnel_nickname")]
        public string? personalNickName { get; set; }

        [JsonPropertyName("personnel_name_TH")]
        public string? personalNameTh { get; set; }

        [JsonPropertyName("personnel_name_EN")]
        public string? personalNameEn { get; set; }

        [JsonPropertyName("personnel_last_TH")]
        public string? personalLastNameTh { get; set; }

        [JsonPropertyName("personnel_last_EN")]
        public string? personalLastNameEn { get; set; }

        [JsonPropertyName("startdate")]
        public string? startDate { get; set; }

        [JsonPropertyName("end_date")]
        public string? endDate { get; set; }

        [JsonPropertyName("personnel_status")]
        public string? personalStatus { get; set; }

        [JsonPropertyName("telephone")]
        public string? telephone { get; set; }

        [JsonPropertyName("e_mail")]
        public string? eMail { get; set; }

        [JsonPropertyName("off_phone")]
        public string? offPhone { get; set; }

        [JsonPropertyName("ad_account")]
        public string? adAccount { get; set; }

        [JsonPropertyName("loanoff")]
        public string? loanOff { get; set; }

        [JsonPropertyName("resigned")]
        public string? resigned { get; set; }

        [JsonPropertyName("resign_by")]
        public string? resignBy { get; set; }

        [JsonPropertyName("resign_date")]
        public string? resignDate { get; set; }

        [JsonPropertyName("Interface_FLAG")]
        public string? interfaceFlag { get; set; }

        [JsonPropertyName("Interface_dte")]
        public string? interfaceDte { get; set; }

        [JsonPropertyName("branch_no")]
        public string? branchNo { get; set; }

        [JsonPropertyName("branch_name_th")]
        public string? branchNameTh { get; set; }

        [JsonPropertyName("branch_name_en")]
        public string? branchNameEn { get; set; }

        [JsonPropertyName("position_code")]
        public string? PositionCode { get; set; }

        [JsonPropertyName("depart_code")]
        public string? DepartCode { get; set; }

        [JsonPropertyName("department_name_TH")]
        public string? DepartmentNameTH { get; set; }

        [JsonPropertyName("department_name_EN")]
        public string? DepartmentNameEN { get; set; }

        [JsonPropertyName("abbreviation")]
        public string? Abbreviation { get; set; }

        [JsonPropertyName("position_level_code")]
        public string? PositionLevelCode { get; set; }

        [JsonPropertyName("position_name_TH")]
        public string? PositionNameTH { get; set; }

        [JsonPropertyName("position_name_EN")]
        public string? PositionNameEN { get; set; }

        [JsonPropertyName("level_no")]
        public string? LevelNo { get; set; }

        [JsonPropertyName("level_name_TH")]
        public string? LevelNameTH { get; set; }

        [JsonPropertyName("level_name_EN")]
        public string? LevelNameEN { get; set; }

        [JsonPropertyName("map_nav_code")]
        public string? MapNavCode { get; set; }

        [JsonPropertyName("section_code")]
        public string? SectionCode { get; set; }

        [JsonPropertyName("branch_CA")]
        public string? BranchCA { get; set; }

        [JsonPropertyName("hub")]
        public string? Hub { get; set; }
    }

public class GetProfileByPersonalCodeResponse
{
    [JsonPropertyName("personnel_id")]
    public int? PersonnelId { get; set; }

    [JsonPropertyName("personnel_code")]
    public string? PersonnelCode { get; set; }

    [JsonPropertyName("personnel_nickname")]
    public string? PersonnelNickname { get; set; }

    [JsonPropertyName("thname")]
    public string? ThName { get; set; }

    [JsonPropertyName("enname")]
    public string? EnName { get; set; }

    [JsonPropertyName("personnel_name_TH")]
    public string? PersonnelNameTH { get; set; }

    [JsonPropertyName("personnel_name_EN")]
    public string? PersonnelNameEN { get; set; }

    [JsonPropertyName("personnel_last_TH")]
    public string? PersonnelLastTH { get; set; }

    [JsonPropertyName("personnel_last_EN")]
    public string? PersonnelLastEN { get; set; }

    [JsonPropertyName("startdate")]
    public string? StartDate { get; set; }

    [JsonPropertyName("personnel_status")]
    public int? PersonnelStatus { get; set; }

    [JsonPropertyName("telephone")]
    public string? Telephone { get; set; }

    [JsonPropertyName("e_mail")]
    public string? EMail { get; set; }

    [JsonPropertyName("off_phone")]
    public string? OffPhone { get; set; }

    [JsonPropertyName("ad_account")]
    public string? AdAccount { get; set; }

    [JsonPropertyName("position_level_code")]
    public string? PositionLevelCode { get; set; }

    [JsonPropertyName("position_code")]
    public string? PositionCode { get; set; }

    [JsonPropertyName("position")]
    public string? Position { get; set; }

    [JsonPropertyName("depart_code")]
    public string? DepartCode { get; set; }

    [JsonPropertyName("department")]
    public string? Department { get; set; }

    [JsonPropertyName("branch_no")]
    public string? BranchNo { get; set; }

    [JsonPropertyName("branch")]
    public string? Branch { get; set; }

    [JsonPropertyName("abbreviation")]
    public string? Abbreviation { get; set; }

    [JsonPropertyName("section_code")]
    public string? SectionCode { get; set; }

    [JsonPropertyName("branch_code")]
    public string? BranchCode { get; set; }

    [JsonPropertyName("section")]
    public string? Section { get; set; }

    [JsonPropertyName("area_no")]
    public string? AreaNo { get; set; }

    [JsonPropertyName("loanoff")]
    public string? LoanOff { get; set; }

    [JsonPropertyName("create_date")]
    public string? CreateDate { get; set; } 

    [JsonPropertyName("resigned")]
    public string? Resigned { get; set; } 

    [JsonPropertyName("resigned_th")]
    public string? ResignedTh { get; set; }
}

    public class LoginResponse
    {
        public int status { get; set; }
        public string? token { get; set; }
        public List<ProfileData>? data { get; set; }
    }

    /// <summary>
    /// Converts any JSON token (Number, Boolean, String, Null) to a nullable string.
    /// Needed because some API fields arrive as bare numbers instead of quoted strings.
    /// </summary>
    public class NumberToStringConverter : JsonConverter<string?>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => reader.TokenType switch
            {
                JsonTokenType.String => reader.GetString(),
                JsonTokenType.Number => reader.GetDecimal().ToString(),
                JsonTokenType.True   => "true",
                JsonTokenType.False  => "false",
                JsonTokenType.Null   => null,
                _ => reader.GetString()
            };

        public override void Write(Utf8JsonWriter writer, string? value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}
