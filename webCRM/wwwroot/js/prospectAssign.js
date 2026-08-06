
let selectedCampaignCode = "";
let prospectPage = 1;
let prospectPageSize = 10;
let prospectTotalCount = 0;
let rawProspectItems = [];
let activeStatusFilter = 'all';

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
            const name = item.nameCus || '-';
            const contract = item.contno || '-';
            const branch = item.branch_Name || '-';
            const carLocation = item.provinceUsecar || '-';
            const createdDate = item.created || '-';
            const createdBy = item.created_by || '-';
            const custType = item.custype || '-';
            const occupation = item.occupation || '-';
            const assignee = item.staffName || '-';
            const status = item.status || '-';

            if (id || idno || name !== '-') {
                items.push({
                    id: String(id || '').trim(),
                    idno: String(idno || '').trim(),
                    branch: String(branch).trim(),
                    name: String(name).trim(),
                    contract: String(contract).trim(),
                    custType: String(custType).trim(),
                    occupation: String(occupation).trim(),
                    carLocation: String(carLocation).trim(),
                    assignee: String(assignee).trim(),
                    status: String(status).trim(),
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

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getStatusDotClass(status, assignee) {
    if (!status) {
        return (assignee && assignee !== '-') ? 'green' : 'purple';
    }
    const s = String(status).toLowerCase();
    if (s.includes('reassign') || s.includes('re-assign')) return 'orange';
    if (s.includes('assign') && !s.includes('wait') && !s.includes('รอ')) return 'green';
    return 'purple';
}

function getStatusLabel(status, assignee) {
    const cls = getStatusDotClass(status, assignee);
    if (cls === 'green') return 'Assign';
    if (cls === 'orange') return 'ReAssign';
    return 'Wait';
}

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
        console.error("Error in getCampainList:", error);
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    } finally {
        stopLoading();
    }
}

async function loadProspectAssignData(productCode, page = 1, pageSize = 10) {
    if (!productCode) {
        rawProspectItems = [];
        prospectTotalCount = 0;
        filterAndRenderProspectTable();
        return;
    }

    selectedCampaignCode = productCode;
    prospectPage = page;
    prospectPageSize = pageSize;

    const tbody = document.getElementById('prospectAssignTableBody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-hourglass-split me-1"></i> กำลังโหลดข้อมูล Prospect...</td></tr>`;
    }

    const res = await getProductBatchByProductCode(productCode, page, pageSize);
    const { items, totalCount } = extractProspectCustomers(res);

    rawProspectItems = items;
    prospectTotalCount = totalCount;

    updateSummaryCardCounts(items, totalCount);
    filterAndRenderProspectTable();
}

function updateSummaryCardCounts(items, totalCount) {
    let allCount = totalCount || items.length;
    let assignCount = 0;
    let reassignCount = 0;
    let waitCount = 0;

    items.forEach(item => {
        const label = getStatusLabel(item.status, item.assignee);
        if (label === 'Assign') assignCount++;
        else if (label === 'ReAssign') reassignCount++;
        else waitCount++;
    });

    const cardAll = document.querySelector('.summary-card[data-status="all"] .summary-value');
    if (cardAll) cardAll.textContent = allCount.toLocaleString();

    const cardAssign = document.querySelector('.summary-card[data-status="assign"] .summary-value');
    if (cardAssign) cardAssign.textContent = assignCount.toLocaleString();

    const cardReassign = document.querySelector('.summary-card[data-status="reassign"] .summary-value');
    if (cardReassign) cardReassign.textContent = reassignCount.toLocaleString();

    const cardWait = document.querySelector('.summary-card[data-status="wait"] .summary-value');
    if (cardWait) cardWait.textContent = waitCount.toLocaleString();
}

function filterAndRenderProspectTable() {
    const tbody = document.getElementById('prospectAssignTableBody');
    if (!tbody) return;

    let filteredItems = rawProspectItems;
    if (activeStatusFilter !== 'all') {
        filteredItems = rawProspectItems.filter(item => {
            const statusLabel = getStatusLabel(item.status, item.assignee).toLowerCase();
            if (activeStatusFilter === 'assign') {
                return statusLabel === 'assign';
            } else if (activeStatusFilter === 'reassign') {
                return statusLabel === 'reassign';
            } else if (activeStatusFilter === 'wait') {
                return statusLabel === 'wait';
            }
            return true;
        });
    }

    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted"><i class="bi bi-emoji-neutral me-1"></i> ไม่พบรายการ Prospect</td></tr>`;
    } else {
        let html = '';
        filteredItems.forEach(item => {
            const dotClass = getStatusDotClass(item.status, item.assignee);
            const statusText = getStatusLabel(item.status, item.assignee);
            html += `
                <tr>
                    <td class="text-center"><input type="checkbox" class="form-check-input prospect-checkbox" data-id="${escapeHtml(item.id)}" data-contract="${escapeHtml(item.contract)}"></td>
                    <td>
                        <div class="fw-medium">${escapeHtml(item.branch)}</div>
                    </td>
                    <td>
                        <div class="fw-medium">${escapeHtml(item.name)}</div>
                        <div class="text-gray" style="font-size: 0.75rem;">${escapeHtml(item.idno)}</div>
                    </td>
                    <td>${escapeHtml(item.contract)}</td>
                    <td>${escapeHtml(item.custType)}</td>
                    <td>${escapeHtml(item.occupation)}</td>
                    <td>${escapeHtml(item.carLocation)}</td>
                    <td>${escapeHtml(item.assignee)}</td>
                    <td><span class="status-dot ${dotClass}"></span><span class="status-text ${dotClass}">${statusText}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    }

    // Attach event listeners for checkboxes in tbody
    const checkboxes = tbody.querySelectorAll('.prospect-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateSelectedCount);
    });

    updateSelectedCount();

    const displayTotal = prospectTotalCount || filteredItems.length;
    const badge = document.getElementById('prospectAssignTotalBadge');
    if (badge) badge.textContent = `ทั้งหมด ${displayTotal} รายการ`;

    const totalRowsInfo = document.getElementById('totalRowsInfo');
    if (totalRowsInfo) totalRowsInfo.textContent = displayTotal;

    renderProspectPagination(displayTotal);
}

function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox');
    const checkedBoxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox:checked');
    const countDisplay = document.getElementById('selectedProspectCount');
    const selectAllCheckbox = document.getElementById('selectAllProspects');
    const assignBtn = document.getElementById('assignBtn');

    const checkedCount = checkedBoxes.length;
    if (countDisplay) {
        countDisplay.textContent = `Selected: ${checkedCount} รายการ`;
    }

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = (checkboxes.length > 0 && checkedCount === checkboxes.length);
    }

    let hasAssigned = false;
    checkedBoxes.forEach(cb => {
        const row = cb.closest('tr');
        if (row) {
            const statusText = row.querySelector('.status-text');
            if (statusText && statusText.textContent.trim().toLowerCase().includes('assign') && !statusText.textContent.trim().toLowerCase().includes('wait')) {
                hasAssigned = true;
            }
        }
    });

    if (assignBtn) {
        if (hasAssigned) {
            assignBtn.textContent = 'ReAssign';
        } else if (checkedCount > 1) {
            assignBtn.textContent = 'Assign To Group';
        } else {
            assignBtn.textContent = 'Assign';
        }
    }
}

function renderProspectPagination(total) {
    const paginationEl = document.getElementById('prospectPagination');
    if (!paginationEl) return;

    paginationEl.innerHTML = '';
    const totalPages = Math.ceil(total / prospectPageSize) || 1;
    if (totalPages <= 0) return;

    // Prev button
    const prevLi = document.createElement('li');
    prevLi.className = 'page-item' + (prospectPage <= 1 ? ' disabled' : '');
    prevLi.innerHTML = '<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>';
    prevLi.addEventListener('click', function (e) {
        e.preventDefault();
        if (prospectPage > 1) {
            prospectPage--;
            loadProspectAssignData(selectedCampaignCode, prospectPage, prospectPageSize);
        }
    });
    paginationEl.appendChild(prevLi);

    // Page numbers
    const pages = buildPageRange(prospectPage, totalPages);
    pages.forEach(function (p) {
        const li = document.createElement('li');
        if (p === '...') {
            li.className = 'page-item disabled';
            li.innerHTML = '<span class="page-link bg-transparent text-gray">...</span>';
        } else {
            li.className = 'page-item' + (p === prospectPage ? ' active' : '');
            li.innerHTML = '<a class="page-link" href="#">' + p + '</a>';
            li.addEventListener('click', function (e) {
                e.preventDefault();
                if (p !== prospectPage) {
                    prospectPage = p;
                    loadProspectAssignData(selectedCampaignCode, prospectPage, prospectPageSize);
                }
            });
        }
        paginationEl.appendChild(li);
    });

    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = 'page-item' + (prospectPage >= totalPages ? ' disabled' : '');
    nextLi.innerHTML = '<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>';
    nextLi.addEventListener('click', function (e) {
        e.preventDefault();
        if (prospectPage < totalPages) {
            prospectPage++;
            loadProspectAssignData(selectedCampaignCode, prospectPage, prospectPageSize);
        }
    });
    paginationEl.appendChild(nextLi);
}

function buildPageRange(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, function (_, i) { return i + 1; });
    }
    var pages = [];
    if (current <= 4) {
        pages = [1, 2, 3, 4, 5, '...', total];
    } else if (current >= total - 3) {
        pages = [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    } else {
        pages = [1, '...', current - 1, current, current + 1, '...', total];
    }
    return pages;
}

// Summary card filtering setup
(function () {
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach(function (card) {
        card.addEventListener('click', function () {
            summaryCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            activeStatusFilter = this.getAttribute('data-status') || 'all';
            filterAndRenderProspectTable();
        });
    });

    const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
    if (rowsPerPageSelect) {
        rowsPerPageSelect.addEventListener('change', function () {
            prospectPageSize = parseInt(this.value, 10) || 10;
            prospectPage = 1;
            loadProspectAssignData(selectedCampaignCode, prospectPage, prospectPageSize);
        });
    }

    const selectAllCheckbox = document.getElementById('selectAllProspects');
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function () {
            const isChecked = this.checked;
            const checkboxes = document.querySelectorAll('#prospectAssignTableBody .prospect-checkbox');
            checkboxes.forEach(cb => cb.checked = isChecked);
            updateSelectedCount();
        });
    }
})();

// BATCH LIST & CAMPAIGN DATA LOADING
(function () {
    let campaigns = [];
    let filteredCampaigns = [];
    let batchPage = 1;
    const batchPerPage = 10;
    let totalBatchCount = 0;
    let selectedIndex = 0;

    function getStatusClass(status) {
        if (!status) return 'approved';
        const s = status.toLowerCase();
        if (s.includes('wait') || s.includes('รอ')) return 'waiting';
        if (s.includes('draft') || s.includes('ร่าง')) return 'draft';
        return 'approved';
    }

    function getTotalBatchPages() {
        return Math.max(1, Math.ceil(totalBatchCount / batchPerPage));
    }

    function selectCampaign(index) {
        selectedIndex = index;
        const container = document.getElementById('batchListContainer');
        if (!container) return;

        const items = container.querySelectorAll('.batch-item');
        items.forEach((el, i) => {
            const isSelected = i === selectedIndex;
            el.classList.toggle('active', isSelected);
            const codeSpan = el.querySelector('.batch-item-id span:first-child');
            if (codeSpan) {
                codeSpan.classList.toggle('text-primary', isSelected);
            }
        });

        const campaign = filteredCampaigns[selectedIndex];
        if (campaign) {
            const codeInput = document.getElementById('filterCampaignCode');
            const nameInput = document.getElementById('filterCampaignName');
            const startInput = document.getElementById('filterStartDate');
            const endInput = document.getElementById('filterEndDate');
            const remarkInput = document.getElementById('filterRemark');

            if (codeInput) codeInput.value = campaign.code;
            if (nameInput) nameInput.value = campaign.name;
            if (startInput) startInput.value = campaign.startDate;
            if (endInput) endInput.value = campaign.endDate;
            if (remarkInput) remarkInput.value = campaign.remark;

            // Fetch prospects for selected campaign code
            loadProspectAssignData(campaign.code, 1, prospectPageSize);
        }
    }

    function renderBatch() {
        const container = document.getElementById('batchListContainer');
        if (!container) return;

        const total = totalBatchCount;

        if (total === 0 || filteredCampaigns.length === 0) {
            container.innerHTML = '<div class="p-3 text-center text-muted" style="font-size: 0.85rem;">ไม่พบข้อมูล Campaign</div>';
            const pageInfo = document.getElementById('batchPageInfo');
            if (pageInfo) pageInfo.textContent = '0 - 0 จาก 0';
            updatePaginationButtons(1, 1);
            return;
        }

        const totalPages = getTotalBatchPages();
        if (batchPage > totalPages) batchPage = totalPages;

        const from = (batchPage - 1) * batchPerPage + 1;
        const to = Math.min(batchPage * batchPerPage, total);

        let html = '';
        filteredCampaigns.forEach((item, idx) => {
            const isSelected = idx === selectedIndex;
            const statusClass = getStatusClass(item.status);
            const displayCode = item.code || item.name || 'N/A';
            const displayDate = item.created || item.startDate || '';
            const displayName = item.name || item.remark || '';

            html += `
                <div class="batch-item ${isSelected ? 'active' : ''}" data-batch-index="${idx}">
                    <div class="batch-item-id">
                        <span class="${isSelected ? 'text-primary' : ''}">${displayCode}</span>
                        <span class="batch-status ${statusClass}">${item.status}</span>
                    </div>
                    <div class="batch-item-details">
                        <span>${displayDate}</span>
                        <span>${displayName}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.batch-item').forEach(el => {
            el.addEventListener('click', function () {
                const idx = parseInt(this.getAttribute('data-batch-index'), 10);
                selectCampaign(idx);
            });
        });

        const pageInfo = document.getElementById('batchPageInfo');
        if (pageInfo) pageInfo.textContent = `${from} - ${to} จาก ${total}`;

        updatePaginationButtons(batchPage, totalPages);
    }

    function updatePaginationButtons(currentPage, totalPages) {
        const firstBtn = document.getElementById('batchFirstBtn');
        const prevBtn = document.getElementById('batchPrevBtn');
        const nextBtn = document.getElementById('batchNextBtn');
        const pageNumbersContainer = document.getElementById('batchPageNumbers');

        if (firstBtn && prevBtn && nextBtn) {
            if (currentPage <= 1) {
                firstBtn.style.opacity = '0.35';
                firstBtn.style.cursor = 'not-allowed';
                prevBtn.style.opacity = '0.35';
                prevBtn.style.cursor = 'not-allowed';
            } else {
                firstBtn.style.opacity = '1';
                firstBtn.style.cursor = 'pointer';
                prevBtn.style.opacity = '1';
                prevBtn.style.cursor = 'pointer';
            }

            if (currentPage >= totalPages) {
                nextBtn.style.opacity = '0.35';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }

        if (pageNumbersContainer) {
            pageNumbersContainer.innerHTML = '';
            
            function buildBatchPageRange(curr, total) {
                if (total <= 5) {
                    return Array.from({ length: total }, (_, i) => i + 1);
                }
                if (curr <= 3) {
                    return [1, 2, 3, '...', total];
                } else if (curr >= total - 2) {
                    return [1, '...', total - 2, total - 1, total];
                } else {
                    return [1, '...', curr, '...', total];
                }
            }

            const pages = buildBatchPageRange(currentPage, totalPages);
            pages.forEach(p => {
                if (p === '...') {
                    const span = document.createElement('span');
                    span.className = 'px-1 text-muted';
                    span.style.fontSize = '0.8rem';
                    span.textContent = '...';
                    pageNumbersContainer.appendChild(span);
                } else {
                    const btn = document.createElement('span');
                    const isActive = p === currentPage;
                    btn.className = `px-2 py-0.5 rounded ${isActive ? 'bg-primary text-white fw-bold' : 'text-dark'}`;
                    btn.style.cursor = 'pointer';
                    btn.style.fontSize = '0.8rem';
                    btn.style.userSelect = 'none';
                    if (!isActive) {
                        btn.style.backgroundColor = '#f1f5f9';
                    }
                    btn.textContent = p;
                    btn.addEventListener('click', function () {
                        if (p !== currentPage) {
                            loadBatch(p);
                        }
                    });
                    pageNumbersContainer.appendChild(btn);
                }
            });
        }
    }

    async function loadBatch(pageToLoad) {
        batchPage = pageToLoad || 1;
        const res = await getCampainList(batchPage, batchPerPage);
        campaigns = res.data || [];
        filteredCampaigns = [...campaigns];
        totalBatchCount = res.count !== undefined ? res.count : campaigns.length;
        batchPage = res.page || batchPage;
        selectedIndex = 0;
        renderBatch();
        if (filteredCampaigns.length > 0) {
            selectCampaign(0);
        }
    }

    const searchInput = document.getElementById('batchSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const q = this.value.toLowerCase().trim();
            if (!q) {
                filteredCampaigns = [...campaigns];
            } else {
                filteredCampaigns = campaigns.filter(item =>
                    (item.code && item.code.toLowerCase().includes(q)) ||
                    (item.name && item.name.toLowerCase().includes(q)) ||
                    (item.status && item.status.toLowerCase().includes(q)) ||
                    (item.remark && item.remark.toLowerCase().includes(q))
                );
            }
            selectedIndex = 0;
            renderBatch();
            if (filteredCampaigns.length > 0) {
                selectCampaign(0);
            }
        });
    }

    document.getElementById('batchFirstBtn')?.addEventListener('click', function () {
        if (batchPage > 1) { loadBatch(1); }
    });
    document.getElementById('batchPrevBtn')?.addEventListener('click', function () {
        if (batchPage > 1) { loadBatch(batchPage - 1); }
    });
    document.getElementById('batchNextBtn')?.addEventListener('click', function () {
        if (batchPage < getTotalBatchPages()) { loadBatch(batchPage + 1); }
    });

    loadBatch(1);
})();

