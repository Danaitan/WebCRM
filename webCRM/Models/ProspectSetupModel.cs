using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class UpdateProspectCustomerRequest
    {
        public List<string>? idno { get; set; }
        public string? product_guid { get; set; }
        public string? assigner { get; set; }
        public string? assign_to { get; set; }
        public string? assign_date { get; set; }
        public string? assign_expire { get; set; }
        public string? assign_remark { get; set; }
        public string? assign_status { get; set; }
        public string? assign_case { get; set; }
        public string? updated_by { get; set; }
    }

    public class PostNewProspectBatchRequest
    {
        public List<string>? id { get; set; }
        public string? product_code { get; set; }
        public string? product_offcde { get; set; }
        public string? product_company { get; set; }
        public string? product_batch_remark { get; set; }
        public string? status { get; set; }
        public string? created_by { get; set; }

    }

    public class UpdateProductBatchStatusRequest
    {
        public string? product_code { get; set; }
        public string? status { get; set; }
        public string? updated_by { get; set; }
    }

}
