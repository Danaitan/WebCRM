using System.Text.Json;
using System.Text.Json.Serialization;

namespace webCRM.Models
{

    public class UpdateProspectCustomerRequest
    {
        public List<string>? id { get; set; }
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
        public string? product_remark { get; set; }
    }

    public class GetProspectRequest
    {
        //เพศ
      public string? gender { get; set; }
      //จำนวนงวด
      public string? term { get; set; }
      //ช่วงปัรถ
      public string? caryear { get; set; }
      //ประเภทบุคคล
      public string? custype { get; set; }
      //จำนวนงวดชำระ
      public string? termpaid { get; set; }
      //จำนวนงวดค้างจ่าย
      public string? total_ovd { get; set; }
      //อาชีพผู้เช่าซื้อ
      public string? occupation { get; set; }
      //ประเภทรถ
      public string? carStype { get; set; }
      //จังหวัดที่อยู่สถานที่ใช้รถ
      public string? provinceUsecar { get; set; }
      //อายุ
      public string? age { get; set; }
      //สาขาที่เปิดสัญญา
      public string? branchName { get; set; }
      //ภูมิภาคที่อยู่ปัจจุบัน
      public string? current_region { get; set; }
      //จำนวนงวดที่ค้างชำระ
      public string? ovd { get; set; }
      //ภูมิภาคที่อยู่สถานที่ใช้รถ
      public string? vehicle_use_region { get; set; }
      //สถานะสัญญา
      public string? consts { get; set; }
      //อำเภอที่อยู่สถานที่ใช้รถ
      public string? districtUsecar { get; set; }
      //ประสบการณ์ทำงาน
      public string? totwrky { get; set; }
      //ประเภทธุรกิจ
      public string? businessType { get; set; }       
      //ภูมิภาคที่อยู่ตามทะเบียนบ้าน
      public string? registered_region { get; set; }  
      //ที่อยู่จัดส่งเอกสาร
      public string? docDelivery_regoin { get; set; } 
      //การทำประกัน
      public string? ownins { get; set; }             
      //ประกันขาดต่ออายุ
      public string? policyDateExpire { get; set; }
      //ประกันหมดอายุ
      public string? expireIns { get; set; }
      //ลักษณะรถ
      public string? category { get; set; }
      //ยี่ห้อ
      public string? brand { get; set; }

    }
}
