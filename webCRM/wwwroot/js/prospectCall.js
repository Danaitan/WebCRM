// prospectCall.js - Sales & Follow-up Page Script

let selectedCampaignCode = "";
let selectedCampaignName = "";
let selectedCampaignObjective = "CS";
let selectedCustomerRow = null;

let campaignsData = [];
let rawProspectItems = [];
let prospectPage = 1;
let prospectPageSize = 10;
let prospectTotalCount = 0;

// Fetch campaign list from API with page and pageSize
async function getCampainList(page, pageSize) {
    startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');
    try {
        const status = "approved";
        const queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}&status=${status}`
            : '';
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

    if (raw && typeof raw === 'object') {
        totalCount = raw.Customer?.total ?? raw.total ?? 0;
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
            const idno = item.idno || item.idCard || '';
            const id = item.id || '';
            const name = item.nameCus || item.name || '-';
            const contract = item.contno || item.contract || '-';
            const branch = item.branch_Name || item.branch || '-';
            const carLocation = item.provinceUsecar || item.carLocation || '-';
            const createdDate = item.created ? String(item.created).substring(0, 10) : (item.createdDate || item.date || '-');
            const createdBy = item.created_by || item.createdBy || '-';
            const phone = item.phone || item.tel || item.mobile || '-';
            const status = item.status || 'พร้อมติดต่อ';
            const statusLead = item.statusLead || item.leadStatus || 'Follow';
            const remarks = item.remarks || item.remark || '';
            const address = item.address || '-';
            const pdpa = item.pdpa || 'ยินยอมแล้ว';
            const plan = item.plan || '-';
            const count = item.count || '1';
            const objective = item.objective || 'CS';
            const nextAppt = item.nextAppt || '-';

            if (id || idno || name !== '-') {
                items.push({
                    id: String(id || '').trim(),
                    idno: String(idno || '').trim(),
                    branch: String(branch).trim(),
                    name: String(name).trim(),
                    contract: String(contract).trim(),
                    phone: String(phone).trim(),
                    carLocation: String(carLocation).trim(),
                    status: String(status).trim(),
                    date: String(createdDate).trim(),
                    statusLead: String(statusLead).trim(),
                    remarks: String(remarks).trim(),
                    address: String(address).trim(),
                    pdpa: String(pdpa).trim(),
                    plan: String(plan).trim(),
                    count: String(count).trim(),
                    objective: String(objective).trim(),
                    nextAppt: String(nextAppt).trim(),
                    historyList: item.historyList || [],
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

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Helper: Objective Badge Mapping (CS=เขียว, MC=เหลือง, RM=ฟ้า, FL=ส้ม)
function getObjectiveBadge(obj) {
    const map = {
        'CS': { text: 'CS', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' },
        'MC': { text: 'MC', class: 'bg-warning-subtle text-warning border-warning-subtle', iconBg: 'yellow' },
        'RM': { text: 'RM', class: 'bg-info-subtle text-info border-info-subtle', iconBg: 'blue' },
        'FL': { text: 'FL', class: 'bg-orange-subtle text-orange border-orange-subtle', iconBg: 'orange' }
    };
    return map[obj] || { text: obj || 'CS', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' };
}

// Render Campaign List dynamically
function renderCampaignList(items) {
    const $container = $('#campaignList');
    $container.empty();

    if (!items || items.length === 0) {
        $container.html('<div class="text-center text-muted py-4 small">ไม่พบข้อมูลแคมเปญ</div>');
        $('#campaignCount').text('0');
        return;
    }

    $('#campaignCount').text(items.length);

    items.forEach(item => {
        const activeClass = (item.code === selectedCampaignCode) ? 'active' : '';
        
        // Campaign status badge: Active / Approved (เขียว) / Waiting Approve (เหลือง)
        const statusBadgeClass = (item.status === 'approved' || item.status === 'Active' || item.status === 'ปกติ')
            ? 'bg-success-subtle text-success border-success-subtle'
            : 'bg-warning-subtle text-warning border-warning-subtle';
        // Objective badge styling (CS เขียว, MC/CL เหลือง, RM ฟ้า, FL ส้ม)
        const objBadge = getObjectiveBadge(item.remark || 'CS');

        const card = $(`
            <div class="pa-card ${activeClass} p-3 rounded-3 mb-2 border shadow-sm-hover cursor-pointer overflow-hidden" data-code="${escapeHtml(item.code)}">
                <div class="d-flex align-items-center gap-2.5 w-100 overflow-hidden">
                    <div class="pa-card-icon ${objBadge.iconBg} flex-shrink-0 fw-bold">${objBadge.text}</div>
                    <div class="pa-card-content flex-grow-1 overflow-hidden min-w-0 ms-2">
                        <div class="d-flex justify-content-between align-items-center mb-1 gap-1 overflow-hidden">
                            <div class="pa-card-name fw-bold text-dark fs-6 text-truncate me-1" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                            <span class="badge ${statusBadgeClass} border px-2 py-0.5 rounded-pill extra-small flex-shrink-0">${escapeHtml(item.status)}</span>
                        </div>
                        <div class="d-flex align-items-center gap-1.5 mb-1 flex-wrap">
                            <span class="pa-card-id badge bg-light text-primary border px-2 py-0.5 extra-small">${escapeHtml(item.code)}</span>
                        </div>
                        <div class="pa-card-date extra-small text-muted text-truncate" title="เริ่ม: ${escapeHtml(item.startDate)} • สิ้นสุด: ${escapeHtml(item.endDate)}">เริ่ม: ${escapeHtml(item.startDate)} &bull; สิ้นสุด: ${escapeHtml(item.endDate)}</div>
                    </div>
                </div>
            </div>
        `);
        $container.append(card);
    });
}

// Select Campaign Card
function selectCampaignCard(code) {
    const campaign = campaignsData.find(c => c.code === code);
    if (!campaign) return;

    selectedCampaignCode = campaign.code;
    selectedCampaignName = campaign.name;
    selectedCampaignObjective = campaign.remark || 'CS';

    $('.pa-card').removeClass('active');
    $(`.pa-card[data-code="${code}"]`).addClass('active');

    const objBadge = getObjectiveBadge(selectedCampaignObjective);

    $('#detailId').val(campaign.code);
    $('#detailName').val(campaign.name);
    $('#detailStart').val(campaign.startDate);
    $('#detailEnd').val(campaign.endDate);
    $('#detailObjective').val(campaign.remark || objBadge.text);

    loadProspectCallData(campaign.code, 1, prospectPageSize);
}

// Load Campaign List from API
async function loadCampaignData() {
    const res = await getCampainList();
    campaignsData = res.data || [];
    renderCampaignList(campaignsData);

    if (campaignsData.length > 0) {
        selectCampaignCard(campaignsData[0].code);
    } else {
        renderProspectTable([]);
    }
}

// Filter Campaign List
function filterCampaignList() {
    const query = ($('#campaignSearch').val() || '').trim().toLowerCase();
    const filtered = campaignsData.filter(item => {
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        return !query || code.includes(query) || name.includes(query);
    });
    renderCampaignList(filtered);
}

// Fetch Prospect Batch Data for selected campaign
async function loadProspectCallData(productCode, page = 1, pageSize = 10) {
    if (!productCode) {
        rawProspectItems = [];
        prospectTotalCount = 0;
        filterProspectTable();
        return;
    }

    selectedCampaignCode = productCode;
    prospectPage = page;
    prospectPageSize = pageSize;

    const $tbody = $('#prospectTableBody');
    $tbody.html('<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-hourglass-split me-1"></i> กำลังโหลดข้อมูล Prospect...</td></tr>');

    const res = await getProductBatchByProductCode(productCode, page, pageSize);
    const { items, totalCount } = extractProspectCustomers(res);

    rawProspectItems = items;
    prospectTotalCount = totalCount;

    filterProspectTable();
}

// Status badge styling helper
function getStatusBadgeClass(status) {
    const map = {
        'พร้อมติดต่อ': 'bg-success text-white',
        'รอนัดหมาย': 'bg-info text-white',
        'โทรแล้ว': 'bg-primary text-white',
        'รอติดตาม': 'bg-warning text-dark',
        'นัดติดตาม': 'bg-warning text-dark',
        'ขอติดตาม': 'bg-warning text-dark',
        'สนใจ': 'bg-success text-white',
        'ไม่สนใจ': 'bg-secondary text-white',
        'ขอข้อมูลเพิ่มเติม': 'bg-warning text-dark',
        'ติดต่อไม่ได้': 'bg-secondary text-white',
        'ไม่ผ่านเงื่อนไข': 'bg-danger text-white'
    };
    return map[status] || 'bg-secondary text-white';
}

// Status Lead Badge Colors: Success (เขียว), Follow (ฟ้า), Cancel (เทา), Reject (แดง)
function getStatusLeadBadgeClass(statusLead) {
    const map = {
        'Success': 'bg-success text-white',
        'Follow': 'bg-info text-white',
        'Cancel': 'bg-secondary text-white',
        'Cancle': 'bg-secondary text-white',
        'Reject': 'bg-danger text-white'
    };
    return map[statusLead] || 'bg-secondary text-white';
}

function getStatusLeadSubtleBadgeClass(statusLead) {
    const map = {
        'Success': 'bg-success-subtle text-success border-success-subtle',
        'Follow': 'bg-info-subtle text-info border-info-subtle',
        'Cancel': 'bg-secondary-subtle text-secondary border-secondary-subtle',
        'Cancle': 'bg-secondary-subtle text-secondary border-secondary-subtle',
        'Reject': 'bg-danger-subtle text-danger border-danger-subtle'
    };
    return map[statusLead] || 'bg-secondary-subtle text-secondary border-secondary-subtle';
}

// Format date string YYYY-MM-DD -> DD/MM/YYYY
function formatDateTh(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

// Render Prospect Table
function renderProspectTable(items) {
    const $tbody = $('#prospectTableBody');
    $tbody.empty();

    if (!items || items.length === 0) {
        $tbody.html('<tr><td colspan="9" class="text-center py-4 text-muted">ไม่พบข้อมูล Prospect / ลูกค้า</td></tr>');
        $('#prospectPaginationText').text('แสดง 0 จาก 0 รายการ');
        $('#prospectCallTotalBadge').text('ทั้งหมด 0 รายการ');
        renderProspectPagination(0);
        return;
    }

    items.forEach((item, index) => {
        const badgeClass = getStatusBadgeClass(item.status);
        const badgeClassStatusLead = getStatusLeadBadgeClass(item.statusLead);
        const seq = (prospectPage - 1) * prospectPageSize + index + 1;
        const tr = $(`
            <tr data-id="${escapeHtml(item.id)}"
                data-branch="${escapeHtml(item.branch)}" 
                data-name="${escapeHtml(item.name)}" 
                data-contract="${escapeHtml(item.contract)}" 
                data-phone="${escapeHtml(item.phone)}" 
                data-status="${escapeHtml(item.status)}" 
                data-statuslead="${escapeHtml(item.statusLead)}" 
                data-idcard="${escapeHtml(item.idno)}" 
                data-address="${escapeHtml(item.address)}" 
                data-pdpa="${escapeHtml(item.pdpa)}" 
                data-plan="${escapeHtml(item.plan)}"
                data-count="${escapeHtml(item.count)}"
                data-remarks="${escapeHtml(item.remarks)}">
                <td style="text-align: center;" class="row-seq">${seq}</td>
                <td>${escapeHtml(item.branch)}</td>
                <td class="fw-bold text-dark">${escapeHtml(item.name)}</td>
                <td><span class="badge bg-light text-primary border">${escapeHtml(item.contract)}</span></td>
                <td>${escapeHtml(item.phone)}</td>
                <td>${escapeHtml(item.carLocation)}</td>
                <td><span class="status-badge badge ${badgeClass}">${escapeHtml(item.status)}</span></td>
                <td>${escapeHtml(item.date)}</td>
                <td><span class="status-badge badge ${badgeClassStatusLead}">${escapeHtml(item.statusLead)}</span></td>
            </tr>
        `);
        $tbody.append(tr);
    });

    const displayTotal = prospectTotalCount || items.length;
    const startCount = (prospectPage - 1) * prospectPageSize + 1;
    const endCount = Math.min(prospectPage * prospectPageSize, displayTotal);

    $('#prospectPaginationText').text(`แสดง ${startCount} - ${endCount} จาก ${displayTotal} รายการ`);
    $('#prospectCallTotalBadge').text(`ทั้งหมด ${displayTotal} รายการ`);

    renderProspectPagination(displayTotal);
}

// Filter Prospect Table
function filterProspectTable() {
    const query = ($('#prospectSearch').val() || '').trim().toLowerCase();
    const branch = $('#filterBranch').val() || '';
    const status = $('#filterStatus').val() || '';
    const statusLead = ($('#filterStatusLead').val() || $('#filterBy').val() || '').trim().toLowerCase();

    const filtered = rawProspectItems.filter(item => {
        const itemBranch = (item.branch || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();
        const itemContract = (item.contract || '').toLowerCase();
        const itemPhone = (item.phone || '').toLowerCase();
        const itemStatus = item.status || '';
        const itemStatusLead = (item.statusLead || '').toLowerCase();

        const matchQuery = !query || itemBranch.includes(query) || itemName.includes(query) || itemContract.includes(query) || itemPhone.includes(query);
        const matchBranch = !branch || item.branch === branch;
        const matchStatus = !status || itemStatus === status;
        const matchStatusLead = !statusLead || itemStatusLead.includes(statusLead);

        return matchQuery && matchBranch && matchStatus && matchStatusLead;
    });

    renderProspectTable(filtered);
}

// Render Prospect Pagination
function renderProspectPagination(total) {
    const $container = $('.pa-page-controls');
    if (!$container.length) return;

    $container.empty();
    const totalPages = Math.ceil(total / prospectPageSize) || 1;
    if (totalPages <= 0) return;

    // Prev button
    const $prevBtn = $(`<button class="pa-page-btn ${prospectPage <= 1 ? 'disabled' : ''}"><i class="bi bi-chevron-left"></i></button>`);
    $prevBtn.on('click', function (e) {
        e.preventDefault();
        if (prospectPage > 1) {
            prospectPage--;
            loadProspectCallData(selectedCampaignCode, prospectPage, prospectPageSize);
        }
    });
    $container.append($prevBtn);

    // Page numbers
    const pages = buildPageRange(prospectPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            $container.append('<button class="pa-page-btn disabled">...</button>');
        } else {
            const $btn = $(`<button class="pa-page-btn ${p === prospectPage ? 'active' : ''}">${p}</button>`);
            $btn.on('click', function (e) {
                e.preventDefault();
                if (p !== prospectPage) {
                    prospectPage = p;
                    loadProspectCallData(selectedCampaignCode, prospectPage, prospectPageSize);
                }
            });
            $container.append($btn);
        }
    });

    // Next button
    const $nextBtn = $(`<button class="pa-page-btn ${prospectPage >= totalPages ? 'disabled' : ''}"><i class="bi bi-chevron-right"></i></button>`);
    $nextBtn.on('click', function (e) {
        e.preventDefault();
        if (prospectPage < totalPages) {
            prospectPage++;
            loadProspectCallData(selectedCampaignCode, prospectPage, prospectPageSize);
        }
    });
    $container.append($nextBtn);
}

function buildPageRange(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    let pages = [];
    if (current <= 4) {
        pages = [1, 2, 3, 4, 5, '...', total];
    } else if (current >= total - 3) {
        pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    } else {
        pages = [1, '...', current - 1, current, current + 1, '...', total];
    }
    return pages;
}

// Clear filters
function clearFilters() {
    $('#filterStartDate, #filterEndDate, #filterStatus, #filterBranch, #filterStatusLead, #prospectSearch, #campaignSearch').val('');
    filterProspectTable();
}

// Render Modal Contact History dynamically from array
function renderModalContactHistory(historyList) {
    const $list = $('#modalHistoryList');
    $list.empty();

    if (!historyList || historyList.length === 0) {
        $list.html('<div class="text-center text-muted py-4 extra-small">ไม่พบประวัติการติดต่อ</div>');
        return;
    }

    historyList.forEach((item, index) => {
        const badgeClass = getStatusLeadSubtleBadgeClass(item.statusLead);
        const iconClass = item.icon || 'bi-telephone';

        let nextApptDisplay = item.nextAppt;
        if (!nextApptDisplay && item.nextDate) {
            nextApptDisplay = formatDateTh(item.nextDate) + (item.nextTime ? ' ' + item.nextTime : '');
        }
        if (!nextApptDisplay) nextApptDisplay = '-';

        const card = $(`
            <div class="pc-history-card p-3 rounded-3 border bg-white shadow-sm-hover cursor-pointer" data-index="${index}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="small fw-semibold text-dark"><i class="bi ${iconClass} text-primary me-1.5"></i> ${item.date}</span>
                    <span class="badge ${badgeClass} border px-2 py-0.5 rounded-pill extra-small">${escapeHtml(item.statusLead)}</span>
                </div>
                <div class="text-secondary extra-small">ผลการติดต่อ: ${escapeHtml(item.result || '')}</div>
                <div class="text-secondary extra-small">นัดหมาย: ${escapeHtml(nextApptDisplay)}</div>
            </div>
        `);

        // Click handler to populate form fields with details from clicked history card
        card.on('click', function () {
            $('.pc-history-card').removeClass('border-primary bg-primary-subtle');
            $(this).addClass('border-primary bg-primary-subtle');

            $('#modalContactResult').val(item.result || '');
            $('#modalStatusLead').val(item.statusLead || '');
            $('#modalContactReport').val(item.report || item.result || '');
            $('#modalProduct').val(item.product || '');
            $('#modalInterestLevel').val(item.interestLevel || '');
            $('#modalSalesResult').val(item.salesResult || '');
            $('#modalNextDate').val(item.nextDate || '');
            $('#modalNextTime').val(item.nextTime || '');
            $('#modalContactChannel').val(item.channel || '');
            $('#modalRemarks').val(item.remarks || '');

            // Update character counters
            $('#contactReportCount').text(`${($('#modalContactReport').val() || '').length}/500`);
            $('#remarksCount').text(`${($('#modalRemarks').val() || '').length}/300`);
        });

        $list.append(card);
    });
}

// Open Record Result Pop-up Modal
function openRecordResultModal(trElement) {
    selectedCustomerRow = trElement;
    const $row = $(trElement);
    const itemId = $row.data('id');
    const contract = $row.data('contract');

    // Find customer in rawProspectItems array
    const customer = rawProspectItems.find(item => item.id == itemId || item.contract == contract) || {
        name: $row.data('name') || '-',
        phone: $row.data('phone') || '-',
        objective: selectedCampaignObjective || 'CS',
        statusLead: $row.data('statuslead') || 'Follow',
        status: $row.data('status') || 'พร้อมติดต่อ',
        nextAppt: '-',
        remarks: $row.data('remarks') || '',
        historyList: []
    };

    const activeCampaign = campaignsData.find(c => c.code === selectedCampaignCode);
    const campaignObjectiveCode = activeCampaign ? (activeCampaign.remark || 'CS') : (selectedCampaignObjective || 'CS');
    const objBadge = getObjectiveBadge(campaignObjectiveCode);

    // Set modal title & customer summary info
    $('#modalCustName').text(customer.name);
    $('#modalCustPhone').text(customer.phone);
    $('#modalCustCampaign').text(selectedCampaignCode);
    $('#modalCustCampaignName').text(selectedCampaignName);
    
    $('#modalCustObjective')
        .attr('class', `pc-modal-obj-badge ${objBadge.iconBg}`)
        .text(objBadge.text);

    const leadStatusClass = getStatusLeadBadgeClass(customer.statusLead);
    const lastResultClass = getStatusBadgeClass(customer.status);

    $('#modalCustLeadStatus')
        .attr('class', `status-badge badge ${leadStatusClass}`)
        .text(customer.statusLead);

    $('#modalCustLastResult')
        .attr('class', `badge ${lastResultClass} border px-3 py-1 rounded-pill fw-semibold`)
        .text(customer.status);

    $('#modalCustNextAppt').text(customer.nextAppt || '-');

    // Reset form fields
    $('#modalContactResult').val('');
    $('#modalStatusLead').val('');
    $('#modalContactReport').val('');
    $('#modalProduct').val('');
    $('#modalInterestLevel').val('');
    $('#modalSalesResult').val('');
    $('#modalNextDate').val('');
    $('#modalNextTime').val('');
    $('#modalContactChannel').val('');
    $('#modalRemarks').val(customer.remarks || '');

    // Reset character counters
    $('#contactReportCount').text('0/500');
    $('#remarksCount').text(`${(customer.remarks || '').length}/300`);

    // Render Contact History dynamically from array
    renderModalContactHistory(customer.historyList || []);

    // Show bootstrap modal
    const modalEl = document.getElementById('recordResultModal');
    if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }
}

// Save Record Result
function saveRecordResult() {
    const resultVal = $('#modalContactResult').val();
    const statusLeadVal = $('#modalStatusLead').val();
    const reportVal = $('#modalContactReport').val();
    const productVal = $('#modalProduct').val();
    const interestVal = $('#modalInterestLevel').val();
    const salesResultVal = $('#modalSalesResult').val();
    const remarksVal = $('#modalRemarks').val();
    const nextDateVal = $('#modalNextDate').val();
    const nextTimeVal = $('#modalNextTime').val();
    const channelVal = $('#modalContactChannel').val();

    if (!resultVal) {
        Swal.fire({
            title: 'กรุณาเลือกผลการติดต่อ',
            text: 'โปรดเลือกผลการติดต่อก่อนบันทึกข้อมูล',
            icon: 'warning',
            confirmButtonColor: '#1e5dd1'
        });
        return;
    }

    if (!statusLeadVal) {
        Swal.fire({
            title: 'กรุณาเลือก Status Lead',
            text: 'โปรดเลือก Status Lead ก่อนบันทึกข้อมูล',
            icon: 'warning',
            confirmButtonColor: '#1e5dd1'
        });
        return;
    }

    if (!reportVal) {
        Swal.fire({
            title: 'กรุณากรอกรายงานผลการติดต่อ',
            text: 'โปรดระบุรายละเอียดรายงานผลการติดต่อก่อนบันทึกข้อมูล',
            icon: 'warning',
            confirmButtonColor: '#1e5dd1'
        });
        return;
    }

    Swal.fire({
        title: 'ยืนยันการบันทึกผลการติดต่อ?',
        text: `บันทึกผล: "${resultVal}" สำหรับลูกค้า ${$('#modalCustName').text()}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'บันทึกข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then((res) => {
        if (res.isConfirmed) {
            if (selectedCustomerRow) {
                const $row = $(selectedCustomerRow);
                const itemId = $row.data('id');
                const contract = $row.data('contract');

                const targetItem = rawProspectItems.find(item => item.id == itemId || item.contract == contract);
                if (targetItem) {
                    targetItem.status = resultVal;
                    targetItem.statusLead = statusLeadVal;
                    targetItem.remarks = remarksVal;
                    if (!targetItem.historyList) targetItem.historyList = [];

                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const year = now.getFullYear();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const mins = String(now.getMinutes()).padStart(2, '0');
                    const formattedNow = `${day}/${month}/${year} ${hours}:${mins}`;

                    let nextApptStr = '-';
                    if (nextDateVal) {
                        nextApptStr = formatDateTh(nextDateVal);
                        if (nextTimeVal) nextApptStr += ` ${nextTimeVal}`;
                    }

                    targetItem.nextAppt = nextApptStr;

                    targetItem.historyList.unshift({
                        date: formattedNow,
                        statusLead: statusLeadVal,
                        result: resultVal,
                        report: reportVal,
                        product: productVal,
                        interestLevel: interestVal,
                        salesResult: salesResultVal,
                        nextDate: nextDateVal,
                        nextTime: nextTimeVal,
                        channel: channelVal,
                        remarks: remarksVal,
                        icon: 'bi-telephone'
                    });
                }
            }

            // Close modal
            const modalEl = document.getElementById('recordResultModal');
            if (modalEl) {
                const bsModal = bootstrap.Modal.getInstance(modalEl);
                if (bsModal) bsModal.hide();
            }

            // Success alert
            Swal.fire({
                title: 'บันทึกสำเร็จ!',
                text: 'บันทึกผลการติดต่อเรียบร้อยแล้ว',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });

            // Re-render / filter table
            filterProspectTable();
        }
    });
}

