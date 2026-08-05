let currentBatchPage = 1;
let currentBatchPageSize = 5;

let currentProspectPage = 1;
let currentProspectPageSize = 10;

let currentFilterRequestId = 0;
let selectedCampaign = null;
let currentProductBatches = [];
let currentBatchCustomers = [];
let removedBatchCustomerIds = new Set();

async function getCampainList(page = 1, pageSize = 20) {
    try {
        startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');

        const response = await fetch(`/Campain/GetCampainList?page=${page}&pageSize=${pageSize}`);
        const jsonResult = await response.json();
        const items = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : (Array.isArray(jsonResult) ? jsonResult : []);
        const mapped = items.map(item => ({
            code:      item.product_code  || "",
            name:      item.product_name  || "",
            status:    item.product_status || "",
            startDate: item.product_start ? item.product_start.substring(0, 10) : "",
            endDate:   item.product_end   ? item.product_end.substring(0, 10)   : "",
            remark:    item.product_remark || "",
            createdBy: item.createrd_by   || item.created_by || "",
            created:   item.created       ? item.created.substring(0, 10)       : "",
            guid:      item.product_guid  || "",
            offcde:    item.offcde || "",
            product_company: item.product_company || "", 
        }));
        return {
            page: jsonResult.page ?? (page ? parseInt(page) : 1),
            pageSize: jsonResult.pageSize ?? (pageSize ? parseInt(pageSize) : mapped.length),
            count: jsonResult.count ?? mapped.length,
            data: mapped
        };
    }
    catch(error){
        console.error("Error in getCampainList:", error);
        return { page: 1, pageSize: 5, count: 0, data: [] };
    }
    finally {
        stopLoading();
    }
}

