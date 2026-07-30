let currentBatchPage = 1;
let currentBatchPageSize = 5;

let currentProspectPage = 1;
let currentProspectPageSize = 10;

let currentFilterRequestId = 0;

async function getCampainList(page = 1, pageSize = 20) {
    try {
        startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');

        const response = await fetch(`/Campain/GetCampainList?page=${page}&pageSize=${pageSize}`);
        const jsonResult = await response.json();
        const items = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : (Array.isArray(jsonResult) ? jsonResult : []);
        const mapped = items.map(item => ({
            code:      item.product_code  || "",
            name:      item.product_name  || "",
            status:    item.product_status || "ปกติ",
            startDate: item.product_start ? item.product_start.substring(0, 10) : "",
            endDate:   item.product_end   ? item.product_end.substring(0, 10)   : "",
            remark:    item.product_remark || "",
            createdBy: item.createrd_by   || item.created_by || "",
            created:   item.created       ? item.created.substring(0, 10)       : "",
            guid:      item.product_guid  || item.guid || item.fguid || item.product_code || item.code || ""
        }));
        stopLoading();
        return {
            page: jsonResult.page ?? (page ? parseInt(page) : 1),
            pageSize: jsonResult.pageSize ?? (pageSize ? parseInt(pageSize) : mapped.length),
            count: jsonResult.count ?? mapped.length,
            data: mapped
        };
    }
    catch(error){
        console.error("Error in getCampainList:", error);
        stopLoading();
        return { page: 1, pageSize: 5, count: 0, data: [] };
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

                const requestId = ++currentFilterRequestId;
                const dynamicFilterContainer = document.getElementById('dynamicFilter');
                if (dynamicFilterContainer) {
                    dynamicFilterContainer.innerHTML = '<div class="col-12 text-center text-muted py-2"><div class="spinner-border spinner-border-sm text-primary me-2"></div>กำลังโหลดตัวกรอง...</div>';
                }

                const targetGuid = item.guid || item.product_guid || item.fguid || item.code || '';

                if (targetGuid) {
                    try {
                        const filterData = await getProductFilterByGuid(targetGuid);
                        if (requestId !== currentFilterRequestId) return;

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
                    loadProspectList(1, currentProspectPageSize);
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
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    }
}

async function loadProspectList(page = 1, pageSize = 10) {

    startLoading('กำลังโหลดข้อมูล...', 'ระบบกำลังดำเนินการ กรุณารอสักครู่...');

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
            console.log("dataTableBody",rawData)
            rawData.forEach(item => {
                const name = item.nameCus || '-';
                const phone = item.mobile || '-';
                const branch = item.branch_Name || '-';
                const status = item.assign_status || '-';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="text-center">
                        <div class="form-check d-flex justify-content-center m-0">
                            <input class="form-check-input row-checkbox" type="checkbox">
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

    stopLoading();
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

function bindTableCheckboxEvents() {
    const checkAll = document.getElementById('checkAll');
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const selectedTableBody = document.getElementById('selectedTableBody');
    const selectedCountText = document.getElementById('selectedCountText');
    const selectedTotalText = document.getElementById('selectedTotalText');

    function updateSelectedList() {
        if (!selectedTableBody) return;
        selectedTableBody.innerHTML = '';
        let selectedCount = 0;

        rowCheckboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                selectedCount++;
                const tr = checkbox.closest('tr');
                const name = tr?.cells[1]?.textContent.trim() || '-';
                const phone = tr?.cells[2]?.textContent.trim() || '-';

                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td class="text-center text-muted">${selectedCount}</td>
                    <td>${name}</td>
                    <td class="text-muted">${phone}</td>
                    <td class="text-center"><i class="bi bi-x text-secondary remove-item" style="cursor:pointer;" data-index="${index}"></i></td>
                `;
                selectedTableBody.appendChild(newRow);
            }
        });

        if (selectedCountText) selectedCountText.textContent = `รายการที่เลือก (${selectedCount} รายการ)`;
        if (selectedTotalText) selectedTotalText.textContent = `รวมทั้งหมด ${selectedCount} รายการ`;

        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', function () {
                const targetIndex = this.getAttribute('data-index');
                if (rowCheckboxes[targetIndex]) {
                    rowCheckboxes[targetIndex].checked = false;
                    updateSelectedList();
                    updateCheckAllStatus();
                }
            });
        });

        const badgeBlue = document.querySelector('.badge-blue');
        if (badgeBlue) badgeBlue.textContent = selectedCount;
    }

    function updateCheckAllStatus() {
        if (!checkAll) return;
        const visibleCheckboxes = Array.from(rowCheckboxes);
        const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
        const someChecked = visibleCheckboxes.some(cb => cb.checked);

        checkAll.checked = allChecked;
        checkAll.indeterminate = !allChecked && someChecked;
    }

    if (checkAll) {
        const newCheckAll = checkAll.cloneNode(true);
        if (checkAll.parentNode) checkAll.parentNode.replaceChild(newCheckAll, checkAll);
        newCheckAll.addEventListener('change', function () {
            const isChecked = this.checked;
            rowCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
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

                } catch (err) {
                    console.error(err);
                    Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถส่งอนุมัติข้อมูลได้", icon: "error" });
                } finally {
                    stopLoading();
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
    