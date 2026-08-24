// Dashboard Suggestion & Complaint Logic

let topicBarChartInstance = null;
let statusDoughnutChartInstance = null;
let rawDashboardData = null;

let currentTableData = [];
let currentPage = 1;
let pageSize = 10;

const statusColors = {
    'Pending': '#3b82f6',
    'Forward': '#0284c7',
    'Reply': '#8b5cf6',
    'Close': '#10b981'
};

async function setFilterBranch(data) {
    const selectEl = document.getElementById('filterBranch');
    if (!selectEl) return;

    const currentValue = $(selectEl).val() || selectEl.value || '';

    if (selectEl.options.length > 1) {
        if (currentValue) {
            $(selectEl).val(currentValue);
            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $(selectEl).trigger('change');
            }
        }
        return;
    }

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                const code = item.e_mail;
                const name = item.name + ": " + item.branch;
                optionsHtml += `<option value="${code}">${name}</option>`;
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        $(selectEl).select2({
            theme: 'bootstrap-5',
            width: '100%',
            language: {
                noResults: function () {
                    return "ไม่พบข้อมูล";
                }
            }
        });
    }
    if (currentValue) {
        $(selectEl).val(currentValue).trigger('change');
    }
}

async function setFilterprovider (data){
    try {
        const filterProvider = document.getElementById('filterProvider');
        if (!filterProvider) return;
        
        const items = data && Array.isArray(data.data) 
            ? data.data 
            : (Array.isArray(data) ? data : []);
        const currentValue = $(filterProvider).val() || filterProvider.value || '';
        let optionsHtml = '<option value="">ทั้งหมด</option>';
        items.forEach(obj => {
            const code = obj.e_mail;
            const name = obj.name;
            const branch = obj.branch;
            if (name) {
                optionsHtml += `<option value="${code}">${name} (${branch})</option>`;
            }
        });
        filterProvider.innerHTML = optionsHtml;
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $(filterProvider).select2({
                theme: 'bootstrap-5',
                width: '100%',
                language: {
                    noResults: function () {
                        return "ไม่พบข้อมูล";
                    }
                }
            });
        }
        if (currentValue) {
            $(filterProvider).val(currentValue).trigger('change');
        }
    } catch (e) {
        console.error("Error setting filter provider:", e);
    }
}

async function setFilterTitle (data){
    const filterTitle = document.getElementById('filterTopic');
    if (!filterTitle) return;
    const items = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    const currentValue = $(filterTitle).val() || filterTitle.value || '';

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    items.forEach(obj => {        
        const code = obj.count;    
        const name = obj.name || "";
        if (name) {
            optionsHtml += `<option value="0${code}">${name}</option>`;
        }
    });
    filterTitle.innerHTML = optionsHtml;
    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        $(filterTitle).select2({
            theme: 'bootstrap-5',
            width: '100%',
            language: {
                noResults: function () {
                    return "ไม่พบข้อมูล";
                }
            }
        });
    }
    if (currentValue) {
        $(filterTitle).val(currentValue).trigger('change');
    }
}

async function setFilterStatus (data){
    const filterStatus = document.getElementById('filterStatus');
    if (!filterStatus) return;
    const items = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    const currentValue = $(filterStatus).val() || filterStatus.value || '';

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    items.forEach(obj => {                
        const name = obj.name || obj.status || "";
        if (name) {
            optionsHtml += `<option value="${name}">${name}</option>`;
        }
    });
    filterStatus.innerHTML = optionsHtml;
    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        $(filterStatus).select2({
            theme: 'bootstrap-5',
            width: '100%',
            language: {
                noResults: function () {
                    return "ไม่พบข้อมูล";
                }
            }
        });
    }
    if (currentValue) {
        $(filterStatus).val(currentValue).trigger('change');
    }
}

