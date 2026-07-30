// prospectCall.js - Sales & Follow-up Page Script

let selectedCampaignCode = "CMP-2024-0001";
let selectedCustomerRow = null;

// Prospect / Customer Data Array
let prospectData = [
    {
        id: 1,
        branch: "ไมโครลิสซิ่ง สาขาเชียงใหม่",
        name: "คุณณัฐวรรณ ใจดี",
        contract: "CT-6705-000123",
        phone: "081-234-5678",
        carLocation: "เชียงใหม่",
        status: "พร้อมติดต่อ",
        date: "15/05/2024 10:15",
        by: "พงศกร คนสอน",
        idcard: "1-5099-00123-45-6",
        address: "99/123 หมู่ 4 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
        pdpa: "ยินยอมแล้ว",
        plan: "6,000 / 12 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 2,
        branch: "ไมโครลิสซิ่ง สาขาขอนแก่น",
        name: "คุณกิตติพงษ์ วงศ์สวัสดิ์",
        contract: "CT-6705-000124",
        phone: "089-876-5432",
        carLocation: "ขอนแก่น",
        status: "รอนัดหมาย",
        date: "15/05/2024 10:22",
        by: "พงศกร คนสอน",
        idcard: "3-4001-00456-78-9",
        address: "12/3 ถนนมิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
        pdpa: "ยินยอมแล้ว",
        plan: "8,500 / 24 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 3,
        branch: "ไมโครลิสซิ่ง สาขาอุดรธานี",
        name: "คุณสุนิสา โพธิ์ทอง",
        contract: "CT-6705-000125",
        phone: "082-345-6789",
        carLocation: "อุดรธานี",
        status: "โทรแล้ว",
        date: "15/05/2024 10:35",
        by: "จิราภรณ์ วงษ์ดี",
        idcard: "1-4199-00789-12-3",
        address: "88 หมู่ 2 ต.หมากแข้ง อ.เมือง จ.อุดรธานี 41000",
        pdpa: "ยินยอมแล้ว",
        plan: "5,500 / 18 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 4,
        branch: "ไมโครลิสซิ่ง สาขาสงขลา",
        name: "คุณอำพล เพชรเกษม",
        contract: "CT-6705-000126",
        phone: "086-543-2109",
        carLocation: "สงขลา",
        status: "รอติดตาม",
        date: "15/05/2024 10:40",
        by: "จิราภรณ์ วงษ์ดี",
        idcard: "9-9002-00111-22-3",
        address: "45/1 ถนนกาญจนวนิช ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
        pdpa: "ยินยอมแล้ว",
        plan: "7,200 / 12 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 5,
        branch: "ไมโครลิสซิ่ง สาขาภูเก็ต",
        name: "คุณปวีณ์ลดา ศรีสุข",
        contract: "CT-6705-000127",
        phone: "084-112-2334",
        carLocation: "ภูเก็ต",
        status: "สนใจ",
        date: "15/05/2024 10:55",
        by: "พงศกร คนสอน",
        idcard: "8-8300-00999-88-7",
        address: "100/5 ถนนเทพกระษัตรี ต.รัษฎา อ.เมือง จ.ภูเก็ต 83000",
        pdpa: "ยินยอมแล้ว",
        plan: "10,000 / 36 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 6,
        branch: "ไมโครลิสซิ่ง สาขาเชียงใหม่",
        name: "คุณภาคภูมิ แสงทอง",
        contract: "CT-6705-000128",
        phone: "085-998-8776",
        carLocation: "เชียงใหม่",
        status: "ติดต่อไม่ได้",
        date: "16/05/2024 09:10",
        by: "พงศกร คนสอน",
        idcard: "1-5099-00444-55-6",
        address: "14 ถนนช้างคลาน ต.ช้างคลาน อ.เมือง จ.เชียงใหม่ 50100",
        pdpa: "ยินยอมแล้ว",
        plan: "6,500 / 12 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 7,
        branch: "ไมโครลิสซิ่ง สาขาขอนแก่น",
        name: "คุณศิริพร มิลดี",
        contract: "CT-6705-000129",
        phone: "083-445-5667",
        carLocation: "ขอนแก่น",
        status: "ไม่สนใจ",
        date: "16/05/2024 11:30",
        by: "จิราภรณ์ วงษ์ดี",
        idcard: "4-4002-00555-66-7",
        address: "55 ถนนศรีจันทร์ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
        pdpa: "ยินยอมแล้ว",
        plan: "7,000 / 24 เดือน",
        count: "1",
        remarks: ""
    },
    {
        id: 8,
        branch: "ไมโครลิสซิ่ง สาขาอุดรธานี",
        name: "คุณสมชาย มันคง",
        contract: "CT-6705-000130",
        phone: "081-776-6554",
        carLocation: "อุดรธานี",
        status: "พร้อมติดต่อ",
        date: "16/05/2024 14:00",
        by: "พงศกร คนสอน",
        idcard: "1-4199-00222-33-4",
        address: "200 ถนนทหาร ต.หมากแข้ง อ.เมือง จ.อุดรธานี 41000",
        pdpa: "ยินยอมแล้ว",
        plan: "9,000 / 12 เดือน",
        count: "1",
        remarks: ""
    }
];

