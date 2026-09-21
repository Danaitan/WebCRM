let currentBatchPage = 1;
let currentBatchPageSize = 5;
let currentSortCreateDate = "";

let currentProspectPage = 1;
let currentProspectPageSize = 10;

let currentSelectedPage = 1;
let currentSelectedPageSize = 10;

let currentFilterRequestId = 0;
let selectedCampaign = null;
let currentProductBatches = [];
let currentBatchCustomers = [];
let removedBatchCustomerIds = new Set();
let manuallySelectedCustomers = new Map();
let isCurrentCampaignImport = false;

let filterAbortController = null;

async function getProductStatus() { 
    try {
        const response = await fetch('/Campain/getProductStatus');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data || []; 
    } catch (error) {
        console.error('Error getting product status:', error);
        return [];
    }
}

async function loadProductStatus() { 
    const select = document.getElementById('campaignStatusFilter'); 
    const statuses = await getProductStatus(); 
    select.innerHTML = '<option value="">ทั้งหมด</option>'; 
    statuses.forEach(status => { 
        const option = document.createElement('option'); 
        option.value = status.name;
        option.textContent = status.name; 
        select.appendChild(option); 
    }); 
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const $campaignSearchInput = $("#campaignSearchInput");

$campaignSearchInput.off("keyup").on("keyup", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        SearchCampaign();
    }
});

$campaignSearchInput.off("input").on("input", function () {
    if ($(this).val().trim() === "") {
        SearchCampaign();
    }
});

$(".panel-left .search-box i").off("click").on("click", function () {
    SearchCampaign();
});

$("#sortCampaignBtn").off("click").on("click", function () {
    toggleSortCampaign();
});

function updateSortCampaignIcon() {
    const $icon = $("#sortCampaignBtn");
    if (!$icon.length) return;

    $icon.removeClass("bi-arrow-down-up bi-sort-up bi-sort-down text-secondary text-primary");

    if (currentSortCreateDate === "asc") {
        $icon.addClass("bi-sort-up text-primary").attr("title", "เรียงตามวันที่สร้าง: เก่าสุด -> ใหม่สุด (ASC)");
    } else if (currentSortCreateDate === "desc") {
        $icon.addClass("bi-sort-down text-primary").attr("title", "เรียงตามวันที่สร้าง: ใหม่สุด -> เก่าสุด (DESC)");
    } else {
        $icon.addClass("bi-arrow-down-up text-secondary").attr("title", "เรียงตามค่าเริ่มต้น");
    }
}

async function toggleSortCampaign() {
    if (currentSortCreateDate === "") {
        currentSortCreateDate = "asc";
    } else if (currentSortCreateDate === "asc") {
        currentSortCreateDate = "desc";
    } else {
        currentSortCreateDate = "";
    }

    updateSortCampaignIcon();
    await loadBatchList(1, currentBatchPageSize);
}

const $prospectSearchInput = $("#prospectSearchInput");

// ค้นหาชื่อลูกค้าแบบ client-side: กรองจากตารางที่โหลดไว้แล้ว
// ไม่ fetch ข้อมูลใหม่ และไม่ต้องกดปุ่มค้นหา/กด Enter
$prospectSearchInput.off("keyup input").on("input", function () {
    filterProspectRows($(this).val());
});

// ป้องกันการ submit/รีเฟรชเมื่อกด Enter ในช่องค้นหา
$prospectSearchInput.off("keydown").on("keydown", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
    }
});

// ปุ่ม/ไอคอนค้นหา ก็ใช้การกรอง client-side เช่นกัน
$("#prospectSearchIcon, #btnSearchProspect").off("click").on("click", function () {
    filterProspectRows($("#prospectSearchInput").val());
});

// ช่องกรอกแบบช่วงตัวเลข (เช่น 40 หรือ 40-60): อนุญาตเฉพาะตัวเลขและ "-" เดียว
$(document).off("input", ".range-number-input").on("input", ".range-number-input", function () {
    let v = $(this).val();
    // เก็บเฉพาะตัวเลขและเครื่องหมาย -
    v = v.replace(/[^\d-]/g, "");
    // อนุญาตให้มี - ได้เพียงตัวเดียว และห้ามขึ้นต้นด้วย -
    v = v.replace(/^-+/, "");
    const firstDash = v.indexOf("-");
    if (firstDash !== -1) {
        v = v.slice(0, firstDash + 1) + v.slice(firstDash + 1).replace(/-/g, "");
    }
    $(this).val(v);
});

// กรองแถวในตารางลูกค้าเป้าหมายจากชื่อ (client-side)
function filterProspectRows(searchText) {
    const term = (searchText || "").trim().toLowerCase();
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    let visibleCount = 0;

    rows.forEach(row => {
        // ข้ามแถวข้อความว่าง (colspan)
        if (row.querySelector('td[colspan]')) return;

        const nameCell = row.querySelector('td:nth-child(2)');
        const name = nameCell ? nameCell.textContent.trim().toLowerCase() : '';

        const isMatch = term === '' || name.includes(term);
        row.style.display = isMatch ? '' : 'none';
        if (isMatch) visibleCount++;
    });

    const totalFoundEl = document.getElementById('totalFound');
    if (totalFoundEl) totalFoundEl.textContent = visibleCount;
}

async function SearchCampaign() {
    page = 1;
    const searchText = $("#campaignSearchInput").val() ? $("#campaignSearchInput").val().trim() : "";
    if (typeof campaignTable !== "undefined" && campaignTable) {
        campaignTable.page(0).draw(false);
    } else {
        await loadBatchList(1, currentBatchPageSize, searchText);
    }
}   

async function getCampainList(
    page = 1,
    pageSize = 20,
    searchText,
    sortCreateDate = currentSortCreateDate,
    statusText
) {
    try {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');

        let queryStr = (page !== undefined && pageSize !== undefined)
            ? `?page=${page}&pageSize=${pageSize}`
            : '';

        if (searchText !== undefined && searchText !== null && searchText !== '') {
            queryStr += `&search=${encodeURIComponent(searchText)}`;
        }

        if (sortCreateDate !== undefined &&
            sortCreateDate !== null &&
            sortCreateDate !== '') {

            queryStr += `&sortCreateDate=${encodeURIComponent(sortCreateDate)}`;
        }

        if (statusText !== undefined &&
            statusText !== null &&
            statusText !== '') {

            queryStr += `&status=${encodeURIComponent(statusText)}`;
        }

        const response = await fetch(
            `/Campain/GetCampainList${queryStr}`
        );

        const jsonResult = await response.json();

        const items =
            jsonResult && Array.isArray(jsonResult.data)
                ? jsonResult.data
                : (Array.isArray(jsonResult) ? jsonResult : []);

        const mapped = items.map(item => ({
            code: item.product_code || "",
            name: item.product_name || "",
            status: item.product_status || "",
            startDate: item.product_start
                ? item.product_start.substring(0, 10)
                : "",
            endDate: item.product_end
                ? item.product_end.substring(0, 10)
                : "",
            remark: item.product_remark || "",
            createdBy: item.createrd_by || item.created_by || "",
            created: item.created
                ? item.created.substring(0, 10)
                : "",
            guid: item.product_guid || "",
            offcde: item.offcde || "",
            product_company: item.product_company || "",
            file_id: item.file_id || "",
            isActive: item.isActive || "false"
        }));

        return {
            page: jsonResult.page ?? (page ? parseInt(page) : 1),
            pageSize: jsonResult.pageSize ?? (pageSize ? parseInt(pageSize) : mapped.length),
            count: jsonResult.count ?? mapped.length,
            data: mapped
        };

    } catch (error) {
        console.error("Error in getCampainList:", error);

        return {
            page: 1,
            pageSize: 5,
            count: 0,
            data: []
        };

    } finally {
        stopLoading();
    }
}

async function displayCampaignFile(fileId) {
    const $fileNameText = $("#selectedFileNameText");
    const $fileNameDisplay = $("#selectedFileNameDisplay");

    if (fileId) {
        try {
            const fileRes = await fetch(`/Campain/getFile?Id=${fileId}`);
            if (fileRes.ok) {
                const fileData = await fileRes.json();
                const fileName = (fileData && fileData[0]) ? (fileData[0].Name || "") : "";
                const filePath = (fileData && fileData[0]) ? (fileData[0].Path || "") : "";

                if (fileName) {
                    $fileNameText
                        .text(fileName)
                        .attr("data-filepath", filePath)
                        .css("cursor", "pointer")
                        .attr("title", "คลิกเพื่อเปิดดูไฟล์");
                    $fileNameDisplay.removeClass("d-none").addClass("d-flex").show();
                    return;
                }
            }
        } catch (e) {
            console.error("Error fetching file info:", e);
        }
    }

    $fileNameText.removeAttr("data-filepath").removeAttr("title").css("cursor", "default").text("");
    $fileNameDisplay.addClass("d-none").removeClass("d-flex").hide();
}

