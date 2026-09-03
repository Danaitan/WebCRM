const pageSize = 5;
let page = 1;
let campaigns = [];
let selectedCampaignCode = "";
let selectedCampaignCreatedBy = "";
let campaignTable;
let masterData = null;

let prospectPage = 1;
let prospectPageSize = 5;
let prospectTotalCount = 0;
let rawProspectItems = [];

async function getCampaignDataForETL(productCode) {
    try {
        const response = await fetch(`/ProspectSetup/getCampaignDataForETL?productCode=${encodeURIComponent(productCode)}`);
        if (!response.ok) {
            console.error("getCampaignDataForETL HTTP error:", response.status, response.statusText);
            return null;
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error in getCampaignDataForETL:", error);
        return null;
    }
}

async function PostNoti(PostNotiData){
    try {
        if (!PostNotiData.receiver && !PostNotiData.receiver_email) {
            console.warn("PostNoti skipped: Both receiver and receiver_email are empty.");
            return null;
        }
        const payload = {
            header: PostNotiData.header || "",
            title: PostNotiData.title || "",
            message: PostNotiData.message || "",
            receiver: PostNotiData.receiver || "",
            sender: PostNotiData.sender || "",
            create_by: PostNotiData.create_by || "",
            end_date: PostNotiData.end_date,
            receiver_email: PostNotiData.receiver_email || ""
        };

        const response = await fetch('/Suggestions/PostNotification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            skipLoading: true
        });
        return response;
    } catch (error) {
        console.error("Error in PostNotification:", error);
    }
}

