const pageSize = 5;
let page = 1;
let campaigns = [];
let selectedCampaignCode = "";
let campaignTable;

let prospectPage = 1;
let prospectPageSize = 10;
let prospectTotalCount = 0;
let rawProspectItems = [];

// Fetch prospect batch for selected campaign from API
async function getProductBatchByProductCode(productCode, page = 1, pageSize = 10){
    try{
        const response = await fetch(`/ProspectSetup/getProductBatchByProductCode?productCode=${encodeURIComponent(productCode)}&page=${page}&pageSize=${pageSize}`);
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
    let rootUpdatedBy = (raw && typeof raw === 'object' && raw.updated_by) ? String(raw.updated_by).trim() : '';

    if (raw && typeof raw === 'object') {
        totalCount = raw.Customer?.total ?? 0;
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
            const id = item.id || '';
            const name = item.nameCus || item.customer_name || '-';
            const contract = item.contno || '-';
            const branch = item.branch_Name || '-';
            const carLocation = item.provinceUsecar || '-';
            const createdDate = item.created || '-';
            const createdBy = item.created_by || '-';

            if (id || idno || name !== '-') {
                items.push({
                    id: String(id || '').trim(),
                    idno: String(idno || '').trim(),
                    branch: String(branch).trim(),
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

async function loadProspectApproveData(productCode, page = 1, pageSize = 10) {
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

    const res = await getProductBatchByProductCode(productCode, page, pageSize);

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
    var parts = dateStr.split('-');
    if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dateStr;
}

// Update detail panel from a campaign object
function updateDetailPanel(campaign) {
    if (!campaign) return;
    const id = campaign.code || '';
    const name = campaign.name || '';
    const start = campaign.startDate || '';
    const end = campaign.endDate || '';
    const status = campaign.status || '';
    const note = campaign.remark || '-';

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

    const detailStatus = document.getElementById('detailStatus');
    if (detailStatus) {
        detailStatus.textContent = status;
        detailStatus.className = 'pa-status-box ' + statusClass(status);
    }
}

// Fetch campaign list from API with page and pageSize
async function getCampainList(page, pageSize) {
    startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');
    try {
        let status = "waiting approve,approved";
        if (document.getElementById('filterStatus').value)
        {
            status = document.getElementById('filterStatus').value;
        }
        let queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}&status=${status}`
            : '';

        // if (document.getElementById('filterStartDate').value)
        // {
        //     var startDate = document.getElementById('filterStartDate').value;
        //     queryStr += '&startDate=' + startDate;
        // }

        // if (document.getElementById('filterEndDate').value)
        // {
        //     var endDate = document.getElementById('filterEndDate').value;
        //     queryStr +='&endDate='+endDate;
        // }

        if (document.getElementById('filterBranch').value)
        {
            var branch = document.getElementById('filterBranch').value;
            queryStr += '&branch=' + branch;
        }

        if (document.getElementById('filterBy').value)
        {
            var createdBy = document.getElementById('filterBy').value;
            queryStr += '&createdBy=' + createdBy;
        }

        const response = await fetch(`/Campain/GetCampainList${queryStr}`);
        if (!response.ok) throw new Error("Failed to fetch campaigns list");
        const jsonResult = await response.json();
        const items = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : (Array.isArray(jsonResult) ? jsonResult : []);
        const mapped = items.map(item => ({
            code:      item.product_code   || '',
            name:      item.product_name   || '',
            status:    item.product_status || 'ปกติ',
            startDate: item.product_start  ? item.product_start.substring(0, 10) : '',
            endDate:   item.product_end    ? item.product_end.substring(0, 10)   : '',
            remark:    item.product_remark || '',
            createdBy: item.createrd_by    || item.created_by || '',
            created:   item.created        ? item.created.substring(0, 10)       : ''
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
                    }
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

        var matchBranch = !branch || item.branch === branch;
        var matchBy = !byUser || item.createdBy.toLowerCase().includes(byUser.toLowerCase());

        return matchText && matchBranch && matchBy;
    });

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="bi bi-emoji-neutral me-1"></i> ไม่พบรายการ Prospect</td></tr>`;
    } else {
        var html = '';
        filteredItems.forEach(function (item, index) {
            var seq = (prospectPage - 1) * prospectPageSize + index + 1;
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

    var total = prospectTotalCount || filteredItems.length;
    var badge = document.getElementById('prospectApproveTotalBadge');
    if (badge) {
        badge.textContent = 'ทั้งหมด ' + total + ' รายการ';
    }

    var startIdx = total > 0 ? (prospectPage - 1) * prospectPageSize + 1 : 0;
    var endIdx = total > 0 ? Math.min(prospectPage * prospectPageSize, filteredItems.length) : 0;
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
    var campaignSearchInput = document.getElementById('campaignSearch');
    var query = campaignSearchInput ? campaignSearchInput.value.trim() : '';
    if (campaignTable) {
        campaignTable.search(query).draw();
    }
    filterProspectTable();
}

function clearAllFilters() {
    const ids = ['filterStartDate', 'filterEndDate', 'filterStatus', 'filterBranch', 'filterBy', 'campaignSearch', 'prospectSearch'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    if (campaignTable) {
        campaignTable.search('').draw();
    }
    filterProspectTable();
}

$(document).ready(function () {
    initDataTables();

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
        if ($(this).attr("disabled")) return;

        const totalPages = Math.ceil(prospectTotalCount / prospectPageSize) || 1;
        if (this.id === "prospectPrevBtn") {
            if (prospectPage > 1) {
                prospectPage--;
                loadProspectApproveData(selectedCampaignCode, prospectPage, prospectPageSize);
            }
        } else if (this.id === "prospectNextBtn") {
            if (prospectPage < totalPages) {
                prospectPage++;
                loadProspectApproveData(selectedCampaignCode, prospectPage, prospectPageSize);
            }
        } else {
            const targetPage = parseInt($(this).data("page"), 10);
            if (targetPage && targetPage !== prospectPage) {
                prospectPage = targetPage;
                loadProspectApproveData(selectedCampaignCode, prospectPage, prospectPageSize);
            }
        }
    });

    $("#prospectPageSizeSelect").on("change", function () {
        prospectPageSize = parseInt($(this).val(), 10) || 10;
        prospectPage = 1;
        loadProspectApproveData(selectedCampaignCode, prospectPage, prospectPageSize);
    });

    const campaignSearchInput = document.getElementById('campaignSearch');
    if (campaignSearchInput) {
        campaignSearchInput.addEventListener('input', function () {
            const query = $(this).val().trim();
            if (campaignTable) {
                campaignTable.search(query).draw();
            }
        });
    }

    const prospectSearchInput = document.getElementById('prospectSearch');
    if (prospectSearchInput) {
        prospectSearchInput.addEventListener('input', filterProspectTable);
    }

    ['filterStartDate', 'filterEndDate', 'filterStatus'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyAllFilters);
    });

    const filterBranch = document.getElementById('filterBranch');
    if (filterBranch) filterBranch.addEventListener('change', filterProspectTable);

    const filterBy = document.getElementById('filterBy');
    if (filterBy) filterBy.addEventListener('input', filterProspectTable);

    const btnClear = document.getElementById('btnClearFilter');
    if (btnClear) btnClear.addEventListener('click', clearAllFilters);

    // Action Footer Button Event Handlers with SweetAlert Confirmations
    $("#btnApprove, .btn-pa-approve").on("click", function () {
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
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        Swal.fire({
                            title: 'อนุมัติเรียบร้อย!',
                            text: `ดำเนินการอนุมัติ ${code || 'รายการ'} เสร็จสิ้น`,
                            icon: 'success',
                            confirmButtonColor: '#10b981',
                            confirmButtonText: 'ตกลง'
                        });
                    }

                } catch (err) {
                    console.error(err);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งอนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    window.location.reload();
                }
            }
        });
    });

    $("#btnReject, .btn-pa-reject").on("click", function () {
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
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        const remark = result.value;
                        Swal.fire({
                            title: 'ไม่อนุมัติเรียบร้อย!',
                            text: `ไม่อนุมัติ ${code || 'รายการ'} เรียบร้อยแล้ว${remark ? ` (หมายเหตุ: ${remark})` : ''}`,
                            icon: 'error',
                            confirmButtonColor: '#ef4444',
                            confirmButtonText: 'ตกลง'
                        });
                    }

                } catch (err) {
                    console.error(err);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งไม่อนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    window.location.reload();
                }
            }
        });
    });

    $("#btnReturn, .btn-pa-return").on("click", function () {
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
                        const errorMsg = (data && data.message) ? data.message : `ไม่สามารถส่งแก้ไขได้ (${response.status} ${response.statusText})`;
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        const remark = result.value;
                        Swal.fire({
                            title: 'ส่งแก้ไขเรียบร้อย!',
                            text: `ส่งแก้ไข ${code || 'รายการ'} เรียบร้อยแล้ว (หมายเหตุ: ${remark})`,
                            icon: 'warning',
                            confirmButtonColor: '#f59e0b',
                            confirmButtonText: 'ตกลง'
                        });
                    }

                } catch (err) {
                    console.error(err);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งไม่อนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    window.location.reload();
                }
            }
        });
    });
});
