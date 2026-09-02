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

// Extract prospect items from API result
function extractProspectCustomers(data) {
    if (!data) return { items: [], totalCount: 0 };
    let raw = data;
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch (e) { return { items: [], totalCount: 0 }; }
    }

    let items = [];
    let totalCount = 0;

    if (raw && typeof raw === 'object') {
        totalCount = raw.Customer?.total ?? raw.total ?? raw.count ?? (Array.isArray(raw.data) ? raw.data.length : (Array.isArray(raw.result) ? raw.result.length : 0));
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
            console.log("item", item);
            const idno = item.idno || '';
            const id = item.id || '';
            const name = item.nameCus || '-';
            const contract = item.contno || '-';
            const branch = item.branch_Name || item.ชื่อสาขาเดิม || '-';
            const offcde = item.offcde || '-';
            const carLocation = item.provinceUsecar || item.provinceUseCar || item.carLocation || item.car_location || '-';
            const createdDate = item.created || item.ImportDate || '-';
            const createdBy = item.created_by || '-';

            if (id || idno || (name && name !== '-')) {
                items.push({
                    id: String(id || '').trim(),
                    idno: String(idno || '').trim(),
                    branch: String(branch).trim(),
                    offcde: String(offcde).trim(),
                    name: String(name).trim(),
                    contract: String(contract).trim(),
                    carLocation: String(carLocation).trim(),
                    createdDate: String(createdDate).trim(),
                    createdBy: String(createdBy).trim(),
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
        } else if (raw.data && typeof raw.data === 'object') {
            checkAndPush(raw.data);
        } else if (Array.isArray(raw.result)) {
            raw.result.forEach(i => checkAndPush(i));
        } else {
            checkAndPush(raw);
        }
    }

    if (totalCount === 0) totalCount = items.length;

    return { items, totalCount };
}

function formatDateTime(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    var str = String(dateStr).trim();
    if (str.includes('T')) {
        var parts = str.split('T');
        var datePart = formatDate(parts[0]);
        var timePart = parts[1] ? parts[1].substring(0, 5) : '';
        return timePart ? `${datePart} ${timePart}` : datePart;
    }
    if (str.includes(' ')) {
        var parts = str.split(' ');
        var datePart = formatDate(parts[0]);
        var timePart = parts[1] ? parts[1].substring(0, 5) : '';
        return timePart ? `${datePart} ${timePart}` : datePart;
    }
    return formatDate(str);
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

    const currentCampaign = campaigns.find(c => c.code === productCode);
    const isImport = currentCampaign ? (currentCampaign.IsImport === true || currentCampaign.IsImport === 'true' || currentCampaign.IsImport === 1 || currentCampaign.IsImport === '1') : false;

    let res = null;
    if (isImport) {
        const etlRes = await getCampaignDataForETL(productCode);
        res = etlRes ? (etlRes.IsBatch || etlRes.isBatch || etlRes.is_batch || etlRes) : null;
    } else {
        res = await getProductBatchByProductCode(productCode);
    }

    const { items, totalCount } = extractProspectCustomers(res);

    rawProspectItems = items;
    prospectTotalCount = totalCount;

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
    var map = {
        'กำลังพิจารณา':    'status-blue',
        'รอข้อมูลเพิ่มเติม': 'status-yellow',
        'รออนุมัติ':        'status-purple',
        'อนุมัติแล้ว':      'status-green',
        'ไม่อนุมัติ':       'status-red',
        'ปกติ':             'status-blue'
    };
    return map[status] || 'status-blue';
}

// format date from YYYY-MM-DD to DD/MM/YYYY
function formatDate(dateStr) {
    if (!dateStr) return '';
    var str = String(dateStr).trim();
    if (str.includes('T')) str = str.split('T')[0];
    else if (str.includes(' ')) str = str.split(' ')[0];
    var parts = str.split('-');
    if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return str;
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
    if (detailName) detailName.value = name;

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
            code:      item.product_code   || '',
            name:      item.product_name   || '',
            status:    item.product_status || 'ปกติ',
            startDate: item.product_start? item.product_start.substring(0, 10) : '',
            endDate:   item.product_end? item.product_end.substring(0, 10) : '',
            remark:    item.product_remark || '',
            createdBy: item.createrd_by || '',
            created:   item.created? item.created.substring(0, 10) : '',
            objective: item.Objective_code || '',
            file_id:   item.file_id || "",
            IsImport:  item.IsImport || false
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
        pageLength: pageSize,
        ordering: true,
        dom: '<"campaign-list-container"t><"d-flex justify-content-center mt-3"p>',
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

                    return `
                    <div class="pa-card ${activeClass} p-3 rounded-3 mb-2 border shadow-sm-hover cursor-pointer overflow-hidden" data-code="${item.code}">
                        <div class="d-flex align-items-center gap-2.5 w-100 overflow-hidden">
                            <div class="pa-card-icon ${objBadge.iconBg} flex-shrink-0 fw-bold">${objBadge.text}</div>
                            <div class="pa-card-content flex-grow-1 overflow-hidden min-w-0 ms-2">
                                <div class="d-flex justify-content-between align-items-center mb-1 gap-1 overflow-hidden">
                                    <div class="pa-card-name fw-bold text-dark fs-6 text-truncate me-1" title="${item.name}">${item.name}</div>
                                    <span class="badge pa-status-badge ${statusBadgeClass} border px-2 py-0.5 rounded-pill extra-small flex-shrink-0">${item.status}</span>
                                </div>
                                <div class="d-flex align-items-center gap-1.5 mb-1 flex-wrap">
                                    <span class="pa-card-id badge bg-light text-primary border px-2 py-0.5 extra-small">${item.code}</span>
                                </div>
                                <div class="pa-card-date extra-small text-muted text-truncate" title="เริ่ม: ${startFmt} &bull; สิ้นสุด: ${endFmt}">เริ่ม: ${startFmt} &bull; สิ้นสุด: ${endFmt}</div>
                            </div>
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
    $("#campaignsTable").on("click", ".pa-card", function () {
        const code = String($(this).data("code"));
        selectedCampaignCode = code;
        $(".pa-card").removeClass("active");
        $(this).addClass("active");
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
                'aria-label': 'กรอกเหตุผลการไม่อนุมัติที่นี่'
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
                        status: "cancle",
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
                'aria-label': 'กรอกหมายเหตุการส่งแก้ไขที่นี่'
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