function productFilterHTML(filtercode) {

    function OptionHTML(labelName, optionData = []) {
        // แก้ไข: ลบเครื่องหมาย " ที่เกินมาตรง class
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <select class="form-select form-select-custom">
                ${optionData.map(item => `<option value="${item.name}">${item.name}</option>`).join('')}
                </select>
            </div>
        `;
        return HTML;
    }

    function RangeNumberHTML(labelName) {
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <input type="number" class="form-control form-select-custom">
            </div>
        `;
        return HTML;
    }

    function CalendarRangeHTML(labelName) {
        const HTML = `
            <div class="col-xxl-4 col-xl-6 col-md-6">
                <label class="form-label-custom">${labelName}</label>
                <input type="date" class="form-control form-select-custom">
            </div>
        `;
        return HTML;
    }

    const company = (window.CURRENT_COMPANY || "MICRO").toUpperCase();
    
    const personType = [{name: "บุคคลธรรมดา"}, {name: "นิติบุคคล"}];
    const gender = [{name: "ชาย"}, {name: "หญิง"}];
    const career = [{name: "พนักงานบริษัท"}, {name: "รับเหมา"}, {name: "เกษตรกร"}, {name: "ค้าขาย"}, {name: "อื่นๆ"}];
    const businessType = [{name: "ชาย"}, {name: "หญิง"}];
    const carType = [{name: "รถหนึ่ง"}, {name: "รถสอง"}];
    const periodCarYear = [{name: "ปี 2026"}, {name: "ปี 2025"}];
    const address = [{name: "กรุงเทพมหานคร"}, {name: "ปริมณฑล"}];
    const addressDistict = [{name: "1"}, {name: "2"}];
    const branch = [{name: "MICRO"}, {name: "MIB"}, {name: "MFIN"}];
    const statusContact = [{name:"ติดต่อแล้ว"}, {name:"กำลังติดต่อ"}];
    const carStyle = [{name: "รถกระบะ"}, {name: "รถตู้"}, {name: "รถอื่นๆ"}];
    const brand = [{name: "Toyota"}, {name: "Honda"}, {name: "Isuzu"}];
    const insurance = [{name: "ทำ"}, {name: "ไม่ทำ"}];
    const expiredInsurance = [{name: "1 ปี"}, {name: "2 ปี"}, {name: "3 ปี"}];

if (company == "MICRO") {

    switch (filtercode) {
        case "F001":
            return OptionHTML("ประเภทบุคคล", personType);
        case "F002":
            return OptionHTML("เพศ", gender);
        case "F003":
            return RangeNumberHTML("อายุ");
        case "F004":
            return OptionHTML("อาชีพผู้เช่าซื้อ", career);
        case "F005":
            return OptionHTML("ประเภทธุรกิจ", businessType);
        case "F006":
            return OptionHTML("ประเภทรถ", carType);
        case "F009":
            return OptionHTML("ช่วงปีรถ", periodCarYear);
        case "F010":
            return RangeNumberHTML("จำนวนงวด");
        case "F011":
            return RangeNumberHTML("จำนวนงวดชำระ");
        case "F012":
            return RangeNumberHTML("จำนวนงวดค้างจ่าย");
        case "F013":
            return RangeNumberHTML("ประสบการณ์ทำงาน");
        case "F014":
            return OptionHTML("ภูมิภาคที่อยู่ตามทะเบียนบ้าน", address);
        case "F015":
            return OptionHTML("ภูมิภาคที่อยู่ปัจจุบัน", address);
        case "F016":
            return OptionHTML("ภูมิภาคที่อยู่สถานที่ใช้รถ", address);
        case "F017":
            return OptionHTML("จังหวัดที่อยู่สถานที่ใช้รถ", address);
        case "F018":
            return OptionHTML("อำเภอที่อยู่สถานที่ใช้รถ", addressDistict);
        case "F019":
            return RangeNumberHTML("จำนวนงวดที่ค้างชำระ");
        case "F020":
            return OptionHTML("สาขาเปิดสัญญา", branch);
        case "F021":
            return OptionHTML("สถานะสัญญา", statusContact);
        default:
            return '';
    }

} else if (company == "MFIN"){

        switch (filtercode) {
        case "F001":
            return OptionHTML("ประเภทบุคคล", personType);
        case "F002":
            return OptionHTML("เพศ", gender);
        case "F003":
            return RangeNumberHTML("อายุ");
        case "F004":
            return OptionHTML("อาชีพ", career);
        case "F005":
            return OptionHTML("ประเภทธุรกิจ", businessType);
        case "F006":
            return OptionHTML("ประเภทรถ", carType);
        case "F007":
            return OptionHTML("ลักษณะรถ", carStyle);
        case "F008":
            return OptionHTML("ยี่ห้อ", brand);
        case "F009":
            return OptionHTML("ช่วงปีรถ", periodCarYear);
        case "F010":
            return RangeNumberHTML("จำนวนงวด");
        case "F011":
            return RangeNumberHTML("จำนวนงวดชำระ");
        case "F012":
            return RangeNumberHTML("จำนวนงวดค้างจ่าย");
        case "F013":
            return RangeNumberHTML("ประสบการณ์ทำงาน");
        case "F014":
            return OptionHTML("ที่อยู่ตามทะเบียนบ้าน", address);
        case "F015":
            return OptionHTML("ที่อยู่ปัจจุบัน", address);
        case "F016":
            return OptionHTML("ที่อยู่จัดส่งเอกสาร", address);
        case "F017":
            return RangeNumberHTML("จำนวนงวดที่ค้างชำระ");
        case "F018":
            return OptionHTML("สาขาเปิดสัญญา", branch);
        case "F019":
            return OptionHTML("สถานะสัญญา", statusContact);
        default:
            return '';
    }

} else if (company == "MIB"){

            switch (filtercode) {
        case "F001":
            return OptionHTML("ประเภทบุคคล", personType);
        case "F002":
            return OptionHTML("เพศ", gender);
        case "F003":
            return RangeNumberHTML("อายุ");
        case "F004":
            return OptionHTML("อาชีพ", career);
        case "F005":
            return OptionHTML("ที่อยู่ปัจจุบัน", address);
        case "F006":
            return OptionHTML("ยี่ห้อ", brand);
        case "F007":
            return OptionHTML("ประเภทรถ", carType);
        case "F008":
            return RangeNumberHTML("ปีรถ");
        case "F009":
            return OptionHTML("การทำประกัน", insurance);
        case "F010":
            return OptionHTML("ประขาดต่ออายุ", expiredInsurance);
        case "F011":
            return OptionHTML("บริษัทลูกค้าในเครือ", branch);
        case "F012": 
            return CalendarRangeHTML("ประกันหมดอายุ");
        case "F013":
            return OptionHTML("ที่อยู่ปัจจุบัน", address);
        default:
            return '';
    }

}

}

