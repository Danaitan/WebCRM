const pageSize = 5;
let page = 1;
let campaigns = [];
let selectedCampaignCode = "";
let campaignTable;

// Colour palette cycling for campaign cards
const iconColors = ['blue', 'green', 'yellow', 'purple', 'red'];

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
        const queryStr = (page !== undefined && pageSize !== undefined) 
            ? `?page=${page}&pageSize=${pageSize}`
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
                    const isActive = row.code === selectedCampaignCode;
                    const idx = campaigns.findIndex(c => c.code === row.code);
                    const color = iconColors[idx >= 0 ? idx % iconColors.length : 0] || 'blue';
                    const sCls = statusClass(row.status);
                    const startFmt = formatDate(row.startDate);
                    const endFmt = formatDate(row.endDate);

                    return `
                        <div class="pa-card ${isActive ? 'active' : ''}" data-code="${row.code}">
                            <div class="pa-card-icon ${color}"><i class="bi bi-megaphone"></i></div>
                            <div class="pa-card-content">
                                <div class="pa-card-title-row">
                                    <div class="pa-card-id">${row.code}</div>
                                    <div class="pa-status-badge ${sCls}">${row.status}</div>
                                </div>
                                <div class="pa-card-name">${row.name}</div>
                                <div class="pa-card-date">วันที่เริ่ม: ${startFmt || '-'} &bull; วันที่สิ้นสุด: ${endFmt || '-'}</div>
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

    var rows    = document.querySelectorAll('#prospectTableBody tr');
    var visible = 0;

    rows.forEach(function (row) {
        var rowBranch   = row.dataset.branch   || '';
        var rowName     = row.dataset.name     || '';
        var rowContract = row.dataset.contract || '';
        var rowBy       = row.dataset.by       || '';

        var matchText   = !query ||
            rowBranch.toLowerCase().includes(query)   ||
            rowName.toLowerCase().includes(query)     ||
            rowContract.toLowerCase().includes(query);
        var matchBranch = !branch || rowBranch === branch;
        var matchBy     = !byUser || rowBy.toLowerCase().includes(byUser.toLowerCase());

        var show = matchText && matchBranch && matchBy;
        row.style.display = show ? '' : 'none';
        if (show) visible++;
    });

    var seq = 1;
    rows.forEach(function (row) {
        if (row.style.display !== 'none') {
            row.cells[0].textContent = seq++;
        }
    });

    var total = rows.length;
    var prospectPaginationText = document.getElementById('prospectPaginationText');
    if (prospectPaginationText) {
        prospectPaginationText.textContent =
            visible > 0
                ? 'แสดง 1 - ' + visible + ' จาก ' + total + ' รายการ'
                : 'แสดง 0 จาก ' + total + ' รายการ';
    }
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
        }
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
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'อนุมัติเรียบร้อย!',
                    text: `ดำเนินการอนุมัติ ${code || 'รายการ'} เสร็จสิ้น`,
                    icon: 'success',
                    confirmButtonColor: '#10b981',
                    confirmButtonText: 'ตกลง'
                });
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
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="bi bi-x-lg me-1"></i> ยืนยันไม่อนุมัติ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            focusCancel: true
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'ไม่อนุมัติเรียบร้อย!',
                    text: `ปฏิเสธการอนุมัติ ${code || 'รายการ'} เรียบร้อยแล้ว`,
                    icon: 'error',
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'ตกลง'
                });
            }
        });
    });

    $("#btnReturn, .btn-pa-return").on("click", function () {
        const code = $("#detailId").val() || selectedCampaignCode || "";
        const name = $("#detailName").val() || "";
        const label = code ? `${code} (${name})` : "รายการนี้";

        Swal.fire({
            title: 'ยืนยันการตีกลับ',
            html: `คุณต้องการตีกลับ <b>${label}</b> เพื่อแก้ไขใช่หรือไม่?`,
            icon: 'warning',
            input: 'textarea',
            inputLabel: 'ระบุหมายเหตุ / เหตุผลในการตีกลับ',
            inputPlaceholder: 'กรอกหมายเหตุการตีกลับที่นี่...',
            inputAttributes: {
                'aria-label': 'กรอกหมายเหตุการตีกลับที่นี่'
            },
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#64748b',
            confirmButtonText: '<i class="bi bi-arrow-counterclockwise me-1"></i> ยืนยันตีกลับ',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            focusCancel: false,
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'กรุณากรอกหมายเหตุหรือเหตุผลในการตีกลับ';
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const remark = result.value;
                Swal.fire({
                    title: 'ตีกลับเรียบร้อย!',
                    text: `ส่งตีกลับ ${code || 'รายการ'} เรียบร้อยแล้ว (หมายเหตุ: ${remark})`,
                    icon: 'warning',
                    confirmButtonColor: '#f59e0b',
                    confirmButtonText: 'ตกลง'
                });
            }
        });
    });
});
