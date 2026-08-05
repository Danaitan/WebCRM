// prospectCall.js - Sales & Follow-up Page Script

let selectedCampaignCode = "APP-0001";
let selectedCampaignName = "โปรโมชัน ดอกเบี้ยพิเศษ 2.99%";
let selectedCampaignObjective = "CS";
let selectedCustomerRow = null;

// Helper: Objective Badge Mapping (CS=เขียว, MC/CL=เหลือง, RM=ฟ้า, FL=ส้ม)
function getObjectiveBadge(obj) {
    const map = {
        'CS': { text: 'CS', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' },
        'MC': { text: 'MC', class: 'bg-warning-subtle text-warning border-warning-subtle', iconBg: 'yellow' },
        'RM': { text: 'RM', class: 'bg-info-subtle text-info border-info-subtle', iconBg: 'blue' },
        'FL': { text: 'FL', class: 'bg-orange-subtle text-orange border-orange-subtle', iconBg: 'orange' }
    };
    return map[obj] || { text: obj || 'CS', class: 'bg-success-subtle text-success border-success-subtle', iconBg: 'green' };
}

// Campaign Data Array
let campaignData = [
    {
        code: "APP-0001",
        name: "โปรโมชัน ดอกเบี้ยพิเศษ 2.99%",
        status: "Active",
        startDate: "01/05/2024",
        endDate: "31/07/2024",
        objective: "CS"
    },
    {
        code: "APP-0002",
        name: "แคมเปญ ฟรีวันรับเงินคืน 1",
        status: "Active",
        startDate: "15/05/2024",
        endDate: "30/06/2024",
        objective: "MC"
    },
    {
        code: "APP-0003",
        name: "โปรโมชัน รีไฟแนนซ์ ดอกเบี้ยพิเศษ",
        status: "Active",
        startDate: "01/06/2024",
        endDate: "31/08/2024",
        objective: "RM"
    },
    {
        code: "APP-0004",
        name: "โปรโมชัน ผ่อนสบาย 0% 6 เดือน",
        status: "Expire",
        startDate: "10/01/2024",
        endDate: "10/04/2024",
        objective: "FL"
    }
];

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
        
        // Campaign status badge: Active (เขียว) / Expire (แดง)
        const statusBadgeClass = (item.status === 'Active')
            ? 'bg-success-subtle text-success border-success-subtle'
            : 'bg-danger-subtle text-danger border-danger-subtle';

        // Objective badge styling (CS เขียว, MC/CL เหลือง, RM ฟ้า, FL ส้ม)
        const objBadge = getObjectiveBadge(item.objective);

        const card = $(`
            <div class="pa-card ${activeClass} p-3 rounded-3 mb-2 border shadow-sm-hover cursor-pointer overflow-hidden" data-code="${item.code}">
                <div class="d-flex align-items-center gap-2.5 w-100 overflow-hidden">
                    <div class="pa-card-icon ${objBadge.iconBg} flex-shrink-0 fw-bold">${objBadge.text}</div>
                    <div class="pa-card-content flex-grow-1 overflow-hidden min-w-0 ms-2">
                        <div class="d-flex justify-content-between align-items-center mb-1 gap-1 overflow-hidden">
                            <div class="pa-card-name fw-bold text-dark fs-6 text-truncate me-1" title="${item.name}">${item.name}</div>
                            <span class="badge ${statusBadgeClass} border px-2 py-0.5 rounded-pill extra-small flex-shrink-0">${item.status}</span>
                        </div>
                        <div class="d-flex align-items-center gap-1.5 mb-1 flex-wrap">
                            <span class="pa-card-id badge bg-light text-primary border px-2 py-0.5 extra-small">${item.code}</span>
                        </div>
                        <div class="pa-card-date extra-small text-muted text-truncate" title="เริ่ม: ${item.startDate} • สิ้นสุด: ${item.endDate}">เริ่ม: ${item.startDate} &bull; สิ้นสุด: ${item.endDate}</div>
                    </div>
                </div>
            </div>
        `);
        $container.append(card);
    });
}

// Filter Campaign List
function filterCampaignList() {
    const query = ($('#campaignSearch').val() || '').trim().toLowerCase();
    const filtered = campaignData.filter(item => {
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        return !query || code.includes(query) || name.includes(query);
    });
    renderCampaignList(filtered);
}

