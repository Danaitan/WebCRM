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

async function getSuggestionDashboard() {
    try {
        const response = await fetch('/DashboardSuggestion/GetSuggestionDashboard');
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching dashboard suggestion info:", error);
        return null;
    }
}

function setDashboard(data) {
    if (!data) return;
    rawDashboardData = data;

    const graph = data.graph || {};
    const table = data.table || [];

    currentTableData = table;

    populateFilters(table, graph);
    renderOverview(graph.overAll || graph.graphStatus || []);
    initTopicBarChart(graph.graphTitle || []);
    initStatusDoughnutChart(graph.graphStatus || graph.overAll || []);

    currentPage = 1;
    renderSuggestionTable();
}

function populateFilters(table, graph) {
    // Populate Topic Filter
    const filterTopic = document.getElementById('filterTopic');
    if (filterTopic) {
        const topics = new Set();
        (graph.graphTitle || []).forEach(item => {
            if (item.name) topics.add(item.name);
        });
        table.forEach(item => {
            if (item.suggesDesc) topics.add(item.suggesDesc);
        });

        let currentVal = filterTopic.value;
        filterTopic.innerHTML = '<option value="">ทั้งหมด</option>';
        topics.forEach(t => {
            filterTopic.innerHTML += `<option value="${t}">${t}</option>`;
        });
        if (currentVal) filterTopic.value = currentVal;
    }

    // Populate Provider Filter
    const filterProvider = document.getElementById('filterProvider');
    if (filterProvider) {
        const providers = new Set();
        table.forEach(item => {
            if (item.nameProvider) providers.add(item.nameProvider);
        });

        let currentVal = filterProvider.value;
        filterProvider.innerHTML = '<option value="">ทั้งหมด</option>';
        providers.forEach(p => {
            filterProvider.innerHTML += `<option value="${p}">${p}</option>`;
        });
        if (currentVal) filterProvider.value = currentVal;
    }

    // Populate Status Filter
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        const statuses = new Set();
        (graph.graphStatus || graph.overAll || []).forEach(item => {
            if (item.name) statuses.add(item.name);
        });
        table.forEach(item => {
            if (item.StatusTask) statuses.add(item.StatusTask);
        });

        let currentVal = filterStatus.value;
        filterStatus.innerHTML = '<option value="">ทั้งหมด</option>';
        statuses.forEach(s => {
            filterStatus.innerHTML += `<option value="${s}">${s}</option>`;
        });
        if (currentVal) filterStatus.value = currentVal;
    }
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

        const status = (row.StatusTask || '').trim();
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

        const days = row.Day !== undefined && row.Day !== null ? `${row.Day} วัน` : '-';

        rowsHtml += `
            <tr>
                <td class="text-muted extra-small">${firstUpdStr}</td>
                <td class="fw-medium text-dark">${row.suggesDesc || '-'}</td>
                <td class="text-dark">${row.nameCus || '-'}</td>
                <td class="text-muted small">${row.branch || 'สำนักงานใหญ่'}</td>
                <td class="text-dark small">${row.nameProvider || '-'}</td>
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

function resetSuggestionFilters() {
    ['filterTopic', 'filterProvider', 'filterStatus', 'filterType', 'filterBranch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    ['filterStartDate', 'filterEndDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
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
    if (typeof startLoading === 'function') {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    }
    try {
        const data = await getSuggestionDashboard();
        setDashboard(data);
    } catch (error) {
        console.error("Error in document ready:", error);
    } finally {
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
    }
});