$(document).off("click", "#selectedFileNameText").on("click", "#selectedFileNameText", function () {
    const filePath = $(this).attr("data-filepath");
    const fileName = $(this).text().trim();
    if (!fileName && !filePath) return;

    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const previewableExts = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.txt'];

    if (previewableExts.includes(ext)) {
        if (filePath) {
            window.open(`/Campain/PreviewFile?filePath=${encodeURIComponent(filePath)}`, '_blank');
        }
    } else {
        Swal.fire({
            title: "แจ้งเตือน",
            text: "ไฟล์นี้ไม่สามารถเปิดดูได้ในขณะนี้",
            icon: "info",
            showCancelButton: true,
            confirmButtonColor: "#0d6efd",
            cancelButtonColor: "#6c757d",
            confirmButtonText: '<i class="bi bi-download me-1"></i> ดาวน์โหลด',
            cancelButtonText: 'ปิด',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed && filePath) {
                window.open(`/Campain/DownloadFile?filePath=${encodeURIComponent(filePath)}&fileName=${encodeURIComponent(fileName)}`, '_blank');
            }
        });
    }
});

function productFilterHTML(filtercode, dropdownData = {}) {

    function OptionHTML(labelName, optionData = [], fieldName = '') {
        const list = Array.isArray(optionData) ? optionData : [];
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <select class="form-select form-select-custom prospect-filter-input" data-field="${fieldName}">
                <option value="">-- ทั้งหมด --</option>
                ${list.map(item => {
                    const text = typeof item === 'object' && item !== null ? (item.name || item.text || item.label || '') : item;
                    const val = typeof item === 'object' && item !== null ? (item.value || item.name || text) : item;
                    return `<option value="${val}">${text}</option>`;
                }).join('')}
                </select>
            </div>
        `;
        return HTML;
    }

    function RangeNumberHTMLAge(labelName, fieldName = '') {
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <input type="text" inputmode="numeric" class="form-control form-select-custom prospect-filter-input range-number-input" data-field="${fieldName}" placeholder="เช่น 40 หรือ 40-60" pattern="^\\d+(-\\d+)?$" title="กรอกตัวเลขเดี่ยว เช่น 40 หรือช่วงตัวเลข เช่น 40-60">
                <small class="text-muted">ตัวอย่าง: 40 หรือ 40-60</small>
            </div>
        `;
        return HTML;
    }

    function RangeNumberHTML(labelName, fieldName = '') {
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <input type="text" inputmode="numeric" class="form-control form-select-custom prospect-filter-input range-number-input" data-field="${fieldName}">
            </div>
        `;
        return HTML;
    }

    function FreeTextHTML(labelName, fieldName = '') {
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <input type="text" class="form-control form-select-custom prospect-filter-input" data-field="${fieldName}">
            </div>
        `;
        return HTML;
    }

    const company = (window.CURRENT_COMPANY || "MICRO").toUpperCase();
    
    let opts = dropdownData;
    if (typeof opts === 'string') {
        try { opts = JSON.parse(opts); } catch(e) {}
    }
    if (opts && typeof opts === 'object') {
        if (opts.data && typeof opts.data === 'object' && !Array.isArray(opts.data)) {
            opts = opts.data;
        } else if (opts.result && typeof opts.result === 'object' && !Array.isArray(opts.result)) {
            opts = opts.result;
        }
    }

    function getOptions(keys, fallback = []) {
        if (!opts || typeof opts !== 'object') return fallback;
        for (const k of keys) {
            const foundKey = Object.keys(opts).find(key => key.toLowerCase() === k.toLowerCase());
            if (foundKey && Array.isArray(opts[foundKey]) && opts[foundKey].length > 0) {
                return opts[foundKey].map(item => typeof item === 'object' && item !== null ? item : { name: item });
            }
        }
        return fallback;
    }

    const gender = getOptions(["gender"]);
    const caryear = getOptions(["caryear"]);
    const custype = getOptions(["custype"]);
    const occupation = getOptions(["occupation"]);
    const carStype = getOptions(["carStype"]);
    const provinceUsecar = getOptions(["provinceUsecar"]);
    const branchName = getOptions(["branchName"]);
    const current_region = getOptions(["current_region"]);
    const vehicle_use_region = getOptions(["vehicle_use_region"]);
    const consts = getOptions(["consts"]);
    const districtUsecar = getOptions(["districtUsecar"]);
    const businessType = getOptions(["businessType"]);
    const registered_region = getOptions(["registered_region"]);
    const category = getOptions(["category"]);
    const brand = getOptions(["brand"]);
    const ownins = getOptions(["ownins"]);
    const policyDateExpire = ["ก่อน 1 ปี", "ตั้งแต่ 1 ปีขึ้นไป"];
    const expireIns = ["หมดอายุ", "ยังไม่หมดอายุ"];

if (company == "MICRO") {

    switch (filtercode) {
        case "F001":
            return OptionHTML("ประเภทบุคคล", custype, "custype");
        case "F002":
            return OptionHTML("เพศ", gender, "gender");
        case "F003":
            return RangeNumberHTMLAge("อายุ", "age");
        case "F004":
            return OptionHTML("อาชีพผู้เช่าซื้อ", occupation, "occupation");
        case "F005":
            return OptionHTML("ประเภทธุรกิจ", businessType, "businessType");
        case "F006":
            return OptionHTML("ประเภทรถ", carStype, "carStype");
        case "F009":
            return OptionHTML("ช่วงปีรถ", caryear, "caryear");
        case "F010":
            return RangeNumberHTML("จำนวนงวด", "term");
        case "F011":
            return RangeNumberHTML("จำนวนงวดชำระ", "termpaid");
        case "F012":
            return RangeNumberHTML("จำนวนงวดค้างจ่าย", "total_ovd");
        case "F013":
            return RangeNumberHTML("ประสบการณ์ทำงาน", "totwrky");
        case "F014":
            return OptionHTML("ภูมิภาคที่อยู่ตามทะเบียนบ้าน", registered_region, "registered_region");
        case "F015":
            return OptionHTML("ภูมิภาคที่อยู่ปัจจุบัน", current_region, "current_region");
        case "F016":
            return OptionHTML("ภูมิภาคที่อยู่สถานที่ใช้รถ", vehicle_use_region, "vehicle_use_region");
        case "F017":
            return OptionHTML("จังหวัดที่อยู่สถานที่ใช้รถ", provinceUsecar, "provinceUsecar");
        case "F018":
            return OptionHTML("อำเภอที่อยู่สถานที่ใช้รถ", districtUsecar, "districtUsecar");
        case "F019":
            return RangeNumberHTML("จำนวนงวดที่ค้างชำระ", "ovd");
        case "F020":
            return OptionHTML("สาขาเปิดสัญญา", branchName, "branchName");
        case "F021":
            return OptionHTML("สถานะสัญญา", consts, "consts");
        default:
            return '';
    }

} else if (company == "MFIN"){

        switch (filtercode) {
        case "F001":
            return OptionHTML("ประเภทบุคคล", custype, "custype");
        case "F002":
            return OptionHTML("เพศ", gender, "gender");
        case "F003":
            return RangeNumberHTMLAge("อายุ", "age");
        case "F004":
            return OptionHTML("อาชีพ", occupation, "occupation");
        case "F005":
            return OptionHTML("ประเภทธุรกิจ", businessType, "businessType");
        case "F006":
            return OptionHTML("ประเภทรถ", carStype, "carStype");
        case "F007":
            return OptionHTML("ลักษณะรถ", category, "category");
        case "F008":
            return OptionHTML("ยี่ห้อ", brand, "brand");
        case "F009":
            return OptionHTML("ช่วงปีรถ", caryear, "caryear");
        case "F010":
            return RangeNumberHTML("จำนวนงวด", "term");
        case "F011":
            return RangeNumberHTML("จำนวนงวดชำระ", "termpaid");
        case "F012":
            return RangeNumberHTML("จำนวนงวดค้างจ่าย", "total_ovd");
        case "F013":
            return RangeNumberHTML("ประสบการณ์ทำงาน", "totwrky");
        case "F014":
            return OptionHTML("ที่อยู่ตามทะเบียนบ้าน", registered_region, "registered_region");
        case "F015":
            return OptionHTML("ที่อยู่ปัจจุบัน", current_region, "current_region");
        case "F016":
            return FreeTextHTML("ที่อยู่จัดส่งเอกสาร", "docDelivery_regoin");
        case "F017":
            return RangeNumberHTML("จำนวนงวดที่ค้างชำระ", "ovd");
        case "F018":
            return OptionHTML("สาขาเปิดสัญญา", branchName, "branchName");
        case "F019":
            return OptionHTML("สถานะสัญญา", consts, "consts");
        default:
            return '';
    }

} else if (company == "MIB"){
        switch (filtercode) {
        case "F001":
            return OptionHTML("ประเภทบุคคล", custype, "custype");
        case "F002":
            return OptionHTML("เพศ", gender, "gender");
        case "F003":
            return RangeNumberHTMLAge("อายุ", "age");
        case "F004":
            return OptionHTML("อาชีพ", occupation, "occupation");
        case "F005":
            return OptionHTML("ที่อยู่ปัจจุบัน", current_region, "current_region");
        case "F006":
            return OptionHTML("ยี่ห้อ", brand, "brand");
        case "F007":
            return OptionHTML("ประเภทรถ", carStype, "carStype");
        case "F008":
            return OptionHTML("ช่วงปีรถ", caryear, "caryear");
        case "F009":
            return OptionHTML("การทำประกัน", ownins, "ownins");
        case "F010":
            return OptionHTML("ประกันขาดต่ออายุ", policyDateExpire, "policyDateExpire");
        case "F011":
            return OptionHTML("บริษัทลูกค้าในเครือ", branchName, "branchName");
        case "F012": 
            return OptionHTML("ประกันหมดอายุ", expireIns, "expireIns");
        case "F013":
            return OptionHTML("ที่อยู่ปัจจุบัน", current_region, "current_region");
        default:
            return '';
    }

}

}

