// prospectCall.js - Sales & Follow-up Page Script

let selectedCampaignCode = "";
let selectedCampaignName = "";
let selectedCampaignObjective = "";
let selectedCustomerRow = null;

let campaignsData = [];
let campaignPage = 1;
let campaignPageSize = 10;
let campaignTotalCount = 0;
let rawProspectItems = [];
let prospectPage = 1;
let prospectPageSize = 10;
let prospectTotalCount = 0;
let dropdownMaster = [];
let historyCall = [];

async function SearchCampaign() {
    loadCampaignData(1, campaignPageSize);
}

function getCampaignStatus(date) {
    if (!date) return 'Expire';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(0, 0, 0, 0);
    return end >= today ? 'Active' : 'Expire';
}

// Fetch campaign list from API with page and pageSize
async function getCampainList(page = 1, pageSize = 10) {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        const status = "approved";
        const searchText = $("#campaignSearch").val() ? $("#campaignSearch").val().trim() : "";
        let queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}&status=${status}`
            : `?status=${status}`;
        if (searchText !== undefined && searchText !== null && searchText !== '') {
            queryStr += `&search=${searchText}`;
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
            created:   item.created        ? item.created.substring(0, 10)       : '',
            Objective_code: item.Objective_code || '',
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
            const idno = item.idno || '';
            const id = item.id || '';
            const name = item.nameCus || item.customer_name || '-';
            const contract = item.contno || '-';
            const branch = item.branch_Name || '-';
            const carLocation = item.provinceUsecar || '-';
            const rawAssignDate = item.assign_date || '';
            let assignDate = '-';
            if (rawAssignDate) {
                const strDate = String(rawAssignDate).trim();
                if (strDate.includes('T')) {
                    assignDate = strDate.split('T')[0];
                } else if (strDate.length >= 10) {
                    assignDate = strDate.substring(0, 10);
                } else {
                    assignDate = strDate;
                }
            }
            const phone = item.mobile || '-';
            const status = getStatusLeadFromMaster('ผลการติดต่อ', item.isCallCase).NameTh;
            const statusLead = getStatusLeadFromMaster('statuslead', item.StatusLead).NameEn;
            const remarks = item.remark || '';
            const rawNextAppt = item.appointment || '';
            let nextAppt = '-';
            if (rawNextAppt) {
                const strDate = String(rawNextAppt).trim();
                if (strDate.includes('T')) {
                    const [dPart, tPart] = strDate.split('T');
                    const [y, m, d] = dPart.split('-');
                    const dateFmt = (y && m && d) ? `${d}/${m}/${y}` : dPart;
                    const timeFmt = tPart ? tPart.substring(0, 5) : '';
                    nextAppt = timeFmt ? `${dateFmt} ${timeFmt}` : dateFmt;
                } else if (strDate.length >= 10) {
                    const dPart = strDate.substring(0, 10);
                    const [y, m, d] = dPart.split('-');
                    const timeFmt = strDate.length > 10 ? strDate.substring(11, 16) : '';
                    const dateFmt = (y && m && d) ? `${d}/${m}/${y}` : dPart;
                    nextAppt = timeFmt ? `${dateFmt} ${timeFmt}` : dateFmt;
                } else {
                    nextAppt = strDate;
                }
            }

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
                    date: String(assignDate).trim(),
                    statusLead: String(statusLead).trim(),
                    remarks: String(remarks).trim(),
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
    return map[obj] || { text: obj || '  ', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' };
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
        
        const statusText = getCampaignStatus(item.endDate);
        const statusBadgeClass = (statusText === 'Active')
            ? 'bg-success-subtle text-success border-success-subtle'
            : 'bg-danger-subtle text-danger border-danger-subtle';
        // Objective badge styling (CS เขียว, MC/CL เหลือง, RM ฟ้า, FL ส้ม)
        const objBadge = getObjectiveBadge(item.Objective_code || '');
        const card = $(`
            <div class="pa-card ${activeClass} p-3 rounded-3 mb-2 border shadow-sm-hover cursor-pointer overflow-hidden" data-code="${escapeHtml(item.code)}">
                <div class="d-flex align-items-center gap-2.5 w-100 overflow-hidden">
                    <div class="pa-card-icon ${objBadge.iconBg} flex-shrink-0 fw-bold">${objBadge.text}</div>
                    <div class="pa-card-content flex-grow-1 overflow-hidden min-w-0 ms-2">
                        <div class="d-flex justify-content-between align-items-center mb-1 gap-1 overflow-hidden">
                            <div class="pa-card-name fw-bold text-dark fs-6 text-truncate me-1" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
                            <span class="badge ${statusBadgeClass} border px-2 py-0.5 rounded-pill extra-small flex-shrink-0">${statusText}</span>
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
    selectedCampaignObjective = campaign.Objective_code || '';

    $('.pa-card').removeClass('active');
    $(`.pa-card[data-code="${code}"]`).addClass('active');

    $('#detailId').val(campaign.code);
    $('#detailName').val(campaign.name);
    $('#detailStart').val(campaign.startDate);
    $('#detailEnd').val(campaign.endDate);
    $('#detailObjective').val(campaign.Objective_code || '');

    populateProductDropdownOptions(masterDropdownData, selectedCampaignObjective);

    loadProspectCallData(campaign.code, 1, prospectPageSize);
}

