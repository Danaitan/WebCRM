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
let prospectAbortController = null;
let currentProspectRequestId = 0;
let prospectSearchTimer = null;
let prospectTable = null;
// จำนวนรวมจริงจาก API (SP) คงที่ต่อการโหลด ใช้แสดง "พบ X รายการ" เมื่อไม่มีการค้นหา
let prospectAuthoritativeTotal = null;
// จำนวนที่ถูกซ่อนออกจากรายการลูกค้าเพราะอยู่ในรายการที่เลือก (หักออกจาก total ตอนแสดง)
let prospectHiddenBySelectionCount = 0;

// แสดงจำนวน "พบ X รายการ" = จำนวนแถวจริงในตารางหลังกรอง (recordsDisplay ของ DataTables)
// ตารางถูก render ด้วย rawData ที่ dedup + กรองสาขา + ตัดรายการที่เลือกแล้วออกมาแล้ว
// ดังนั้นจำนวนนี้จึงเท่ากับจำนวนที่ "เลือกทั้งหมด" ทำได้จริงเสมอ
function updateProspectTotalFound(recordsDisplay) {
    const totalFoundEl = document.getElementById('totalFound');
    if (!totalFoundEl) return;

    // ถ้าไม่ได้ส่ง recordsDisplay มา ให้ดึงจาก DataTables ปัจจุบัน
    if (recordsDisplay === undefined && prospectTable) {
        recordsDisplay = prospectTable.page.info().recordsDisplay;
    }

    // ระหว่างค้นหาใช้จำนวนหลังกรองของ DataTables, ไม่ค้นหาก็ใช้จำนวนแถวทั้งหมดในตาราง
    // ทั้งสองกรณีคือ recordsDisplay จึงตรงกับจำนวนแถวที่ผู้ใช้ติ๊กเลือกได้จริง
    let value = recordsDisplay;
    if (!Number.isFinite(value)) {
        value = Number.isFinite(prospectAuthoritativeTotal) ? prospectAuthoritativeTotal : 0;
    }
    totalFoundEl.textContent = Number(value || 0).toLocaleString();
}

// index ของ batch สำหรับตัดสิน matched อย่างรวดเร็ว (สร้างใหม่เมื่อ currentProductBatches/currentBatchCustomers เปลี่ยน)
let batchMatchIndex = { batchIds: new Set(), batchNames: new Set(), savedIds: new Set() };
// รายการ idno ของแถวที่ผู้ใช้เลือกได้ (selectable) ในชุดข้อมูลปัจจุบัน คำนวณครั้งเดียวต่อการ render
let selectableRowIdStrs = [];
// lookup ข้อมูลลูกค้าดิบจาก "รายการลูกค้า" (idno -> {name, phone, branch}) ใช้เติม field ที่ขาดในรายการที่เลือก
let prospectCustomerLookup = new Map();
// จำ signature ล่าสุดที่ใช้คำนวณ selectableRowIdStrs (search term) เพื่อ recompute เฉพาะเมื่อเปลี่ยน
let selectableRowIdStrsKey = null;

// รีเฟรช selectableRowIdStrs จากแถวที่ตรงตัวกรองปัจจุบัน (recompute เฉพาะเมื่อ search เปลี่ยน)
function refreshSelectableRowIdStrs(force = false) {
    if (!prospectTable) {
        selectableRowIdStrs = [];
        selectableRowIdStrsKey = null;
        return;
    }
    const searchKey = ($prospectSearchInput.val() || '').trim().toLowerCase();
    if (!force && searchKey === selectableRowIdStrsKey) return;

    selectableRowIdStrs = prospectTable
        .rows({ search: 'applied' })
        .data()
        .toArray()
        .map(getProspectRowState)
        .filter(state => state.idStr && !state.isDisabled)
        .map(state => state.idStr);
    selectableRowIdStrsKey = searchKey;
}

function rebuildBatchMatchIndex() {
    const batchIds = new Set();
    const batchNames = new Set();
    const savedIds = new Set();

    if (Array.isArray(currentProductBatches)) {
        currentProductBatches.forEach(b => {
            if (b === null || b === undefined) return;
            if (typeof b === 'string' || typeof b === 'number') {
                batchIds.add(String(b).trim());
                return;
            }
            const batch = b.prospect_batch || b.product_batch || '';
            if (batch) batchNames.add(String(batch).trim());
            if (b.id) batchIds.add(String(b.id).trim());
            const ids = Array.isArray(b.id)
                ? b.id
                : (Array.isArray(b.ids) ? b.ids : (Array.isArray(b.prospects) ? b.prospects : []));
            ids.forEach(v => batchIds.add(String(v).trim()));
        });
    }

    if (Array.isArray(currentBatchCustomers)) {
        currentBatchCustomers.forEach(c => {
            if (c && c.id) savedIds.add(String(c.id).trim());
        });
    }

    batchMatchIndex = { batchIds, batchNames, savedIds };
}

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

function applyProspectTableSearch() {
    if (prospectSearchTimer) {
        clearTimeout(prospectSearchTimer);
        prospectSearchTimer = null;
    }
    filterProspectRows($prospectSearchInput.val());
}

// DataTables ค้นหาจากข้อมูลทั้งหมดใน browser โดยไม่ยิง API ซ้ำ
$prospectSearchInput.off("keyup input").on("input", function () {
    if (prospectSearchTimer) clearTimeout(prospectSearchTimer);
    prospectSearchTimer = setTimeout(applyProspectTableSearch, 250);
});

$prospectSearchInput.off("keydown").on("keydown", function (e) {
    if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
        applyProspectTableSearch();
    }
});