async function loadBatchList(page = 1, pageSize = 5, searchText) {
    currentBatchPage = page;
    currentBatchPageSize = pageSize;

    if (searchText === undefined) {
        searchText = $("#campaignSearchInput").val() ? $("#campaignSearchInput").val().trim() : "";
    }

    const statusText = $("#campaignStatusFilter").val();
    const res = await getCampainList(page, pageSize, searchText, currentSortCreateDate, statusText);
    const campainData = res.data;

    const foundCountEl = document.getElementById('batchFoundCount');
    if (foundCountEl) foundCountEl.textContent = `พบ ${res.count} รายการ`;

    const batchListTextEl = document.getElementById('batchListText');
    if (batchListTextEl) {
        const startItem = res.count > 0 ? (res.page - 1) * res.pageSize + 1 : 0;
        const endItem = Math.min(res.page * res.pageSize, res.count);
        const totalPages = Math.ceil(res.count / (res.pageSize || 1)) || 1;
        batchListTextEl.textContent = `แสดง ${startItem} ถึง ${endItem} จากทั้งหมด ${res.count} รายการ`;
    }

    const dataTableContainer = document.getElementById('dataTable');
    if (dataTableContainer) {
        dataTableContainer.innerHTML = '';
        const colorPalette = ['blue', 'green', 'orange', 'purple', 'cyan'];
        campainData.forEach((item, i) => {
            const color = colorPalette[i % colorPalette.length];
            const card = document.createElement('div');
            card.className = `batch-card color-${color}`;
            if (selectedCampaign && selectedCampaign.code === item.code) {
                card.classList.add('active');
            }
            card.dataset.code = item.code;
            card.dataset.guid = item.guid || '';
            const formatDisplayDate = (dateStr) => {
                if (!dateStr) return '-';
                let str = String(dateStr).trim();
                if (str.includes('T')) str = str.split('T')[0];
                else if (str.includes(' ')) str = str.split(' ')[0];
                const parts = str.split('-');
                if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
                return str;
            };

            const statusStr = String(item.status || '').trim().toLowerCase();
            const normalizedStatus = statusStr.replace(/_/g, ' ');
            let badgeClass = 'bg-secondary';

            if (normalizedStatus === 'return' ) {
                badgeClass = 'bg-orange text-white';
            } else if (normalizedStatus === 'reject') {
                badgeClass = 'bg-danger text-white';
            }else if (normalizedStatus === 'approved' || normalizedStatus === 'approve') {
                badgeClass = 'bg-success text-white';
            } else if (normalizedStatus === 'waiting prospect') {
                badgeClass = 'bg-warning text-dark';
            } else if (normalizedStatus === 'waiting approve') {
                badgeClass = 'bg-info text-dark';
            } else if (normalizedStatus === 'draft') {
                badgeClass = 'bg-secondary text-white';
            }

            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div class="batch-id color-${color}">
                        ${escapeHtml(item.code || `BATCH-${String(i+1).padStart(3,'0')}`)}
                    </div>

                    <span class="badge rounded-pill ${badgeClass}">
                        ${escapeHtml(item.status)}
                    </span>
                </div>

                <div class="batch-title">
                    ${escapeHtml(item.name || '(ไม่มีชื่อ)')}
                </div>

                <div class="d-flex justify-content-between align-items-end">
                    <div class="batch-meta">
                        <div>สร้างโดย: ${escapeHtml(item.createdBy || '-')}</div>
                        <div style="white-space: nowrap;">
                            ${escapeHtml(formatDisplayDate(item.startDate))} -
                            ${escapeHtml(formatDisplayDate(item.endDate))}
                        </div>
                    </div>
                </div>
            `;

            card.addEventListener('click', async function () {

                // เปลี่ยน Campaign
                dataTableContainer
                    .querySelectorAll('.batch-card')
                    .forEach(c => c.classList.remove('active'));

                this.classList.add('active');

                selectedCampaign = item;

                // Reset state
                removedBatchCustomerIds.clear();
                manuallySelectedCustomers.clear();

                currentBatchCustomers = [];
                currentProductBatches = [];

                isCurrentCampaignImport = false;

                currentSelectedPage = 1;

                updateSendForApprovalButtonState();

                // แสดงไฟล์ Campaign
                await displayCampaignFile(item.file_id);

                if (filterAbortController) {
                    try {
                        filterAbortController.abort();
                    } catch (e) {
                        console.warn("Cannot abort previous filter request:", e);
                    }
                }

                filterAbortController = new AbortController();

                const signal = filterAbortController.signal;

                // Request ID สำหรับป้องกัน response เก่าทับ Campaign ใหม่
                const requestId = ++currentFilterRequestId;

                const dynamicFilterContainer =
                    document.getElementById('dynamicFilter');

                const targetGuid = item.guid || '';

                startLoading(
                    'กำลังโหลดข้อมูล...',
                    'กรุณารอสักครู่'
                );

                try {

                    if (dynamicFilterContainer) {

                        dynamicFilterContainer.innerHTML = `
                            <div class="col-12 text-center text-muted py-2">
                                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                                กำลังโหลดตัวกรอง...
                            </div>
                        `;
                    }

                    if (!targetGuid) {

                        console.warn(
                            "Campaign ไม่มี product_guid:",
                            item
                        );

                        isCurrentCampaignImport = false;

                        if (
                            dynamicFilterContainer &&
                            requestId === currentFilterRequestId
                        ) {
                            dynamicFilterContainer.innerHTML = `
                                <div class="col-12 text-center text-warning py-2"
                                    style="font-size:0.85rem;">
                                    <i class="bi bi-exclamation-triangle me-1"></i>
                                    Campaign นี้ไม่มีข้อมูล GUID สำหรับโหลดเงื่อนไข
                                </div>
                            `;
                        }

                    } else {

                        const filterData =
                            await getProductFilterByGuid(
                                targetGuid,
                                signal
                            );

                        // ถ้า Campaign ถูกเปลี่ยนไปแล้ว
                        if (requestId !== currentFilterRequestId) {
                            console.log(
                                "Skip old Campaign filter response:",
                                requestId
                            );
                            return;
                        }
                        let rawFilters = filterData;

                        if (typeof rawFilters === 'string') {

                            try {
                                rawFilters = JSON.parse(rawFilters);
                            } catch (e) {

                                console.error(
                                    "Cannot parse filter response:",
                                    e
                                );

                                rawFilters = [];
                            }
                        }

                        let filters = [];

                        if (Array.isArray(rawFilters)) {

                            filters = rawFilters;

                        } else if (
                            rawFilters &&
                            typeof rawFilters === 'object'
                        ) {

                            if (Array.isArray(rawFilters.data)) {

                                filters = rawFilters.data;

                            } else if (Array.isArray(rawFilters.result)) {

                                filters = rawFilters.result;

                            } else if (Array.isArray(rawFilters.filters)) {

                                filters = rawFilters.filters;

                            } else if (
                                rawFilters.data &&
                                typeof rawFilters.data === 'object'
                            ) {

                                filters = [rawFilters.data];
                            }
                        }

                        const isImport = filters.some(filter => {

                            if (
                                typeof filter === 'string' ||
                                typeof filter === 'number'
                            ) {
                                return String(filter)
                                    .trim()
                                    .toLowerCase() === 'import';
                            }

                            if (
                                filter &&
                                typeof filter === 'object'
                            ) {

                                const name =
                                    filter.fname ||
                                    filter.fName ||
                                    filter.FName ||
                                    filter.f_name ||
                                    filter.filterName ||
                                    filter.filter_name ||
                                    '';

                                return String(name)
                                    .trim()
                                    .toLowerCase() === 'import';
                            }

                            return false;
                        });

                        isCurrentCampaignImport = isImport;

                        if (dynamicFilterContainer) {
                            dynamicFilterContainer.innerHTML = '';
                        }
                        if (isImport) {

                            if (dynamicFilterContainer) {

                                dynamicFilterContainer.innerHTML = `
                                    <div class="col-12 text-center text-primary py-2"
                                        style="font-size:0.85rem;">
                                        <i class="bi bi-file-earmark-excel me-1"></i>
                                        แคมเปญประเภทนำเข้าข้อมูล (Import Excel)
                                    </div>
                                `;
                            }

                        } else {
                            const optionResponse =
                                await fetch(
                                    `/ProspectSetup/getFilterDropdown`,
                                    {
                                        method: 'GET',
                                        signal: signal,
                                        headers: {
                                            'Accept': 'application/json'
                                        }
                                    }
                                );

                            // ตรวจ request เก่าอีกครั้ง
                            if (requestId !== currentFilterRequestId) {
                                console.log(
                                    "Skip old Dropdown response:",
                                    requestId
                                );
                                return;
                            }

                            if (!optionResponse.ok) {

                                throw new Error(
                                    `getFilterDropdown HTTP ${optionResponse.status} ${optionResponse.statusText}`
                                );
                            }

                            const optionData =
                                await optionResponse.json();

                            // Render Filter
                            if (
                                filters.length > 0 &&
                                dynamicFilterContainer
                            ) {

                                let renderedCount = 0;

                                filters.forEach(filter => {

                                    const fCode =
                                        typeof filter === 'string'
                                            ? filter
                                            : (
                                                filter.fcode ||
                                                filter.fCode ||
                                                filter.FCode ||
                                                filter.code ||
                                                filter.f_code ||
                                                filter.filterCode ||
                                                filter.filter_code ||
                                                filter.FilterCode ||
                                                ''
                                            );

                                    const normalizedFCode =
                                        String(fCode || '')
                                            .trim()
                                            .toUpperCase();

                                    if (!normalizedFCode) {

                                        console.warn(
                                            "Filter ไม่มี fcode:",
                                            filter
                                        );

                                        return;
                                    }

                                    const filterHTML =
                                        productFilterHTML(
                                            normalizedFCode,
                                            optionData
                                        );

                                    if (filterHTML) {

                                        dynamicFilterContainer
                                            .insertAdjacentHTML(
                                                'beforeend',
                                                filterHTML
                                            );

                                        renderedCount++;

                                    } else {

                                        console.warn(
                                            "ไม่พบ HTML สำหรับ Filter:",
                                            normalizedFCode
                                        );
                                    }
                                });

                                // =================================================
                                // ไม่มี Filter ไหน Render ได้
                                // =================================================

                                if (renderedCount === 0) {

                                    dynamicFilterContainer.innerHTML = `
                                        <div class="col-12 text-center text-warning py-2"
                                            style="font-size:0.85rem;">
                                            <i class="bi bi-exclamation-triangle me-1"></i>
                                            ไม่พบตัวกรองที่รองรับ
                                        </div>
                                    `;

                                }
                            } else {

                                if (dynamicFilterContainer) {

                                    dynamicFilterContainer.innerHTML = `
                                        <div class="col-12 text-center text-muted py-2"
                                            style="font-size:0.85rem;">
                                            ไม่มีข้อมูลตัวกรองสำหรับรายการนี้
                                        </div>
                                    `;
                                }

                                console.log(
                                    "Campaign นี้ไม่มี Filter"
                                );
                            }
                        }
                    }

                    if (requestId !== currentFilterRequestId) {
                        return;
                    }

                    await refreshSelectedCampaignCustomers();

                    if (requestId !== currentFilterRequestId) {
                        return;
                    }

                    await loadProspectList(
                        1,
                        currentProspectPageSize
                    );

                } catch (err) {

                    if (err.name === 'AbortError') {

                        console.log(
                            "Campaign request cancelled:",
                            item.code
                        );

                        return;
                    }

                    console.error(
                        "======================================"
                    );

                    console.error(
                        "ERROR LOADING CAMPAIGN FILTER"
                    );

                    console.error(
                        "Campaign:",
                        item
                    );

                    console.error(
                        "GUID:",
                        targetGuid
                    );

                    console.error(
                        "Error:",
                        err
                    );

                    console.error(
                        "======================================"
                    );

                    isCurrentCampaignImport = false;

                    if (
                        dynamicFilterContainer &&
                        requestId === currentFilterRequestId
                    ) {

                        dynamicFilterContainer.innerHTML = `
                            <div class="col-12 text-center text-danger py-2"
                                style="font-size:0.85rem;">
                                <i class="bi bi-exclamation-circle me-1"></i>
                                เกิดข้อผิดพลาดในการโหลดตัวกรอง
                                <div class="small mt-1">
                                    ${escapeHtml(err.message || '')}
                                </div>
                            </div>
                        `;
                    }

                } finally {

                    // เฉพาะ Campaign ล่าสุดเท่านั้นที่หยุด Loading
                    if (requestId === currentFilterRequestId) {
                        stopLoading();
                    }
                }
            });

            dataTableContainer.appendChild(card);
        });
    }

    renderBatchPaginationControls(res.page, res.pageSize, res.count);
    updateSendForApprovalButtonState();
}

function renderBatchPaginationControls(currentPage, pageSize, totalCount) {
    const paginationEl = document.getElementById('batchPagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize || 1)));
    const searchText = $("#campaignSearchInput").val() ? $("#campaignSearchInput").val().trim() : "";

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) loadBatchList(currentPage - 1, pageSize, searchText);
    });
    paginationEl.appendChild(prevLi);

    const pages = buildPageRange(currentPage, totalPages);
    pages.forEach(p => {
        const li = document.createElement('li');
        if (p === '...') {
            li.className = 'page-item disabled';
            li.innerHTML = `<span class="page-link bg-transparent text-muted">...</span>`;
        } else {
            li.className = `page-item ${p === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                loadBatchList(p, pageSize, searchText);
            });
        }
        paginationEl.appendChild(li);
    });

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) loadBatchList(currentPage + 1, pageSize, searchText);
    });
    paginationEl.appendChild(nextLi);
}