// Load Campaign List from API
async function loadCampaignData(page = 1, pageSize = 10) {
    campaignPage = page;
    campaignPageSize = pageSize;
    const res = await getCampainList(campaignPage, campaignPageSize);
    campaignsData = res.data || [];
    campaignTotalCount = res.count ?? campaignsData.length;

    $('#campaignCount').text(campaignTotalCount);
    renderCampaignList(campaignsData);
    renderCampaignPagination(campaignTotalCount);

    if (campaignsData.length > 0) {
        selectCampaignCard(campaignsData[0].code);
    } else {
        renderProspectTable([]);
    }
}

// Render Campaign Pagination Controls
function renderCampaignPagination(total) {
    const $container = $('#campaignPageControls');
    const $infoText = $('#campaignPaginationText');
    if (!$container.length) return;

    $container.empty();
    const totalPages = Math.ceil(total / campaignPageSize) || 1;

    if ($infoText.length) {
        const startCount = total > 0 ? (campaignPage - 1) * campaignPageSize + 1 : 0;
        const endCount = Math.min(campaignPage * campaignPageSize, total);
        $infoText.text(`แสดง ${startCount} - ${endCount} จาก ${total} รายการ`);
    }

    if (totalPages <= 0) return;

    // Prev button
    const $prevBtn = $(`<button class="pa-page-btn ${campaignPage <= 1 ? 'disabled' : ''}"><i class="bi bi-chevron-left"></i></button>`);
    $prevBtn.on('click', function (e) {
        e.preventDefault();
        if (campaignPage > 1) {
            campaignPage--;
            loadCampaignData(campaignPage, campaignPageSize);
        }
    });
    $container.append($prevBtn);

    // Page numbers
    const pages = buildPageRange(campaignPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            $container.append('<button class="pa-page-btn disabled">...</button>');
        } else {
            const $btn = $(`<button class="pa-page-btn ${p === campaignPage ? 'active' : ''}">${p}</button>`);
            $btn.on('click', function (e) {
                e.preventDefault();
                if (p !== campaignPage) {
                    campaignPage = p;
                    loadCampaignData(campaignPage, campaignPageSize);
                }
            });
            $container.append($btn);
        }
    });

    // Next button
    const $nextBtn = $(`<button class="pa-page-btn ${campaignPage >= totalPages ? 'disabled' : ''}"><i class="bi bi-chevron-right"></i></button>`);
    $nextBtn.on('click', function (e) {
        e.preventDefault();
        if (campaignPage < totalPages) {
            campaignPage++;
            loadCampaignData(campaignPage, campaignPageSize);
        }
    });
    $container.append($nextBtn);
}

// Filter Campaign List
// function filterCampaignList() {
//     const query = ($('#campaignSearch').val() || '').trim().toLowerCase();
//     const filtered = campaignsData.filter(item => {
//         const code = (item.code || '').toLowerCase();
//         const name = (item.name || '').toLowerCase();
//         return !query || code.includes(query) || name.includes(query);
//     });
//     renderCampaignList(filtered);
// }

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

    const res = await getProductBatchByProductCode(productCode);
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
        'ติดต่อเรียบร้อย': 'bg-success text-white',
        'ไม่สนใจ': 'bg-secondary text-white',
        'ไม่สามารถติดต่อได้': 'bg-secondary text-white',
        'เบอร์ติดต่อไม่ได้': 'bg-secondary text-white',
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
        'สำเร็จ': 'bg-success text-white',
        'Follow': 'bg-info text-white',
        'ติดตาม': 'bg-info text-white',
        'Cancel': 'bg-secondary text-white',
        'Cancle': 'bg-secondary text-white',
        'ยกเลิก': 'bg-secondary text-white',
        'Reject': 'bg-danger text-white',
        'ปฏิเสธ': 'bg-danger text-white'
    };
    return map[statusLead] || 'bg-secondary text-white';
}