// Prospect / Customer Data Array with dynamic history & info
let prospectData = [
    {
        id: 1,
        branch: "ไมโครลิสซิ่ง สาขาเชียงใหม่",
        name: "คุณณัฐวรรณ ใจดี",
        contract: "CT-6705-000123",
        phone: "081-234-5678",
        carLocation: "เชียงใหม่",
        status: "ขอข้อมูลเพิ่มเติม",
        date: "15/05/2024 10:15",
        statusLead: "Follow",
        idcard: "1-5099-00123-45-6",
        address: "99/123 หมู่ 4 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
        pdpa: "ยินยอมแล้ว",
        plan: "6,000 / 12 เดือน",
        count: "1",
        remarks: "สนใจรีไฟแนนซ์ ขอส่งเอกสารเพิ่ม",
        objective: "CS",
        nextAppt: "20/05/2024 14:00",
        historyList: [
            {
                date: "15/05/2024 10:22",
                statusLead: "Follow",
                result: "ขอข้อมูลเพิ่มเติม",
                report: "ลูกค้าสนใจสินเชื่อจำนำทะเบียน ขอใบเสนอราคาและตารางค่างวดเพิ่มเติมเพื่อนำไปเปรียบเทียบ",
                product: "สินเชื่อจำนำทะเบียน",
                interestLevel: "High",
                salesResult: "ขอคิดดูก่อน",
                nextDate: "2024-05-20",
                nextTime: "14:00",
                channel: "โทรศัพท์",
                remarks: "ต้องการวงเงิน 150,000 บาท ผ่อน 24 เดือน",
                icon: "bi-telephone"
            },
            {
                date: "10/05/2024 09:45",
                statusLead: "Success",
                result: "สนใจ",
                report: "ติดต่อสอบถามรอบแรก ลูกค้าสนใจโปรโมชันดอกเบี้ยพิเศษ 2.99%",
                product: "สินเชื่อรีไฟแนนซ์",
                interestLevel: "High",
                salesResult: "เสนอขายสำเร็จ",
                nextDate: "2024-05-15",
                nextTime: "10:00",
                channel: "โทรศัพท์",
                remarks: "นัดเตรียมเอกสารเพื่อยื่นขออนุมัติ",
                icon: "bi-telephone"
            }
        ]
    },
    {
        id: 2,
        branch: "ไมโครลิสซิ่ง สาขาขอนแก่น",
        name: "คุณกิตติพงษ์ วงศ์สวัสดิ์",
        contract: "CT-6705-000124",
        phone: "089-876-5432",
        carLocation: "ขอนแก่น",
        status: "สนใจ",
        date: "15/05/2024 10:22",
        statusLead: "Success",
        idcard: "3-4001-00456-78-9",
        address: "12/3 ถนนมิตรภาพ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
        pdpa: "ยินยอมแล้ว",
        plan: "8,500 / 24 เดือน",
        count: "1",
        remarks: "ตกลงทำสัญญาแล้ว นัดวันเซ็นสัญญา",
        objective: "CL",
        nextAppt: "18/05/2024 11:00",
        historyList: [
            {
                date: "15/05/2024 10:22",
                statusLead: "Success",
                result: "สนใจ",
                report: "เสนอขายสำเร็จ ตกลงทำสัญญาพร้อมยื่นอนุมัติวงเงินสินเชื่อ",
                product: "สินเชื่อรีไฟแนนซ์",
                interestLevel: "High",
                salesResult: "เสนอขายสำเร็จ",
                nextDate: "2024-05-18",
                nextTime: "11:00",
                channel: "สาขา",
                remarks: "นัดเข้ามาเซ็นสัญญาที่สาขาขอนแก่น",
                icon: "bi-telephone"
            }
        ]
    },
    {
        id: 3,
        branch: "ไมโครลิสซิ่ง สาขาอุดรธานี",
        name: "คุณสุนิสา โพธิ์ทอง",
        contract: "CT-6705-000125",
        phone: "082-345-6789",
        carLocation: "อุดรธานี",
        status: "ไม่สนใจ",
        date: "15/05/2024 10:35",
        statusLead: "Cancel",
        idcard: "1-4199-00789-12-3",
        address: "88 หมู่ 2 ต.หมากแข้ง อ.เมือง จ.อุดรธานี 41000",
        pdpa: "ยินยอมแล้ว",
        plan: "5,500 / 18 เดือน",
        count: "1",
        remarks: "ไม่สะดวกรับข้อเสนอในขณะนี้",
        objective: "RM",
        nextAppt: "-",
        historyList: [
            {
                date: "15/05/2024 10:35",
                statusLead: "Cancel",
                result: "ไม่สนใจ",
                report: "ปฏิเสธ ไม่สนใจสินเชื่อและโปรโมชันในขณะนี้",
                product: "สินเชื่อจำนำทะเบียน",
                interestLevel: "Low",
                salesResult: "ปฏิเสธ",
                nextDate: "",
                nextTime: "",
                channel: "โทรศัพท์",
                remarks: "แจ้งยกเลิกการติดตาม",
                icon: "bi-telephone"
            }
        ]
    },
    {
        id: 4,
        branch: "ไมโครลิสซิ่ง สาขาสงขลา",
        name: "คุณอำพล เพชรเกษม",
        contract: "CT-6705-000126",
        phone: "086-543-2109",
        carLocation: "สงขลา",
        status: "ไม่ผ่านเงื่อนไข",
        date: "15/05/2024 10:40",
        statusLead: "Reject",
        idcard: "9-9002-00111-22-3",
        address: "45/1 ถนนกาญจนวนิช ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา 90110",
        pdpa: "ยินยอมแล้ว",
        plan: "7,200 / 12 เดือน",
        count: "1",
        remarks: "ติดเงื่อนไขแบล็กลิสต์",
        objective: "FL",
        nextAppt: "-",
        historyList: [
            {
                date: "15/05/2024 10:40",
                statusLead: "Reject",
                result: "ไม่ผ่านเงื่อนไข",
                report: "ตรวจสอบประวัติสินเชื่อ ไม่ผ่านเงื่อนไขการอนุมัติ (Reject)",
                product: "สินเชื่อจำนำทะเบียน",
                interestLevel: "Low",
                salesResult: "ไม่อนุมัติ",
                nextDate: "",
                nextTime: "",
                channel: "ระบบ",
                remarks: "ติดเงื่อนไขแบล็กลิสต์",
                icon: "bi-x-circle"
            }
        ]
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
        statusLead: "Success",
        idcard: "8-8300-00999-88-7",
        address: "100/5 ถนนเทพกระษัตรี ต.รัษฎา อ.เมือง จ.ภูเก็ต 83000",
        pdpa: "ยินยอมแล้ว",
        plan: "10,000 / 36 เดือน",
        count: "1",
        remarks: "สนใจวงเงินสูง นัดเข้าพบ",
        objective: "CS",
        nextAppt: "25/05/2024 13:30",
        historyList: [
            {
                date: "15/05/2024 10:55",
                statusLead: "Success",
                result: "สนใจ",
                report: "ลูกค้าสนใจสินเชื่อจำนำทะเบียน วงเงินสูง นัดหมายเข้าพบเสนอรายละเอียด",
                product: "สินเชื่อจำนำทะเบียน",
                interestLevel: "High",
                salesResult: "เสนอขายสำเร็จ",
                nextDate: "2024-05-25",
                nextTime: "13:30",
                channel: "เข้าพบ",
                remarks: "นัดพบสถานที่ทำงานของลูกค้า",
                icon: "bi-telephone"
            }
        ]
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
        statusLead: "Follow",
        idcard: "1-5099-00444-55-6",
        address: "14 ถนนช้างคลาน ต.ช้างคลาน อ.เมือง จ.เชียงใหม่ 50100",
        pdpa: "ยินยอมแล้ว",
        plan: "6,500 / 12 เดือน",
        count: "1",
        remarks: "ไม่รับสาย โทรแล้ว 2 ครั้ง",
        objective: "CL",
        nextAppt: "19/05/2024 10:00",
        historyList: [
            {
                date: "16/05/2024 09:10",
                statusLead: "Follow",
                result: "ติดต่อไม่ได้",
                report: "สายไม่ว่าง / ไม่รับสาย โทรติดต่อ 2 ครั้ง",
                product: "",
                interestLevel: "",
                salesResult: "",
                nextDate: "2024-05-19",
                nextTime: "10:00",
                channel: "โทรศัพท์",
                remarks: "ติดต่อนัดหมายติดตามใหม่",
                icon: "bi-telephone"
            }
        ]
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
        statusLead: "Cancel",
        idcard: "4-4002-00555-66-7",
        address: "55 ถนนศรีจันทร์ ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
        pdpa: "ยินยอมแล้ว",
        plan: "7,000 / 24 เดือน",
        count: "1",
        remarks: "มีเจ้าอื่นดูแลแล้ว",
        objective: "RM",
        nextAppt: "-",
        historyList: [
            {
                date: "16/05/2024 11:30",
                statusLead: "Cancel",
                result: "ไม่สนใจ",
                report: "ลูกค้าไม่สนใจโปรโมชัน เนื่องจากมีเจ้าอื่นดูแลแล้ว",
                product: "",
                interestLevel: "Low",
                salesResult: "ปฏิเสธ",
                nextDate: "",
                nextTime: "",
                channel: "โทรศัพท์",
                remarks: "มีสินเชื่อเดิมอยู่แล้ว",
                icon: "bi-telephone"
            }
        ]
    },
    {
        id: 8,
        branch: "ไมโครลิสซิ่ง สาขาอุดรธานี",
        name: "คุณสมชาย มันคง",
        contract: "CT-6705-000130",
        phone: "081-776-6554",
        carLocation: "อุดรธานี",
        status: "ไม่ผ่านเงื่อนไข",
        date: "16/05/2024 14:00",
        statusLead: "Reject",
        idcard: "1-4199-00222-33-4",
        address: "200 ถนนทหาร ต.หมากแข้ง อ.เมือง จ.อุดรธานี 41000",
        pdpa: "ยินยอมแล้ว",
        plan: "9,000 / 12 เดือน",
        count: "1",
        remarks: "เอกสารไม่ครบถ้วน / ไม่ผ่านเกณฑ์",
        objective: "FL",
        nextAppt: "-",
        historyList: [
            {
                date: "16/05/2024 14:00",
                statusLead: "Reject",
                result: "ไม่ผ่านเงื่อนไข",
                report: "พิจารณาอนุมัติ ไม่ผ่านเกณฑ์ (Reject)",
                product: "สินเชื่อจำนำทะเบียน",
                interestLevel: "Low",
                salesResult: "ไม่อนุมัติ",
                nextDate: "",
                nextTime: "",
                channel: "ระบบ",
                remarks: "เอกสารไม่อนุมัติ",
                icon: "bi-x-circle"
            }
        ]
    }
];

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
        'Follow': 'bg-info text-white', // ฟ้า
        'Cancel': 'bg-secondary text-white', // เทา
        'Cancle': 'bg-secondary text-white',
        'Reject': 'bg-danger text-white' // แดง
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
        const badgeClassStatusLead = getStatusLeadBadgeClass(item.statusLead);
        const tr = $(`
            <tr data-id="${item.id}"
                data-branch="${item.branch || ''}" 
                data-name="${item.name || ''}" 
                data-contract="${item.contract || ''}" 
                data-phone="${item.phone || ''}" 
                data-status="${item.status || ''}" 
                data-statuslead="${item.statusLead || ''}" 
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
                <td><span class="status-badge badge ${badgeClassStatusLead}">${item.statusLead || ''}</span></td>
            </tr>
        `);
        $tbody.append(tr);
    });

    $('#prospectPaginationText').text(`แสดง 1 - ${items.length} จาก ${prospectData.length} รายการ`);
    $('#prospectCallTotalBadge').text(`ทั้งหมด ${items.length} รายการ`);
}