function getFilterParams() {
    const params = new URLSearchParams();
    const filterInputs = document.querySelectorAll('.prospect-filter-input');
    filterInputs.forEach(input => {
        const fieldName = input.getAttribute('data-field');
        const val = $(input).val();
        if (fieldName && val !== null && val !== undefined && val.toString().trim() !== '') {
            params.append(fieldName, val.toString().trim());
        }
    });
    return params;
}

// ตรวจว่าแถวลูกค้า (row) อยู่ในสาขาของ Campaign (offcde) หรือไม่ — กรองที่ frontend
// campaignOffcde เช่น "11,08" (คั่นด้วย ,) และ row.branchName เช่น "07-ขอนแก่น"
// ถ้า Campaign เป็นทุกสาขา ("", "99", "ทุกสาขา") ให้ผ่านทั้งหมด
function isRowInCampaignBranch(item, campaignOffcde) {
    const offcde = String(campaignOffcde || '').trim();
    if (!offcde || offcde === '99' || offcde === 'ทุกสาขา') {
        return true;
    }

    const campaignBranches = offcde.split(',').map(s => s.trim()).filter(Boolean);
    if (campaignBranches.length === 0) return true;
    // ดึงรหัสสาขาจากข้อมูลแถว — รองรับหลายรูปแบบ field และรูปแบบ "07-ชื่อสาขา"
    const rawBranch = String(
        item.branchName || item.ชื่อสาขาเดิม || ''
    ).trim();

    if (!rawBranch) return false;

    // แยกเอาเฉพาะรหัสนำหน้า (ก่อน "-") เช่น "07-ขอนแก่น" -> "07"
    const rowCode = rawBranch.split('-')[0].trim();
    if (!rowCode) return false;

    const rowClean = rowCode.replace(/^0+/, '');
    const rowPad = rowCode.padStart(2, '0');

    return campaignBranches.some(cBranch => {
        const cClean = cBranch.replace(/^0+/, '');
        const cPad = cBranch.padStart(2, '0');
        return cBranch === rowCode ||
               cPad === rowPad ||
               (cClean && rowClean && cClean === rowClean);
    });
}

async function getCampaignDataForETL(productCode) {
    try {
        const response = await fetch(`/ProspectSetup/getCampaignDataForETL?productCode=${encodeURIComponent(productCode)}`);
        const jsonResult = await response.json();
        return jsonResult;
    } catch (error) {
        console.error("Error in getCampaignDataForETL:", error);
        return { status: false, data: [] };
    }
}