function getStatusLeadSubtleBadgeClass(statusLead) {
    const map = {
        'Success': 'bg-success-subtle text-success border-success-subtle',
        'สำเร็จ': 'bg-success-subtle text-success border-success-subtle',
        'Follow': 'bg-info-subtle text-info border-info-subtle',
        'ติดตาม': 'bg-info-subtle text-info border-info-subtle',
        'Cancel': 'bg-secondary-subtle text-secondary border-secondary-subtle',
        'Cancle': 'bg-secondary-subtle text-secondary border-secondary-subtle',
        'ยกเลิก': 'bg-secondary-subtle text-secondary border-secondary-subtle',
        'DD0010': 'bg-danger-subtle text-danger border-danger-subtle',
        'Reject': 'bg-danger-subtle text-danger border-danger-subtle',
        'ปฏิเสธ': 'bg-danger-subtle text-danger border-danger-subtle'
    };
    return map[statusLead] || 'bg-secondary-subtle text-secondary border-secondary-subtle';
}

// Smart Helper: Set select value matching value, text, data-en, data-th, or data-code
function setSelectValue($select, value) {
    if (!$select || !$select.length) return;
    if (value === null || value === undefined || value === '') {
        $select.val('');
        return;
    }
    const target = String(value).trim().toLowerCase();
    
    // 1. Direct jQuery .val() attempt
    $select.val(value);
    if ($select.val() === String(value)) return;

    // 2. Loop options to match value, text, data-en, data-th, or data-code
    let matched = false;
    $select.find('option').each(function () {
        const $opt = $(this);
        const optVal = String($opt.val() || '').trim().toLowerCase();
        const optText = String($opt.text() || '').trim().toLowerCase();
        const optEn = String($opt.data('en') || '').trim().toLowerCase();
        const optTh = String($opt.data('th') || '').trim().toLowerCase();
        const optCode = String($opt.data('code') || '').trim().toLowerCase();

        if (optVal === target || optText === target || (optCode && optCode === target) || (optEn && optEn === target) || (optTh && optTh === target)) {
            $select.val($opt.val());
            matched = true;
            return false;
        }
    });

    if (!matched) {
        $select.val('');
    }
}

let masterDropdownData = [];
let masterCodeMap = {};

function buildMasterCodeMap(dropdownList) {
    masterCodeMap = {};
    if (!Array.isArray(dropdownList)) return;

    dropdownList.forEach(group => {
        const groupTitle = group.DropdownTitle || group.dropdownTitle || '';
        const items = group.item || group.Item || group.items || [];
        if (!Array.isArray(items)) return;

        items.forEach(item => {
            const code = item.Code || item.code;
            if (code) {
                masterCodeMap[String(code).trim().toUpperCase()] = {
                    code: code,
                    nameTh: item.NameTh || item.nameTh || '',
                    nameEn: item.NameEn || item.nameEn || '',
                    groupTitle: groupTitle
                };
            }
        });
    });
}

function getDropdownNameByCode(val, preferEn = false) {
    if (!val || String(val).trim() === '' || val === 'null' || val === 'undefined') return '-';
    const key = String(val).trim().toUpperCase();
    if (masterCodeMap[key]) {
        const item = masterCodeMap[key];
        const name = preferEn ? (item.nameEn || item.nameTh || val) : (item.nameTh || item.nameEn || val);
        return (name && String(name).trim() !== '') ? name : '-';
    }
    return String(val).trim() !== '' ? val : '-';
}

function getStatusLeadFromMaster(dropdownTitle,value) {
    if (!value || value === '-' || value === 'null' || value === 'undefined') return '-';
    let dropdownList = [];
    if (Array.isArray(dropdownMaster)) {
        if (dropdownMaster.length > 0 && dropdownMaster[0] && Array.isArray(dropdownMaster[0].Dropdown)) {
            dropdownList = dropdownMaster[0].Dropdown;
        } else {
            dropdownList = dropdownMaster;
        }
    } else if (dropdownMaster && typeof dropdownMaster === 'object') {
        if (Array.isArray(dropdownMaster.Dropdown)) {
            dropdownList = dropdownMaster.Dropdown;
        } else if (Array.isArray(dropdownMaster.data)) {
            dropdownList = dropdownMaster.data;
        }
    }

    if (Array.isArray(dropdownList)) {
        const group = dropdownList.find(d => 
            d && d.DropdownTitle && d.DropdownTitle.trim().toLowerCase() === dropdownTitle
        );
        if (group) {
            const rawItems = group.item || group.Item || group.items || [];
            if (Array.isArray(rawItems)) {
                const target = String(value).trim().toLowerCase();
                const matched = rawItems.find(x => 
                    x && (
                        String(x.Code || x.code || '').trim().toLowerCase() === target
                    )
                );
                if (matched) {
                    return matched || value;
                }
            }
        }
    }

    return value;
}