// Document Ready
$(document).ready(function () {
    // Initial Load Campaigns
    loadCampaignData();

    // Campaign search listener
    $('#campaignSearch').on('input keyup', filterCampaignList);

    // Campaign card selection handler (delegated)
    $(document).on('click', '.pa-card', function () {
        const code = $(this).data('code');
        selectCampaignCard(code);
    });

    // Prospect search listener
    $('#prospectSearch').on('input', filterProspectTable);
    $('#filterBranch, #filterStatus').on('change', filterProspectTable);
    $('#filterStatusLead').on('input', filterProspectTable);
    $('#btnClearFilter').on('click', clearFilters);

    // Rows per page select listener
    $('.pa-table-pagination select').on('change', function () {
        const val = parseInt($(this).val(), 10) || 10;
        prospectPageSize = val;
        prospectPage = 1;
        loadProspectCallData(selectedCampaignCode, prospectPage, prospectPageSize);
    });

    // Character counter listeners (Document delegated)
    $(document).on('input keyup change', '#modalContactReport', function () {
        const len = $(this).val().length;
        $('#contactReportCount').text(`${len}/500`);
    });

    $(document).on('input keyup change', '#modalRemarks', function () {
        const len = $(this).val().length;
        $('#remarksCount').text(`${len}/300`);
    });

    // Customer table row click handler
    $('#prospectTableBody').on('click', 'tr', function () {
        openRecordResultModal(this);
    });

    // Save button click in modal
    $('#btnSaveResult').on('click', function (e) {
        e.preventDefault();
        saveRecordResult();
    });
});