async function loadBatchList(page = 1, pageSize = 5) {
    currentBatchPage = page;
    currentBatchPageSize = pageSize;

    const res = await getCampainList(page, pageSize);
    const campainData = res.data;

    const foundCountEl = document.getElementById('batchFoundCount');
    if (foundCountEl) foundCountEl.textContent = `พบ ${res.count} รายการ`;

    const batchListTextEl = document.getElementById('batchListText');
    if (batchListTextEl) {
        const startItem = res.count > 0 ? (res.page - 1) * res.pageSize + 1 : 0;
        const endItem = Math.min(res.page * res.pageSize, res.count);
        const totalPages = Math.ceil(res.count / (res.pageSize || 1)) || 1;
        batchListTextEl.textContent = `แสดง ${startItem} - ${endItem} จาก ${res.count} รายการ (หน้า ${res.page}/${totalPages}, ขนาด ${res.pageSize}/หน้า)`;
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
            card.innerHTML = `
                <div class="d-flex justify-content-between">
                    <div class="batch-id color-${color}">${item.code || `BATCH-${String(i+1).padStart(3,'0')}`}</div>
                </div>
                <div class="batch-title">${item.name || '(ไม่มีชื่อ)'}</div>
                <div class="d-flex justify-content-between align-items-end">
                    <div class="batch-meta">
                        <div>สร้างโดย: ${item.createdBy || '-'}</div>
                        <div>${item.created || '-'}</div>
                    </div>
                    <div class="text-end">
                        <span class="badge rounded-pill ${item.status === 'Active' ? 'bg-success' : 'bg-secondary'} mb-1">${item.status}</span>
                        <div class="text-secondary mt-1"><i class="bi bi-file-earmark-text"></i></div>
                    </div>
                </div>
            `;
            card.addEventListener('click', async function() {
                dataTableContainer.querySelectorAll('.batch-card').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                selectedCampaign = item;
                removedBatchCustomerIds.clear();

                startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');

                try {
                    await refreshSelectedCampaignCustomers();

                    const requestId = ++currentFilterRequestId;
                    const dynamicFilterContainer = document.getElementById('dynamicFilter');
                    if (dynamicFilterContainer) {
                        dynamicFilterContainer.innerHTML = '<div class="col-12 text-center text-muted py-2"><div class="spinner-border spinner-border-sm text-primary me-2"></div>กำลังโหลดตัวกรอง...</div>';
                    }

                    const targetGuid = item.guid || item.product_guid || item.fguid || item.code || '';

                    if (targetGuid) {
                        try {
                            const filterData = await getProductFilterByGuid(targetGuid);
                            if (requestId !== currentFilterRequestId) {
                                return;
                            }

                            let rawFilters = filterData;
                            if (typeof rawFilters === 'string') {
                                try { rawFilters = JSON.parse(rawFilters); } catch(e) {}
                            }

                            let filters = [];
                            if (Array.isArray(rawFilters)) {
                                filters = rawFilters;
                            } else if (rawFilters && typeof rawFilters === 'object') {
                                if (Array.isArray(rawFilters.data)) filters = rawFilters.data;
                                else if (Array.isArray(rawFilters.result)) filters = rawFilters.result;
                                else if (Array.isArray(rawFilters.filters)) filters = rawFilters.filters;
                            }

                            if (dynamicFilterContainer) {
                                dynamicFilterContainer.innerHTML = '';

                                if (filters.length > 0) {
                                    filters.forEach((filter) => {
                                        const fCode = typeof filter === 'string' ? filter : (filter.fcode || filter.fCode || filter.code || filter.f_code);
                                        const filterHTML = productFilterHTML(fCode);

                                        if (filterHTML) {
                                            dynamicFilterContainer.insertAdjacentHTML('beforeend', filterHTML);
                                        }
                                    });
                                } else {
                                    dynamicFilterContainer.innerHTML = '<div class="col-12 text-center text-muted py-2" style="font-size:0.85rem;">ไม่มีข้อมูลตัวกรองสำหรับรายการนี้</div>';
                                }
                            }
                        } catch (err) {
                            console.error("Error calling getProductFilterByGuid:", err);
                            if (dynamicFilterContainer && requestId === currentFilterRequestId) {
                                dynamicFilterContainer.innerHTML = '<div class="col-12 text-center text-danger py-2" style="font-size:0.85rem;">เกิดข้อผิดพลาดในการโหลดตัวกรอง</div>';
                            }
                        }
                    } else {
                        if (dynamicFilterContainer) {
                            dynamicFilterContainer.innerHTML = '<div class="col-12 text-center text-muted py-2" style="font-size:0.85rem;">ไม่มีข้อมูลตัวกรองสำหรับรายการนี้</div>';
                        }
                    }

                    if (requestId === currentFilterRequestId) {
                        await loadProspectList(1, currentProspectPageSize);
                    }
                } catch (err) {
                    console.error("Error in card click handler:", err);
                } finally {
                    stopLoading();
                }
            });
            dataTableContainer.appendChild(card);
        });
    }

    renderBatchPaginationControls(res.page, res.pageSize, res.count);
}