function getStatusLeadDisplayName(statusLead) {
    if (!statusLead || String(statusLead).trim() === '' || statusLead === 'null' || statusLead === 'undefined') return '-';
    const name = getDropdownNameByCode(statusLead, true);
    return (name && String(name).trim() !== '') ? name : '-';
}

function getContactResultDisplayName(result) {
    if (!result || String(result).trim() === '' || result === 'null' || result === 'undefined') return '-';
    const name = getDropdownNameByCode(result, false);
    return (name && String(name).trim() !== '') ? name : '-';
}

// Fetch master dropdowns from API
async function loadMasterDropdowns() {
    try {
        const response = await fetch('/ProspectCall/GetDropDown');
        if (!response.ok) {
            console.error("GetDropDown HTTP error:", response.status, response.statusText);
            return;
        }
        let data = await response.json();
        dropdownMaster = data;
        console.log("dropdownMaster",dropdownMaster)
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) { return; }
        }

        let dropdownList = [];
        if (Array.isArray(data)) {
            if (data.length > 0 && data[0] && Array.isArray(data[0].Dropdown)) {
                dropdownList = data[0].Dropdown;
            } else {
                dropdownList = data;
            }
        } else if (data && typeof data === 'object') {
            if (Array.isArray(data.Dropdown)) {
                dropdownList = data.Dropdown;
            } else if (Array.isArray(data.data)) {
                dropdownList = data.data;
            }
        }

        if (Array.isArray(dropdownList) && dropdownList.length > 0) {
            masterDropdownData = dropdownList;
            buildMasterCodeMap(dropdownList);
            populateDropdownOptions(dropdownList);
            if (rawProspectItems.length > 0) {
                filterProspectTable();
            }
        }
    } catch (err) {
        console.error("Error loading master dropdowns:", err);
    }
}

// Populate modal dropdown select options dynamically
function populateDropdownOptions(dropdownList, objective) {
    const dropdownMap = {
        'StatusLead': {
            selector: '#modalStatusLead',
            defaultText: 'เลือก Status Lead',
            useEn: true
        },
        'ช่องทางการนัดหมาย': {
            selector: '#modalContactChannel',
            defaultText: 'เลือกช่องทาง'
        },
        'ผลการติดต่อ': {
            selector: '#modalContactResult',
            defaultText: 'เลือกผลการติดต่อ'
        },
        'ระดับความสนใจ': {
            selector: '#modalInterestLevel',
            defaultText: 'เลือกระดับความสนใจ'
        },
        'รายงานผล': {
            selector: '#modalSalesResult',
            defaultText: 'เลือกผลการรายงานผล'
        }
    };

    Object.keys(dropdownMap).forEach(titleKey => {
        const config = dropdownMap[titleKey];
        const $select = $(config.selector);
        if (!$select.length) return;

        const group = dropdownList.find(d => 
            d && d.DropdownTitle && d.DropdownTitle.trim().toLowerCase() === titleKey.toLowerCase()
        );

        if (!group) return;

        const rawItems = group.item || group.Item || group.items || [];
        if (!Array.isArray(rawItems)) return;

        // Filter active items (IsActive !== false)
        const activeItems = rawItems.filter(i => i && i.IsActive !== false && i.isActive !== false);

        // Sort items by SortOrder ascending
        activeItems.sort((a, b) => {
            const orderA = a.SortOrder ?? a.sortOrder ?? 0;
            const orderB = b.SortOrder ?? b.sortOrder ?? 0;
            return orderA - orderB;
        });

        // Re-build select options
        $select.empty();
        $select.append(`<option value="" disabled selected>${escapeHtml(config.defaultText)}</option>`);

        activeItems.forEach(item => {
            const nameTh = item.NameTh || item.nameTh || '';
            const nameEn = item.NameEn || item.nameEn || '';
            const code = item.Code || item.code || '';
            
            const displayText = config.useEn ? (nameEn || nameTh || code) : (nameTh || nameEn || code);
            const val = code || (config.useEn ? nameEn : nameTh);
            
            const $option = $('<option></option>')
                .val(val)
                .text(displayText)
                .attr('data-code', code)
                .attr('data-en', nameEn)
                .attr('data-th', nameTh);

            $select.append($option);
        });
    });

    populateProductDropdownOptions(dropdownList, objective);
}

