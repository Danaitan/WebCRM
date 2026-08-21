let masterData = [];
let productChartInstance = null;
let occupationChartInstance = null;
let ageChartInstance = null;

if (window.Chart) {
    Chart.defaults.font.family = "'Prompt', sans-serif";
    Chart.defaults.color = "#475569";
    Chart.defaults.plugins.tooltip.backgroundColor = "#ffffff";
    Chart.defaults.plugins.tooltip.titleColor = "#1e293b";
    Chart.defaults.plugins.tooltip.bodyColor = "#334155";
    Chart.defaults.plugins.tooltip.footerColor = "#0f172a";
    Chart.defaults.plugins.tooltip.borderColor = "#cbd5e1";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
}

const chartColors = [
    'rgba(54, 162, 235, 0.75)',
    'rgba(255, 99, 132, 0.75)',
    'rgba(75, 192, 192, 0.75)',
    'rgba(255, 206, 86, 0.75)',
    'rgba(153, 102, 255, 0.75)',
    'rgba(255, 159, 64, 0.75)',
    'rgba(46, 204, 113, 0.75)',
    'rgba(155, 89, 182, 0.75)',
    'rgba(52, 152, 219, 0.75)',
    'rgba(241, 196, 15, 0.75)',
    'rgba(230, 126, 34, 0.75)',
    'rgba(231, 76, 60, 0.75)',
    'rgba(52, 73, 94, 0.75)',
    'rgba(26, 188, 156, 0.75)'
];