async function getBranchList(){
    try{
        const response = await fetch(`/Campain/getBranchListForCRM`);
        if (!response.ok) {
            console.error("getMaster HTTP error:", response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        return data || [];
    }catch(err){
        console.error("Error in getMaster:", err);
        return [];
    }
}

function renderBranchOptions(branches) {
    const branchSelect = document.getElementById('filterBranch');
    if (!branchSelect) return;
    branchSelect.innerHTML = '<option value="">ทั้งหมด</option>';

    if (Array.isArray(branches) && branches.length > 0) {
        const currentCompany = ((typeof userCompany !== 'undefined' ? userCompany : (window.CURRENT_COMPANY || "")) || "").trim().toUpperCase();

        let filteredBranches = branches;
        if (currentCompany) {
            const matchingCompanyDepts = branches.filter(item => item && item.company && item.company.trim().toUpperCase() === currentCompany);
            if (matchingCompanyDepts.length > 0) {
                filteredBranches = matchingCompanyDepts;
            }
        }

        const uniqueBranches = [];
        const addedCodes = new Set();

        filteredBranches.forEach(item => {
            if (!item) return;

            const offcde = (typeof item === 'string'
                ? item
                : (item.offcde || '')
            ).trim();

            const branchName = (typeof item === 'string'
                ? item
                : (item.branch_name || '')
            ).trim();

            if (offcde && !addedCodes.has(offcde)) {
                addedCodes.add(offcde);
                uniqueBranches.push({
                    offcde: offcde,
                    name: branchName || offcde
                });
            }
        });

        uniqueBranches.forEach(branchItem => {
            const option = document.createElement('option');
            option.value = branchItem.offcde;
            option.textContent = branchItem.name;
            branchSelect.appendChild(option);
        });
    }
}

async function SearchCampaign() {
    page = 1;
    const searchText = $("#campaignSearch").val() ? $("#campaignSearch").val().trim() : "";
    if (typeof campaignTable !== "undefined" && campaignTable) {
        campaignTable.page(0).draw(false);
    } else {
        await loadBatchList(1, currentBatchPageSize, searchText);
    }
}

function reloadCampaignComponent() {
    if (typeof campaignTable !== "undefined" && campaignTable) {
        campaignTable.ajax.reload(null, false);
    } else {
        if (selectedCampaignCode) {
            loadProspectApproveData(selectedCampaignCode, prospectPage, prospectPageSize);
        }
    }
}

// Fetch prospect batch for selected campaign from API
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

async function getProspectCustomerView(productBatch) {
    try {
        const response = await fetch(`/ProductApprove/GetProspectCustomerView?productBatch=${encodeURIComponent(productBatch)}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (err) {
        console.error("Error in getProspectCustomerView:", err);
        return null;
    }
}

// Extract prospect items from API result
function extractProspectCustomers(data) {
    if (!data) return { items: [], totalCount: 0 };
    let raw = data;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return { items: [], totalCount: 0 }; }
    }

    let items = [];
    const seenKeys = new Set();

    const checkAndPush = (item) => {
        if (!item) return;

        // Check nested arrays
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
        if (Array.isArray(item.IsBatch?.data)) {
            item.IsBatch.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.isBatch?.data)) {
            item.isBatch.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.IsNotBatch?.data)) {
            item.IsNotBatch.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.isNotBatch?.data)) {
            item.isNotBatch.data.forEach(c => checkAndPush(c));
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
        if (Array.isArray(item.ObjectCustomer)) {
            item.ObjectCustomer.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.objectCustomer)) {
            item.objectCustomer.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.prospects)) {
            item.prospects.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.batches)) {
            item.batches.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.productBatch)) {
            item.productBatch.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.prospectBatch)) {
            item.prospectBatch.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.data)) {
            item.data.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.result)) {
            item.result.forEach(c => checkAndPush(c));
            return;
        }
        if (Array.isArray(item.items)) {
            item.items.forEach(c => checkAndPush(c));
            return;
        }

        // Check nested single objects
        if (item.Customer && typeof item.Customer === 'object') {
            checkAndPush(item.Customer);
            return;
        }
        if (item.customer && typeof item.customer === 'object') {
            checkAndPush(item.customer);
            return;
        }
        if (item.ObjectCustomer && typeof item.ObjectCustomer === 'object') {
            checkAndPush(item.ObjectCustomer);
            return;
        }
        if (item.objectCustomer && typeof item.objectCustomer === 'object') {
            checkAndPush(item.objectCustomer);
            return;
        }
        if (item.IsBatch && typeof item.IsBatch === 'object') {
            checkAndPush(item.IsBatch);
            return;
        }
        if (item.isBatch && typeof item.isBatch === 'object') {
            checkAndPush(item.isBatch);
            return;
        }
        if (item.IsNotBatch && typeof item.IsNotBatch === 'object') {
            checkAndPush(item.IsNotBatch);
            return;
        }
        if (item.isNotBatch && typeof item.isNotBatch === 'object') {
            checkAndPush(item.isNotBatch);
            return;
        }
        if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
            checkAndPush(item.data);
            return;
        }

        if (typeof item === 'object') {
            const idno = item.idno || item.id_no || item.IdNo || item.IDNO || '';
            const id = item.id || item.Id || item.prospect_id || item.prospectId || item.ID || '';
            const name = item.nameCus || item.customer_name || item.customerName || item.name || item.cus_name || item.fullname || item.FullName || item.CustomerName || item.Name || item.CustName || item.cust_name || item.ชื่อลูกค้า || '-';
            const contract = item.contno || item.contract_no || item.contractNo || item.contract || item.ContNo || item.เลขที่สัญญา || '-';
            const branch = item.branch_Name || item.branch_name || item.branchName || item.branch || item.BranchName || item.ชื่อสาขาเดิม || item.ชื่อสาขา || item.branch_title || item.offcde || '-';
            const offcde = item.offcde || item.contractoffcde || item.contractOffCde || item.branch_offcde || item.branchOffcde || item.branch_code || item.branchCode || '';
            const carLocation = item.provinceUsecar || item.provinceUseCar || item.ProvinceUseCar || item.province_usecar || item.carLocation || item.car_location || item.carLocation_name || item.province || item.สถานที่ใช้รถ || '-';
            const createdDate = item.created || item.created_date || item.createdDate || item.Created || item.ImportDate || item.import_date || item.importDate || item.date || item.วันที่เลือกข้อมูล || '-';
            const createdBy = item.created_by || item.createdBy || item.createrd_by || item.CreaterdBy || item.create_by || item.createBy || item.staffName || item.StaffName || item.staff_name || item.createrd_by_name || item.ผู้เลือกข้อมูล || '-';

            const cleanName = String(name || '').trim();
            const cleanContract = String(contract || '').trim();
            const cleanId = String(id || '').trim();
            const cleanIdno = String(idno || '').trim();

            if (cleanId || cleanIdno || (cleanName && cleanName !== '-') || (cleanContract && cleanContract !== '-')) {
                const uniqueKey = cleanId ? `id_${cleanId}` : (cleanIdno ? `idno_${cleanIdno}_${cleanContract}` : `${cleanName}_${cleanContract}`);
                if (!seenKeys.has(uniqueKey)) {
                    seenKeys.add(uniqueKey);
                    items.push({
                        id: cleanId,
                        idno: cleanIdno,
                        branch: String(branch || '-').trim(),
                        offcde: String(offcde || '').trim(),
                        name: cleanName,
                        contract: cleanContract,
                        carLocation: String(carLocation || '-').trim(),
                        createdDate: String(createdDate || '-').trim(),
                        createdBy: String(createdBy || '-').trim(),
                        raw: item
                    });
                }
            }
        }
    };

    if (Array.isArray(raw)) {
        raw.forEach(i => checkAndPush(i));
    } else if (typeof raw === 'object') {
        if (Array.isArray(raw.data)) {
            raw.data.forEach(i => checkAndPush(i));
        } else if (raw.data && typeof raw.data === 'object') {
            checkAndPush(raw.data);
        } else if (Array.isArray(raw.result)) {
            raw.result.forEach(i => checkAndPush(i));
        } else {
            checkAndPush(raw);
        }
    }

    let totalCount = items.length;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const rawTotal = raw.Customer?.total ?? raw.total ?? raw.count;
        if (typeof rawTotal === 'number' && rawTotal > totalCount) {
            totalCount = rawTotal;
        }
    }

    return { items, totalCount };
}

function formatDateTime(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '-';
    try {
        var str = String(dateStr).trim();
        if (!str || str === '-') return '-';

        let d;
        if (/^\d+$/.test(str)) {
            d = new Date(parseInt(str, 10));
        } else {
            let parsedStr = str;
            const yearMatch = str.match(/^(\d{4})[-/]/);
            if (yearMatch && parseInt(yearMatch[1], 10) > 2400) {
                const gregorianYear = parseInt(yearMatch[1], 10) - 543;
                parsedStr = gregorianYear + str.substring(4);
            }
            d = new Date(parsedStr);
        }

        if (d && !isNaN(d.getTime())) {
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            const parts = formatter.formatToParts(d);
            const getPart = (type) => (parts.find(p => p.type === type)?.value || '');
            const day = getPart('day');
            const month = getPart('month');
            const year = getPart('year');
            const hour = getPart('hour');
            const minute = getPart('minute');
            if (day && month && year && hour && minute) {
                return `${day}/${month}/${year} ${hour}:${minute}`;
            }
        }
    } catch (e) {
        console.error("Error formatting date time:", e);
    }

    var rawStr = String(dateStr).trim();
    if (rawStr.includes('T')) {
        var parts = rawStr.split('T');
        var datePart = formatDate(parts[0]);
        var timePart = parts[1] ? parts[1].substring(0, 5) : '';
        return timePart ? `${datePart} ${timePart}` : datePart;
    }
    if (rawStr.includes(' ')) {
        var parts = rawStr.split(' ');
        var datePart = formatDate(parts[0]);
        var timePart = parts[1] ? parts[1].substring(0, 5) : '';
        return timePart ? `${datePart} ${timePart}` : datePart;
    }
    return formatDate(rawStr);
}

async function loadProspectApproveData(productCode, page = 1, pageSize = 5) {
    if (!productCode) {
        rawProspectItems = [];
        prospectTotalCount = 0;
        filterProspectTable();
        return;
    }

    prospectPage = page;
    prospectPageSize = pageSize;

    const tbody = document.getElementById('prospectTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-hourglass-split me-1"></i> กำลังโหลดข้อมูล Prospect...</td></tr>`;
    }

    let items = [];
    let totalCount = 0;

    // 1. Try getProductBatchByProductCode first
    try {
        const batchRes = await getProductBatchByProductCode(productCode);
        const parsedBatch = extractProspectCustomers(batchRes);
        if (parsedBatch.items && parsedBatch.items.length > 0) {
            items = parsedBatch.items;
            totalCount = parsedBatch.totalCount;
        }
    } catch (e) {
        console.error("Error fetching product batch:", e);
    }

    // 2. If no items, try getCampaignDataForETL (for import campaigns or ETL data)
    if (!items || items.length === 0) {
        try {
            const etlRes = await getCampaignDataForETL(productCode);
            if (etlRes) {
                const parsedEtl = extractProspectCustomers(etlRes);
                if (parsedEtl.items && parsedEtl.items.length > 0) {
                    items = parsedEtl.items;
                    totalCount = parsedEtl.totalCount;
                }
            }
        } catch (e) {
            console.error("Error fetching ETL data:", e);
        }
    }

    // 3. Fallback to GetProspectCustomerView if still no items
    if (!items || items.length === 0) {
        try {
            const viewRes = await getProspectCustomerView(productCode);
            if (viewRes) {
                const parsedView = extractProspectCustomers(viewRes);
                if (parsedView.items && parsedView.items.length > 0) {
                    items = parsedView.items;
                    totalCount = parsedView.totalCount;
                }
            }
        } catch (e) {
            console.error("Error fetching ProspectCustomerView:", e);
        }
    }

    rawProspectItems = items;
    prospectTotalCount = totalCount || items.length;

    filterProspectTable();
}

// Colour palette cycling for campaign cards
const iconColors = ['blue', 'green', 'yellow', 'purple', 'red'];

function getObjectiveBadge(obj) {
    const map = {
        'CS': { text: 'CS', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' },
        'MC': { text: 'MC', class: 'bg-warning-subtle text-warning border-warning-subtle', iconBg: 'yellow' },
        'RM': { text: 'RM', class: 'bg-info-subtle text-info border-info-subtle', iconBg: 'blue' },
        'FL': { text: 'FL', class: 'bg-orange-subtle text-orange border-orange-subtle', iconBg: 'orange' }
    };
    return map[obj] || { text: obj || 'CS', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' };
}

// Map status → badge CSS class
function statusClass(status) {
    if (!status) return 'status-green';
    var s = String(status).trim().toLowerCase();
    var normalized = s.replace(/_/g, ' ');
    if (normalized === 'reject' || normalized === 'rejected' || normalized === 'ไม่อนุมัติ' || normalized === 'cancel' || normalized === 'cancelled' || normalized === 'ยกเลิก') {
        return 'status-red';
    }
    if (normalized === 'approve' || normalized === 'approved' || normalized === 'อนุมัติ' || normalized === 'อนุมัติแล้ว' || normalized === 'active' || normalized === 'ปกติ') {
        return 'status-green';
    }
    if (normalized === 'waiting prospect' || normalized === 'waiting prospect (prospect setup)' || normalized === 'รอข้อมูลเพิ่มเติม') {
        return 'status-yellow';
    }
    if (normalized === 'waiting approve' || normalized === 'waiting approval' || normalized === 'รออนุมัติ' || normalized === 'กำลังพิจารณา') {
        return 'status-blue';
    }
    if (normalized === 'draft' || normalized === 'ร่าง' || normalized === 'inactive') {
        return 'status-gray';
    }
    return 'status-blue';
}

// format date from YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr === 'null' || dateStr === 'undefined') return '';
    try {
        var str = String(dateStr).trim();
        if (!str || str === '-') return '';

        if (str.includes('T')) str = str.split('T')[0];
        else if (str.includes(' ')) str = str.split(' ')[0];

        var parts = str.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
            let year = parseInt(parts[0], 10);
            if (year > 2400) year -= 543;
            return parts[2].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + year;
        }
        return str;
    } catch (e) {
        console.error("Error formatting date:", e);
    }
    return String(dateStr || '');
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
                        .attr("title", "คลิกเพื่อดาวน์โหลดไฟล์");
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
    if (filePath) {
        window.open(`/Campain/DownloadFile?filePath=${encodeURIComponent(filePath)}&fileName=${encodeURIComponent(fileName)}`, '_blank');
    }
});

// Check if campaign status is waiting approve
function isWaitingApprove(status) {
    if (!status) return false;
    const s = String(status).trim().toLowerCase();
    return s === 'waiting approve' || s === 'รออนุมัติ' || s === 'waiting_approve';
}

function updateActionButtons(campaign) {
    const canApprove = campaign && isWaitingApprove(campaign.status);
    $("#btnApprove, .btn-pa-approve, #btnReject, .btn-pa-reject, #btnReturn, .btn-pa-return").prop("disabled", !canApprove);
}

// Update detail panel from a campaign object
function updateDetailPanel(campaign) {
    if (!campaign) {
        if (document.getElementById('detailId')) document.getElementById('detailId').value = '';
        if (document.getElementById('detailName')) document.getElementById('detailName').value = '';
        if (document.getElementById('detailStart')) document.getElementById('detailStart').value = '';
        if (document.getElementById('detailEnd')) document.getElementById('detailEnd').value = '';
        if (document.getElementById('detailNote')) document.getElementById('detailNote').value = '';
        if (document.getElementById('detailObjective')) document.getElementById('detailObjective').value = '';
        const detailStatus = document.getElementById('detailStatus');
        if (detailStatus) {
            detailStatus.textContent = '';
            detailStatus.className = 'pa-status-box';
        }
        updateActionButtons(null);
        return;
    }
    const id = campaign.code || '';
    const name = campaign.name || '';
    const start = campaign.startDate || '';
    const end = campaign.endDate || '';
    const status = campaign.status || '';
    const note = campaign.remark || '-';
    const objective = campaign.objective || '';

    selectedCampaignCreatedBy = campaign.createdBy || '';
    const detailId = document.getElementById('detailId');
    if (detailId) detailId.value = id;

    const detailName = document.getElementById('detailName');
    if (detailName) {
        detailName.value = name;
        detailName.title = name;
    }

    const detailStart = document.getElementById('detailStart');
    if (detailStart) detailStart.value = formatDate(start);

    const detailEnd = document.getElementById('detailEnd');
    if (detailEnd) detailEnd.value = formatDate(end);

    const detailNote = document.getElementById('detailNote');
    if (detailNote) detailNote.value = note;

    const detailObjective = document.getElementById('detailObjective');
    if (detailObjective) detailObjective.value = objective;

    const detailStatus = document.getElementById('detailStatus');
    if (detailStatus) {
        detailStatus.textContent = status;
        detailStatus.className = 'pa-status-box ' + statusClass(status);
    }

    displayCampaignFile(campaign.file_id);
    updateActionButtons(campaign);
}

// Fetch campaign list from API with page and pageSize
async function getCampainList(page, pageSize) {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        const queryParams = [];

        if (page !== undefined && pageSize !== undefined) {
            queryParams.push(`page=${encodeURIComponent(page)}`);
            queryParams.push(`pageSize=${encodeURIComponent(pageSize)}`);
        }

        const filterStatusEl = document.getElementById('filterStatus');
        let status = "waiting approve,approved";
        if (filterStatusEl && filterStatusEl.value) {
            status = filterStatusEl.value;
        }
        queryParams.push(`status=${encodeURIComponent(status)}`);

        const campaignSearchInput = document.getElementById('campaignSearch');
        if (campaignSearchInput && campaignSearchInput.value.trim()) {
            queryParams.push(`search=${encodeURIComponent(campaignSearchInput.value.trim())}`);
        }

        const filterStartDateEl = document.getElementById('filterStartDate');
        if (filterStartDateEl && filterStartDateEl.value) {
            queryParams.push(`startDate=${encodeURIComponent(filterStartDateEl.value)}`);
        }

        const filterEndDateEl = document.getElementById('filterEndDate');
        if (filterEndDateEl && filterEndDateEl.value) {
            queryParams.push(`endDate=${encodeURIComponent(filterEndDateEl.value)}`);
        }

        const filterBranchEl = document.getElementById('filterBranch');
        if (filterBranchEl && filterBranchEl.value) {
            queryParams.push(`branch=${encodeURIComponent(filterBranchEl.value)}`);
        }

        const filterByEl = document.getElementById('filterBy');
        if (filterByEl && filterByEl.value) {
            queryParams.push(`createdBy=${encodeURIComponent(filterByEl.value)}`);
        }

        const queryStr = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

        const response = await fetch(`/Campain/GetCampainList${queryStr}`);
        if (!response.ok) throw new Error("Failed to fetch campaigns list");
        const jsonResult = await response.json();
        const items = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : (Array.isArray(jsonResult) ? jsonResult : []);
        const mapped = items.map(item => ({
            code:          item.product_code   || item.ProductCode || '',
            name:          item.product_name   || item.ProductName || '',
            status:        item.product_status || item.ProductStatus || 'ปกติ',
            startDate:     item.product_start  ? String(item.product_start).substring(0, 10) : '',
            endDate:       item.product_end    ? String(item.product_end).substring(0, 10) : '',
            remark:        item.product_remark || item.ProductRemark || '',
            createdBy:     item.createrd_by    || item.created_by || item.CreatedBy || '',
            createdByName: item.createrd_by_name || item.CreaterdByName || item.createrd_by || item.created_by || item.CreatedBy || '',
            company:       item.product_company || item.ProductCompany || '',
            created:       item.created        ? String(item.created).substring(0, 10) : '',
            objective:     item.Objective_code || item.ObjectiveCode || '',
            file_id:       item.file_id || "",
            IsImport:      item.IsImport || false
        }));
        return {
            page: jsonResult.page ?? (page ? parseInt(page) : 1),
            pageSize: jsonResult.pageSize ?? (pageSize ? parseInt(pageSize) : mapped.length),
            count: jsonResult.count ?? mapped.length,
            data: mapped
        };
    } catch (error) {
        console.error(error);
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    } finally {
        stopLoading();
    }
}

function initDataTables() {
    campaignTable = $("#campaignsTable").DataTable({
        serverSide: true,
        processing: false,
        autoWidth: false,
        pageLength: pageSize,
        ordering: true,
        dom: '<"campaign-list-container"t><"campaign-pagination-wrapper"p>',
        language: {
            infoEmpty: "ไม่พบรายการ",
            emptyTable: `<div class="text-center py-4 text-muted" style="font-size: 0.85rem;">
                            <i class="bi bi-emoji-neutral fs-4 d-block mb-1"></i>
                            ไม่พบรายการ
                        </div>`,
            paginate: {
                previous: '<i class="bi bi-chevron-left"></i>',
                next: '<i class="bi bi-chevron-right"></i>'
            }
        },
        ajax: async function (data, callback, settings) {
            const requestedPage = Math.floor(data.start / data.length) + 1;
            page = requestedPage;
            try {
                const res = await getCampainList(page, pageSize);
                const rawItems = Array.isArray(res) ? res : (res.data || []);
                campaigns = rawItems;
                const totalCount = res.count !== undefined ? res.count : rawItems.length;
                $("#campaignCount").text(totalCount);

                if (rawItems.length > 0) {
                    const exists = rawItems.some(c => c.code === selectedCampaignCode);
                    if (!exists || !selectedCampaignCode) {
                        selectedCampaignCode = rawItems[0].code;
                        updateDetailPanel(rawItems[0]);
                        loadProspectApproveData(rawItems[0].code, 1, prospectPageSize);
                    } else {
                        const currentCampaign = rawItems.find(c => c.code === selectedCampaignCode);
                        if (currentCampaign) updateDetailPanel(currentCampaign);
                        loadProspectApproveData(selectedCampaignCode, prospectPage, prospectPageSize);
                    }
                } else {
                    selectedCampaignCode = "";
                    updateDetailPanel(null);
                    loadProspectApproveData("", 1, prospectPageSize);
                }

                callback({
                    draw: data.draw,
                    recordsTotal: totalCount,
                    recordsFiltered: totalCount,
                    data: rawItems
                });
            } catch (err) {
                console.error("Error fetching DataTables page:", err);
                callback({
                    draw: data.draw,
                    recordsTotal: 0,
                    recordsFiltered: 0,
                    data: []
                });
            }
        },
        columns: [
            { 
                data: null,
                orderable: false,
                render: function (data, type, row) {
                    if (!row || !row.code) return '';
                    const item = row;
                    const isActive = item.code === selectedCampaignCode;
                    const activeClass = isActive ? 'active' : '';
                    const idx = campaigns.findIndex(c => c.code === item.code);
                    const color = iconColors[idx >= 0 ? idx % iconColors.length : 0] || 'blue';
                    const statusBadgeClass = statusClass(item.status);
                    const startFmt = formatDate(item.startDate);
                    const endFmt = formatDate(item.endDate);
                    const objBadge = getObjectiveBadge(item.objective);
                    const safeName = (item.name || '').replace(/"/g, '&quot;');
                    const safeCode = (item.code || '').replace(/"/g, '&quot;');
                    const safeStatus = item.status || '';
                    const safeCompany = (item.company || '').replace(/"/g, '&quot;');
                    const safeCreatedByName = (item.createdByName || '').replace(/"/g, '&quot;');

                    return `
                    <div class="pa-card ${activeClass}" data-code="${safeCode}">
                        <div class="pa-card-icon ${objBadge.iconBg} flex-shrink-0 fw-bold">${objBadge.text}</div>
                        <div class="pa-card-content">
                            <div class="d-flex justify-content-between align-items-center mb-1 gap-2 min-w-0 w-100">
                                <div class="pa-card-name" title="${safeName}">${item.name || ''}</div>
                                <span class="badge pa-status-badge ${statusBadgeClass} border px-2 py-0.5 rounded-pill extra-small flex-shrink-0">${safeStatus}</span>
                            </div>
                            <div class="d-flex align-items-center gap-1.5 mb-1 flex-wrap">
                                <span class="pa-card-id badge bg-light text-primary border px-2 py-0.5 extra-small">${safeCode}</span>
                                ${safeCompany ? `<span class="badge bg-light text-secondary border px-2 py-0.5 extra-small" title="บริษัท">${safeCompany}</span>` : ''}
                            </div>
                            ${safeCreatedByName ? `
                            <div class="d-flex align-items-center mb-1 min-w-0 w-100">
                                <span class="badge bg-light text-muted border px-2 py-0.5 extra-small text-truncate" style="max-width: 100%;" title="ผู้สร้าง: ${safeCreatedByName}"><i class="bi bi-person me-1"></i>${safeCreatedByName}</span>
                            </div>
                            ` : ''}
                            <div class="pa-card-date" title="เริ่ม: ${startFmt} • สิ้นสุด: ${endFmt}">เริ่ม: ${startFmt} • สิ้นสุด: ${endFmt}</div>
                        </div>
                    </div>
                    `;
                }
            },
            { data: 'code', visible: false },
            { data: 'name', visible: false },
            { data: 'status', visible: false },
            { data: 'startDate', visible: false },
            { data: 'endDate', visible: false },
            { data: 'remark', visible: false }
        ],
        order: [[1, 'asc']]
    });
}

function filterProspectTable() {
    var prospectSearchInput = document.getElementById('prospectSearch');
    var query  = prospectSearchInput ? prospectSearchInput.value.trim().toLowerCase() : '';
    var branch = document.getElementById('filterBranch') ? document.getElementById('filterBranch').value : '';
    var byUser = document.getElementById('filterBy') ? document.getElementById('filterBy').value : '';

    var tbody = document.getElementById('prospectTableBody');
    if (!tbody) return;

    var filteredItems = rawProspectItems.filter(function (item) {
        var matchText = !query ||
            item.branch.toLowerCase().includes(query) ||
            item.name.toLowerCase().includes(query) ||
            item.contract.toLowerCase().includes(query) ||
            item.carLocation.toLowerCase().includes(query) ||
            item.createdBy.toLowerCase().includes(query);

        var matchBranch = !branch ||
            item.branch === branch ||
            item.offcde === branch ||
            (item.raw && (item.raw.offcde === branch || item.raw.contractoffcde === branch || item.raw.branch_offcde === branch || item.raw.branch_Name === branch));
        var matchBy = !byUser || item.createdBy.toLowerCase().includes(byUser.toLowerCase());

        return matchText && matchBranch && matchBy;
    });

    var total = filteredItems.length;
    var totalPages = Math.ceil(total / prospectPageSize) || 1;
    if (prospectPage > totalPages) {
        prospectPage = 1;
    }

    var start = (prospectPage - 1) * prospectPageSize;
    var end = start + prospectPageSize;
    var pagedItems = filteredItems.slice(start, end);

    if (pagedItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-emoji-neutral me-1"></i> ไม่พบรายการ Prospect</td></tr>`;
    } else {
        var html = '';
        pagedItems.forEach(function (item, index) {
            var seq = start + index + 1;
            var dtStr = formatDateTime(item.createdDate);
            html += `
                <tr data-branch="${item.branch}" data-name="${item.name}" data-contract="${item.contract}" data-by="${item.createdBy}">
                    <td style="text-align: center;">${seq}</td>
                    <td>${item.branch}</td>
                    <td>${item.name}</td>
                    <td>${item.contract}</td>
                    <td>${item.carLocation}</td>
                    <td>${dtStr}</td>
                    <td>${item.createdBy}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    var badge = document.getElementById('prospectApproveTotalBadge');
    if (badge) {
        badge.textContent = 'ทั้งหมด ' + total + ' รายการ';
    }

    var startIdx = total > 0 ? start + 1 : 0;
    var endIdx = total > 0 ? Math.min(start + pagedItems.length, total) : 0;
    var prospectPaginationText = document.getElementById('prospectPaginationText');
    if (prospectPaginationText) {
        prospectPaginationText.textContent = total > 0
            ? `แสดง ${startIdx} - ${endIdx} จาก ${total} รายการ`
            : `แสดง 0 จาก 0 รายการ`;
    }

    renderProspectPaginationControls(total);
}

function renderProspectPaginationControls(total) {
    const controls = document.getElementById('prospectPaginationControls');
    if (!controls) return;

    const totalPages = Math.ceil(total / prospectPageSize) || 1;
    let html = '';

    const prevDisabled = prospectPage <= 1 ? 'disabled' : '';
    html += `<button class="pa-page-btn" id="prospectPrevBtn" ${prevDisabled}><i class="bi bi-chevron-left"></i></button>`;

    for (let p = 1; p <= totalPages; p++) {
        if (p === 1 || p === totalPages || (p >= prospectPage - 1 && p <= prospectPage + 1)) {
            const activeClass = p === prospectPage ? 'active' : '';
            html += `<button class="pa-page-btn ${activeClass}" data-page="${p}">${p}</button>`;
        } else if (p === prospectPage - 2 || p === prospectPage + 2) {
            html += `<span class="px-1 text-muted">...</span>`;
        }
    }

    const nextDisabled = prospectPage >= totalPages ? 'disabled' : '';
    html += `<button class="pa-page-btn" id="prospectNextBtn" ${nextDisabled}><i class="bi bi-chevron-right"></i></button>`;

    controls.innerHTML = html;
}

function applyAllFilters() {
    page = 1;
    if (typeof campaignTable !== "undefined" && campaignTable) {
        campaignTable.page(0).draw(false);
    }
    filterProspectTable();
}

function clearAllFilters() {
    const ids = ['filterStartDate', 'filterEndDate', 'filterStatus', 'filterBranch', 'filterBy', 'campaignSearch', 'prospectSearch'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    applyAllFilters();
}

$(document).ready(async function () {
    initDataTables();
    branch = await getBranchList();
    if (branch) {
        renderBranchOptions(branch);
    }
    $("#campaignsTable").on("click", ".pa-card, tbody tr", function () {
        const card = $(this).hasClass("pa-card") ? $(this) : $(this).find(".pa-card");
        if (!card.length) return;
        const code = String(card.data("code"));
        if (!code) return;
        selectedCampaignCode = code;
        $(".pa-card").removeClass("active");
        card.addClass("active");
        const campaign = campaigns.find(c => c.code === code);
        if (campaign) {
            updateDetailPanel(campaign);
            loadProspectApproveData(campaign.code, 1, prospectPageSize);
        }
    });

    $("#prospectPaginationControls").on("click", ".pa-page-btn", function (e) {
        e.preventDefault();
        if ($(this).attr("disabled") || $(this).prop("disabled")) return;

        const totalPages = Math.ceil(rawProspectItems.length / prospectPageSize) || 1;
        if (this.id === "prospectPrevBtn") {
            if (prospectPage > 1) {
                prospectPage--;
                filterProspectTable();
            }
        } else if (this.id === "prospectNextBtn") {
            if (prospectPage < totalPages) {
                prospectPage++;
                filterProspectTable();
            }
        } else {
            const targetPage = parseInt($(this).data("page"), 10);
            if (targetPage && targetPage !== prospectPage) {
                prospectPage = targetPage;
                filterProspectTable();
            }
        }
    });

    $("#prospectPageSizeSelect").on("change", function () {
        prospectPageSize = parseInt($(this).val(), 10) || 5;
        prospectPage = 1;
        filterProspectTable();
    });

    $("#btnSearch, #btnSearchbtn").off("click").on("click", function (e) {
        e.preventDefault();
        applyAllFilters();
    });


    $("#campaignSearch, #filterBy, #prospectSearch, #filterStartDate, #filterEndDate").off("keydown").on("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
            e.preventDefault();
            applyAllFilters();
        }
    });

    const btnClear = document.getElementById('btnClearFilter');
    if (btnClear) btnClear.addEventListener('click', clearAllFilters);

    // Action Footer Button Event Handlers with SweetAlert Confirmations
    $("#btnApprove, .btn-pa-approve").on("click", function () {
        if ($(this).is(":disabled") || $(this).prop("disabled")) return;
        const currentCampaign = campaigns.find(c => c.code === selectedCampaignCode);
        if (currentCampaign && !isWaitingApprove(currentCampaign.status)) return;
        const code = $("#detailId").val() || selectedCampaignCode || "";
        const name = $("#detailName").val() || "";
        const label = code ? `${code} (${name})` : "รายการนี้";

        Swal.fire({
            title: 'ยืนยันการอนุมัติ',
            html: `คุณต้องการอนุมัติ <b>${label}</b> ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="bi bi-check2 me-1"></i> ยืนยันอนุมัติ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            focusCancel: true
        }).then(async (result) => {
            if (result.isConfirmed) {
                startLoading("กำลังส่งอนุมัติ...", "");
                try {
                    var request = {
                        product_code: code || "",
                        status: "approved",
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
                    if (!response.ok || (data && data.status === false)) {
                        const errorMsg = (data && data.message) ? data.message : `ไม่สามารถส่งอนุมัติข้อมูลได้ (${response.status} ${response.statusText})`;
                        stopLoading(true);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
                        const Content =
                            `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Campaign <b>${code} (${name})</b> ได้รับการอนุมัติเรียบร้อยแล้ว<br><br>` +
                            `ขอขอบคุณ<br>` +
                            `${fullNameTh}`;

                        const endDate = new Date();
                        endDate.setFullYear(endDate.getFullYear() + 10);

                        const senderId = typeof userId !== 'undefined' ? userId : '';
                        const receiver = selectedCampaignCreatedBy;
                        if (receiver) {
                            await PostNoti({
                                header: "Campaign",
                                title: `Campaign ${code} (${name})`,
                                message: Content,
                                receiver: receiver,
                                sender: senderId,
                                create_by: senderId,
                                end_date: endDate,
                            });
                        }

                        stopLoading(true);
                        Swal.fire({
                            title: 'อนุมัติเรียบร้อย!',
                            text: `ดำเนินการอนุมัติ ${code || 'รายการ'} เสร็จสิ้น`,
                            icon: 'success',
                            confirmButtonColor: '#10b981',
                            confirmButtonText: 'ตกลง'
                        });
                        reloadCampaignComponent();
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

    $("#btnReject, .btn-pa-reject").on("click", function () {
        if ($(this).is(":disabled") || $(this).prop("disabled")) return;
        const currentCampaign = campaigns.find(c => c.code === selectedCampaignCode);
        if (currentCampaign && !isWaitingApprove(currentCampaign.status)) return;
        const code = $("#detailId").val() || selectedCampaignCode || "";
        const name = $("#detailName").val() || "";
        const label = code ? `${code} (${name})` : "รายการนี้";

        Swal.fire({
            title: 'ยืนยันการไม่อนุมัติ',
            html: `คุณต้องการไม่อนุมัติ <b>${label}</b> ใช่หรือไม่?`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'ระบุสาเหตุการไม่อนุมัติ',
            inputPlaceholder: 'กรอกเหตุผลการไม่อนุมัติที่นี่...',
            inputAttributes: {
                'aria-label': 'กรอกเหตุผลการไม่อนุมัติที่นี่',
                'style': 'resize: none;'
            },
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="bi bi-x-lg me-1"></i> ยืนยันไม่อนุมัติ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            focusCancel: false,
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'กรุณากรอกเหตุผลการไม่อนุมัติ';
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                startLoading("กำลังส่งไม่อนุมัติ...", "");
                try {
                    var request = {
                        product_code: code || "",
                        status: "Cancel",
                        product_remark: result.value,
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
                    if (!response.ok || (data && data.status === false)) {
                        const errorMsg = (data && data.message) ? data.message : `ไม่สามารถส่งไม่อนุมัติข้อมูลได้ (${response.status} ${response.statusText})`;
                        stopLoading(true);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        const remark = result.value || '';
                        const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
                        const Content =
                            `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Campaign <b>${code} (${name})</b> ไม่อนุมัติ<br>` +
                            (remark ? `<b>เหตุผลการไม่อนุมัติ:</b> ${remark}<br><br>` : `<br>`) +
                            `ขอขอบคุณ<br>` +
                            `${fullNameTh}`;

                        const endDate = new Date();
                        endDate.setFullYear(endDate.getFullYear() + 10);

                        const senderId = typeof userId !== 'undefined' ? userId : '';
                        const receiver = selectedCampaignCreatedBy;
                        if (receiver) {
                            await PostNoti({
                                header: "Campaign",
                                title: `Campaign ${code} (${name})`,
                                message: Content,
                                receiver: receiver,
                                sender: senderId,
                                create_by: senderId,
                                end_date: endDate,
                            });
                        }

                        stopLoading(true);
                        Swal.fire({
                            title: 'ไม่อนุมัติเรียบร้อย!',
                            text: `ไม่อนุมัติ ${code || 'รายการ'} เรียบร้อยแล้ว${remark ? ` (หมายเหตุ: ${remark})` : ''}`,
                            icon: 'error',
                            confirmButtonColor: '#ef4444',
                            confirmButtonText: 'ตกลง'
                        });
                        reloadCampaignComponent();
                    }

                } catch (err) {
                    console.error(err);
                    stopLoading(true);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งไม่อนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    stopLoading(true);
                }
            }
        });
    });

    $("#btnReturn, .btn-pa-return").on("click", function () {
        if ($(this).is(":disabled") || $(this).prop("disabled")) return;
        const currentCampaign = campaigns.find(c => c.code === selectedCampaignCode);
        if (currentCampaign && !isWaitingApprove(currentCampaign.status)) return;
        const code = $("#detailId").val() || selectedCampaignCode || "";
        const name = $("#detailName").val() || "";
        const label = code ? `${code} (${name})` : "รายการนี้";

        Swal.fire({
            title: 'ส่งกลับแก้ไข',
            html: `คุณต้องการส่งแก้ไข <b>${label}</b> ใช่หรือไม่?`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'ระบุสาเหตุที่แก้ไข',
            inputPlaceholder: 'กรอกหมายเหตุการแก้ไขที่นี่...',
            inputAttributes: {
                'aria-label': 'กรอกหมายเหตุการส่งแก้ไขที่นี่',
                'style': 'resize: none;'
            },
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="bi bi-x-lg me-1"></i> ยืนยันการส่งกลับแก้ไข',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            focusCancel: false,
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'กรุณากรอกหมายเหตุหรือเหตุผลในการส่งแก้ไข';
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                startLoading("กำลังส่งแก้ไข...", "");
                try {
                    var request = {
                        product_code: code || "",
                        status: "reject",
                        product_remark: result.value,
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

                    if (!response.ok || (data && data.status === false)) {
                        const errorMsg = (data && data.message) ? data.message : `ไม่สามารถส่งแก้ไขได้ (${response.status} ${response.statusText})`;
                        stopLoading(true);
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        const remark = result.value || '';
                        const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
                        const Content =
                            `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Campaign <b>${code} (${name})</b> ได้ถูกส่งกลับให้แก้ไข<br>` +
                            `<b>หมายเหตุการแก้ไข:</b> ${remark}<br><br>` +
                            `ขอขอบคุณ<br>` +
                            `${fullNameTh}`;

                        const endDate = new Date();
                        endDate.setFullYear(endDate.getFullYear() + 10);

                        const senderId = typeof userId !== 'undefined' ? userId : '';
                        const receiver = selectedCampaignCreatedBy;
                        if (receiver) {
                            await PostNoti({
                                header: "Campaign",
                                title: `Campaign ${code} (${name})`,
                                message: Content,
                                receiver: receiver,
                                sender: senderId,
                                create_by: senderId,
                                end_date: endDate,
                            });
                        }

                        stopLoading(true);
                        Swal.fire({
                            title: 'ส่งแก้ไขเรียบร้อย!',
                            text: `ส่งแก้ไข ${code || 'รายการ'} เรียบร้อยแล้ว (หมายเหตุ: ${remark})`,
                            icon: 'warning',
                            confirmButtonColor: '#f59e0b',
                            confirmButtonText: 'ตกลง'
                        });
                        reloadCampaignComponent();
                    }

                } catch (err) {
                    console.error(err);
                    stopLoading(true);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งแก้ไขข้อมูลได้", icon: "error" });
                } finally {
                    stopLoading(true);
                }
            }
        });
    });
});
