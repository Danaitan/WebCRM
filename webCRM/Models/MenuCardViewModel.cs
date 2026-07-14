namespace webCRM.Models
{
    public class MenuCardViewModel
    {
        public string Url { get; set; } = "#";
        public string Number { get; set; } = "";
        public string Color { get; set; } = "blue"; // blue, purple, green, teal, orange
        public string Icon { get; set; } = ""; // e.g. bi-person
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
    }
}