async function setDashboard() {

    const startDate = $('#filterStartDate').val() || '';
    const endDate = $('#filterEndDate').val() || '';
    const branch = $('#filterBranch').val() || '';
    const provider = $('#filterProvider').val() || '';
    const topic = $('#filterTopic').val() || '';
    const status = $('#filterStatus').val() || '';

    const params = new URLSearchParams();
    if (startDate) params.append('startdate', startDate);
    if (endDate) params.append('enddate', endDate);
    if (branch) params.append('branch', branch);
    if (provider) params.append('provider', provider);
    if (topic) params.append('title', topic);
    if (status) params.append('status', status);

    const queryString = params.toString();
    const url = `/DashboardSuggestion/GetSuggestionDashboard${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url);
    if (!response.ok) {
        console.error("Network response was not ok", response.statusText);
        return;
    }
    const jsonResult = await response.json();
    if (!jsonResult) return;

    // Support both root payload and wrapped data payload
    const data = (jsonResult && jsonResult.data && typeof jsonResult.data === 'object' && !Array.isArray(jsonResult.data))
        ? jsonResult.data
        : jsonResult;

    rawDashboardData = data;

    if (data.statusMenu) await setFilterStatus(data.statusMenu);
    if (data.titleMenu) await setFilterTitle(data.titleMenu);

    const graph = data.graph || {};
    const table = data.table || (Array.isArray(data) ? data : (data.data || []));

    currentTableData = Array.isArray(table) ? table : [];

    renderOverview(graph.overAll || graph.graphStatus || graph.status || []);
    initTopicBarChart(graph.graphTitle || graph.topic || []);
    initStatusDoughnutChart(graph.graphStatus || graph.overAll || graph.status || []);

    currentPage = 1;
    renderSuggestionTable();
}

function renderOverview(overAllData) {
    let pending = 0;
    let forward = 0;
    let reply = 0;
    let close = 0;

    overAllData.forEach(item => {
        const name = (item.name || '').trim().toLowerCase();
        const count = Number(item.count || 0);

        if (name === 'pending') pending = count;
        else if (name === 'forward') forward = count;
        else if (name === 'reply') reply = count;
        else if (name === 'close') close = count;
    });

    const total = pending + forward + reply + close;

    const elTotal = document.getElementById('statTotalCount');
    const elPending = document.getElementById('statPendingCount');
    const elForward = document.getElementById('statForwardCount');
    const elReply = document.getElementById('statReplyCount');
    const elClose = document.getElementById('statCloseCount');

    if (elTotal) elTotal.innerText = total.toLocaleString();
    if (elPending) elPending.innerText = pending.toLocaleString();
    if (elForward) elForward.innerText = forward.toLocaleString();
    if (elReply) elReply.innerText = reply.toLocaleString();
    if (elClose) elClose.innerText = close.toLocaleString();
}

function initTopicBarChart(topicData) {
    const ctx = document.getElementById('topicBarChart');
    if (!ctx) return;

    if (topicBarChartInstance) {
        topicBarChartInstance.destroy();
    }

    // Sort descending by count (มากไปน้อย)
    const sortedTopicData = [...(topicData || [])].sort((a, b) => (Number(b.count) || 0) - (Number(a.count) || 0));

    const labels = sortedTopicData.map(item => item.name || '');
    const counts = sortedTopicData.map(item => item.count || 0);

    const barColors = [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#8b5cf6',
        '#64748b'
    ];

    topicBarChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนรายการ',
                data: counts,
                backgroundColor: labels.map((_, i) => barColors[i % barColors.length]),
                borderRadius: 6,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ` จำนวน: ${context.raw} รายการ`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { family: "'Prompt', sans-serif", size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0, font: { family: "'Prompt', sans-serif", size: 11 } }
                }
            }
        }
    });
}

function initStatusDoughnutChart(statusData) {
    const ctx = document.getElementById('statusDoughnutChart');
    if (!ctx) return;

    if (statusDoughnutChartInstance) {
        statusDoughnutChartInstance.destroy();
    }

    const labels = statusData.map(item => item.name || '');
    const counts = statusData.map(item => item.count || 0);
    const total = counts.reduce((a, b) => a + b, 0);

    const elTotal = document.getElementById('doughnutTotalCount');
    if (elTotal) elTotal.innerText = total.toLocaleString();

    const colors = labels.map(name => statusColors[name] || '#94a3b8');

    statusDoughnutChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ${pct}% (${context.raw})`;
                        }
                    }
                }
            }
        }
    });

    // Custom HTML Legend
    const legendContainer = document.getElementById('statusLegend');
    if (legendContainer) {
        let legendHtml = '';
        statusData.forEach(item => {
            const name = item.name || '';
            const count = item.count || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = statusColors[name] || '#94a3b8';

            legendHtml += `
                <div class="d-flex align-items-center mb-1.5 extra-small">
                    <span class="d-inline-block rounded-circle me-2" style="width: 10px; height: 10px; background-color: ${color};"></span>
                    <span class="fw-bold text-dark me-2" style="min-width: 55px;">${name}</span>
                    <span class="text-muted me-1">${pct}%</span>
                    <span class="text-secondary fw-semibold">(${count})</span>
                </div>
            `;
        });
        legendContainer.innerHTML = legendHtml;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function renderSuggestionTable() {
    const tbody = document.getElementById('suggestionTableBody');
    const infoEl = document.getElementById('tableInfoText');
    const paginationEl = document.getElementById('tablePagination');

    if (!tbody) return;

    const totalItems = currentTableData.length;
    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 small">ไม่พบข้อมูลข้อเสนอแนะ / ร้องเรียน</td></tr>`;
        if (infoEl) infoEl.innerText = `0 จาก 0 รายการ`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(totalItems / pageSize);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const pageItems = currentTableData.slice(startIndex, endIndex);

    let rowsHtml = '';
    pageItems.forEach(row => {
        const firstUpdStr = formatDate(row.FirstUpdDate);
        const lastUpdStr = formatDate(row.LastUpdDate);

        const suggesDesc = row.suggesDesc || '-';
        const nameCus = row.nameCus || '-';
        const provider = row.sendToPerson || row.sendToGroupAbb || '-';
        const branch = row.sendToPersonAbb || row.sendToGroupFull || '-';

        const status = String(row.StatusTask);
        let statusBadge = '<span class="badge bg-secondary">Unknown</span>';
        const statusLower = status.toLowerCase();

        if (statusLower === 'pending') {
            statusBadge = `<span class="badge badge-status-pending px-2.5 py-1 rounded-pill">Pending</span>`;
        } else if (statusLower === 'forward') {
            statusBadge = `<span class="badge badge-status-forward px-2.5 py-1 rounded-pill">Forward</span>`;
        } else if (statusLower === 'reply') {
            statusBadge = `<span class="badge badge-status-reply px-2.5 py-1 rounded-pill">Reply</span>`;
        } else if (statusLower === 'close') {
            statusBadge = `<span class="badge badge-status-close px-2.5 py-1 rounded-pill">Close</span>`;
        } else if (status) {
            statusBadge = `<span class="badge bg-light text-dark border px-2.5 py-1 rounded-pill">${status}</span>`;
        }

        const rawDay = row.Day !== undefined && row.Day !== null ? row.Day : (row.day !== undefined && row.day !== null ? row.day : null);
        const days = rawDay !== null ? `${rawDay} วัน` : '-';

        rowsHtml += `
            <tr>
                <td class="text-muted extra-small">${firstUpdStr}</td>
                <td class="fw-medium text-dark">${suggesDesc}</td>
                <td class="text-dark">${nameCus}</td>
                <td class="text-dark small">${provider}</td>
                <td class="text-muted small">${branch}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-muted extra-small">${lastUpdStr}</td>
                <td class="text-center fw-semibold text-secondary small">${days}</td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    if (infoEl) {
        infoEl.innerText = `แสดง ${startIndex + 1} - ${endIndex} จาก ${totalItems} รายการ`;
    }

    if (paginationEl) {
        let pagHtml = '';
        pagHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></a>
            </li>
        `;

        for (let p = 1; p <= totalPages; p++) {
            pagHtml += `
                <li class="page-item ${p === currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0)" onclick="goToPage(${p})">${p}</a>
                </li>
            `;
        }

        pagHtml += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></a>
            </li>
        `;
        paginationEl.innerHTML = pagHtml;
    }
}

function goToPage(page) {
    currentPage = page;
    renderSuggestionTable();
}

function changePageSize(size) {
    pageSize = Number(size) || 10;
    currentPage = 1;
    renderSuggestionTable();
}

function applySuggestionFilters() {
    if (!rawDashboardData || !rawDashboardData.table) return;

    const topicFilter = (document.getElementById('filterTopic')?.value || '').trim();
    const providerFilter = (document.getElementById('filterProvider')?.value || '').trim();
    const statusFilter = (document.getElementById('filterStatus')?.value || '').trim();
    const startDateVal = document.getElementById('filterStartDate')?.value;
    const endDateVal = document.getElementById('filterEndDate')?.value;

    let filtered = rawDashboardData.table;

    if (topicFilter) {
        filtered = filtered.filter(item => (item.suggesDesc || '').trim() === topicFilter);
    }
    if (providerFilter) {
        filtered = filtered.filter(item => (item.nameProvider || '').trim() === providerFilter);
    }
    if (statusFilter) {
        filtered = filtered.filter(item => (item.StatusTask || '').trim() === statusFilter);
    }
    if (startDateVal) {
        const start = new Date(startDateVal);
        start.setHours(0, 0, 0, 0);
        filtered = filtered.filter(item => {
            if (!item.FirstUpdDate) return true;
            return new Date(item.FirstUpdDate) >= start;
        });
    }
    if (endDateVal) {
        const end = new Date(endDateVal);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(item => {
            if (!item.FirstUpdDate) return true;
            return new Date(item.FirstUpdDate) <= end;
        });
    }

    currentTableData = filtered;
    currentPage = 1;
    renderSuggestionTable();
}

async function resetSuggestionFilters() {
    $('#filterStartDate').val('');
    $('#filterEndDate').val('');

    const select2Ids = ['#filterBranch', '#filterProvider', '#filterTopic', '#filterStatus'];
    select2Ids.forEach(id => {
        const $el = $(id);
        if ($el.length) {
            $el.val('');
            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $el.trigger('change');
            }
        }
    });

    if (rawDashboardData) {
        currentTableData = rawDashboardData.table || [];
        currentPage = 1;
        renderSuggestionTable();
    }
}

function exportSuggestionExcel() {
    if (!currentTableData || currentTableData.length === 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'ไม่มีข้อมูล',
                text: 'ไม่มีข้อมูลสำหรับส่งออก Excel',
                confirmButtonText: 'ตกลง'
            });
        } else {
            alert('ไม่มีข้อมูลสำหรับส่งออก Excel');
        }
        return;
    }

    let csv = '\uFEFF';
    csv += 'วันที่รับเรื่อง,หัวข้อเรื่อง,ชื่อลูกค้า,สาขา,ผู้รับผิดชอบ,สถานะ,อัปเดตล่าสุด,จำนวนวัน\n';

    currentTableData.forEach(row => {
        const firstDate = formatDate(row.FirstUpdDate);
        const lastDate = formatDate(row.LastUpdDate);
        csv += `"${firstDate}","${row.suggesDesc || ''}","${row.nameCus || ''}","${row.branch || 'สำนักงานใหญ่'}","${row.nameProvider || ''}","${row.StatusTask || ''}","${lastDate}",${row.Day || 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Suggestion_Dashboard_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

$(document).ready(async function () {
    if (typeof $.fn !== 'undefined' && $.fn.select2) {
        $('.select2-filter').select2({
            theme: 'bootstrap-5',
            width: '100%',
            language: {
                noResults: function () {
                    return "ไม่พบข้อมูล";
                }
            }
        });

        $(document).on('select2:open', () => {
            setTimeout(() => {
                const searchInput = document.querySelector('.select2-container--open .select2-search__field');
                if (searchInput) {
                    searchInput.focus();
                }
            }, 10);
        });
    }

    if (typeof startLoading === 'function') {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    }
    try {

        const response = await fetch('/DashboardSuggestion/GetPersonalAndGroup');
        if (!response.ok) return;
        const jsonResult = await response.json();
        const branch = [
            ...jsonResult.group,
            ...jsonResult.personalAbb
        ];
        const provider = [
            ...jsonResult.group,
            ...jsonResult.personal
        ];
        await setFilterBranch(branch);
        await setFilterprovider(provider);
        await setDashboard();

    } catch (error) {
        console.error("Error in document ready:", error);
    } finally {
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
    }
});

$("#btnSearchFilter").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await setDashboard();
});

$("#btnResetFilter").off("click").on("click", async function (e) {
    if (e) e.preventDefault();
    await resetSuggestionFilters();
    await setDashboard();
});