// Populate product dropdown (#modalProduct) options based on Objective (CS/RM -> "ผลิตภัณฑ์ที่เสนอ_CS/RM", MC/FL -> "ผลิตภัณฑ์ที่เสนอ_MC/FL")
function populateProductDropdownOptions(dropdownList, objective) {
    const list = dropdownList || masterDropdownData;
    if (!Array.isArray(list) || list.length === 0) return;

    const $select = $('#modalProduct');
    if (!$select.length) return;

    const objUpper = String(objective || selectedCampaignObjective || '').trim().toUpperCase();

    let targetTitle = '';
    if (objUpper === 'CS' || objUpper === 'RM') {
        targetTitle = 'ผลิตภัณฑ์ที่เสนอ_CS/RM';
    } else if (objUpper === 'MC' || objUpper === 'FL') {
        targetTitle = 'ผลิตภัณฑ์ที่เสนอ_MC/FL';
    }

    let group = null;
    if (targetTitle) {
        group = list.find(d => 
            d && d.DropdownTitle && d.DropdownTitle.trim().toLowerCase() === targetTitle.toLowerCase()
        );
    }

    // Fallback search if exact objective title was not found
    if (!group) {
        group = list.find(d => 
            d && d.DropdownTitle && (
                d.DropdownTitle.trim().toLowerCase() === 'ผลิตภัณฑ์ที่เสนอ_cs/rm' ||
                d.DropdownTitle.trim().toLowerCase() === 'ผลิตภัณฑ์ที่เสนอ_mc/fl' ||
                d.DropdownTitle.trim().toLowerCase() === 'ผลิตภัณฑ์ที่เสนอ'
            )
        );
    }

    if (!group) return;

    const rawItems = group.item || group.Item || group.items || [];
    if (!Array.isArray(rawItems)) return;

    const activeItems = rawItems.filter(i => i && i.IsActive !== false && i.isActive !== false);

    activeItems.sort((a, b) => {
        const orderA = a.SortOrder ?? a.sortOrder ?? 0;
        const orderB = b.SortOrder ?? b.sortOrder ?? 0;
        return orderA - orderB;
    });

    const currentVal = $select.val();

    $select.empty();
    $select.append('<option value="" disabled selected>เลือกผลิตภัณฑ์</option>');

    activeItems.forEach(item => {
        const nameTh = item.NameTh || item.nameTh || '';
        const nameEn = item.NameEn || item.nameEn || '';
        const code = item.Code || item.code || '';

        const displayText = nameTh || nameEn || code;
        const val = code || nameTh;

        const $option = $('<option></option>')
            .val(val)
            .text(displayText)
            .attr('data-code', code)
            .attr('data-en', nameEn)
            .attr('data-th', nameTh);

        $select.append($option);
    });

    if (currentVal) {
        setSelectValue($select, currentVal);
    }
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
        const displayStatus = getContactResultDisplayName(item.status);
        const displayStatusLead = getStatusLeadDisplayName(item.statusLead);
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
                data-date="${escapeHtml(item.date)}"
                data-remarks="${escapeHtml(item.remarks)}">
                <td style="text-align: center;" class="row-seq">${seq}</td>
                <td>${escapeHtml(item.branch || '-')}</td>
                <td>${escapeHtml(item.name || '-')}</td>
                <td>${escapeHtml(item.contract || '-')}</td>
                <td>${escapeHtml(item.phone || '-')}</td>
                <td>${escapeHtml(item.carLocation || '-')}</td>
                <td><span class="status-badge badge ${badgeClass}">${escapeHtml(displayStatus || '-')}</span></td>
                <td>${escapeHtml(formatDateTh(item.date) || item.date || '-')}</td>
                <td><span class="status-badge badge ${badgeClassStatusLead}">${escapeHtml(displayStatusLead || '-')}</span></td>
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

// Fetch History Call from controller endpoint
async function getHistoryCall(prospectBatch, customerId) {
    if (!prospectBatch || !customerId) {
        console.warn("getHistoryCall: Missing prospectBatch or customerId", { prospectBatch, customerId });
        return [];
    }

    try {
        const response = await fetch(`/ProspectCall/GetHistoryCall?prospectBatch=${encodeURIComponent(prospectBatch)}&customerId=${encodeURIComponent(customerId)}`);
        if (!response.ok) {
            console.error("getHistoryCall HTTP error:", response.status, response.statusText);
            return [];
        }

        let data = await response.json();
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) {}
        }

        let history = [];
        if (Array.isArray(data)) {
            history = data;
        } else if (data && Array.isArray(data.data)) {
            history = data.data;
        } else if (data && Array.isArray(data.history)) {
            history = data.history;
        } else if (data && Array.isArray(data.items)) {
            history = data.items;
        } else if (data && typeof data === 'object') {
            const possibleArr = Object.values(data).find(val => Array.isArray(val));
            if (possibleArr) history = possibleArr;
        }

        return history;
    } catch (err) {
        console.error("Error in getHistoryCall:", err);
        return [];
    }
}