// Status badge styling helper
function getStatusBadgeClass(status) {
    const map = {
        'พร้อมติดต่อ': 'bg-success text-white',
        'รอนัดหมาย': 'bg-info text-white',
        'โทรแล้ว': 'bg-primary text-white',
        'รอติดตาม': 'bg-warning text-dark',
        'สนใจ': 'bg-success text-white',
        'ไม่สนใจ': 'bg-danger text-white',
        'ติดต่อไม่ได้': 'bg-secondary text-white'
    };
    return map[status] || 'bg-secondary text-white';
}

// Format date string YYYY-MM-DD -> DD/MM/YYYY
function formatDateTh(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
}

// Render Prospect Table from Array Data
function renderProspectTable(items) {
    const $tbody = $('#prospectTableBody');
    $tbody.empty();

    if (!items || items.length === 0) {
        $tbody.html('<tr><td colspan="9" class="text-center py-4 text-muted">ไม่พบข้อมูล Prospect / ลูกค้า</td></tr>');
        $('#prospectPaginationText').text(`แสดง 0 จาก ${prospectData.length} รายการ`);
        return;
    }

    items.forEach((item, index) => {
        const badgeClass = getStatusBadgeClass(item.status);
        const tr = $(`
            <tr data-id="${item.id}"
                data-branch="${item.branch || ''}" 
                data-name="${item.name || ''}" 
                data-contract="${item.contract || ''}" 
                data-phone="${item.phone || ''}" 
                data-status="${item.status || ''}" 
                data-by="${item.by || ''}" 
                data-idcard="${item.idcard || ''}" 
                data-address="${item.address || ''}" 
                data-pdpa="${item.pdpa || ''}" 
                data-plan="${item.plan || ''}"
                data-count="${item.count || '1'}"
                data-remarks="${item.remarks || ''}">
                <td style="text-align: center;" class="row-seq">${index + 1}</td>
                <td>${item.branch || ''}</td>
                <td class="fw-bold text-dark">${item.name || ''}</td>
                <td><span class="badge bg-light text-primary border">${item.contract || ''}</span></td>
                <td>${item.phone || ''}</td>
                <td>${item.carLocation || ''}</td>
                <td><span class="status-badge badge ${badgeClass}">${item.status || ''}</span></td>
                <td>${item.date || ''}</td>
                <td>${item.by || ''}</td>
            </tr>
        `);
        $tbody.append(tr);
    });

    $('#prospectPaginationText').text(`แสดง 1 - ${items.length} จาก ${prospectData.length} รายการ`);
}

