let currentBatchPage = 1;
let currentBatchPageSize = 5;

async function getCampainList(page = 1, pageSize = 20)
{
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
            created:   item.created       ? item.created.substring(0, 10)       : ""
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
        console.error(error);
        stopLoading();
        return { page: 1, pageSize: 5, count: 0, data: [] };
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

document.addEventListener('DOMContentLoaded', async function () {
    const checkAll = document.getElementById('checkAll');
    let rowCheckboxes; // Will be set after generating table
    const selectedTableBody = document.getElementById('selectedTableBody');
    const selectedCountText = document.getElementById('selectedCountText');
    const selectedTotalText = document.getElementById('selectedTotalText');
    const btnClearSelection = document.getElementById('btnClearSelection');
    const dataTable = document.getElementById('dataTable');

    // --- 0. Load Campaign (Batch) List from API ---
    await loadBatchList(currentBatchPage, currentBatchPageSize);

    rowCheckboxes = document.querySelectorAll('.row-checkbox');

    // --- 1. Filter Logic (DataTables-based) ---
    const btnLoadCustomers = document.getElementById('btnLoadCustomers');
    const btnClearFilters = document.getElementById('btnClearFilters');

    // Custom DataTables search filter for status dropdown
    $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
        const fStatus = document.getElementById('filterStatus')?.value || '';
        if (!fStatus) return true;
        const rowStatus = $('<div>').html(data[5]).text().trim();
        return rowStatus === fStatus;
    });

    function applyFilters() {
        const fStatus = document.getElementById('filterStatus')?.value || '';
        // Use DataTables global search for the status; redraw triggers ext.search
        $dt.draw();
    }

    function updatePagination() { /* no-op: DataTables handles pagination */ }

    if(btnLoadCustomers) {
        btnLoadCustomers.addEventListener('click', applyFilters);
    }

    // Apply Filters button inside the filter card
    const btnApplyFilters = document.getElementById('btnApplyFilters');
    if(btnApplyFilters) {
        btnApplyFilters.addEventListener('click', applyFilters);
    }
    
    if(btnClearFilters) {
        btnClearFilters.addEventListener('click', function() {
            document.getElementById('filterCustType').value = '';
            document.getElementById('filterGender').value = '';
            document.getElementById('filterJob').value = '';
            document.getElementById('filterStatus').value = '';
            document.getElementById('filterBranch').value = '';
            document.getElementById('filterAgeMin').value = '25';
            document.getElementById('filterAgeMax').value = '60';
            document.getElementById('filterDateStart').value = '2024-05-01';
            document.getElementById('filterDateEnd').value = '2024-05-12';
            $dt.search('').draw();
        });
    }

    // Real-time filtering — trigger on every change
    const filterSelects = ['filterCustType', 'filterGender', 'filterJob', 'filterStatus', 'filterBranch'];
    filterSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });

    const filterInputs = ['filterAgeMin', 'filterAgeMax', 'filterDateStart', 'filterDateEnd'];
    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', applyFilters);
    });

    // --- 2. Checkbox & Right Panel Logic ---
    function updateSelectedList() {
        selectedTableBody.innerHTML = '';
        let selectedCount = 0;

        rowCheckboxes.forEach((checkbox, index) => {
            if (checkbox.checked) {
                selectedCount++;
                const tr = checkbox.closest('tr');
                const campaignName = tr.cells[2]?.textContent.trim() || '-';
                const productCode  = tr.cells[3]?.textContent.trim() || '-';

                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td class="text-center text-muted">${selectedCount}</td>
                    <td>${campaignName}</td>
                    <td class="text-muted">${productCode}</td>
                    <td class="text-center"><i class="bi bi-x text-secondary remove-item" style="cursor:pointer;" data-index="${index}"></i></td>
                `;
                selectedTableBody.appendChild(newRow);
            }
        });

        selectedCountText.textContent = `รายการที่เลือก (${selectedCount} รายการ)`;
        selectedTotalText.textContent = `รวมทั้งหมด ${selectedCount} รายการ`;

        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', function () {
                const targetIndex = this.getAttribute('data-index');
                rowCheckboxes[targetIndex].checked = false;
                updateSelectedList();
                updateCheckAllStatus();
            });
        });
        
        // Update header badge if exists
        const badgeBlue = document.querySelector('.badge-blue');
        if(badgeBlue) badgeBlue.textContent = selectedCount;
    }

    function updateCheckAllStatus() {
        const visibleCheckboxes = Array.from(rowCheckboxes);
        const allChecked = visibleCheckboxes.length > 0 && visibleCheckboxes.every(cb => cb.checked);
        const someChecked = visibleCheckboxes.some(cb => cb.checked);
        
        checkAll.checked = allChecked;
        checkAll.indeterminate = !allChecked && someChecked;
    }

    checkAll.addEventListener('change', function () {
        const isChecked = this.checked;
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        updateSelectedList();
    });

    rowCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            updateSelectedList();
            updateCheckAllStatus();
        });
    });

    if (btnClearSelection) {
        btnClearSelection.addEventListener('click', function () {
            rowCheckboxes.forEach(checkbox => checkbox.checked = false);
            updateSelectedList();
            updateCheckAllStatus();
        });
    }

    // DataTables renders the initial draw; no manual applyFilters() call needed.

    // --- 3. Export to Excel Logic ---
    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', function () {
            // Create a clone of the table to manipulate before export
            let tableClone = dataTable.cloneNode(true);
            
            // Remove the checkbox column (first column) from header and body
            tableClone.querySelectorAll('tr').forEach(row => {
                if(row.cells.length > 0) {
                    row.deleteCell(0);
                }
            });

            // Remove hidden rows from clone
            Array.from(tableClone.querySelectorAll('tbody tr')).forEach(row => {
               if(row.style.display === 'none' || row.classList.contains('d-none')) {
                   row.parentNode.removeChild(row);
               }
            });
            
            // Clean up formatting in cells for export (e.g. branch names)
            tableClone.querySelectorAll('.company-name').forEach(el => {
                el.textContent = el.textContent + ' ';
            });

            // Convert table to workbook
            let wb = XLSX.utils.table_to_book(tableClone, { sheet: "Prospects" });
            
            // Auto-fit columns and apply styles
            let ws = wb.Sheets["Prospects"];
            if (ws) {
                const colWidths = [];
                const range = XLSX.utils.decode_range(ws['!ref']);
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    let maxWidth = 10; // Default minimum width
                    for (let R = range.s.r; R <= range.e.r; ++R) {
                        const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                        let cell = ws[cellRef];
                        
                        // Ensure cell exists to apply styling even if empty
                        if (!cell) {
                            cell = { t: 's', v: '' };
                            ws[cellRef] = cell;
                        }

                        // Add styling
                        if (!cell.s) cell.s = {};

                        // Make header bold and center aligned
                        if (R === range.s.r) {
                            cell.s.font = { bold: true };
                            cell.s.alignment = { horizontal: "center", vertical: "center" };
                        } else {
                            cell.s.alignment = { vertical: "center" };
                        }

                        // Add table border styling for all cells
                        if (!cell.s.border) {
                            cell.s.border = {
                                top: { style: "thin", color: { rgb: "000000" } },
                                bottom: { style: "thin", color: { rgb: "000000" } },
                                left: { style: "thin", color: { rgb: "000000" } },
                                right: { style: "thin", color: { rgb: "000000" } }
                            };
                        }

                        if (cell.v !== undefined && cell.v !== null) {
                            const length = cell.v.toString().length;
                            if (length > maxWidth) {
                                maxWidth = length;
                            }
                        }
                    }
                    // Set width with some extra padding for fonts
                    colWidths.push({ wch: maxWidth + 5 });
                }
                ws['!cols'] = colWidths;
            }

            // Save to file
            XLSX.writeFile(wb, "Prospect_Data.xlsx");
        });
    }
    
    // --- 4. Batch List Pagination (Left Panel) ---
    const batchPagination = document.getElementById('batchPagination');
    const batchListText = document.getElementById('batchListText');
    
    if (dataTable && batchPagination && batchListText) {
        let currentBatchPage = 1;
        const batchesPerPage = 5;
        const totalBatchItems = allBatches.length;
        const totalBatchPages = Math.ceil(totalBatchItems / batchesPerPage);
        
        function renderBatchPage() {
            dataTable.innerHTML = '';
            const startIdx = (currentBatchPage - 1) * batchesPerPage;
            const endIdx = Math.min(startIdx + batchesPerPage, totalBatchItems);
            
            for (let i = startIdx; i < endIdx; i++) {
                dataTable.appendChild(allBatches[i]);
            }
            
            batchListText.textContent = `แสดง ${startIdx + 1} - ${endIdx} จาก ${totalBatchItems} รายการ`;
            
            // Render Pagination
            let html = '';
            html += `<li class="page-item ${currentBatchPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-bpage="prev"><i class="bi bi-chevron-left"></i></a></li>`;
            for (let i = 1; i <= totalBatchPages; i++) {
                html += `<li class="page-item ${currentBatchPage === i ? 'active' : ''}"><a class="page-link" href="#" data-bpage="${i}">${i}</a></li>`;
            }
            html += `<li class="page-item ${currentBatchPage === totalBatchPages ? 'disabled' : ''}"><a class="page-link" href="#" data-bpage="next"><i class="bi bi-chevron-right"></i></a></li>`;
            
            batchPagination.innerHTML = html;
            
            batchPagination.querySelectorAll('.page-link').forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    if (this.parentElement.classList.contains('disabled')) return;
                    const page = this.getAttribute('data-bpage');
                    if (page === 'prev') {
                        currentBatchPage--;
                    } else if (page === 'next') {
                        currentBatchPage++;
                    } else {
                        currentBatchPage = parseInt(page);
                    }
                    renderBatchPage();
                });
            });
            
            // Add click event for cards to be active
            dataTable.querySelectorAll('.batch-card').forEach(card => {
                card.addEventListener('click', function() {
                    dataTable.querySelectorAll('.batch-card').forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        }
        
        renderBatchPage();
    }
});