// Render Modal Contact History dynamically from array
function renderModalContactHistory(historyList) {
    const $list = $('#modalHistoryList');
    $list.empty();

    const countText = historyList ? historyList.length : 0;
    $('#modalHistoryCount').text(`(ล่าสุด ${countText} รายการ)`);

    if (!historyList || historyList.length === 0) {
        $list.html('<div class="text-center text-muted py-4 extra-small">ไม่พบประวัติการติดต่อ</div>');
        return;
    }

    historyList.forEach((rawItem, index) => {
        const dateStr = rawItem.created || '-';
        let formattedDate = dateStr;
        if (dateStr && dateStr.includes('T')) {
            const [dPart, tPart] = dateStr.split('T');
            const [y, m, d] = dPart.split('-');
            const dateFmt = (y && m && d) ? `${d}/${m}/${y}` : dPart;
            const timeFmt = tPart ? tPart.substring(0, 5) : '';
            formattedDate = timeFmt ? `${dateFmt} ${timeFmt}` : dateFmt;
        } else if (dateStr && dateStr.length >= 10 && dateStr.includes('-')) {
            const dPart = dateStr.substring(0, 10);
            const [y, m, d] = dPart.split('-');
            const timeFmt = dateStr.length > 10 ? dateStr.substring(11, 16) : '';
            const dateFmt = (y && m && d) ? `${d}/${m}/${y}` : dPart;
            formattedDate = timeFmt ? `${dateFmt} ${timeFmt}` : dateFmt;
        }

        const rawStatusLead = rawItem.status_lead || '';
        const statusLeadCode = getStatusLeadFromMaster('statuslead', rawStatusLead).NameEn || rawStatusLead || 'Follow';

        const rawCallCase = rawItem.call_result || '';
        const callCaseName = getStatusLeadFromMaster('ผลการติดต่อ', rawCallCase).NameTh || rawCallCase;

        const reportText = rawItem.call_report || '';
        const remarksText = rawItem.call_remark || '';

        const rawAppt = rawItem.appointment || '';
        let apptDisplay = '-';
        if (rawAppt) {
            const strAppt = String(rawAppt).trim();
            if (strAppt.includes('T')) {
                const [dPart, tPart] = strAppt.split('T');
                const [y, m, d] = dPart.split('-');
                const dateFmt = (y && m && d) ? `${d}/${m}/${y}` : dPart;
                const timeFmt = tPart ? tPart.substring(0, 5) : '';
                apptDisplay = timeFmt ? `${dateFmt} ${timeFmt}` : dateFmt;
            } else {
                apptDisplay = strAppt;
            }
        }

        const badgeClass = getStatusLeadSubtleBadgeClass(statusLeadCode);
        const iconClass = rawItem.icon || 'bi-telephone';
        const displayStatusLead = getStatusLeadDisplayName(statusLeadCode);
        const displayResult = getContactResultDisplayName(callCaseName);

        const card = $(`
            <div class="pc-history-card p-3 rounded-3 border bg-white shadow-sm-hover cursor-pointer mb-2" data-index="${index}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="small fw-semibold text-dark"><i class="bi ${iconClass} text-primary me-1.5"></i> ${escapeHtml(formattedDate)}</span>
                    <span class="badge ${badgeClass} border px-2 py-0.5 rounded-pill extra-small">${escapeHtml(displayStatusLead)}</span>
                </div>
                <div class="text-secondary extra-small">ผลการติดต่อ: ${escapeHtml(displayResult)}</div>
                ${reportText ? `<div class="text-secondary extra-small text-truncate" title="${escapeHtml(reportText)}">รายงาน: ${escapeHtml(reportText)}</div>` : ''}
                ${remarksText ? `<div class="text-secondary extra-small text-truncate" title="${escapeHtml(remarksText)}">หมายเหตุ: ${escapeHtml(remarksText)}</div>` : ''}
                <div class="text-secondary extra-small">นัดหมาย: ${escapeHtml(apptDisplay)}</div>
            </div>
        `);

        // Click handler to populate form fields with details from clicked history card
        card.on('click', function () {
            $('.pc-history-card').removeClass('border-primary bg-primary-subtle');
            $(this).addClass('border-primary bg-primary-subtle');

            setSelectValue($('#modalContactResult'), rawCallCase);
            setSelectValue($('#modalStatusLead'), statusLeadCode);
            $('#modalContactReport').val(reportText);
            setSelectValue($('#modalProduct'), rawItem.product_present || '');
            setSelectValue($('#modalInterestLevel'), rawItem.interest_level || '');
            setSelectValue($('#modalSalesResult'), rawItem.call_result_description || '');

            if (rawAppt && rawAppt.includes('T')) {
                const [dPart, tPart] = rawAppt.split('T');
                $('#modalNextDate').val(dPart);
                $('#modalNextTime').val(tPart ? tPart.substring(0, 5) : '');
            } else if (rawAppt && rawAppt.includes(' ')) {
                const parts = rawAppt.split(' ');
                $('#modalNextDate').val(parts[0] || '');
                $('#modalNextTime').val(parts[1] ? parts[1].substring(0, 5) : '');
            } else {
                $('#modalNextDate').val(rawItem.nextDate || rawAppt || '');
                $('#modalNextTime').val(rawItem.nextTime || '');
            }

            setSelectValue($('#modalContactChannel'), rawItem.appointment_way || '');
            $('#modalRemarks').val(remarksText);

            // Update character counters
            $('#contactReportCount').text(`${($('#modalContactReport').val() || '').length}/500`);
            $('#remarksCount').text(`${($('#modalRemarks').val() || '').length}/300`);
        });

        $list.append(card);
    });
}