// Filter Prospect Table
function filterProspectTable() {
    const query = ($('#prospectSearch').val() || '').trim().toLowerCase();
    const branch = $('#filterBranch').val() || '';
    const status = $('#filterStatus').val() || '';
    const byUser = ($('#filterBy').val() || '').trim().toLowerCase();

    const filtered = prospectData.filter(item => {
        const itemBranch = (item.branch || '').toLowerCase();
        const itemName = (item.name || '').toLowerCase();
        const itemContract = (item.contract || '').toLowerCase();
        const itemPhone = (item.phone || '').toLowerCase();
        const itemStatus = item.status || '';
        const itemBy = (item.by || '').toLowerCase();

        const matchQuery = !query || itemBranch.includes(query) || itemName.includes(query) || itemContract.includes(query) || itemPhone.includes(query);
        const matchBranch = !branch || item.branch === branch;
        const matchStatus = !status || itemStatus === status;
        const matchBy = !byUser || itemBy.includes(byUser);

        return matchQuery && matchBranch && matchStatus && matchBy;
    });

    renderProspectTable(filtered);
}

// Clear filters
function clearFilters() {
    $('#filterStartDate, #filterEndDate, #filterStatus, #filterBranch, #filterBy, #prospectSearch, #campaignSearch').val('');
    filterProspectTable();
}

// Open Record Result Pop-up Modal
function openRecordResultModal(trElement) {
    selectedCustomerRow = trElement;
    const $row = $(trElement);

    const name = $row.data('name') || '';
    const contract = $row.data('contract') || '';
    const phone = $row.data('phone') || '';
    const branch = $row.data('branch') || '';
    const idCard = $row.data('idcard') || '1-5099-00123-45-6';
    const address = $row.data('address') || '99/123 หมู่ 4 ต.สุเทพ อ.เมือง จ.เชียงใหม่';
    const pdpa = $row.data('pdpa') || 'ยินยอมแล้ว';
    const plan = $row.data('plan') || '6,000 / 12 เดือน';
    const count = $row.data('count') || '1';
    const remarks = $row.data('remarks') || '';

    // Set modal title & customer info
    $('#modalCustName').text(name);
    $('#modalCustContract').text(contract);
    $('#modalCustPhone').text(phone);
    $('#modalCustBranch').text(branch);
    $('#modalCustIdCard').text(idCard);
    $('#modalCustAddress').text(address);
    $('#modalCustPdpa').text(pdpa);
    $('#modalCustPlan').text(plan);

    // Set form fields
    $('#modalContactCount').val(count);
    $('#modalContactResult').val('');
    $('#modalNextDate').val('');
    $('#modalRemarks').val(remarks);

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
    const nextDateVal = $('#modalNextDate').val();
    const remarksVal = $('#modalRemarks').val();
    const countVal = $('#modalContactCount').val();

    if (!resultVal) {
        Swal.fire({
            title: 'กรุณาเลือกผลการติดต่อ',
            text: 'โปรดเลือกผลการติดต่อก่อนบันทึกข้อมูล',
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
            // Update customer data in array
            if (selectedCustomerRow) {
                const $row = $(selectedCustomerRow);
                const itemId = $row.data('id');
                const contract = $row.data('contract');

                const targetItem = prospectData.find(item => item.id == itemId || item.contract == contract);
                if (targetItem) {
                    targetItem.status = resultVal;
                    targetItem.remarks = remarksVal;
                    targetItem.count = countVal;
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
    // Initial Render Table
    renderProspectTable(prospectData);

    // Campaign card selection
    $('.pa-card').on('click', function () {
        $('.pa-card').removeClass('active');
        $(this).addClass('active');
        selectedCampaignCode = $(this).data('code') || '';

        // Update detail header
        const name = $(this).find('.pa-card-name').text();
        const code = $(this).find('.pa-card-id').text();

        $('#detailId').val(code);
        $('#detailName').val(name);
    });

    // Prospect search listener
    $('#prospectSearch').on('input', filterProspectTable);
    $('#filterBranch, #filterStatus').on('change', filterProspectTable);
    $('#filterBy').on('input', filterProspectTable);
    $('#btnClearFilter').on('click', clearFilters);

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