// Filter Prospect Table
function filterProspectTable() {
    const query = ($('#prospectSearch').val() || '').trim().toLowerCase();
    const branch = $('#filterBranch').val() || '';
    const status = $('#filterStatus').val() || '';
    const statusLead = ($('#filterBy').val() || '').trim().toLowerCase();

    const filtered = prospectData.filter(item => {
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
                    <span class="badge ${badgeClass} border px-2 py-0.5 rounded-pill extra-small">${item.statusLead}</span>
                </div>
                <div class="text-secondary extra-small">ผลการติดต่อ: ${item.result || ''}</div>
                <div class="text-secondary extra-small">นัดหมาย: ${nextApptDisplay}</div>
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

    // Find customer in prospectData array
    const customer = prospectData.find(item => item.id == itemId) || {
        name: $row.data('name') || 'คุณณัฐวรรณ ใจดี',
        phone: $row.data('phone') || '081-234-5678',
        objective: selectedCampaignObjective || 'CS',
        statusLead: $row.data('statuslead') || 'Follow',
        status: $row.data('status') || 'ขอข้อมูลเพิ่มเติม',
        nextAppt: '20/05/2024 14:00',
        remarks: $row.data('remarks') || '',
        historyList: []
    };

    // Get Objective directly from the active selected campaign
    const activeCampaign = campaignData.find(c => c.code === selectedCampaignCode);
    const campaignObjectiveCode = activeCampaign ? activeCampaign.objective : (selectedCampaignObjective || 'CS');
    const objBadge = getObjectiveBadge(campaignObjectiveCode);

    // Set modal title & customer summary info
    $('#modalCustName').text(customer.name);
    $('#modalCustPhone').text(customer.phone);
    $('#modalCustCampaign').text(selectedCampaignCode);
    $('#modalCustCampaignName').text(selectedCampaignName);
    
    // Set Objective badge directly from active campaign using formatted pc-modal-obj-badge style and color
    $('#modalCustObjective')
        .attr('class', `pc-modal-obj-badge ${objBadge.iconBg}`)
        .text(objBadge.text);

    // Set badges with consistent badge classes
    const leadStatusClass = getStatusLeadBadgeClass(customer.statusLead);
    const lastResultClass = getStatusBadgeClass(customer.status);

    $('#modalCustLeadStatus')
        .attr('class', `status-badge badge ${leadStatusClass}`)
        .text(customer.statusLead);

    $('#modalCustLastResult')
        .attr('class', `badge ${lastResultClass} border px-3 py-1 rounded-pill fw-semibold`)
        .text(customer.status);

    $('#modalCustNextAppt').text(customer.nextAppt || '20/05/2024 14:00');

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
    renderModalContactHistory(customer.historyList);

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
            // Update customer data in array
            if (selectedCustomerRow) {
                const $row = $(selectedCustomerRow);
                const itemId = $row.data('id');
                const contract = $row.data('contract');

                const targetItem = prospectData.find(item => item.id == itemId || item.contract == contract);
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
    // Initial Render Campaign List & Prospect Table
    renderCampaignList(campaignData);
    renderProspectTable(prospectData);

    // Campaign search listener
    $('#campaignSearch').on('input keyup', filterCampaignList);

    // Campaign card selection handler (delegated)
    $(document).on('click', '.pa-card', function () {
        $('.pa-card').removeClass('active');
        $(this).addClass('active');

        const code = $(this).data('code');
        const campaign = campaignData.find(c => c.code === code);
        if (campaign) {
            selectedCampaignCode = campaign.code;
            selectedCampaignName = campaign.name;
            selectedCampaignObjective = campaign.objective;

            const objBadge = getObjectiveBadge(campaign.objective);

            $('#detailId').val(campaign.code);
            $('#detailName').val(campaign.name);
            $('#detailStart').val(campaign.startDate);
            $('#detailEnd').val(campaign.endDate);
            $('#detailObjective').val(objBadge.full);
        } else {
            selectedCampaignCode = $(this).data('code') || 'CMP-2024-0001';
            selectedCampaignName = $(this).find('.pa-card-name').text().trim() || 'โปรโมชัน ดอกเบี้ยพิเศษ 2.99%';
            $('#detailId').val(selectedCampaignCode);
            $('#detailName').val(selectedCampaignName);
        }
    });

    // Prospect search listener
    $('#prospectSearch').on('input', filterProspectTable);
    $('#filterBranch, #filterStatus').on('change', filterProspectTable);
    $('#filterStatusLead').on('input', filterProspectTable);
    $('#btnClearFilter').on('click', clearFilters);

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