// Open Record Result Pop-up Modal
async function openRecordResultModal(trElement) {
    selectedCustomerRow = trElement;
    const $row = $(trElement);
    const itemId = $row.data('id');
    const contract = $row.data('contract');

    // Find customer in rawProspectItems array
    const customer = rawProspectItems.find(item => item.id == itemId || item.contract == contract) || {
        name: $row.data('name') || '-',
        phone: $row.data('phone') || '-',
        objective: selectedCampaignObjective || '',
        statusLead: $row.data('statuslead') || 'Follow',
        status: $row.data('status') || 'พร้อมติดต่อ',
        nextAppt: '-',
        remarks: $row.data('remarks') || '',
        historyList: []
    };

    const activeCampaign = campaignsData.find(c => c.code === selectedCampaignCode);
    const campaignObjectiveCode = (customer && (customer.objective || customer.Objective_code)) || (activeCampaign ? (activeCampaign.Objective_code || '') : (selectedCampaignObjective || ''));
    const objBadge = getObjectiveBadge(campaignObjectiveCode);

    // Populate modalProduct dropdown based on Objective (CS/RM vs MC/FL)
    populateProductDropdownOptions(masterDropdownData, campaignObjectiveCode);

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
    const displayStatusLead = getStatusLeadDisplayName(customer.statusLead);
    const displayStatus = getContactResultDisplayName(customer.status);

    $('#modalCustLeadStatus')
        .attr('class', `status-badge badge ${leadStatusClass}`)
        .text(displayStatusLead);

    $('#modalCustLastResult')
        .attr('class', `badge ${lastResultClass} border px-3 py-1 rounded-pill fw-semibold`)
        .text(displayStatus);

    $('#modalCustNextAppt').text(customer.nextAppt || '-');

    // Reset form fields
    setSelectValue($('#modalContactResult'), '');
    setSelectValue($('#modalStatusLead'), '');
    $('#modalContactReport').val('');
    setSelectValue($('#modalProduct'), '');
    setSelectValue($('#modalInterestLevel'), '');
    setSelectValue($('#modalSalesResult'), '');
    $('#modalNextDate').val('');
    $('#modalNextTime').val('');
    setSelectValue($('#modalContactChannel'), '');
    $('#modalRemarks').val(customer.remarks || '');

    // Reset character counters
    $('#contactReportCount').text('0/500');
    $('#remarksCount').text(`${(customer.remarks || '').length}/300`);

    // Show bootstrap modal
    const modalEl = document.getElementById('recordResultModal');
    if (modalEl) {
        const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bsModal.show();
    }

    // Set loading indicator for contact history sidebar
    $('#modalHistoryList').html('<div class="text-center text-muted py-4 extra-small"><i class="bi bi-hourglass-split me-1"></i> กำลังโหลดประวัติการติดต่อ...</div>');
    $('#modalHistoryCount').text('(กำลังโหลด...)');

    // Get prospectBatch and customerId for API call
    const rawItem = customer.raw || {};
    const prospectBatch = rawItem.prospect_batch || '';
    const customerId = rawItem.id || '';

    let historyList = [];
    if (prospectBatch && customerId) {
        historyList = await getHistoryCall(prospectBatch, customerId);
    }

    // Fallback to customer.historyList if API returned empty but local customer has history
    if ((!historyList || historyList.length === 0) && customer.historyList && customer.historyList.length > 0) {
        historyList = customer.historyList;
    }

    customer.historyList = historyList;
    renderModalContactHistory(historyList);
}