function initProductChart(data) {
    const ctx = document.getElementById('productChart');
    if (!ctx) return;

    if (productChartInstance) {
        productChartInstance.destroy();
    }

    if (!data || typeof data !== 'object') return;

    const getItemName = (item) => (item.name).trim();
    const getItemCount = (item) => Number(item.count ?? 0);

    const companies = Object.keys(data);

    const productSet = new Set();
    companies.forEach(comp => {
        const list = data[comp];
        if (Array.isArray(list)) {
            list.forEach(item => {
                const name = getItemName(item);
                if (name && getItemCount(item) > 0) {
                    productSet.add(name);
                }
            });
        }
    });
    const products = Array.from(productSet);

    const datasets = products.map((prodName, index) => {
        const color = chartColors[index % chartColors.length];
        const borderColor = color.replace('0.75', '1');

        return {
            label: prodName,
            data: companies.map(comp => {
                const list = data[comp] || [];
                const item = list.find(i => getItemName(i) === prodName);
                return item ? getItemCount(item) : 0;
            }),
            backgroundColor: color,
            borderColor: borderColor,
            borderWidth: 1
        };
    });

    productChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: companies,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'การแบ่งตามประเภทผลิตภัณฑ์',
                    color: '#000000ff',
                    align: 'left',
                    font: {
                        family: "'Prompt', sans-serif",
                        size: 18,
                        weight: '700',
                        style: 'normal'
                    },
                    padding: {
                        top: 5,
                        bottom: 15
                    }
                },
                legend: false,
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1e293b',
                    bodyColor: '#334155',
                    footerColor: '#0f172a',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    mode: 'index',
                    intersect: false,
                    filter: function(tooltipItem) {
                        return Number(tooltipItem.raw) > 0;
                    },
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()} ราย`;
                        },
                        footer: function(tooltipItems) {
                            let total = 0;
                            tooltipItems.forEach(function(item) {
                                total += Number(item.raw);
                            });
                            return `รวมทั้งหมด: ${total.toLocaleString()} ราย`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    title: {
                        display: true,
                        text: 'บริษัท',
                        font: { weight: 'bold', style: 'normal' }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวน (ราย)',
                        font: { weight: 'bold', style: 'normal' }
                    },
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function initOccupationChart(data) {
    const ctx = document.getElementById('occupationChart');
    if (!ctx) return;

    if (occupationChartInstance) {
        occupationChartInstance.destroy();
    }

    if (!Array.isArray(data) || data.length === 0) return;

    let othersCount = 0;
    const validItems = [];

    data.forEach(item => {
        const name = (item.name || '').trim();
        const count = Number(item.count || 0);

        if (!name || name === 'ไม่ระบุ' || name === 'อื่นๆ') {
            othersCount += count;
        } else {
            validItems.push({ name, count });
        }
    });

    // เรียงลำดับตาม count จากมากไปน้อย
    validItems.sort((a, b) => b.count - a.count);

    // ดึง 7 อันแรก และส่วนที่เหลือรวมเข้ากลุ่ม "อื่นๆ"
    const top7 = validItems.slice(0, 6);
    const remaining = validItems.slice(6);

    remaining.forEach(item => {
        othersCount += item.count;
    });

    const processedData = [...top7];

    // รวม "ไม่ระบุ" และส่วนที่เหลือเข้ากลุ่ม "อื่นๆ" ไว้ท้ายสุด
    if (othersCount > 0) {
        processedData.push({
            name: 'อื่นๆ',
            count: othersCount
        });
    }

    const labels = processedData.map(item => item.name);
    const values = processedData.map(item => item.count);

    const bgColors = processedData.map((_, index) => chartColors[index % chartColors.length]);
    const borderColors = bgColors.map(c => c.replace('0.75', '1'));

    occupationChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนลูกค้า (ราย)',
                data: values,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'การแบ่งตามอาชีพ',
                    color: '#1f3b60',
                    align: 'left',
                    font: {
                        family: "'Prompt', sans-serif",
                        size: 18,
                        weight: '700',
                        style: 'normal'
                    },
                    padding: {
                        top: 5,
                        bottom: 15
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1e293b',
                    bodyColor: '#334155',
                    footerColor: '#0f172a',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            return ` จำนวน: ${Number(context.raw).toLocaleString()} ราย`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'อาชีพ',
                        font: { weight: 'bold', style: 'normal' }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวน (ราย)',
                        font: { weight: 'bold', style: 'normal' }
                    },
                    ticks: {
                        precision: 0,
                        callback: function (value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

function initAgeChart(data) {
    const ctx = document.getElementById('ageChart');
    if (!ctx) return;

    if (ageChartInstance) {
        ageChartInstance.destroy();
    }

    if (!Array.isArray(data) || data.length === 0) return;

    const validItems = [];

    data.forEach(item => {
        const name = (item.name || '').trim();
        const count = Number(item.count || 0);
        validItems.push({ name, count });
    });

    const processedData = [...validItems];

    const labels = processedData.map(item => item.name);
    const values = processedData.map(item => item.count);

    const bgColors = processedData.map((_, index) => chartColors[index % chartColors.length]);
    const borderColors = bgColors.map(c => c.replace('0.75', '1'));

    ageChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'จำนวนลูกค้า (ราย)',
                data: values,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'การแบ่งตามช่วงอายุ',
                    color: '#1f3b60',
                    align: 'left',
                    font: {
                        family: "'Prompt', sans-serif",
                        size: 18,
                        weight: '700',
                        style: 'normal'
                    },
                    padding: {
                        top: 5,
                        bottom: 15
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#1e293b',
                    bodyColor: '#334155',
                    footerColor: '#0f172a',
                    borderColor: '#cbd5e1',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            return ` จำนวน: ${Number(context.raw).toLocaleString()} ราย`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'ช่วงอายุ',
                        font: { weight: 'bold', style: 'normal' }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'จำนวน (ราย)',
                        font: { weight: 'bold', style: 'normal' }
                    },
                    ticks: {
                        precision: 0,
                        callback: function (value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });
}

async function getDashboardCustomerInfo() {
    try {
        const branch = document.getElementById('dashboardBranch')?.value || '';
        const cusType = document.getElementById('dashboardCustomerType')?.value || '';
        const gender = document.getElementById('dashboardGender')?.value || '';
        const contactStatus = document.getElementById('dashboardContactStatus')?.value || '';

        const params = new URLSearchParams();
        if (branch) params.append('branch', branch);
        if (cusType) params.append('cusType', cusType);
        if (gender) params.append('gender', gender);
        if (contactStatus) params.append('contactStatus', contactStatus);

        const queryString = params.toString();
        const url = '/Home/GetCustommerDashboard' + (queryString ? `?${queryString}` : '');

        const response = await fetch(url);
        if (!response.ok) {
            console.error("HTTP error fetching dashboard customer info:", response.status);
            return;
        }
        const data = await response.json();
        const branchResponse = await fetch('/Home/getBranchListForCRM');
        const branchData = await branchResponse.json();
        await setFilterCustType(data.custypMenu);
        await setFilterGender(data.genderMenu);
        await setFilterContractStatus(data.contractStatusMenu);
        await setFilterBranch(branchData)
        if (!data || data.status === false) {
            console.error("Error fetching dashboard customer info:", data ? data.message : "No data received");
            return;
        }
        if (data.companyCus) {
            setDataDashboardCustomer(data);
        }
        if (data.graph) {
            if (data.graph.product) initProductChart(data.graph.product);
            if (data.graph.occupation) initOccupationChart(data.graph.occupation);
            if (data.graph.customerAge) initAgeChart(data.graph.customerAge);
        }

    } catch (error) {
        console.error("Error fetching dashboard customer info:", error);
    }
}

async function setDataDashboardCustomer(data) {
    if (!data || !Array.isArray(data.companyCus)) return;
    const customerTotal = data.companyCus.map(item => item.count).reduce((a, b) => a + b, 0);
    const customerList = data.companyCus;
    const statTotalEl = document.getElementById('statTotalCount');
    if (statTotalEl) {
        statTotalEl.innerText = customerTotal.toLocaleString();
    }
    const cardColor = ['card-green', 'card-orange', 'card-purple'];
    const customerCardContainer = document.getElementById('customerCard');
    if (customerCardContainer) {
        customerCardContainer.innerHTML = '';
        customerList.forEach((item, index) => {
            const customerPercent = customerTotal > 0 ? (item.count / customerTotal * 100).toFixed(2) : '0.00';
            const div = document.createElement('div');
            div.className = 'customer-stat-card ' + cardColor[index % cardColor.length];
            div.innerHTML = `
                <div class="stat-card-main">
                    <div class="stat-icon-wrapper">
                        <i class="bi bi-building-fill"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-title">${item.name}</div>
                        <div class="stat-value-group">
                            <span class="stat-value">${item.count.toLocaleString()}</span>
                            <span class="stat-unit">ราย</span>
                        </div>
                    </div>
                </div>
                <div class="stat-card-footer">
                    <span>คิดเป็น <strong>${customerPercent}%</strong> ของทั้งหมด</span>
                </div>
            `;
            customerCardContainer.appendChild(div);
        });
    }
}

async function setFilterCustType(data) {
    const selectEl = document.getElementById('dashboardCustomerType');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';

    if (selectEl.options.length > 1) {
        if (currentValue) selectEl.value = currentValue;
        return;
    }

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item && item.name) {
                optionsHtml += `<option value="${item.name}">${item.name}</option>`;
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue) {
        selectEl.value = currentValue;
    }
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
        if (currentValue) {
            $(selectEl).val(currentValue).trigger('change');
        }
    }
}

async function setFilterGender(data) {
    const selectEl = document.getElementById('dashboardGender');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';

    if (selectEl.options.length > 1) {
        if (currentValue) selectEl.value = currentValue;
        return;
    }

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item && item.name) {
                optionsHtml += `<option value="${item.name}">${item.name}</option>`;
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue) {
        selectEl.value = currentValue;
    }
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
        if (currentValue) {
            $(selectEl).val(currentValue).trigger('change');
        }
    }
}

async function setFilterContractStatus(data) {
    const selectEl = document.getElementById('dashboardContactStatus');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';

    if (selectEl.options.length > 1) {
        if (currentValue) selectEl.value = currentValue;
        return;
    }

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item && item.name) {
                optionsHtml += `<option value="${item.name}">${item.name}</option>`;
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue) {
        selectEl.value = currentValue;
    }
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
        if (currentValue) {
            $(selectEl).val(currentValue).trigger('change');
        }
    }
}

async function setFilterBranch(data) {
    const selectEl = document.getElementById('dashboardBranch');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';

    if (selectEl.options.length > 1) {
        if (currentValue) selectEl.value = currentValue;
        return;
    }

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                const code = String(item.offcde || '').trim();
                const name = item.branch_name;
                optionsHtml += `<option value="${name}">${name}</option>`;
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue) {
        selectEl.value = currentValue;
    }
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
        if (currentValue) {
            $(selectEl).val(currentValue).trigger('change');
        }
    }
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

    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        await getDashboardCustomerInfo();
    } catch (error) {
        console.error("Error in document ready:", error);
    } finally {
        stopLoading();
    }

    $('#dashboardSearch').on('click', async function () {
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
        try {
            await getDashboardCustomerInfo();
        } catch (error) {
            console.error("Error searching dashboard customer info:", error);
        } finally {
            stopLoading();
        }
    });

    $('#dashboardClear').on('click', async function () {
        if (typeof $.fn !== 'undefined' && $.fn.select2) {
            $('.select2-filter').val('').trigger('change');
        } else {
            $('#dashboardBranch').val('');
            $('#dashboardCustomerType').val('');
            $('#dashboardGender').val('');
            $('#dashboardContactStatus').val('');
        }
        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
        try {
            await getDashboardCustomerInfo();
        } catch (error) {
            console.error("Error clearing dashboard filters:", error);
        } finally {
            stopLoading();
        }
    });
});

$("#dashboardSearch").off("click").on("click", async function () {
    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        await getDashboardCustomerInfo();
    } catch (error) {
        console.error("Error searching dashboard customer info:", error);
    } finally {
        stopLoading();
    }
});