function renderBatchPaginationControls(currentPage, pageSize, totalCount) {
    const paginationEl = document.getElementById('batchPagination');
    if (!paginationEl) return;
    paginationEl.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize || 1)));

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) loadBatchList(currentPage - 1, pageSize);
    });
    paginationEl.appendChild(prevLi);

    for (let p = 1; p <= totalPages; p++) {
        const li = document.createElement('li');
        li.className = `page-item ${p === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${p}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            loadBatchList(p, pageSize);
        });
        paginationEl.appendChild(li);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) loadBatchList(currentPage + 1, pageSize);
    });
    paginationEl.appendChild(nextLi);
}

async function getProspect(page = 1, pageSize = 10) {
    try {
        currentProspectPage = page;
        currentProspectPageSize = pageSize;
        const response = await fetch(`/ProspectSetup/GetProspect?page=${page}&pageSize=${pageSize}`);
        const jsonResult = await response.json();
        return jsonResult;
    }
    catch(error){
        console.error("Error in getProspect:", error);
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    }
}

async function loadProspectList(page = 1, pageSize = 10) {

    startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');

    try {
        currentProspectPage = page;
        currentProspectPageSize = pageSize;

        const res = await getProspect(page, pageSize);
        const rawData = res && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
        const count = res.total ?? 0;
        const currentPage = res && typeof res.page === 'number' ? res.page : page;
        const currentPageSize = res && typeof res.pageSize === 'number' ? res.pageSize : pageSize;

        // 1. Update total count
        const totalFoundEl = document.getElementById('totalFound');
        if (totalFoundEl) totalFoundEl.textContent = count;

        // 2. Populate tbody
        const tbody = document.getElementById('dataTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            if (rawData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">ไม่พบข้อมูลลูกค้าเป้าหมาย</td></tr>`;
            } else {
                rawData.forEach(item => {
                    const name = item.nameCus || '-';
                    const phone = item.mobile || '-';
                    const branch = item.branch_Name || '-';
                    const status = item.assign_status || '-';

                    const idno = item.idno || '';
                    const id = item.id || '';
                    const prospectBatch = item.prospect_batch || item.prospectBatch || item.product_batch || item.productBatch || item.batch_id || item.batch || '';

                    let matchedBatch = null;
                    if (Array.isArray(currentProductBatches) && currentProductBatches.length > 0) {
                        matchedBatch = currentProductBatches.find(b => {
                            if (!b) return false;

                            // 1. If b is a primitive string or number
                            if (typeof b === 'string' || typeof b === 'number') {
                                const strB = String(b).trim();
                                return (prospectBatch && strB === String(prospectBatch).trim()) ||
                                       (id && strB === String(id).trim());
                            }

                            // 2. Extract batch properties from object b
                            const bBatch = b.prospect_batch || b.prospectBatch || b.product_batch || b.productBatch || b.batch_id || b.batch || b.code || b.product_batch_remark || '';
                            const bId = b.id || b.Id || b.ID || b.cus_id || b.cust_id || '';
                            const bIds = Array.isArray(b.id) ? b.id : (Array.isArray(b.ids) ? b.ids : (Array.isArray(b.prospects) ? b.prospects : []));

                            // Match by batch code/name
                            if (prospectBatch && bBatch && String(bBatch).trim() === String(prospectBatch).trim()) {
                                return true;
                            }

                            // Match by single id
                            if (id && bId && String(bId).trim() === String(id).trim()) {
                                return true;
                            }

                            // Match by id in array
                            if (id && bIds.length > 0 && bIds.some(i => String(i).trim() === String(id).trim())) {
                                return true;
                            }

                            return false;
                        });
                    }

                    const isRemoved = id && removedBatchCustomerIds.has(String(id).trim());
                    const isMatchedInBatchRes = Array.isArray(currentBatchCustomers) && currentBatchCustomers.some(c => c.id && String(c.id).trim() === String(id).trim());
                    const isMatched = !isRemoved && (!!matchedBatch || isMatchedInBatchRes);
                    let isDraft = false;
                    if (isMatched) {
                        const bStatus = (typeof matchedBatch === 'object' && matchedBatch ? (matchedBatch.status || matchedBatch.assign_status || matchedBatch.product_batch_status || matchedBatch.batch_status) : null) || item.status || item.assign_status || '';
                        const statusStr = String(bStatus || '').trim().toLowerCase();
                        isDraft = statusStr === 'draft' || statusStr === '' || statusStr === '1';
                    }

                    const isChecked = isMatched;
                    const isDisabled = isMatched && !isDraft;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="text-center">
                            <div class="form-check d-flex justify-content-center m-0">
                                <input class="form-check-input row-checkbox" type="checkbox" data-id="${id}" data-idno="${idno}" data-batch="${prospectBatch}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}>
                            </div>
                        </td>
                        <td>${name}</td>
                        <td>${phone}</td>
                        <td>${branch}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        // 3. Re-bind checkbox listeners
        bindTableCheckboxEvents();

        // 4. Render Table Pagination Controls
        renderProspectPaginationControls(currentPage, currentPageSize, count);

        // 5. Update Go To Page Input
        const goToInput = document.getElementById('goToPageInput');
        if (goToInput) goToInput.value = currentPage;

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
            const idKey = c.id || c.Id || (c.raw ? (c.raw.id || c.raw.Id || c.raw.ID || c.raw.cus_id || c.raw.cust_id) : null);
            const trimmedId = idKey ? String(idKey).trim() : null;

            if (trimmedId) seenIds.add(trimmedId);

            const name = c.name || c.nameCus || c.name_cus || c.cus_name || (c.raw ? (c.raw.nameCus || c.raw.name || c.raw.name_cus || c.raw.cus_name) : '-') || '-';
            const phone = c.phone || c.mobile || c.phone1 || c.mobile_no || c.contno || (c.raw ? (c.raw.mobile || c.raw.phone || c.raw.contno) : '-') || '-';
            const branch = c.branch || c.branch_Name || c.branch_name || c.branchName || (c.raw ? (c.raw.branch_Name || c.raw.branch) : '-') || '-';
            const isDisabled = c.isDisabled !== undefined ? c.isDisabled : true;

            combinedList.push({
                id: trimmedId || '',
                idno: c.idno || (c.raw ? c.raw.idno : ''),
                name: name,
                phone: phone,
                branch: branch,
                isDisabled: isDisabled,
                isBatchCustomer: true
            });
        });
    }

    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            const tr = checkbox.closest('tr');
            const name = tr?.cells[1]?.textContent.trim() || '-';
            const phone = tr?.cells[2]?.textContent.trim() || '-';
            const branch = tr?.cells[3]?.textContent.trim() || '-';
            const idno = checkbox.getAttribute('data-idno') || '';
            const id = checkbox.getAttribute('data-id') || '';
            const idKey = id ? String(id).trim() : null;

            if (idKey && seenIds.has(idKey)) {
                return;
            }

            if (idKey) seenIds.add(idKey);

            combinedList.push({
                id: idKey || '',
                idno: idno,
                name: name,
                phone: phone,
                branch: branch,
                isDisabled: checkbox.disabled,
                isBatchCustomer: false,
                checkboxIndex: index
            });
        }
    });

    return combinedList;
}