$("#prospectSearchIcon, #btnSearchProspect").off("click").on("click", function () {
    applyProspectTableSearch();
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

// ค้นหาจากทุกคอลัมน์ (global search) จากข้อมูลทั้งหมดที่ DataTables เก็บไว้
function filterProspectRows(searchText) {
    if (!prospectTable) return;
    prospectTable.search((searchText || '').trim()).draw();
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

        // if (statusText !== undefined &&
        //     statusText !== null &&
        //     statusText !== '') {

        //     queryStr += `&status=${encodeURIComponent(statusText)}`;
        // }
        queryStr += `&isFiltercompany=${encodeURIComponent(true)}`;

        let status = "waiting prospect,waiting approve,approved,return,reject";
        if (statusText && statusText.trim()) {
            status = statusText;
        }
        queryStr += `&status=${encodeURIComponent(status)}`;

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

function escapeCampaignFileAttr(v) {
    return String(v || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// รองรับ file_id แบบหลายไฟล์ (CSV เช่น "12,34,56") - วาดเป็นรายการไฟล์ที่คลิกดูได้
async function displayCampaignFile(fileId, signal = null, requestId = currentFilterRequestId) {
    const $fileNameDisplay = $("#selectedFileNameDisplay");
    const $wrapper = $fileNameDisplay.parent();

    // ล้าง chip ไฟล์เดิม (ถ้ามี) แล้วซ่อนกล่องต้นแบบ
    $wrapper.find(".pa-file-chip").remove();
    $fileNameDisplay.addClass("d-none").removeClass("d-flex").hide();

    const idCsv = String(fileId || "")
        .split(",")
        .map(s => s.trim())
        .filter(s => /^\d+$/.test(s) && s !== "0")
        .join(",");

    if (!idCsv) return;

    try {
        const fileRes = await fetch(`/Campain/getFile?Id=${encodeURIComponent(idCsv)}`, { signal });
        if (requestId !== currentFilterRequestId) return;
        if (!fileRes.ok) return;

        const fileData = await fileRes.json();
        if (requestId !== currentFilterRequestId) return;
        if (!Array.isArray(fileData) || fileData.length === 0) return;

        fileData.forEach(row => {
            const fileName = row.Name || row.name || "";
            const filePath = row.Path || row.path || "";
            if (!fileName && !filePath) return;

            const chip = $(`
                <div class="pa-file-chip d-flex align-items-center gap-2 px-3 py-1 bg-light border rounded" style="font-size: 0.875rem;">
                    <i class="bi bi-file-earmark-text text-primary fs-5"></i>
                    <span class="fw-medium text-dark pa-file-name" style="cursor:pointer;" title="คลิกเพื่อเปิดดูไฟล์"
                          data-filepath="${escapeCampaignFileAttr(filePath)}">${escapeCampaignFileAttr(fileName)}</span>
                </div>`);
            $wrapper.append(chip);
        });
    } catch (e) {
        if (e.name === 'AbortError') return;
        console.error("Error fetching file info:", e);
    }
}

$(document).off("click", ".pa-file-name").on("click", ".pa-file-name", function () {
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

function productFilterHTML(filterMeta, dropdownData = {}) {
    let filtercode = '';
    let fCompanyFromFilter = '';
    let fType = '';
    let fName = '';

    if (filterMeta && typeof filterMeta === 'object') {
        filtercode = String(filterMeta.fcode || '').trim().toUpperCase();
        fCompanyFromFilter = String(filterMeta.fcompany || '').trim();
        fType = String(filterMeta.ftype || '').trim();
        fName = String(filterMeta.fname || '').trim();
    } else {
        filtercode = String(filterMeta || '').trim().toUpperCase();
    }

    function OptionHTML(labelName, optionData = [], fieldName = '') {
        const list = Array.isArray(optionData) ? optionData : [];
        const HTML = `
            <div class="prospect-filter-col">
                <label class="form-label-custom">${labelName}</label>
                <select class="form-select form-select-custom prospect-filter-input" data-field="${fieldName}">
                <option value="">-- ทั้งหมด --</option>
                ${list.map(item => {
                    const text = typeof item === 'object' && item !== null ? (item.name || '') : item;
                    const val = typeof item === 'object' && item !== null ? (item.name) : item;
                    return `<option value="${val}">${text}</option>`;
                }).join('')}
                </select>
            </div>
        `;
        return HTML;
    }

    function RangeNumberHTML(labelName, fieldName = '') {
        const HTML = `
            <div class="prospect-filter-col">
                <label class="form-label-custom">${labelName}</label>
                <input type="text" inputmode="numeric" class="form-control form-select-custom prospect-filter-input range-number-input" data-field="${fieldName}" placeholder="เช่น 40 หรือ 40-60" pattern="^\\d+(-\\d+)?$" title="กรอกตัวเลขเดี่ยว เช่น 40 หรือช่วงตัวเลข เช่น 40-60">
                <small class="text-muted">ตัวอย่าง: 40 หรือ 40-60</small>
            </div>
        `;
        return HTML;
    }

    function FreeTextHTML(labelName, fieldName = '') {
        const HTML = `
            <div class="prospect-filter-col">
                <label class="form-label-custom">${labelName}</label>
                <input type="text" class="form-control form-select-custom prospect-filter-input" data-field="${fieldName}">
            </div>
        `;
        return HTML;
    }

    let optionSource = dropdownData;
    if (typeof optionSource === 'string') {
        try { optionSource = JSON.parse(optionSource); } catch (e) {}
    }
    if (optionSource && !Array.isArray(optionSource)) {
        if (Array.isArray(optionSource.data)) {
            optionSource = optionSource.data;
        } else if (Array.isArray(optionSource.result)) {
            optionSource = optionSource.result;
        }
    }
    if (!Array.isArray(optionSource)) optionSource = [];

    const label = filterMeta.fremark || fName;
    const fieldName = fName;
    const normalizedType = fType.toLowerCase();

    if (normalizedType === "option") {

        // รวม option ทุก company ที่มี fname เดียวกัน แล้ว dedupe ตาม name
        const matched = optionSource.filter(item =>
            item.fname === filterMeta.fname
        );

        const seen = new Set();
        const option = [];
        matched.forEach(item => {
            const name = typeof item === 'object' && item !== null
                ? (item.name || item.text || item.label || '')
                : item;
            const key = String(name).trim().toLowerCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            option.push(item);
        });

        return OptionHTML(label, option, fieldName);

    } else if (normalizedType === "range") {

        return RangeNumberHTML(label, fieldName);

    } else if (normalizedType === "text") {

        return FreeTextHTML(label, fieldName);

    }

    return '';

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

                // ยกเลิกงานของ Campaign ก่อนหน้าและสร้าง freshness token ก่อน await แรก
                if (filterAbortController) {
                    try {
                        filterAbortController.abort();
                    } catch (e) {
                        console.warn("Cannot abort previous filter request:", e);
                    }
                }
                if (prospectAbortController) {
                    prospectAbortController.abort();
                }
                ++currentProspectRequestId;

                filterAbortController = new AbortController();
                const signal = filterAbortController.signal;
                const requestId = ++currentFilterRequestId;
                // แสดงไฟล์เฉพาะเมื่อ Campaign นี้ยังเป็นรายการล่าสุด
                await displayCampaignFile(item.file_id, signal, requestId);
                if (requestId !== currentFilterRequestId) return;

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

                        const filterData = await getProductFilterByGuid(targetGuid);

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

                                const name = filter.fname || '';

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

                            const collectFilterValues = (key) => {
                                const values = filters
                                    .map(filter => {
                                        if (
                                            filter &&
                                            typeof filter === 'object'
                                        ) {
                                            return filter[key] ?? '';
                                        }
                                        return '';
                                    })
                                    .map(v => String(v).trim())
                                    .filter(v => v.length > 0);

                                // ตัดค่าซ้ำออก
                                const result = Array
                                    .from(new Set(values))
                                    .join(',');

                                return result;
                            };

                            const fnameParam = collectFilterValues('fname');
                            const fcompanyParam =
                                collectFilterValues('fcompany');

                            const dropdownQuery = new URLSearchParams({
                                fname: fnameParam,
                                fcompany: fcompanyParam
                            });

                            const optionResponse =
                                await fetch(
                                    `/ProspectSetup/getFilterDropdown?${dropdownQuery.toString()}`,
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

                            const optionData = await optionResponse.json();

                            // Render Filter
                            if (
                                filters.length > 0 &&
                                dynamicFilterContainer
                            ) {

                                let renderedCount = 0;

                                const renderedOptionFields = new Set();
                                filters.forEach(filter => {

                                    const isObj =
                                        filter &&
                                        typeof filter === 'object';

                                    const fCode =
                                        typeof filter === 'string'
                                            ? filter
                                            : ( filter.fcode || '' );

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

                                    const filterMeta = {
                                        fcode: normalizedFCode,
                                        fcompany: isObj
                                            ? String(filter.fcompany || '')
                                                .trim()
                                            : '',
                                        ftype: isObj
                                            ? String(filter.ftype || '')
                                                .trim()
                                            : '',
                                        fname: isObj
                                            ? String(filter.fname || '')
                                                .trim()
                                            : '',
                                        fremark: isObj
                                            ? String(filter.fremark || '')
                                                .trim()
                                            : '',
                                    };

                                    // ถ้าเป็น option และ fname เดียวกันถูก render ไปแล้ว ให้ข้าม
                                    // เพราะตัวเลือกจากทุก company จะถูกรวมไว้ในกล่องเดียวแล้ว
                                    const filterType =
                                        String(filterMeta.ftype || '')
                                            .trim()
                                            .toLowerCase();
                                    const optionFieldKey =
                                        String(filterMeta.fname || '')
                                            .trim()
                                            .toLowerCase();

                                    if (
                                        filterType === 'option' &&
                                        optionFieldKey
                                    ) {
                                        if (renderedOptionFields.has(optionFieldKey)) {
                                            return;
                                        }
                                        renderedOptionFields.add(optionFieldKey);
                                    }

                                    const filterHTML =
                                        productFilterHTML(
                                            filterMeta,
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

                    // เปิดใช้ Select2 ให้ dropdown ตัวเลือก (เช่น อำเภอที่อยู่สถานที่ใช้รถ) ค้นหาได้
                    initProspectFilterSelects();

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

                    if (requestId === currentFilterRequestId) {
                        isCurrentCampaignImport = false;
                    }

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
                    // ทุก startLoading ต้องมี stopLoading คู่กัน แม้ request จะถูกยกเลิก
                    stopLoading();
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

// เปิด Select2 ให้ <select> ในเงื่อนไขคัดเลือก เพื่อให้พิมพ์ค้นหาตัวเลือกได้
// ความสูงของ dropdown (สูงสุด 7 / ต่ำสุด 3 รายการ) คุมด้วย CSS (.prospect-filter-select2-dropdown)
function initProspectFilterSelects() {
    if (typeof $ === 'undefined' || !$.fn || !$.fn.select2) return;

    $('#dynamicFilter select.prospect-filter-input').each(function () {
        const $sel = $(this);
        // กัน init ซ้ำ
        if ($sel.hasClass('select2-hidden-accessible')) {
            $sel.select2('destroy');
        }
        $sel.select2({
            theme: 'bootstrap-5',
            width: '100%',
            placeholder: '-- ทั้งหมด --',
            allowClear: true,
            // ปล่อยให้ dropdown แนบกับ body (ค่าเริ่มต้น) จะได้ไม่ถูก overflow ของการ์ดเงื่อนไขบัง
            dropdownCssClass: 'prospect-filter-select2-dropdown',
            language: {
                noResults: () => 'ไม่พบตัวเลือก',
                searching: () => 'กำลังค้นหา...'
            }
        });
    });
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

// มี filter ที่ผู้ใช้เลือกไว้อย่างน้อย 1 อันหรือไม่ (ไม่นับ batch/branch ของแคมเปญ)
function hasAnyProspectFilter(params) {
    const p = params || getFilterParams();
    for (const key of p.keys()) {
        if (key === 'batch' || key === 'branch') continue;
        return true;
    }
    return false;
}

// batch ของแคมเปญที่เลือกอยู่ (รองรับหลายรูปแบบ field)
function getCampaignBatch() {
    // จาก selectedCampaign ก่อน
    if (selectedCampaign) {
        const fromCampaign = String(
            selectedCampaign.prospect_batch ||
            selectedCampaign.product_batch ||
            selectedCampaign.batch ||
            ''
        ).trim();
        if (fromCampaign) return fromCampaign;
    }

    // fallback: batch ของแคมเปญที่โหลดมากับ currentProductBatches
    if (Array.isArray(currentProductBatches)) {
        for (const b of currentProductBatches) {
            if (b === null || b === undefined) continue;
            const batch = String(b.prospect_batch || b.product_batch || '').trim();
            if (batch) return batch;
        }
    }

    return '';
}

// ตรวจว่าแถวลูกค้า (row) อยู่ในสาขาของ Campaign (offcde) หรือไม่ — กรองที่ frontend
function normalizeIdno(value) {
    return String(value || '').trim();
}

// สร้าง key สำหรับเทียบซ้ำจากคู่ (idno + เลขที่สัญญา)
// ถือว่าซ้ำก็ต่อเมื่อ "ทั้ง idno และ contno ตรงกันทั้งคู่"
function makeIdnoContnoKey(idno, contno) {
    const id = normalizeIdno(idno);
    const cont = normalizeIdno(contno);
    if (!id || !cont || cont === '-') return '';
    return `${id}||${cont}`;
}

function getPersistedSelectedIdnos() {
    return new Set(
        currentBatchCustomers
            .filter(item => {
                const id = String(item?.id || '').trim();
                return !id || !removedBatchCustomerIds.has(id);
            })
            .map(item => normalizeIdno(item.idno))
            .filter(Boolean)
    );
}

// รวม key (idno + contno) ของ "รายการที่เลือก" ทั้งหมด (batch ที่ save แล้ว + manual ที่เพิ่งติ๊ก)
// ใช้ตัดออกจาก "รายการลูกค้า" เพื่อไม่ให้แสดงซ้ำ โดยซ่อนเฉพาะแถวที่ idno และ contno ตรงกันทั้งคู่
function getAllSelectedIdnoContnoKeys() {
    const keys = new Set();

    currentBatchCustomers
        .filter(item => {
            const id = String(item?.id || '').trim();
            return !id || !removedBatchCustomerIds.has(id);
        })
        .forEach(item => {
            const key = makeIdnoContnoKey(item?.idno, item?.contno);
            if (key) keys.add(key);
        });

    manuallySelectedCustomers.forEach((item, idKey) => {
        if (idKey && removedBatchCustomerIds.has(idKey)) return;
        const key = makeIdnoContnoKey(item?.idno, item?.contno);
        if (key) keys.add(key);
    });

    return keys;
}

// campaignOffcde เช่น "11,08" (คั่นด้วย ,) และข้อมูลสาขา เช่น "07-ขอนแก่น"
// ถ้า Campaign เป็นทุกสาขา ("", "99", "ทุกสาขา") ให้ผ่านทั้งหมด
function isRowInCampaignBranch(item, campaignOffcde) {
    const offcde = String(campaignOffcde || '').trim();
    if (!offcde || offcde === '99' || offcde === 'ทุกสาขา') {
        return true;
    }

    const campaignBranches = offcde.split(',').map(s => s.trim()).filter(Boolean);
    if (campaignBranches.length === 0) return true;

    // ดึงรหัสสาขาจากข้อมูลแถว — ใช้ contractoffcde/offcde เป็นหลักเหมือนหน้า productApprove
    // แล้ว fallback ไปที่การแยกรหัสนำหน้าจากชื่อสาขา ("07-ขอนแก่น" -> "07")
    let rowCode = String(
        item?.contractoffcde || item?.ContractOffCde ||
        item?.offcde || item?.Offcde || ''
    ).trim();

    if (!rowCode) {
        const rawBranch = String(item?.branchName || item?.Branch_name || '').trim();
        if (!rawBranch) return false;
        // แยกเอาเฉพาะรหัสนำหน้า (ก่อน "-") เช่น "07-ขอนแก่น" -> "07"
        rowCode = rawBranch.split('-')[0].trim();
    }
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

async function getProspect(signal = null) {
    try {
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

        // แคมเปญที่ไม่ใช่แบบ import ต้องเลือก filter อย่างน้อย 1 อันก่อน
        // ไม่งั้นไม่ต้อง fetch และแสดงรายการว่าง
        if (!hasAnyProspectFilter(filterParams)) {
            return { count: 0, total: 0, data: [] };
        }

        // batch ของแคมเปญ และ branch (สาขา) ของแคมเปญ
        const campaignBatch = getCampaignBatch();
        const campaignBranch = selectedCampaign ? (selectedCampaign.offcde || '') : '';
        if (campaignBatch) filterParams.append('batch', campaignBatch);
        if (campaignBranch) filterParams.append('branch', campaignBranch);

        const response = await fetch(
            `/ProspectSetup/GetProspect?${filterParams.toString()}`,
            { signal }
        );
        if (!response.ok) {
            throw new Error(`GetProspect HTTP ${response.status} ${response.statusText}`);
        }
        return await response.json();
        return await response.json();
    }
    catch(error){
        if (error.name === 'AbortError') throw error;
        console.error("Error in getProspect:", error);
        return { count: 0, data: [] };
    }
}

// คำนวณสถานะการเลือกของแถวจาก item เดียว ใช้ร่วมกันทั้งการ render และ select-all
// ใช้ batchMatchIndex (O(1) lookup) แทนการ find ทั้ง array ต่อแถว เพื่อรองรับข้อมูลจำนวนมาก
function getProspectRowState(item) {
    const idno = item.idno || '-';
    const id = item.id || item.Id || '-';
    const prospectBatch = item.prospect_batch || item.product_batch || '';
    const name = item?.nameCus || '-';
    const phone = item?.mobile || item?.phone || '-';
    const branch = item?.branchName || item?.Branch_name || '-';
    const contno = item?.contno || '-';

    const idStr = id && id !== '-'
        ? String(id).trim()
        : (idno && idno !== '-' ? String(idno).trim() : '');

    const { batchIds, batchNames, savedIds } = batchMatchIndex;
    const matchedInBatchDef =
        (prospectBatch && batchNames.has(String(prospectBatch).trim())) ||
        (idStr && batchIds.has(idStr));
    const isMatchedInBatch = idStr && savedIds.has(idStr);

    const isRemoved = idStr && removedBatchCustomerIds.has(idStr);
    const isMatched = !isRemoved && (matchedInBatchDef || isMatchedInBatch);

    const batchStatus = item.status || item.assign_status || '';
    const normalizedStatus = String(batchStatus).trim().toLowerCase();
    const isDraft = normalizedStatus === 'waiting prospect' || normalizedStatus === 'return';
    const isChecked = isMatched || (idStr && manuallySelectedCustomers.has(idStr) && !isRemoved);
    const isDisabled = !isProspectSelectionAllowed() || (isMatched && !isDraft) || !selectedCampaign?.isActive;

    return {
        idStr,
        idno: idno !== '-' ? idno : '',
        name: name !== '-' ? name : '',
        phone: phone !== '-' ? phone : '',
        branch: branch !== '-' ? branch : '',
        contno: contno !== '-' ? contno : '',
        prospectBatch,
        isChecked,
        isDisabled
    };
}

// ตรวจว่าคู่ (idno + contno) นี้มีอยู่ใน "รายการที่เลือก" แล้วหรือไม่
// ใช้กันการติ๊กสัญญาซ้ำที่ idno และ contno ตรงกันแต่คนละ id
// ถ้าส่ง excludeIdStr มา จะไม่นับแถวที่เป็นตัวเดียวกัน (id เดียวกัน)
function isIdnoContnoAlreadySelected(idno, contno, excludeIdStr = '') {
    const targetIdno = normalizeIdno(idno);
    const targetContno = normalizeIdno(contno);
    // ต้องมีทั้ง idno และ contno จึงจะถือว่าเป็น "สัญญา" ที่นำมาเทียบซ้ำได้
    if (!targetIdno || !targetContno) return false;

    const exclude = String(excludeIdStr || '').trim();

    return getSelectedList().some(item => {
        const itemId = String(item.id || '').trim();
        if (exclude && itemId === exclude) return false;
        return normalizeIdno(item.idno) === targetIdno &&
            normalizeIdno(item.contno) === targetContno;
    });
}

// เลือก/ยกเลิกแถวหนึ่งในสถานะ selection (ใช้ร่วมกันระหว่าง select-all และติ๊กรายแถว)
function applyProspectRowSelection(state, isChecked) {
    const { idStr, idno, name, phone, branch, contno } = state;
    if (!idStr) return;

    if (isChecked) {
        removedBatchCustomerIds.delete(idStr);
        const isSavedInBatch = Array.isArray(currentBatchCustomers) &&
            currentBatchCustomers.some(c => c && c.id && String(c.id).trim() === idStr);
        if (!isSavedInBatch) {
            manuallySelectedCustomers.set(idStr, {
                id: idStr,
                idno: idno,
                name: name || '-',
                phone: phone || '-',
                branch: branch || '-',
                contno: contno || '-',
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

// รวบรวมข้อมูลทุกแถวที่ตรงกับตัวกรองปัจจุบัน (ทุกหน้า ไม่ใช่แค่หน้าที่แสดง)
function getFilteredProspectItems() {
    if (!prospectTable) return [];
    return prospectTable.rows({ search: 'applied' }).data().toArray();
}

function renderProspectCheckbox(item) {
    const state = getProspectRowState(item);
    const { idStr, idno, name, phone, branch, contno, prospectBatch, isChecked, isDisabled } = state;

    return `
        <div class="form-check d-flex justify-content-center m-0">
            <input class="form-check-input row-checkbox" type="checkbox"
                data-id="${escapeHtml(idStr)}"
                data-idno="${escapeHtml(idno)}"
                data-name="${escapeHtml(name)}"
                data-phone="${escapeHtml(phone)}"
                data-branch="${escapeHtml(branch)}"
                data-contno="${escapeHtml(contno)}"
                data-batch="${escapeHtml(prospectBatch)}"
                ${isChecked ? 'checked' : ''}
                ${isDisabled ? 'disabled' : ''}>
        </div>`;
}

function renderProspectDataTable(data, page = 1, pageSize = 10) {
    const tableData = Array.isArray(data) ? data : [];
    const searchText = ($prospectSearchInput.val() || '').trim();

    rebuildBatchMatchIndex();
    selectableRowIdStrsKey = null;

    if (!prospectTable) {
        $('#dataTableBody').empty();
        prospectTable = $('#batchListContainer').DataTable({
            data: tableData,
            deferRender: true,
            processing: true,
            ordering: false,
            searching: true,
            paging: true,
            pagingType: 'simple_numbers',
            pageLength: pageSize,
            lengthMenu: [[10, 20, 50, 100], [10, 20, 50, 100]],
            autoWidth: false,
            dom: '<"prospect-table-scroll"t><"prospect-table-footer d-flex align-items-center justify-content-between gap-2"<"prospect-footer-left d-flex flex-column"l<"prospect-info-text"i>>p>',
            columns: [
                {
                    data: null,
                    searchable: false,
                    orderable: false,
                    className: 'text-center',
                    render: function (_value, type, row) {
                        return type === 'display' ? renderProspectCheckbox(row) : '';
                    }
                },                
                {
                    data: null,
                    render: function (_value, type, row) {
                        const value = row?.idno || '-';
                        return type === 'display' ? escapeHtml(value) : value;
                    }
                },
                {
                    data: null,
                    render: function (_value, type, row) {
                        const value = row?.nameCus || '-';
                        return type === 'display' ? escapeHtml(value) : value;
                    }
                },
                {
                    data: null,
                    render: function (_value, type, row) {
                        const value = row?.mobile || row?.phone || '-';
                        return type === 'display' ? escapeHtml(value) : value;
                    }
                },
                {
                    data: null,
                    render: function (_value, type, row) {
                        const value = row?.branchName || row?.Branch_name || '-';
                        return type === 'display' ? escapeHtml(value) : value;
                    }
                },
                {
                    data: null,
                    render: function (_value, type, row) {
                        const value = row?.contno || '-';
                        return type === 'display' ? escapeHtml(value) : value;
                    }
                },
            ],
            language: {
                processing: 'กำลังประมวลผล...',
                emptyTable: 'ไม่พบข้อมูลลูกค้าเป้าหมาย',
                zeroRecords: 'ไม่พบข้อมูลที่ตรงกับการค้นหา',
                lengthMenu: 'แสดง _MENU_ รายการ',
                info: 'แสดง _START_ ถึง _END_ จาก _TOTAL_ รายการ',
                infoEmpty: 'แสดง 0 ถึง 0 จาก 0 รายการ',
                paginate: {
                    first: 'หน้าแรก',
                    last: 'หน้าสุดท้าย',
                    next: 'ถัดไป',
                    previous: 'ก่อนหน้า'
                }
            },
            drawCallback: function () {
                const info = this.api().page.info();
                currentProspectPage = info.page + 1;
                currentProspectPageSize = info.length;
                updateProspectTotalFound(info.recordsDisplay);
                bindTableCheckboxEvents();
            }
        });
    } else {
        prospectTable.clear();
        prospectTable.rows.add(tableData);
        prospectTable.page.len(pageSize);
    }

    prospectTable.search(searchText || '');
    prospectTable.draw();

    const targetPage = Math.max(0, Math.min(page - 1, prospectTable.page.info().pages - 1));
    if (targetPage !== prospectTable.page.info().page) {
        prospectTable.page(targetPage).draw('page');
    }
}

async function loadProspectList(page = 1, pageSize = 10) {
    page = Math.max(1, parseInt(page, 10) || 1);
    pageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 10));
    currentProspectPage = page;
    currentProspectPageSize = pageSize;

    if (!selectedCampaign) {
        if (prospectTable) {
            prospectTable.clear().draw();
        } else {
            const totalFoundEl = document.getElementById('totalFound');
            if (totalFoundEl) totalFoundEl.textContent = '0';

            const tbody = document.getElementById('dataTableBody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">ไม่พบข้อมูล กรุณาเลือก Campaign ทางด้านซ้ายก่อน</td></tr>`;
            }
            bindTableCheckboxEvents();
        }
        return;
    }

    if (prospectAbortController) {
        prospectAbortController.abort();
    }
    prospectAbortController = new AbortController();
    const requestId = ++currentProspectRequestId;

    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');

    try {
        const res = await getProspect(prospectAbortController.signal);
        if (requestId !== currentProspectRequestId) return;

        // จำนวนรวมจริงจาก API (SP) — คงที่ ไม่แกว่งตาม payload ที่มาไม่ครบ
        const apiTotal = Number(res?.total ?? res?.count);
        prospectAuthoritativeTotal = Number.isFinite(apiTotal) ? apiTotal : null;

        const allData = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);


        // และเก็บ lookup ข้อมูลดิบ (idno -> name/phone/branch) ไว้เติม field ที่ขาดในรายการที่เลือก
        const seenIdnos = new Set();
        const uniqueData = [];
        prospectCustomerLookup = new Map();
        for (const item of allData) {
            const idno = normalizeIdno(item.idno);
            if (idno && !prospectCustomerLookup.has(idno)) {
                prospectCustomerLookup.set(idno, {
                    name: item?.nameCus || '',
                    phone: item?.mobile || item?.phone || '',
                    branch: item?.branchName || item?.Branch_name || '',
                    contno: item?.contno || ''
                });
            }
            // dedup ด้วย idno เพื่อตัดแถวซ้ำที่ SP อาจคืนมาต่างกันแต่ละ request
            // if (!idno || !seenIdnos.has(idno)) {
                if (idno) seenIdnos.add(idno);
                uniqueData.push(item);
            // }
        }

        // กรองตามสาขาและตัดลูกค้าที่อยู่ในรายการที่เลือกแล้ว (batch + manual) ด้วย idno
        const campaignOffcde = selectedCampaign ? selectedCampaign.offcde : '';
        // ซ่อนแถวที่อยู่ใน "รายการที่เลือก" แล้ว โดยเทียบทั้ง idno และเลขที่สัญญา (contno)
        // จะถือว่าซ้ำ (และซ่อน) ก็ต่อเมื่อทั้งคู่ตรงกัน
        const selectedKeys = getAllSelectedIdnoContnoKeys();
        let hiddenBySelectionCount = 0;

        const rawData = uniqueData.filter(item => {
            if (!isRowInCampaignBranch(item, campaignOffcde)) return false;
            const key = makeIdnoContnoKey(item.idno, item.contno);
            if (key && selectedKeys.has(key)) {
                hiddenBySelectionCount++;
                return false;
            }
            return true;
        });

        // จำนวนที่ถูกซ่อนเพราะอยู่ในรายการที่เลือก ใช้หักออกจาก API total ตอนแสดง "พบ X รายการ"
        prospectHiddenBySelectionCount = hiddenBySelectionCount;

        // แสดงเฉพาะข้อมูลที่ผ่านการ dedup (idno) + กรองสาขา + ตัดรายการที่เลือกแล้วออก (rawData)
        // เพื่อให้จำนวนแถวในตาราง = จำนวนที่ "เลือกทั้งหมด" ทำได้จริง (ไม่มีแถวซ้ำ/แถวที่เลือกไม่ได้)
        // และให้ "พบ X รายการ" อ้างอิงจากจำนวนแถวจริงในตาราง ไม่ใช่ยอดดิบจาก SP ที่มีแถวซ้ำ
        prospectAuthoritativeTotal = rawData.length;
        prospectHiddenBySelectionCount = 0;

        // เรียงรายการลูกค้าตาม idno (น้อยไปมาก) ก่อนแสดง
        // ถ้า idno เป็นตัวเลขทั้งคู่ให้เทียบแบบตัวเลข ไม่งั้น fallback เป็นการเทียบข้อความ
        rawData.sort((a, b) => {
            const aId = normalizeIdno(a?.idno);
            const bId = normalizeIdno(b?.idno);
            const aNum = Number(aId);
            const bNum = Number(bId);
            const aIsNum = aId !== '' && Number.isFinite(aNum);
            const bIsNum = bId !== '' && Number.isFinite(bNum);
            if (aIsNum && bIsNum) return aNum - bNum;
            return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
        });

        renderProspectDataTable(rawData, page, pageSize);
        return;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Error in loadProspectList:", err);
        }
    } finally {
        // ทุก startLoading ต้องมี stopLoading คู่กัน แม้ request จะถูกแทนที่หรือ abort
        stopLoading();
    }
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

// เติม field ที่ขาด (ว่างหรือ "-") ของรายการที่เลือก จากข้อมูลลูกค้าดิบที่ match ด้วย idno
function fillMissingFromLookup(entry) {
    const idno = normalizeIdno(entry.idno);
    if (!idno) return entry;
    const src = prospectCustomerLookup.get(idno);
    if (!src) return entry;

    const isEmpty = v => v === undefined || v === null || v === '' || v === '-';
    if (isEmpty(entry.name) && src.name) entry.name = src.name;
    if (isEmpty(entry.phone) && src.phone) entry.phone = src.phone;
    if (isEmpty(entry.branch) && src.branch) entry.branch = src.branch;
    if (isEmpty(entry.contno) && src.contno) entry.contno = src.contno;
    return entry;
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
            const contno = c.contno || '-';
            const isDisabled = c.isDisabled !== undefined ? c.isDisabled : true;

            combinedList.push(fillMissingFromLookup({
                id: idKey || '',
                idno: c.idno || (c.raw ? c.raw.idno : ''),
                name: name,
                phone: phone,
                branch: branch,
                contno: contno,
                isDisabled: isDisabled,
                isBatchCustomer: true
            }));
  
        });
    }

    manuallySelectedCustomers.forEach((item, idKey) => {
        if (idKey && removedBatchCustomerIds.has(idKey)) return;
        if (idKey && seenIds.has(idKey)) return;
        if (idKey) seenIds.add(idKey);

        combinedList.push(fillMissingFromLookup({
            id: idKey || '',
            idno: item.idno || '',
            name: item.name || '-',
            phone: item.phone || '-',
            branch: item.branch || '-',
            contno: item.contno || '-',
            isDisabled: false,
            isBatchCustomer: false
        }));
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
        selectedTableBody.innerHTML = `<tr class="selected-empty-row"><td colspan="6"><div class="selected-empty-state"><i class="bi bi-inbox"></i><span>ยังไม่มีรายการที่เลือก</span></div></td></tr>`;
    } else {
        const canSelect = isProspectSelectionAllowed();
        combinedList.forEach((item) => {

            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${escapeHtml(item.idno)}</td>
                <td>${escapeHtml(item.name)}</td>
                <td class="text-muted">${escapeHtml(item.phone)}</td>
                <td class="text-muted">${escapeHtml(item.branch)}</td>
                <td class="text-muted">${escapeHtml(item.contno)}</td>
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

            // แถวใน "รายการลูกค้า" ยังคงอยู่แล้ว (ไม่ได้ถูกย้ายออก) จึงไม่ต้องโหลดใหม่
            // แค่ re-render checkbox หน้าปัจจุบันให้ติ๊กหลุดตาม state ล่าสุด
            if (prospectTable) {
                prospectTable
                    .rows({ page: 'current' })
                    .invalidate('data')
                    .draw(false);
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
    if (!checkAll) return;
    const canSelect = isProspectSelectionAllowed();
    checkAll.disabled = !canSelect;

    // รีเฟรช selectable list ให้ตรงกับตัวกรองปัจจุบัน (recompute เฉพาะเมื่อ search เปลี่ยน)
    refreshSelectableRowIdStrs();

    // ประเมินจากรายการ selectable ที่แคชไว้ (ทุกหน้า) เทียบกับ selection maps โดยตรง (Set lookup)
    const selectable = selectableRowIdStrs;
    let checkedCount = 0;
    for (const idStr of selectable) {
        const isChecked =
            (manuallySelectedCustomers.has(idStr) && !removedBatchCustomerIds.has(idStr)) ||
            (batchMatchIndex.savedIds.has(idStr) && !removedBatchCustomerIds.has(idStr));
        if (isChecked) checkedCount++;
    }

    const allChecked = selectable.length > 0 && checkedCount === selectable.length;
    const someChecked = checkedCount > 0;

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

            startLoading(
                isChecked ? 'กำลังเลือกทั้งหมด...' : 'กำลังยกเลิกการเลือก...',
                'กรุณารอสักครู่'
            );

            // ทำงานหนักแบบ async เพื่อให้ overlay แสดงก่อน แล้วไม่ freeze UI
            setTimeout(() => {
                try {
                    // วนทุกแถวที่ตรงตัวกรอง (ทุกหน้า) จาก DataTables ไม่ใช่แค่ DOM ที่ render อยู่
                    const allItems = getFilteredProspectItems();
                    allItems.forEach(item => {
                        const state = getProspectRowState(item);
                        if (state.idStr && !state.isDisabled) {
                            applyProspectRowSelection(state, isChecked);
                        }
                    });

                    // ไม่ย้ายแถวออกจาก "รายการลูกค้า" — คงแถวไว้ทั้งหมดและแค่ติ๊ก/ยกเลิกติ๊ก
                    // re-render checkbox หน้าปัจจุบันให้ตรงกับ state ล่าสุด
                    if (prospectTable) {
                        prospectTable
                            .rows({ page: 'current' })
                            .invalidate('data')
                            .draw(false);
                    }

                    updateSelectedList();
                } catch (err) {
                    console.error('Error in select-all:', err);
                } finally {
                    stopLoading(true);
                }
            }, 0);
        });
    }

    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (!isProspectSelectionAllowed() || this.disabled) {
                return;
            }

            // ดึงข้อมูลแถวจริงจาก DataTables ก่อน (authoritative) เพื่อกัน name/phone/branch เป็น "-"
            let state = null;
            if (prospectTable) {
                const tr = this.closest('tr');
                const rowData = tr ? prospectTable.row(tr).data() : null;
                if (rowData) {
                    state = getProspectRowState(rowData);
                }
            }

            // fallback อ่านจาก data-* ของ checkbox หากดึง row data ไม่ได้
            if (!state) {
                const idStr = this.getAttribute('data-id') ? String(this.getAttribute('data-id')).trim() : '';
                state = {
                    idStr,
                    idno: this.getAttribute('data-idno') || '',
                    name: this.getAttribute('data-name') || '',
                    phone: this.getAttribute('data-phone') || '',
                    branch: this.getAttribute('data-branch') || '',
                    contno: this.getAttribute('data-contno') || '',
                };
            }

            const isChecked = this.checked;

            // ติ๊กสัญญาที่มี idno และ contno ตรงกับรายการที่เลือกอยู่แล้ว -> แจ้งเตือนและยกเลิกการติ๊ก
            if (isChecked && isIdnoContnoAlreadySelected(state.idno, state.contno, state.idStr)) {
                this.checked = false;
                Swal.fire({
                    icon: "warning",
                    title: "แจ้งเตือน",
                    text: "สัญญานี้ได้ถูกบันทึกแล้ว",
                    confirmButtonText: "ตกลง"
                });
                return;
            }

            applyProspectRowSelection(state, isChecked);

            // ไม่ย้ายแถวออกจาก "รายการลูกค้า" แล้ว — คงแถวไว้และแค่ติ๊กถูกเอาไว้
            // เพื่อให้ผู้ใช้ยกเลิกได้โดยเอาติ๊กออกได้ทันที ไม่ต้องโหลดใหม่

            updateSelectedList();
            updateCheckAllStatus();
        });
    });

    updateCheckAllStatus();
    updateSelectedList();
}

// ลบแถวที่ถูกเลือกออกจาก DataTables ตาม idno set (ใช้กับ select-all)
// คืนจำนวนแถวที่ลบจริง
function removeSelectedRowsFromProspectTable(idnoSet) {
    if (!prospectTable || !idnoSet || idnoSet.size === 0) return 0;
    const rows = prospectTable.rows((idx, data) => {
        const idno = normalizeIdno(data && data.idno);
        return idno && idnoSet.has(idno);
    });
    const removedCount = rows.count();
    rows.remove();
    prospectTable.draw(false);
    return removedCount;
}

// ผูกปุ่มหุบ/ขยายการ์ด "เงื่อนไขการคัดเลือกลูกค้าเป้าหมาย"
// เมื่อหุบ การ์ดเงื่อนไขจะเหลือเฉพาะ header ทำให้แถวรายการลูกค้าด้านล่างมีพื้นที่แสดงมากขึ้น
function initFilterCardToggle() {
    const card = document.getElementById('filterCard');
    const header = document.getElementById('filterCardToggle');
    if (!card || !header) return;

    function toggleFilterCard() {
        const collapsed = card.classList.toggle('filter-collapsed');
        header.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }

    header.addEventListener('click', toggleFilterCard);
    header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            toggleFilterCard();
        }
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    const btnClearSelection = document.getElementById('btnClearSelection');

    // หุบ/ขยายการ์ดเงื่อนไขการคัดเลือก เพื่อเพิ่มพื้นที่แสดงรายการลูกค้า
    initFilterCardToggle();

    loadProductStatus();

    //Load Campaign (Batch) List ---
    await loadBatchList(currentBatchPage, currentBatchPageSize);

    //Load Prospect List ---
    await loadProspectList(currentProspectPage, currentProspectPageSize);

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
                dynamicFilterContainer.querySelectorAll('select').forEach(sel => {
                    sel.value = '';
                    // ถ้าเป็น Select2 ต้อง trigger change เพื่อให้ UI อัปเดตตาม
                    if (window.jQuery && $(sel).hasClass('select2-hidden-accessible')) {
                        $(sel).val('').trigger('change');
                    }
                });
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
            if (!isProspectSelectionAllowed()) return;

            // ยกเลิกการเลือกทุกแถวที่ตรงตัวกรอง (ทุกหน้า) ใน state ให้ตรงกับติ๊กที่หลุด
            const allItems = getFilteredProspectItems();
            allItems.forEach(item => {
                const state = getProspectRowState(item);
                if (state.idStr && !state.isDisabled) {
                    applyProspectRowSelection(state, false);
                }
            });

            // re-render checkbox หน้าปัจจุบันให้ติ๊กหลุด ไม่ต้องโหลดข้อมูลใหม่
            if (prospectTable) {
                prospectTable
                    .rows({ page: 'current' })
                    .invalidate('data')
                    .draw(false);
            }

            updateSelectedList();
            updateCheckAllStatus();
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
                    // บันทึกเฉพาะรายการที่ "เพิ่มใหม่" (ยังไม่ถูกบันทึกลง batch) เท่านั้น
                    // รายการที่มีอยู่ใน batch แล้ว (isBatchCustomer === true) ไม่ต้องส่งซ้ำ
                    const newlyAdded = currentSelected.filter(c => c && c.isBatchCustomer === false);

                    // ส่งรายการที่เพิ่มใหม่ไปทั้งหมด ไม่คัด idno/contno ที่ซ้ำกับของเดิมออก
                    // เพื่อให้ข้อมูลครบ (การกันซ้ำใช้เกณฑ์ idno + contno ตอนติ๊กเลือกแล้ว)
                    // เก็บ idno + contno เป็นคู่ในลูปเดียว เพื่อให้ index ของสอง array ตรงกัน
                    const selectedIdnos = [];
                    const selectedContnos = [];
                    newlyAdded.forEach(c => {
                        const idno = normalizeIdno(c.idno);
                        if (!idno) return; // ต้องมี idno เป็น key ในการบันทึก
                        selectedIdnos.push(idno);
                        const contno = normalizeIdno(c.contno);
                        selectedContnos.push(contno && contno !== '-' ? contno : '');
                    });

                    if (selectedIdnos.length === 0) {
                        stopLoading(true);
                        Swal.fire({
                            title: "แจ้งเตือน",
                            text: "ไม่มีรายการที่เพิ่มใหม่สำหรับบันทึก",
                            icon: "info"
                        });
                        return;
                    }

                    let response;
                    let data;

                    if (isCurrentCampaignImport) {
                        const upsertRequest = {
                            Id: selectedIdnos.join(","),
                            productCode: selectedCampaign.code || "",
                            user: "",
                            contno: selectedContnos.join(",")
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
                            idno: selectedIdnos,
                            contno: selectedContnos,
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

async function getProductFilterByGuid(guid) {
    if (!guid) return [];

    try {

        const response = await fetch(`/Campain/GetFilterByGuid?fguid=${encodeURIComponent(guid)}`);
        if (!response.ok) {
            console.error(
                "GetFilterByGuid HTTP error:",
                response.status,
                response.statusText
            );
            return [];
        }

        const data = await response.json();

        return data || [];

    } catch (err) {

        if (err.name === 'AbortError') {
            console.log("GetFilterByGuid request aborted");
            return [];
        }

        console.error("Error in GetFilterByGuid:", err);
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

async function refreshSelectedCampaignCustomers(
    campaign = selectedCampaign,
    requestId = currentFilterRequestId
) {
    if (campaign && campaign.code) {
        const campaignCode = campaign.code;
        const isImportCampaign = isCurrentCampaignImport;

        if (isImportCampaign) {
            const response = await getCampaignDataForETL(campaignCode);
            if (requestId !== currentFilterRequestId || selectedCampaign?.code !== campaignCode) return;

            currentSelectedPage = 1;
            const etlResult = response ? (response.IsBatch) : null;
            currentBatchCustomers = extractCustomers(etlResult);
            currentProductBatches = [];
            updateSelectedList();
        } else {
            const batchRes = await getProductBatchByProductCode(campaignCode);
            if (requestId !== currentFilterRequestId || selectedCampaign?.code !== campaignCode) return;

            currentSelectedPage = 1;
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
            const name = item?.nameCus || '-';
            const phone = item?.mobile || item?.phone || '-';
            const branch = item?.branchName || item?.Branch_name || item?.BranchName ||  '-';
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