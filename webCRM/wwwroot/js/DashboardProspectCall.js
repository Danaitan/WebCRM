// Prospect Call Dashboard Logic

let callResultChartInstance = null;
let objectiveChartInstance = null;
let rawDashboardData = null;
let currentCallerMode = 'top';
let rawCallerData = [];

let currentTableData = [];
let currentPage = 1;
let pageSize = 10;

const objectiveColors = {
    'CS': '#3b82f6',
    'MC': '#10b981',
    'FL': '#f59e0b',
    'RM': '#6b7280'
};

async function getDashboardCall() {
    try {
        const response = await fetch('/DashboardProspectCall/GetCallDashboard');
        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching dashboard call info:", error);
        return null;
    }
}

function setDashboard(data) {
    if (!data) return;
    rawDashboardData = data;

    const graph = data.graph || {};
    const table = data.table || [];

    renderOverview(graph.overAll || []);

    initCallResultChart(graph.callResult || []);
    initObjectiveChart(graph.objective || []);

    renderTopCallers(graph.callNumber || []);

    currentTableData = table;
    currentPage = 1;
    renderCampaignTable();
}

function renderOverview(overAll) {
    let called = 0;
    let notCalled = 0;
    let total = 0;

    overAll.forEach(item => {
        const name = (item.name || '').trim();
        const count = Number(item.count || 0);
        if (name === 'โทรแล้ว' || name === 'ติดต่อแล้ว') {
            called = count;
        } else if (name === 'ยังไม่โทร' || name === 'ยังไม่ได้ติดต่อ') {
            notCalled = count;
        } else if (name === 'ทั้งหมด') {
            total = count;
        }
    });

    if (total === 0 && (called > 0 || notCalled > 0)) {
        total = called + notCalled;
    }

    const calledPct = total > 0 ? ((called / total) * 100).toFixed(2) : 0;
    const notCalledPct = total > 0 ? ((notCalled / total) * 100).toFixed(2) : 0;

    const statCalledCountEl = document.getElementById('statCalledCount');
    const statCalledPercentEl = document.getElementById('statCalledPercent');
    const statNotCalledCountEl = document.getElementById('statNotCalledCount');
    const statNotCalledPercentEl = document.getElementById('statNotCalledPercent');

    if (statCalledCountEl) statCalledCountEl.innerText = called.toLocaleString();
    if (statCalledPercentEl) statCalledPercentEl.innerText = `${calledPct}%`;
    if (statNotCalledCountEl) statNotCalledCountEl.innerText = notCalled.toLocaleString();
    if (statNotCalledPercentEl) statNotCalledPercentEl.innerText = `${notCalledPct}%`;
}

function initCallResultChart(callResultData) {
    const ctx = document.getElementById('callResultChart');
    if (!ctx) return;

    if (callResultChartInstance) {
        callResultChartInstance.destroy();
    }

    const sortedData = [...callResultData].sort((a, b) => (b.count || 0) - (a.count || 0));

    let processedData = sortedData;
    if (sortedData.length > 4) {
        const top4 = sortedData.slice(0, 4);
        const others = sortedData.slice(4);
        const othersCount = others.reduce((sum, item) => sum + (item.count || 0), 0);
        if (othersCount > 0) {
            top4.push({ name: 'อื่นๆ', count: othersCount });
        }
        processedData = top4;
    }

    const labels = processedData.map(item => item.name || '');
    const counts = processedData.map(item => item.count || 0);

    const getBarColor = (name) => {
        if (name === 'อื่นๆ') return '#94a3b8';
        if (name.includes('เรียบร้อย') || name.includes('สำเร็จ')) return '#10b981';
        if (name.includes('เบอร์ไม่สามารถ')) return '#ef4444';
        if (name.includes('ไม่สามารถ')) return '#f59e0b';
        return '#3b82f6';
    };

    const backgroundColors = labels.map(name => getBarColor(name));

    callResultChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวน (ราย)',
                data: counts,
                backgroundColor: backgroundColors,
                borderRadius: 4,
                barThickness: 24
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
                            return ` ${context.dataset.label}: ${context.raw} ราย`;
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

function initObjectiveChart(objectiveData) {
    const ctx = document.getElementById('objectiveChart');
    if (!ctx) return;

    if (objectiveChartInstance) {
        objectiveChartInstance.destroy();
    }

    const labels = objectiveData.map(item => item.name || '');
    const counts = objectiveData.map(item => item.count || 0);
    const total = counts.reduce((a, b) => a + b, 0);

    const totalEl = document.getElementById('objectiveTotalCount');
    if (totalEl) totalEl.innerText = total.toLocaleString();

    const colors = labels.map(name => objectiveColors[name.toUpperCase()] || '#94a3b8');

    objectiveChartInstance = new Chart(ctx, {
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
                            return ` ${context.label}: ${context.raw} ราย (${pct}%)`;
                        }
                    }
                }
            }
        }
    });

    // Render Custom HTML Legend
    const legendContainer = document.getElementById('objectiveLegend');
    if (legendContainer) {
        let legendHtml = '';
        objectiveData.forEach(item => {
            const name = item.name || '';
            const count = item.count || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const color = objectiveColors[name.toUpperCase()] || '#94a3b8';

            legendHtml += `
                <div class="d-flex align-items-center mb-1.5 extra-small">
                    <span class="d-inline-block rounded-circle me-1.5" style="width: 10px; height: 10px; background-color: ${color};"></span>
                    <span class="fw-bold me-1" style="min-width: 22px;">&nbsp;${name}</span>
                    <span class="text-muted me-1">${pct}%</span>
                    <span class="text-secondary fw-semibold">(${count})</span>
                </div>
            `;
        });
        legendContainer.innerHTML = legendHtml;
    }
}