// Save Record Result
function saveRecordResult() {
    const resultVal = $('#modalContactResult').val();
    const statusLeadVal = $('#modalStatusLead').val();
    const reportVal = $('#modalContactReport').val();
    const productVal = $('#modalProduct').val() || '';
    const interestVal = $('#modalInterestLevel').val() || '';
    const salesResultVal = $('#modalSalesResult').val() || '';
    const remarksVal = $('#modalRemarks').val() || '';
    const nextDateVal = $('#modalNextDate').val() || '';
    const nextTimeVal = $('#modalNextTime').val() || '';
    const channelVal = $('#modalContactChannel').val() || '';

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

    let customerName = $('#modalCustName').text();
    let targetItem = null;
    let rawItem = {};

    if (selectedCustomerRow) {
        const $row = $(selectedCustomerRow);
        const itemId = $row.data('id');
        const contract = $row.data('contract');
        targetItem = rawProspectItems.find(item => item.id == itemId || item.contract == contract);
        if (targetItem) {
            rawItem = targetItem.raw || {};
        } else {
            rawItem = {
                id: itemId,
                contno: contract,
                name: $row.data('name'),
                phone: $row.data('phone'),
                idno: $row.data('idcard')
            };
        }
    }

    Swal.fire({
        title: 'ยืนยันการบันทึกผลการติดต่อ?',
        text: `บันทึกผล: "${resultVal}" สำหรับลูกค้า ${customerName}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'บันทึกข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then(async (res) => {
        if (res.isConfirmed) {
            const currentUserId = window.CURRENT_USER_ID || rawItem.isCallBy || rawItem.isCall_by || '680004';

            let apptStr = '';
            if (nextDateVal) {
                apptStr = nextDateVal + (nextTimeVal ? ` ${nextTimeVal}` : '');
            }
            const payload = [
                {
                    "cid": String(rawItem.id || ''),
                    "contno": String(rawItem.contno || ''),
                    "created": new Date().toISOString(),
                    "idno": String(rawItem.idno || ''),
                    "isCall": true,
                    "isCallBy": String(currentUserId),
                    "isCallCase": String(resultVal),
                    "isCallLock": false,
                    "isCallLockTime": "0",
                    "isCallRemark": String(remarksVal),
                    "mobile": String(rawItem.mobile || ''),
                    "prospect_batch": String(rawItem.prospect_batch || ''),
                    "status_lead": String(statusLeadVal),
                    "call_result_description": String(salesResultVal),
                    "product_present": String(productVal),
                    "interest_level": String(interestVal),
                    "call_report": String(reportVal),
                    "appointment": String(apptStr),
                    "appointment_way": String(channelVal)
                }
            ];

            try {
                if (typeof startLoading === 'function') {
                    startLoading('กำลังบันทึกข้อมูล...', 'ระบบกำลังส่งข้อมูลผลการติดต่อ กรุณารอสักครู่...');
                }

                const response = await fetch('/ProspectCall/postHistoryCall', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ (${response.status})`);
                }

                let resultData;
                try {
                    resultData = await response.json();
                } catch (e) {
                    resultData = null;
                }

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

            } catch (err) {
                console.error("Error posting history call:", err);
                Swal.fire({
                    title: 'บันทึกไม่สำเร็จ',
                    text: err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลผลการติดต่อ',
                    icon: 'error',
                    confirmButtonColor: '#1e5dd1'
                });
            } finally {
                if (typeof stopLoading === 'function') {
                    stopLoading();
                }
            }
        }
    });
}

async function call3CX(number) {
    try {
        if (!number) {
            throw new Error("Phone number is required.");
        }
        window.location.href = `tel:${number}`;

    } catch (err) {
        status.textContent = "Failed to connect.";
        console.error(err);
    }
}

// Document Ready
$(document).ready(function () {
    // Initial Load Master Dropdowns
    loadMasterDropdowns();

    // Initial Load Campaigns
    loadCampaignData();

    // Campaign search listenert);
    $("#campaignSearch").off("keydown").on("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
            e.preventDefault();
            SearchCampaign();
        }
    });

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

    // 3CX Call button click handler
    $('#btnModalCall').on('click', function (e) {
        e.preventDefault();
        let modalCustPhone = $('#modalCustPhone').text() || '';
        modalCustPhone = modalCustPhone.replace("-","");
        const phone = "8"+modalCustPhone;
        call3CX(phone);
    });
});