async function getProspect() {
    try {

        // หมายเหตุ: การค้นหาชื่อลูกค้าทำแบบ client-side (filterProspectRows)
        // จึงไม่ส่งค่า search ไปยัง server เพื่อให้โหลดรายการทั้งหมดมากรองในหน้า

        if (isCurrentCampaignImport && selectedCampaign && selectedCampaign.code) {
            const response = await getCampaignDataForETL(selectedCampaign.code);
            let rawData = [];
            const etlResult = response.IsNotBatch
            if (etlResult) {
                if (Array.isArray(etlResult.data)) rawData = etlResult.data;
                else if (Array.isArray(etlResult.result)) rawData = etlResult.result;
                else if (Array.isArray(etlResult)) rawData = etlResult;
            }

            const total = rawData.length;

            return {
                total: total,
                count: total,
                data: rawData
            };
        }

        const filterParams = getFilterParams();

        const response = await fetch(`/ProspectSetup/GetProspect?${filterParams.toString()}`);
        const jsonResult = await response.json();
        return jsonResult;
    }
    catch(error){
        console.error("Error in getProspect:", error);
        return { count: 0, data: [] };
    }
}

async function loadProspectList(page = 1, pageSize = 10) {
    if (!selectedCampaign) {
        const totalFoundEl = document.getElementById('totalFound');
        if (totalFoundEl) totalFoundEl.textContent = '0';

        const tbody = document.getElementById('dataTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">ไม่พบข้อมูล กรุณาเลือก Campaign ทางด้านซ้ายก่อน</td></tr>`;
        }

        bindTableCheckboxEvents();
        renderProspectPaginationControls(1, 0, 0);
        const goToInput = document.getElementById('goToPageInput');
        if (goToInput) goToInput.value = '1';
        return;
    }

    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');

    try {
        const res = await getProspect();
        const allData = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);

        // กรองที่ frontend: เอาเฉพาะลูกค้าที่อยู่ในสาขาของ Campaign ที่เลือก (offcde เช่น "11,08")
        const campaignOffcde = selectedCampaign ? selectedCampaign.offcde : '';
        const rawData = allData.filter(item => isRowInCampaignBranch(item, campaignOffcde));

        const count = rawData.length;

        const totalFoundEl = document.getElementById('totalFound');
        if (totalFoundEl) totalFoundEl.textContent = count;

        const tbody = document.getElementById('dataTableBody');

        if (tbody) {
            tbody.innerHTML = '';
            if (rawData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">ไม่พบข้อมูลลูกค้าเป้าหมาย</td></tr>`;
            } else {
                rawData.forEach(item => {
                    const name = item.nameCus || '-';
                    const phone = item.mobile || item.phone || '-';
                    const branch = item.branchName || item.ชื่อสาขาเดิม || '-';

                    const idno = item.idno || '-';
                    const id = item.id || item.Id || '-';
                    const prospectBatch = item.prospect_batch || item.product_batch || '';
                    const isActive = selectedCampaign.isActive;

                    let matchedBatch = null;
                    if (Array.isArray(currentProductBatches) && currentProductBatches.length > 0) {
                        matchedBatch = currentProductBatches.find(b => {
                            if (!b) return false;

                            if (typeof b === 'string' || typeof b === 'number') {
                                const strB = String(b).trim();
                                return (prospectBatch && strB === String(prospectBatch).trim()) ||
                                       (id && strB === String(id).trim());
                            }

                            const bBatch = b.prospect_batch || b.product_batch || '';
                            const bId = b.id || '';
                            const bIds = Array.isArray(b.id) ? b.id : (Array.isArray(b.ids) ? b.ids : (Array.isArray(b.prospects) ? b.prospects : []));

                            if (prospectBatch && bBatch && String(bBatch).trim() === String(prospectBatch).trim()) {
                                return true;
                            }

                            if (id && bId && String(bId).trim() === String(id).trim()) {
                                return true;
                            }

                            if (id && bIds.length > 0 && bIds.some(i => String(i).trim() === String(id).trim())) {
                                return true;
                            }

                            return false;
                        });
                    }

                    const idStr = (id && id !== '-') ? String(id).trim() : (idno && idno !== '-' ? String(idno).trim() : '');
                    const isRemoved = idStr && removedBatchCustomerIds.has(idStr);
                    const isMatchedInBatchRes = Array.isArray(currentBatchCustomers) && currentBatchCustomers.some(c => c.id && String(c.id).trim() === idStr);
                    const isMatched = !isRemoved && (!!matchedBatch || isMatchedInBatchRes);
                    let isDraft = false;
                    if (isMatched) {
                        const bStatus = (typeof matchedBatch === 'object' && matchedBatch ? (matchedBatch.status || matchedBatch.assign_status || matchedBatch.product_batch_status || matchedBatch.batch_status) : null) || item.status || item.assign_status || '';
                        const statusStr = String(bStatus || '').trim().toLowerCase();
                        isDraft = statusStr === 'waiting prospect' || statusStr === 'return';
                    }

                    const isManuallySelected = idStr && manuallySelectedCustomers.has(idStr) && !isRemoved;
                    const isChecked = isMatched || isManuallySelected;
                    const canSelect = isProspectSelectionAllowed();
                    const isDisabled = !canSelect || (isMatched && !isDraft) || !isActive;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="text-center">
                            <div class="form-check d-flex justify-content-center m-0">
                                <input class="form-check-input row-checkbox" type="checkbox" 
                                    data-id="${escapeHtml(idStr)}" 
                                    data-idno="${escapeHtml(idno !== '-' ? idno : '')}" 
                                    data-name="${escapeHtml(name !== '-' ? name : '')}" 
                                    data-phone="${escapeHtml(phone !== '-' ? phone : '')}" 
                                    data-branch="${escapeHtml(branch !== '-' ? branch : '')}" 
                                    data-batch="${escapeHtml(prospectBatch)}" 
                                    ${isChecked ? 'checked' : ''} 
                                    ${isDisabled ? 'disabled' : ''}>
                            </div>
                        </td>
                        <td>${escapeHtml(name)}</td>
                        <td>${escapeHtml(phone)}</td>
                        <td>${escapeHtml(branch)}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        bindTableCheckboxEvents();
        renderProspectPaginationControls(1, count, count);
        const goToInput = document.getElementById('goToPageInput');
        if (goToInput) goToInput.value = '1';

        // คงการกรองชื่อลูกค้าที่ผู้ใช้พิมพ์ไว้ หลังจากโหลด/เรนเดอร์ตารางใหม่
        const currentSearch = document.getElementById('prospectSearchInput');
        if (currentSearch && currentSearch.value.trim() !== '') {
            filterProspectRows(currentSearch.value);
        }

    } catch (err) {
        console.error("Error in loadProspectList:", err);
    } finally {
        stopLoading();
    }
}

function renderProspectPaginationControls(currentPage, pageSize, totalCount) {
    const paginationEl = document.getElementById('tablePagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize || 1)));

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            loadProspectList(currentPage - 1, pageSize);
        }
    });
    paginationEl.appendChild(prevLi);

    // Page Numbers
    const pages = buildPageRange(currentPage, totalPages);
    pages.forEach(p => {
        const li = document.createElement('li');
        if (p === '...') {
            li.className = 'page-item disabled';
            li.innerHTML = `<span class="page-link bg-transparent text-muted">...</span>`;
        } else {
            li.className = `page-item ${p === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                if (p !== currentPage) {
                    loadProspectList(p, pageSize);
                }
            });
        }
        paginationEl.appendChild(li);
    });

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            loadProspectList(currentPage + 1, pageSize);
        }
    });
    paginationEl.appendChild(nextLi);
}

function buildPageRange(current, total) {
    if (total <= 7) {
        const range = [];
        for (let i = 1; i <= total; i++) range.push(i);
        return range;
    }
    if (current <= 4) {
        return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
        return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
}

function getSelectedList() {
    const combinedList = [];
    const seenIds = new Set();

    if (Array.isArray(currentBatchCustomers)) {
        currentBatchCustomers.forEach(c => {
            if (!c) return;
            const idKey = c.id ? String(c.id).trim() : null;
            if (idKey && removedBatchCustomerIds.has(idKey)) return;

            if (idKey) seenIds.add(idKey);
            const name = c.name || '-';
            const phone = c.phone || '-';
            const branch = c.branch || '-';
            const isDisabled = c.isDisabled !== undefined ? c.isDisabled : true;

            combinedList.push({
                id: idKey || '',
                idno: c.idno || (c.raw ? c.raw.idno : ''),
                name: name,
                phone: phone,
                branch: branch,
                isDisabled: isDisabled,
                isBatchCustomer: true
            });
        });
    }

    manuallySelectedCustomers.forEach((item, idKey) => {
        if (idKey && removedBatchCustomerIds.has(idKey)) return;
        if (idKey && seenIds.has(idKey)) return;
        if (idKey) seenIds.add(idKey);

        combinedList.push({
            id: idKey || '',
            idno: item.idno || '',
            name: item.name || '-',
            phone: item.phone || '-',
            branch: item.branch || '-',
            isDisabled: false,
            isBatchCustomer: false
        });
    });

    return combinedList;
}

function updateSelectedList() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    const selectedCountText = document.getElementById('selectedCountText');
    const selectedTotalText = document.getElementById('selectedTotalText');

    if (!selectedTableBody) return;
    selectedTableBody.innerHTML = '';

    const combinedList = getSelectedList();
    const selectedCount = combinedList.length;

    if (combinedList.length === 0) {
        selectedTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-3" style="font-size: 0.85rem;">ไม่มีรายการที่เลือก</td></tr>`;
    } else {
        const canSelect = isProspectSelectionAllowed();
        combinedList.forEach((item) => {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${escapeHtml(item.name)}</td>
                <td class="text-muted">${escapeHtml(item.phone)}</td>
                <td class="text-muted">${escapeHtml(item.branch)}</td>
                <td class="text-center">${(item.isDisabled || !canSelect) ? '' : `<i class="bi bi-x text-secondary remove-item" style="cursor:pointer;" data-idno="${escapeHtml(item.idno)}" data-id="${escapeHtml(item.id)}"></i>`}</td>
            `;
            selectedTableBody.appendChild(newRow);
        });
    }

    if (selectedCountText) selectedCountText.textContent = `รายการที่เลือก (${selectedCount} รายการ)`;
    if (selectedTotalText) selectedTotalText.textContent = `รวมทั้งหมด ${selectedCount} รายการ`;

    renderSelectedPaginationControls(currentSelectedPage, currentSelectedPageSize, selectedCount);

    document.querySelectorAll('#selectedTableBody .remove-item').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetIdno = this.getAttribute('data-idno');
            const targetId = this.getAttribute('data-id');

            const idStr = targetId ? String(targetId).trim() : (targetIdno ? String(targetIdno).trim() : '');

            if (idStr) {
                removedBatchCustomerIds.add(idStr);
                manuallySelectedCustomers.delete(idStr);
            }

            const matchCbs = document.querySelectorAll('#dataTableBody .row-checkbox');
            matchCbs.forEach(cb => {
                const cbId = cb.getAttribute('data-id') ? String(cb.getAttribute('data-id')).trim() : '';
                const cbIdno = cb.getAttribute('data-idno') ? String(cb.getAttribute('data-idno')).trim() : '';
                if (idStr && (cbId === idStr || cbIdno === idStr)) {
                    cb.checked = false;
                    cb.disabled = false;
                }
            });

            if (Array.isArray(currentBatchCustomers)) {
                const removeIndex = currentBatchCustomers.findIndex(c => {
                    const cId = c.id ? String(c.id).trim() : '';
                    const cIdno = c.idno ? String(c.idno).trim() : '';
                    return idStr && (cId === idStr || cIdno === idStr);
                });
                if (removeIndex !== -1) {
                    currentBatchCustomers.splice(removeIndex, 1);
                }
            }

            updateSelectedList();
            updateCheckAllStatus();
        });
    });

    const badgeBlue = document.querySelector('.badge-blue');
    if (badgeBlue) badgeBlue.textContent = selectedCount;

    updateSendForApprovalButtonState();
}

function isProspectSelectionAllowed() {
    if (!window.isCampaignCreate) return false;
    if (!selectedCampaign) return false;
    const rawStatus = String(selectedCampaign.status || selectedCampaign.product_status || '').trim().toLowerCase();
    const normalizedStatus = rawStatus.replace(/_/g, ' ');
    return normalizedStatus === "waiting prospect" || normalizedStatus === "return";
}

function updateSendForApprovalButtonState() {
    const sendBtn = document.getElementById('sendForApprovalBtn');
    const saveBtn = document.getElementById('saveDraftBtn');

    const isWaitingProspect = isProspectSelectionAllowed();

    if (saveBtn) {
        const shouldDisableSave = !isWaitingProspect;
        saveBtn.disabled = shouldDisableSave;
        if (shouldDisableSave) {
            saveBtn.classList.add('disabled');
            saveBtn.style.opacity = '0.5';
            saveBtn.style.pointerEvents = 'none';
            saveBtn.style.cursor = 'not-allowed';
        } else {
            saveBtn.classList.remove('disabled');
            saveBtn.style.opacity = '1';
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.style.cursor = 'pointer';
        }
    }

    if (sendBtn) {
        const selectedList = getSelectedList();
        const hasSelectedItems = selectedList.length > 0;
        const hasUnsavedChecked = manuallySelectedCustomers.size > 0;

        const shouldDisableSend = !isWaitingProspect || !hasSelectedItems || hasUnsavedChecked;

        sendBtn.disabled = shouldDisableSend;
        if (shouldDisableSend) {
            sendBtn.classList.add('disabled');
            sendBtn.style.opacity = '0.5';
            sendBtn.style.pointerEvents = 'none';
            sendBtn.style.cursor = 'not-allowed';
        } else {
            sendBtn.classList.remove('disabled');
            sendBtn.style.opacity = '1';
            sendBtn.style.pointerEvents = 'auto';
            sendBtn.style.cursor = 'pointer';
        }
    }
}

function renderSelectedPaginationControls(currentPage, pageSize, totalCount) {
    const paginationEl = document.getElementById('selectedTablePagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = '';

    const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize || 1)));

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage <= 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentSelectedPage = currentPage - 1;
            updateSelectedList();
        }
    });
    paginationEl.appendChild(prevLi);

    // Page Numbers
    const pages = buildPageRange(currentPage, totalPages);
    pages.forEach(p => {
        const li = document.createElement('li');
        if (p === '...') {
            li.className = 'page-item disabled';
            li.innerHTML = `<span class="page-link bg-transparent text-muted">...</span>`;
        } else {
            li.className = `page-item ${p === currentPage ? 'active' : ''}`;
            li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
            li.addEventListener('click', (e) => {
                e.preventDefault();
                if (p !== currentPage) {
                    currentSelectedPage = p;
                    updateSelectedList();
                }
            });
        }
        paginationEl.appendChild(li);
    });

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentSelectedPage = currentPage + 1;
            updateSelectedList();
        }
    });
    paginationEl.appendChild(nextLi);
}

function updateCheckAllStatus() {
    const checkAll = document.getElementById('checkAll');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (!checkAll) return;
    const canSelect = isProspectSelectionAllowed();
    checkAll.disabled = !canSelect;

    const visibleCheckboxes = Array.from(rowCheckboxes);
    const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
    const someChecked = visibleCheckboxes.some(cb => cb.checked);

    checkAll.checked = allChecked;
    checkAll.indeterminate = !allChecked && someChecked;
}

function bindTableCheckboxEvents() {
    const checkAll = document.getElementById('checkAll');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const canSelect = isProspectSelectionAllowed();

    if (checkAll) {
        const newCheckAll = checkAll.cloneNode(true);
        if (checkAll.parentNode) checkAll.parentNode.replaceChild(newCheckAll, checkAll);
        newCheckAll.disabled = !canSelect;
        newCheckAll.addEventListener('change', function () {
            if (!isProspectSelectionAllowed()) {
                this.checked = false;
                return;
            }
            const isChecked = this.checked;
            rowCheckboxes.forEach(checkbox => {
                if (!checkbox.disabled) {
                    checkbox.checked = isChecked;
                    const idStr = checkbox.getAttribute('data-id') ? String(checkbox.getAttribute('data-id')).trim() : '';
                    const idno = checkbox.getAttribute('data-idno') || '';
                    const name = checkbox.getAttribute('data-name') || checkbox.closest('tr')?.cells[1]?.textContent.trim() || '-';
                    const phone = checkbox.getAttribute('data-phone') || checkbox.closest('tr')?.cells[2]?.textContent.trim() || '-';
                    const branch = checkbox.getAttribute('data-branch') || checkbox.closest('tr')?.cells[3]?.textContent.trim() || '-';

                    if (idStr) {
                        if (isChecked) {
                            removedBatchCustomerIds.delete(idStr);
                            const isSavedInBatch = Array.isArray(currentBatchCustomers) && currentBatchCustomers.some(c => c && c.id && String(c.id).trim() === idStr);
                            if (!isSavedInBatch) {
                                manuallySelectedCustomers.set(idStr, {
                                    id: idStr,
                                    idno: idno,
                                    name: name,
                                    phone: phone,
                                    branch: branch,
                                    isDisabled: false,
                                    isBatchCustomer: false
                                });
                            }
                        } else {
                            manuallySelectedCustomers.delete(idStr);
                            removedBatchCustomerIds.add(idStr);
                            if (Array.isArray(currentBatchCustomers)) {
                                const removeIndex = currentBatchCustomers.findIndex(c => c && c.id && String(c.id).trim() === idStr);
                                if (removeIndex !== -1) {
                                    currentBatchCustomers.splice(removeIndex, 1);
                                }
                            }
                        }
                    }
                }
            });
            updateSelectedList();
        });
    }

    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (!isProspectSelectionAllowed() || this.disabled) {
                return;
            }
            const idStr = this.getAttribute('data-id') ? String(this.getAttribute('data-id')).trim() : '';
            const idno = this.getAttribute('data-idno') || '';
            const name = this.getAttribute('data-name') || this.closest('tr')?.cells[1]?.textContent.trim() || '-';
            const phone = this.getAttribute('data-phone') || this.closest('tr')?.cells[2]?.textContent.trim() || '-';
            const branch = this.getAttribute('data-branch') || this.closest('tr')?.cells[3]?.textContent.trim() || '-';

            if (idStr) {
                if (this.checked) {
                    removedBatchCustomerIds.delete(idStr);
                    const isSavedInBatch = Array.isArray(currentBatchCustomers) && currentBatchCustomers.some(c => c && c.id && String(c.id).trim() === idStr);
                    if (!isSavedInBatch) {
                        manuallySelectedCustomers.set(idStr, {
                            id: idStr,
                            idno: idno,
                            name: name,
                            phone: phone,
                            branch: branch,
                            isDisabled: false,
                            isBatchCustomer: false
                        });
                    }
                } else {
                    manuallySelectedCustomers.delete(idStr);
                    removedBatchCustomerIds.add(idStr);
                    if (Array.isArray(currentBatchCustomers)) {
                        const removeIndex = currentBatchCustomers.findIndex(c => c && c.id && String(c.id).trim() === idStr);
                        if (removeIndex !== -1) {
                            currentBatchCustomers.splice(removeIndex, 1);
                        }
                    }
                }
            }

            updateSelectedList();
            updateCheckAllStatus();
        });
    });

    updateCheckAllStatus();
    updateSelectedList();
}

document.addEventListener('DOMContentLoaded', async function () {
    const btnClearSelection = document.getElementById('btnClearSelection');

    loadProductStatus();

    //Load Campaign (Batch) List ---
    await loadBatchList(currentBatchPage, currentBatchPageSize);

    //Load Prospect List ---
    await loadProspectList(currentProspectPage, currentBatchPageSize);

    updateSendForApprovalButtonState();

    //Rows per page selector event listener ---
    const rowsPerPageSelect = document.getElementById('rowsPerPage');
    if (rowsPerPageSelect) {
        rowsPerPageSelect.value = currentProspectPageSize.toString();
        rowsPerPageSelect.addEventListener('change', function() {
            const newSize = parseInt(this.value, 10) || 10;
            loadProspectList(1, newSize);
        });
    }

    //Go to page input event listener ---
    const goToPageInput = document.getElementById('goToPageInput');
    if (goToPageInput) {
        goToPageInput.addEventListener('change', function() {
            let p = parseInt(this.value, 10);
            if (isNaN(p) || p < 1) p = 1;
            loadProspectList(p, currentProspectPageSize);
        });
        goToPageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
    }

    //Filter event listeners ---
    const btnApplyFilters = document.getElementById('btnApplyFilters');
    if (btnApplyFilters) {
        btnApplyFilters.addEventListener('click', function() {
            loadProspectList(1, currentProspectPageSize);
        });
    }

    const btnClearFilters = document.getElementById('btnClearFilters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', function() {
            const dynamicFilterContainer = document.getElementById('dynamicFilter');
            if (dynamicFilterContainer) {
                dynamicFilterContainer.querySelectorAll('select').forEach(sel => sel.value = '');
                dynamicFilterContainer.querySelectorAll('input').forEach(inp => inp.value = '');
            }
            const prospectSearchInput = document.getElementById('prospectSearchInput');
            if (prospectSearchInput) prospectSearchInput.value = '';

            ['filterCustType', 'filterGender', 'filterJob', 'filterStatus', 'filterBranch'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            const filterAgeMin = document.getElementById('filterAgeMin');
            if (filterAgeMin) filterAgeMin.value = '25';
            const filterAgeMax = document.getElementById('filterAgeMax');
            if (filterAgeMax) filterAgeMax.value = '60';
            const filterDateStart = document.getElementById('filterDateStart');
            if (filterDateStart) filterDateStart.value = '2024-05-01';
            const filterDateEnd = document.getElementById('filterDateEnd');
            if (filterDateEnd) filterDateEnd.value = '2024-05-12';

            loadProspectList(1, currentProspectPageSize);
        });
    }

    //Selected Table Pagination event listeners ---
    const selectedRowsPerPageSelect = document.getElementById('selectedRowsPerPage');
    if (selectedRowsPerPageSelect) {
        selectedRowsPerPageSelect.value = currentSelectedPageSize.toString();
        selectedRowsPerPageSelect.addEventListener('change', function() {
            currentSelectedPageSize = parseInt(this.value, 10) || 10;
            currentSelectedPage = 1;
            updateSelectedList();
        });
    }



    if (btnClearSelection) {
        btnClearSelection.addEventListener('click', function () {
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(checkbox => checkbox.checked = false);
            bindTableCheckboxEvents();
        });
    }

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', function () {
            const dataTable = document.getElementById('batchListContainer');
            if (!dataTable) return;
            let tableClone = dataTable.cloneNode(true);
            
            tableClone.querySelectorAll('tr').forEach(row => {
                if (row.cells.length > 0) {
                    row.deleteCell(0);
                }
            });

            Array.from(tableClone.querySelectorAll('tbody tr')).forEach(row => {
               if (row.style.display === 'none' || row.classList.contains('d-none')) {
                   row.parentNode.removeChild(row);
               }
            });

            let wb = XLSX.utils.table_to_book(tableClone, { sheet: "Prospects" });
            XLSX.writeFile(wb, "Prospect_Data.xlsx");
        });
    }
});

    $("#saveDraftBtn").off("click").on("click", function () {
        if ($(this).is(":disabled") || $(this).hasClass("disabled")) return;
        if (!selectedCampaign) {
            Swal.fire({
                title: "แจ้งเตือน",
                text: "กรุณาเลือกแคมเปญก่อนทำการบันทึก",
                icon: "warning"
            });
            return;
        }

        const selectedList = getSelectedList();
        if (selectedList.length === 0) {
            Swal.fire({
                title: "แจ้งเตือน",
                text: "กรุณาเลือกลูกค้าเป้าหมายอย่างน้อย 1 รายการ",
                icon: "warning"
            });
            return;
        }

        Swal.fire({
            title: "ยืนยันการบันทึก",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก"
        }).then(async (result) => {
            if (result.isConfirmed) {
                startLoading("กำลังบันทึกข้อมูล...", "");
                try {
                    const currentSelected = getSelectedList();
                    const selectedIds = Array.from(new Set(
                        currentSelected.map(c => c.id).filter(Boolean)
                    ));

                    let response;
                    let data;

                    if (isCurrentCampaignImport) {
                        const upsertRequest = {
                            Id: selectedIds,
                            productCode: selectedCampaign.code || "",
                            user: ""
                        };
                        response = await fetch(`/ProspectSetup/upsertProspectFromETL`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(upsertRequest),
                        });
                        data = await response.json();
                    } else {
                        var request = {
                            id: selectedIds,
                            product_code: selectedCampaign.code || "",
                            product_offcde: selectedCampaign.offcde || "",
                            product_company: selectedCampaign.product_company || "",
                            product_batch_remark: selectedCampaign.code+":new batch" || "",
                            status: "draft",
                        };
                        response = await fetch(`/ProspectSetup/PostNewProspectBatch`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(request),
                        });
                        data = await response.json();
                    }

                    if (!response.ok || (data && data.status === false)) {
                        const errorMsg = (data && data.message) ? data.message : "ไม่สามารถบันทึกข้อมูลได้";
                        stopLoading(true);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        stopLoading(true);
                        Swal.fire({ title: "บันทึกสำเร็จ", icon: "success", timer: 1500, showConfirmButton: false });
                        removedBatchCustomerIds.clear();
                        manuallySelectedCustomers.clear();
                        await refreshSelectedCampaignCustomers();
                        await loadProspectList(currentProspectPage, currentProspectPageSize);
                    }
                } catch (err) {
                    console.error(err);
                    stopLoading(true);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกข้อมูลได้", icon: "error" });
                } finally {
                    stopLoading(true);
                }
            }
        });
    });

    $("#sendForApprovalBtn").off("click").on("click", function () {
        if ($(this).is(":disabled") || $(this).hasClass("disabled")) return;
        const selectedList = getSelectedList();
        if (selectedList.length === 0) {
            Swal.fire({
                title: "แจ้งเตือน",
                text: "ไม่มีข้อมูลในรายการที่เลือก",
                icon: "warning"
            });
            return;
        }

        if (manuallySelectedCustomers.size > 0) {
            Swal.fire({
                title: "แจ้งเตือน",
                text: "มีรายการที่กดติ๊กเลือกอยู่ กรุณาบันทึกชุดข้อมูลก่อนส่งอนุมัติ",
                icon: "warning"
            });
            return;
        }

        Swal.fire({
            title: "ยืนยันการอนุมัติ",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#28a745",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก"
        }).then(async (result) => {
            if (result.isConfirmed) {
                startLoading("กำลังส่งอนุมัติ...", "");
                try {

                    var request = {
                        product_code: selectedCampaign.code || "",
                        status: "waiting approve",
                    };
                    const response = await fetch(`/ProspectSetup/updateProductBatchStatus`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(request),
                    });
                    let data = null;
                    try {
                        data = await response.json();
                    } catch (e) {
                        console.error("Error parsing response json:", e);
                    }

                    if (!response.ok) {
                        const errorMsg = (data && data.message) ? data.message : `ไม่สามารถส่งอนุมัติข้อมูลได้ (${response.status} ${response.statusText})`;
                        stopLoading(true);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        stopLoading(true);
                        await Swal.fire({ title: "บันทึกสำเร็จ", icon: "success", confirmButtonText: "ตกลง" });

                        var request = {
                            title: "Campaign Waiting Approve",
                            message: `Campaign ${selectedCampaign.code} (${selectedCampaign.product_name}) ถูกส่งอนุมัติโดย ${typeof userFullNameTh !== 'undefined' ? userFullNameTh : ''}`,
                            sender: userId,
                        };

                        fetch(`/ProspectSetup/postNotiToApprover`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(request),
                            keepalive: true
                        });

                        window.location.reload();
                        
                    }

                } catch (err) {
                    console.error(err);
                    stopLoading(true);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งอนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    stopLoading(true);
                }
            }
        });
    });

async function getProductFilterByGuid(guid, signal = null) {
    if (!guid) return [];

    try {
        const response = await fetch(
            `/ProspectSetup/GetProductFilterByGuid?guid=${encodeURIComponent(guid)}`,
            signal ? { signal } : undefined
        );

        if (!response.ok) {
            console.error(
                "GetProductFilterByGuid HTTP error:",
                response.status,
                response.statusText
            );
            return [];
        }

        const data = await response.json();

        return data || [];

    } catch (err) {

        if (err.name === 'AbortError') {
            console.log("GetProductFilterByGuid request aborted");
            return [];
        }

        console.error("Error in getProductFilterByGuid:", err);
        return [];
    }
}

async function getProductBatchByProductCode(productCode){
    try{
        const response = await fetch(`/ProspectSetup/getProductBatchByProductCode?productCode=${encodeURIComponent(productCode)}`);
        if (!response.ok) {
            console.error("getProductBatchByProductCode HTTP error:", response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        return data || [];
    }catch(err){
        console.error("Error in getProductBatchByProductCode:", err);
        return [];
    }
}

async function refreshSelectedCampaignCustomers() {
    if (selectedCampaign && selectedCampaign.code) {
        currentSelectedPage = 1;

        if (isCurrentCampaignImport) {
            const response = await getCampaignDataForETL(selectedCampaign.code);
            const etlResult = response ? (response.IsBatch) : null;
            currentBatchCustomers = extractCustomers(etlResult);
            currentProductBatches = [];
            updateSelectedList();
        } else {
            const batchRes = await getProductBatchByProductCode(selectedCampaign.code);
            currentBatchCustomers = extractCustomers(batchRes);
            updateSelectedList();

            let rawBatches = batchRes;
            if (typeof rawBatches === 'string') {
                try { rawBatches = JSON.parse(rawBatches); } catch(e) {}
            }
            if (Array.isArray(rawBatches)) {
                currentProductBatches = rawBatches;
            } else if (rawBatches && typeof rawBatches === 'object') {
                let items = [];
                if (Array.isArray(rawBatches.data)) items = rawBatches.data;
                else if (rawBatches.Customer && Array.isArray(rawBatches.Customer.data)) items = rawBatches.Customer.data;
                else if (rawBatches.customer && Array.isArray(rawBatches.customer.data)) items = rawBatches.customer.data;
                else if (rawBatches.ObjectCustomer && Array.isArray(rawBatches.ObjectCustomer.data)) items = rawBatches.ObjectCustomer.data;
                else if (rawBatches.objectCustomer && Array.isArray(rawBatches.objectCustomer.data)) items = rawBatches.objectCustomer.data;
                else if (Array.isArray(rawBatches.Customer)) items = rawBatches.Customer;
                else if (Array.isArray(rawBatches.customer)) items = rawBatches.customer;
                else if (Array.isArray(rawBatches.customers)) items = rawBatches.customers;
                else if (Array.isArray(rawBatches.result)) items = rawBatches.result;
                else if (Array.isArray(rawBatches.batches)) items = rawBatches.batches;
                else if (Array.isArray(rawBatches.productBatch)) items = rawBatches.productBatch;
                else if (Array.isArray(rawBatches.prospectBatch)) items = rawBatches.prospectBatch;
                else items = [rawBatches];

                const parentStatus = rawBatches.status || rawBatches.assign_status || rawBatches.product_batch_status;
                const parentBatch = rawBatches.prospect_batch || rawBatches.prospectBatch || rawBatches.product_batch;

                currentProductBatches = items.map(b => {
                    if (typeof b === 'object' && b !== null) {
                        return {
                            ...b,
                            status: b.status || parentStatus,
                            prospect_batch: b.prospect_batch || parentBatch
                        };
                    }
                    return b;
                });
            } else {
                currentProductBatches = [];
            }
        }
    } else {
        currentBatchCustomers = [];
        currentProductBatches = [];
    }
}

function extractCustomers(data) {
    if (!data) return [];
    let list = [];

    let raw = data;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return []; }
    }

    const checkAndPush = (item) => {
        if (!item) return;
        if (Array.isArray(item.Customer?.data)) {
            item.Customer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.customer?.data)) {
            item.customer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.ObjectCustomer?.data)) {
            item.ObjectCustomer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.objectCustomer?.data)) {
            item.objectCustomer.data.forEach(c => checkAndPush(c));
            return;
        }
        if (item.Customer && typeof item.Customer === 'object' && !Array.isArray(item.Customer)) {
            checkAndPush(item.Customer);
            return;
        }
        if (item.customer && typeof item.customer === 'object' && !Array.isArray(item.customer)) {
            checkAndPush(item.customer);
            return;
        }
        if (item.ObjectCustomer && typeof item.ObjectCustomer === 'object' && !Array.isArray(item.ObjectCustomer)) {
            checkAndPush(item.ObjectCustomer);
            return;
        }
        if (item.objectCustomer && typeof item.objectCustomer === 'object' && !Array.isArray(item.objectCustomer)) {
            checkAndPush(item.objectCustomer);
            return;
        }
        if (Array.isArray(item.Customer)) {
            item.Customer.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.customer)) {
            item.customer.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.customers)) {
            item.customers.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.prospects)) {
            item.prospects.forEach(c => checkAndPush(c));
            return;
        }

        if (typeof item === 'object') {
            const idno = item.idno || '';
            const id = item.id || item.Id || '';
            const name = item.nameCus || '-';
            const phone = item.mobile || item.phone || '-';
            const branch = item.branchName || item.ชื่อสาขาเดิม || '-';
            const statusVal = item.assign_status || item.status || '';
            const statusStr = String(statusVal).trim().toLowerCase();
            const isDraft = statusStr === 'waiting prospect' || statusStr === 'return';
            const isDisabled = item.isDisabled !== undefined ? item.isDisabled : !isDraft;

            if (id || idno || (name !== '-' && name !== '')) {
                list.push({
                    id: String(id || '').trim(),
                    idno: String(idno || '').trim(),
                    name: String(name).trim(),
                    phone: String(phone).trim(),
                    branch: String(branch).trim(),
                    isDisabled: isDisabled,
                    raw: item
                });
            }
        }
    };

    if (Array.isArray(raw)) {
        raw.forEach(i => checkAndPush(i));
    } else if (typeof raw === 'object') {
        if (Array.isArray(raw.data)) {
            raw.data.forEach(i => checkAndPush(i));
        } else if (Array.isArray(raw.result)) {
            raw.result.forEach(i => checkAndPush(i));
        } else if (Array.isArray(raw.IsNotBatch)) {
            raw.IsNotBatch.forEach(i => checkAndPush(i));
        } else if (raw.IsNotBatch && Array.isArray(raw.IsNotBatch.data)) {
            raw.IsNotBatch.data.forEach(i => checkAndPush(i));
        } else if (raw.data && typeof raw.data === 'object') {
            checkAndPush(raw.data);
        } else {
            checkAndPush(raw);
        }
    }

    return list;
}
    
$("#campaignStatusFilter").off("change").on("change", function () {
    currentBatchPage = 1;
    loadBatchList();
});