function toggleCallerSort() {
    if (currentCallerMode === 'top') {
        currentCallerMode = 'bottom';
    } else {
        currentCallerMode = 'top';
    }

    const titleText = document.getElementById('callerTitleText');
    const titleIcon = document.getElementById('callerTitleIcon');
    const btnText = document.getElementById('callerBtnText');
    const btnIcon = document.getElementById('callerArrowIcon');

    if (currentCallerMode === 'top') {
        if (titleText) titleText.innerHTML = '&nbsp;&nbsp;5 อันดับสูงสุด';
        if (titleIcon) titleIcon.className = 'bi bi-trophy-fill text-warning';
        if (btnText) btnText.innerText = 'สลับดู 5 อันดับต่ำสุด';
        if (btnIcon) btnIcon.className = 'bi bi-arrow-down-up text-primary';
    } else {
        if (titleText) titleText.innerHTML = '&nbsp;&nbsp;5 อันดับต่ำสุด';
        if (titleIcon) titleIcon.className = 'bi bi-graph-down-arrow text-danger';
        if (btnText) btnText.innerText = 'สลับดู 5 อันดับสูงสุด';
        if (btnIcon) btnIcon.className = 'bi bi-arrow-down-up text-danger';
    }

    renderTopCallers();
}

function renderTopCallers(callNumberData) {
    if (callNumberData) {
        rawCallerData = callNumberData;
    }

    const container = document.getElementById('topCallersList');
    if (!container) return;

    if (!rawCallerData || rawCallerData.length === 0) {
        container.innerHTML = `<div class="text-muted extra-small text-center py-3">ไม่มีข้อมูลผู้โทร</div>`;
        return;
    }

    let sorted = [...rawCallerData];
    if (currentCallerMode === 'top') {
        sorted.sort((a, b) => (b.count || 0) - (a.count || 0));
    } else {
        sorted.sort((a, b) => (a.count || 0) - (b.count || 0));
    }

    const targetList = sorted.slice(0, 5);
    const maxCount = Math.max(...rawCallerData.map(item => item.count || 0), 1);

    let html = '';
    targetList.forEach((item, index) => {
        const name = item.name || 'ไม่ระบุชื่อ';
        const count = item.count || 0;
        const pct = Math.round((count / maxCount) * 100);
        const rank = index + 1;

        let rankClass = '';
        if (currentCallerMode === 'top') {
            rankClass = rank === 1 ? 'rank-1' : (rank === 2 ? 'rank-2' : (rank === 3 ? 'rank-3' : ''));
        } else {
            rankClass = 'rank-bottom';
        }

        const barColorClass = currentCallerMode === 'top' ? 'bg-primary' : 'bg-danger';
        const countColorClass = currentCallerMode === 'top' ? 'text-primary' : 'text-danger';

        html += `
            <div class="caller-item">
                <div class="d-flex align-items-center justify-content-between mb-1">
                    <div class="d-flex align-items-center gap-2">
                        <span class="caller-rank ${rankClass}">${rank}</span>
                        <span class="fw-medium small text-dark me-1">${name}</span>
                    </div>
                    <span class="fw-bold small ${countColorClass}">${count} <span class="text-muted extra-small font-normal">ครั้ง</span></span>
                </div>
                <div class="caller-progress-bar">
                    <div class="caller-progress-fill ${barColorClass}" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function renderCampaignTable() {
    const tbody = document.getElementById('campaignTableBody');
    const infoEl = document.getElementById('tableInfoText');
    const paginationEl = document.getElementById('tablePagination');

    if (!tbody) return;

    const totalItems = currentTableData.length;
    if (totalItems === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4 small">ไม่พบข้อมูลแคมเปญ</td></tr>`;
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
        let createdFormatted = '-';
        if (row.created) {
            const d = new Date(row.created);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                createdFormatted = `${day}/${month}/${year}`;
            }
        }

        const objCode = (row.Objective_code || '').trim().toUpperCase();
        let objBadge = '<span class="text-muted">-</span>';
        if (objCode) {
            const badgeClass = `badge-objective-${objCode.toLowerCase()}`;
            objBadge = `<span class="badge ${badgeClass} px-2 py-1">${objCode}</span>`;
        }

        const totalCust = Number(row.totalCustomer || 0);
        const calledCust = Number(row.calledCustomer || 0);
        const successRate = totalCust > 0 ? ((calledCust / totalCust) * 100).toFixed(2) + '%' : '0.00%';

        const status = (row.activeStatus || '').trim();
        const isExpire = status.toLowerCase() === 'expire';
        const statusBadgeClass = isExpire ? 'badge-status-expire' : 'badge-status-active';
        const statusText = status || 'Active';

        rowsHtml += `
            <tr>
                <td class="text-secondary">${createdFormatted}</td>
                <td class="fw-medium text-dark">${row.product_name || '-'}</td>
                <td class="text-center">${objBadge}</td>
                <td class="text-muted extra-small">${row['startDate-endDate'] || '-'}</td>
                <td class="text-end fw-semibold">${totalCust.toLocaleString()}</td>
                <td class="text-end text-primary fw-bold">${calledCust.toLocaleString()}</td>
                <td class="text-end fw-bold text-success">${successRate}</td>
                <td class="text-center">
                    <span class="badge ${statusBadgeClass} px-2 py-1 rounded-pill">${statusText}</span>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;

    if (infoEl) {
        infoEl.innerText = `${endIndex} จาก ${totalItems} รายการ`;
    }

    if (paginationEl) {
        let pagHtml = '';
        pagHtml += `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage - 1})">ก่อนหน้า</a>
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
                <a class="page-link" href="javascript:void(0)" onclick="goToPage(${currentPage + 1})">ถัดไป</a>
            </li>
        `;
        paginationEl.innerHTML = pagHtml;
    }
}

function goToPage(page) {
    currentPage = page;
    renderCampaignTable();
}

function changePageSize(size) {
    pageSize = Number(size) || 10;
    currentPage = 1;
    renderCampaignTable();
}

function applyFilters() {
    if (!rawDashboardData || !rawDashboardData.table) return;

    const campaignSearch = (document.getElementById('filterCampaign')?.value || '').toLowerCase().trim();

    if (!campaignSearch) {
        currentTableData = rawDashboardData.table;
    } else {
        currentTableData = rawDashboardData.table.filter(item => 
            (item.product_name || '').toLowerCase().includes(campaignSearch) ||
            (item.Objective_code || '').toLowerCase().includes(campaignSearch)
        );
    }

    currentPage = 1;
    renderCampaignTable();
}

function resetFilters() {
    const campaignInput = document.getElementById('filterCampaign');
    if (campaignInput) campaignInput.value = '';
    const startDateInput = document.getElementById('filterStartDate');
    if (startDateInput) startDateInput.value = '';
    const endDateInput = document.getElementById('filterEndDate');
    if (endDateInput) endDateInput.value = '';

    if (rawDashboardData && rawDashboardData.table) {
        currentTableData = rawDashboardData.table;
        currentPage = 1;
        renderCampaignTable();
    }
}

function exportExcel() {
    if (!currentTableData || currentTableData.length === 0) {
        Swal.fire({
            icon: 'info',
            title: 'ไม่มีข้อมูล',
            text: 'ไม่มีข้อมูลสำหรับส่งออก Excel',
            confirmButtonText: 'ตกลง'
        });
        return;
    }

    let csv = '\uFEFF';
    csv += 'วันที่สร้าง,ชื่อแคมเปญ,วัตถุประสงค์,วันที่เริ่ม-สิ้นสุด,จำนวนลูกค้า,จำนวนที่ติดต่อ,สถานะแคมเปญ\n';

    currentTableData.forEach(row => {
        csv += `"${row.created || ''}","${row.product_name || ''}","${row.Objective_code || ''}","${row['startDate-endDate'] || ''}",${row.totalCustomer || 0},${row.calledCustomer || 0},"${row.activeStatus || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Prospect_Call_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

$(document).ready(async function () {
    if (typeof startLoading === 'function') {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    }
    try {
        const topCallers = document.getElementById('topCallers');
        const campaignTableCol = document.getElementById('campaignTableCol');
        const isEmployee = false;
        if (isEmployee) {
            if (topCallers) {
                topCallers.classList.add("d-none");
                topCallers.style.display = 'none';
            }
            if (campaignTableCol) {
                campaignTableCol.classList.remove('col-xl-8');
                campaignTableCol.classList.add('col-xl-12');
            }
        } else {
            if (topCallers) {
                topCallers.classList.remove("d-none");
                topCallers.style.display = '';
            }
            if (campaignTableCol) {
                campaignTableCol.classList.remove('col-xl-12');
                campaignTableCol.classList.add('col-xl-8');
            }
        }
        const data = await getDashboardCall();
        setDashboard(data);
    } catch (error) {
        console.error("Error in document ready:", error);
    } finally {
        if (typeof stopLoading === 'function') {
            stopLoading();
        }
    }
});