function updateSelectedList() {
    const selectedTableBody = document.getElementById('selectedTableBody');
    const selectedCountText = document.getElementById('selectedCountText');
    const selectedTotalText = document.getElementById('selectedTotalText');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');

    if (!selectedTableBody) return;
    selectedTableBody.innerHTML = '';

    const combinedList = getSelectedList();

    let selectedCount = 0;
    combinedList.forEach((item) => {
        selectedCount++;
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>${item.name}</td>
            <td class="text-muted">${item.phone}</td>
            <td class="text-muted">${item.branch}</td>
            <td class="text-center">${item.isDisabled ? '' : `<i class="bi bi-x text-secondary remove-item" style="cursor:pointer;" data-index="${item.checkboxIndex !== undefined ? item.checkboxIndex : ''}" data-idno="${item.idno}" data-id="${item.id}"></i>`}</td>
        `;
        selectedTableBody.appendChild(newRow);
    });

    if (selectedCountText) selectedCountText.textContent = `รายการที่เลือก (${selectedCount} รายการ)`;
    if (selectedTotalText) selectedTotalText.textContent = `รวมทั้งหมด ${selectedCount} รายการ`;

    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetIndex = this.getAttribute('data-index');
            const targetIdno = this.getAttribute('data-idno');
            const targetId = this.getAttribute('data-id');

            const idStr = targetId ? String(targetId).trim() : '';

            if (idStr) removedBatchCustomerIds.add(idStr);

            if (targetIndex !== '' && targetIndex !== null && rowCheckboxes[targetIndex]) {
                rowCheckboxes[targetIndex].checked = false;
                rowCheckboxes[targetIndex].disabled = false;
            }

            const matchCbs = document.querySelectorAll('#dataTableBody .row-checkbox');
            matchCbs.forEach(cb => {
                const cbId = cb.getAttribute('data-id') ? String(cb.getAttribute('data-id')).trim() : '';
                if (idStr && cbId === idStr) {
                    cb.checked = false;
                    cb.disabled = false;
                }
            });

            if (Array.isArray(currentBatchCustomers)) {
                const removeIndex = currentBatchCustomers.findIndex(c => {
                    const cId = c.id ? String(c.id).trim() : '';
                    return idStr && cId === idStr;
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
}

function updateCheckAllStatus() {
    const checkAll = document.getElementById('checkAll');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    if (!checkAll) return;
    const visibleCheckboxes = Array.from(rowCheckboxes);
    const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
    const someChecked = visibleCheckboxes.some(cb => cb.checked);

    checkAll.checked = allChecked;
    checkAll.indeterminate = !allChecked && someChecked;
}

function bindTableCheckboxEvents() {
    const checkAll = document.getElementById('checkAll');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');

    if (checkAll) {
        const newCheckAll = checkAll.cloneNode(true);
        if (checkAll.parentNode) checkAll.parentNode.replaceChild(newCheckAll, checkAll);
        newCheckAll.addEventListener('change', function () {
            const isChecked = this.checked;
            rowCheckboxes.forEach(checkbox => {
                if (!checkbox.disabled) {
                    checkbox.checked = isChecked;
                }
            });
            updateSelectedList();
        });
    }

    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            updateSelectedList();
            updateCheckAllStatus();
        });
    });

    updateCheckAllStatus();
    updateSelectedList();
}

document.addEventListener('DOMContentLoaded', async function () {
    const btnClearSelection = document.getElementById('btnClearSelection');

    // --- 1. Load Campaign (Batch) List ---
    await loadBatchList(currentBatchPage, currentBatchPageSize);

    // --- 2. Load Prospect List ---
    await loadProspectList(currentProspectPage, currentProspectPageSize);

    // --- 3. Rows per page selector event listener ---
    const rowsPerPageSelect = document.getElementById('rowsPerPage');
    if (rowsPerPageSelect) {
        rowsPerPageSelect.value = currentProspectPageSize.toString();
        rowsPerPageSelect.addEventListener('change', function() {
            const newSize = parseInt(this.value, 10) || 10;
            loadProspectList(1, newSize);
        });
    }

    // --- 4. Go to page input event listener ---
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

    // --- 5. Filter event listeners ---
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
            }
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

    if (btnClearSelection) {
        btnClearSelection.addEventListener('click', function () {
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(checkbox => checkbox.checked = false);
            bindTableCheckboxEvents();
        });
    }

    // --- 6. Export to Excel Logic ---
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

                    var request = {
                        id: selectedIds,
                        product_code: selectedCampaign.code || "",
                        product_offcde: selectedCampaign.offcde || "",
                        product_company: selectedCampaign.product_company || "",
                        product_batch_remark: selectedCampaign.code+":new batch" || "",
                        status: "draft",
                    };
                    const response = await fetch(`/ProspectSetup/PostNewProspectBatch`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(request),
                    });
                    const data = await response.json();
                    if (!response.ok || (data && data.status === false)) {
                        const errorMsg = (data && data.message) ? data.message : "ไม่สามารถบันทึกข้อมูลได้";
                        Swal.fire({ title: "เกิดข้อผิดพลาด", text: errorMsg, icon: "error" });
                    } else {
                        Swal.fire({ title: "บันทึกสำเร็จ", icon: "success" });
                        removedBatchCustomerIds.clear();
                        await refreshSelectedCampaignCustomers();
                        await loadProspectList(currentProspectPage, currentProspectPageSize);
                    }
                } catch (err) {
                    console.error(err);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกข้อมูลได้", icon: "error" });
                } finally {
                    stopLoading();
                }
            }
        });
    });

    $("#sendForApprovalBtn").off("click").on("click", function () {

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

                    const selectedProspects = Array.from(document.querySelectorAll('.row-checkbox:checked'))
                        .map(cb => ({ idno: cb.getAttribute('data-idno') }))
                        .filter(p => p.idno);

                    var request = {
                        product_code: selectedCampaign.code || "",
                        status: "waiting approve",
                    };
                    const response = await fetch(`/ProspectSetup/updateProductBatchStatus`, {
                        method: 'POST',
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
                        Swal.fire({ title: "บันทึกสำเร็จ", icon: "success" });
                    }

                } catch (err) {
                    console.error(err);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งอนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    window.location.reload();
                    // stopLoading();
                }
            }
        });
    });

async function getProductFilterByGuid(guid) {
    if (!guid) return [];
    try {
        const response = await fetch(`/ProspectSetup/GetProductFilterByGuid?guid=${encodeURIComponent(guid)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data || [];
    } catch (err) {
        console.error("Error in getProductFilterByGuid:", err);
        return [];
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

async function refreshSelectedCampaignCustomers() {
    if (selectedCampaign && selectedCampaign.code) {
        const batchRes = await getProductBatchByProductCode(selectedCampaign.code, 1, currentProspectPageSize || 10);
        console.log("batchRes", batchRes);
        currentBatchCustomers = extractCustomers(batchRes);
        console.log("Extracted batch customers:", currentBatchCustomers);
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
            const idno = item.idno || item.Idno || item.IDNO || item.cus_idno || item.cust_idno || item.code || '';
            const id = item.id || item.Id || item.ID || item.cus_id || item.cust_id || '';
            const name = item.nameCus || item.name || item.name_cus || item.cus_name || item.cust_name || item.customerName || item.fullName || (item.first_name ? `${item.first_name} ${item.last_name || ''}` : '') || idno || '-';
            const phone = item.mobile || item.phone || item.phone1 || item.mobile_no || item.phone_no || item.tel || item.contract_no || item.cont_no || item.contno || '-';
            const branch = item.branch_Name || item.branch || item.branch_name || item.branchName || item.offcde || item.off_cde || '-';
            const statusVal = item.status || item.assign_status || (raw && typeof raw === 'object' ? (raw.status || raw.assign_status) : '') || '';
            const statusStr = String(statusVal).trim().toLowerCase();
            const isDraft = statusStr === 'draft' || statusStr === '' || statusStr === '1';
            const isDisabled = item.isDisabled !== undefined ? item.isDisabled : !isDraft;

            if (id || idno || name !== '-') {
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
        } else if (raw.data && typeof raw.data === 'object') {
            checkAndPush(raw.data);
        } else {
            checkAndPush(raw);
        }
    }

    return list;
}
    