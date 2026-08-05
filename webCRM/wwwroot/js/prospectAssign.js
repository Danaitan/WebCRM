
const pageSize = 10;
let page = 1;

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
        console.error("Error in getCampainList:", error);
        return { page: page, pageSize: pageSize, count: 0, data: [] };
    } finally {
        stopLoading();
    }
}

(function () {
    const tbody = document.querySelector('.table-custom tbody');
    if (!tbody) return;

    const allRows = Array.from(tbody.querySelectorAll('tr'));
    const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');
    const paginationEl = document.getElementById('prospectPagination');
    const summaryCards = document.querySelectorAll('.summary-card');

    let currentPage = 1;
    let activeStatusFilter = 'all';

    // Summary card click filtering
    summaryCards.forEach(function (card) {
        card.addEventListener('click', function () {
            summaryCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            activeStatusFilter = this.getAttribute('data-status') || 'all';
            currentPage = 1;
            update();
        });
    });

    function getFilteredRows() {
        if (activeStatusFilter === 'all') {
            return allRows;
        }
        return allRows.filter(function (row) {
            const statusEl = row.querySelector('.status-text');
            if (!statusEl) return true;
            const text = statusEl.textContent.trim().toLowerCase();

            if (activeStatusFilter === 'assign') {
                return text.includes('assign') && !text.includes('ยังไม่') && !text.includes('reassign');
            } else if (activeStatusFilter === 'reassign') {
                return text.includes('reassign') || text.includes('re-assign');
            } else if (activeStatusFilter === 'wait') {
                return text.includes('wait') || text.includes('รอ') || text.includes('ยังไม่');
            }
            return true;
        });
    }

    function getRowsPerPage() {
        return parseInt(rowsPerPageSelect.value, 10);
    }

    function getTotalPages() {
        const filtered = getFilteredRows();
        return Math.max(1, Math.ceil(filtered.length / getRowsPerPage()));
    }

    function renderRows() {
        const filtered = getFilteredRows();
        const rpp = getRowsPerPage();
        const start = (currentPage - 1) * rpp;
        const end = start + rpp;

        allRows.forEach(function (row) {
            row.style.display = 'none';
        });

        filtered.forEach(function (row, i) {
            if (i >= start && i < end) {
                row.style.display = '';
            }
        });

        const totalRowsInfo = document.getElementById('totalRowsInfo');
        if (totalRowsInfo) {
            totalRowsInfo.textContent = filtered.length;
        }
        const badge = document.getElementById('prospectAssignTotalBadge');
        if (badge) {
            badge.textContent = 'ทั้งหมด ' + filtered.length + ' รายการ';
        }
    }

    function renderPagination() {
        const total = getTotalPages();
        paginationEl.innerHTML = '';

        if (total <= 0) return;

        // Prev button
        const prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = '<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>';
        prevLi.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage > 1) { currentPage--; update(); }
        });
        paginationEl.appendChild(prevLi);

        // Page number buttons with ellipsis
        const pages = buildPageRange(currentPage, total);
        pages.forEach(function (p) {
            const li = document.createElement('li');
            if (p === '...') {
                li.className = 'page-item disabled';
                li.innerHTML = '<span class="page-link bg-transparent text-gray">...</span>';
            } else {
                li.className = 'page-item' + (p === currentPage ? ' active' : '');
                li.innerHTML = '<a class="page-link" href="#">' + p + '</a>';
                li.addEventListener('click', function (e) {
                    e.preventDefault();
                    currentPage = p;
                    update();
                });
            }
            paginationEl.appendChild(li);
        });

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === total ? ' disabled' : '');
        nextLi.innerHTML = '<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>';
        nextLi.addEventListener('click', function (e) {
            e.preventDefault();
            if (currentPage < total) { currentPage++; update(); }
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

    function update() {
        renderRows();
        renderPagination();
    }

    rowsPerPageSelect.addEventListener('change', function () {
        currentPage = 1;
        update();
    });

    update();
})();

// =============================================
// BATCH LIST & CAMPAIGN DATA LOADING
// =============================================
(function () {
    let campaigns = [];
    let filteredCampaigns = [];
    let batchPage = 1;
    const batchPerPage = pageSize;
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

        // Add click events to rendered batch items
        container.querySelectorAll('.batch-item').forEach(el => {
            el.addEventListener('click', function () {
                const idx = parseInt(this.getAttribute('data-batch-index'), 10);
                selectCampaign(idx);
            });
        });

        // Update page info
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

    // Search listener
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

    // Pagination buttons
    document.getElementById('batchFirstBtn')?.addEventListener('click', function () {
        if (batchPage > 1) { loadBatch(1); }
    });
    document.getElementById('batchPrevBtn')?.addEventListener('click', function () {
        if (batchPage > 1) { loadBatch(batchPage - 1); }
    });
    document.getElementById('batchNextBtn')?.addEventListener('click', function () {
        if (batchPage < getTotalBatchPages()) { loadBatch(batchPage + 1); }
    });

    // Initialize Campaign List
    loadBatch(1);
})();

(function () {
    const assignMethodBtns = document.querySelectorAll('.assign-method-btn');
    assignMethodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            assignMethodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
})();

(function () {
    const selectAllCheckbox = document.querySelector('.table-custom thead .form-check-input');
    const prospectCheckboxes = document.querySelectorAll('.table-custom tbody .form-check-input');
    const countDisplay = document.getElementById('selectedProspectCount');

    function updateCount() {
        const checkedCheckboxes = document.querySelectorAll('.table-custom tbody .form-check-input:checked');
        const checkedCount = checkedCheckboxes.length;
        if (countDisplay) {
            countDisplay.textContent = `Selected: ${checkedCount} รายการ`;
        }
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = (checkedCount === prospectCheckboxes.length && prospectCheckboxes.length > 0);
        }

        let hasAssigned = false;
        checkedCheckboxes.forEach(cb => {
            const row = cb.closest('tr');
            if (row) {
                const statusText = row.querySelector('.status-text');
                if (statusText && statusText.textContent.trim() === 'Assign แล้ว') {
                    hasAssigned = true;
                }
            }
        });

        const assignBtn = document.getElementById('assignBtn');
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

    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            prospectCheckboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            updateCount();
        });
    }

    prospectCheckboxes.forEach(cb => {
        cb.addEventListener('change', updateCount);
    });

    // Initialize
    updateCount();
})();

// =============================================
// RESPONSIBLE PERSON MULTI-SELECT
// =============================================
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
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }

        function removeTag(val) {
            const tag = selectBox.querySelector(`.branch-tag[data-value="${val}"]`);
            if (tag) {
                tag.remove();
            }
        }
    }

    // Initialize for Main Assign Panel
    initMultiSelect('responsibleSelectContainer', 'responsibleSelectBox', 'responsibleDropdownMenu', 'responsible-option');
    
    // Initialize for Re-Assign Modal
    initMultiSelect('newResponsibleSelectContainer', 'newResponsibleSelectBox', 'newResponsibleDropdownMenu', 'new-responsible-option');
})();

// =============================================
// ASSIGN / RE-ASSIGN BUTTON CLICK
// =============================================
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