// AUTO ASSIGN METHOD TOGGLE
(function () {
    const assignMethodBtns = document.querySelectorAll('.assign-method-btn');
    assignMethodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            assignMethodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
})();

// RESPONSIBLE PERSON MULTI-SELECT
(function () {
    function initMultiSelect(containerId, selectBoxId, dropdownMenuId, optionClass) {
        const container = document.getElementById(containerId);
        const selectBox = document.getElementById(selectBoxId);
        const dropdownMenu = document.getElementById(dropdownMenuId);
        
        if (!container || !selectBox || !dropdownMenu) return;

        const searchInput = selectBox.querySelector('input[type="text"]');
        const options = dropdownMenu.querySelectorAll('.' + optionClass);
        
        selectBox.addEventListener('click', function(e) {
            if (e.target.tagName === 'I' && e.target.classList.contains('bi-x')) return;
            if (e.target === searchInput) {
                dropdownMenu.style.display = 'block';
                return;
            }
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', function(e) {
            if (!container.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });

        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const val = this.value.toLowerCase();
                options.forEach(opt => {
                    const text = opt.querySelector('span').textContent.toLowerCase();
                    if (text.includes(val)) {
                        opt.classList.remove('d-none');
                    } else {
                        opt.classList.add('d-none');
                    }
                });
                dropdownMenu.style.display = 'block';
            });
        }

        options.forEach(opt => {
            opt.addEventListener('click', function(e) {
                const checkbox = this.querySelector('input[type="checkbox"]');
                const val = this.getAttribute('data-value');
                const text = this.querySelector('span').textContent;
                
                checkbox.checked = !checkbox.checked;
                
                if (checkbox.checked) {
                    addTag(val, text);
                } else {
                    removeTag(val);
                }
            });
        });

        function addTag(val, text) {
            if (selectBox.querySelector(`.branch-tag[data-value="${val}"]`)) return;
            
            const tag = document.createElement('span');
            tag.className = 'branch-tag';
            tag.setAttribute('data-value', val);
            tag.innerHTML = `${text} <i class="bi bi-x" style="cursor: pointer;"></i>`;
            
            tag.querySelector('.bi-x').addEventListener('click', function(e) {
                e.stopPropagation();
                removeTag(val);
                const opt = Array.from(options).find(o => o.getAttribute('data-value') === val);
                if (opt) {
                    opt.querySelector('input[type="checkbox"]').checked = false;
                }
            });
            
            selectBox.insertBefore(tag, selectBox.querySelector('.d-flex'));
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
        }

        function removeTag(val) {
            const tag = selectBox.querySelector(`.branch-tag[data-value="${val}"]`);
            if (tag) {
                tag.remove();
            }
        }
    }

    initMultiSelect('responsibleSelectContainer', 'responsibleSelectBox', 'responsibleDropdownMenu', 'responsible-option');
    initMultiSelect('newResponsibleSelectContainer', 'newResponsibleSelectBox', 'newResponsibleDropdownMenu', 'new-responsible-option');
})();

// ASSIGN / RE-ASSIGN BUTTON CLICK
(function () {
    const assignBtn = document.getElementById('assignBtn');
    if (assignBtn) {
        assignBtn.addEventListener('click', function(e) {
            if (this.textContent.trim() === 'ReAssign') {
                const modalElement = document.getElementById('reAssignModal');
                if (modalElement && typeof bootstrap !== 'undefined') {
                    const bsModal = new bootstrap.Modal(modalElement);
                    bsModal.show();
                } else if (typeof $ !== 'undefined') {
                    $('#reAssignModal').modal('show');
                }
            } else {
                showAlert('success', 'Assign เรียบร้อยแล้ว', 'ทำการ Assign เรียบร้อยแล้ว', function() {
                    window.location.reload();
                });
            }
        });
    }
})();
