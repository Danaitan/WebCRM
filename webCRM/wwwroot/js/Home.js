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

    const getItemName = (item) => (item.name || '').trim();
    const getItemCount = (item) => Number(item.count ?? 0);

    const companies = Object.keys(data);

    // ตรวจสอบบริษัทที่มีข้อมูล (มีรายการและผลรวมมากกว่า 0)
    const companiesWithData = companies.filter(comp => {
        const list = data[comp];
        return Array.isArray(list) && list.some(item => getItemCount(item) > 0);
    });

    // หากมีแค่บริษัทเดียวที่มีข้อมูล (หรือเลือกดูแค่ 1 บริษัท)
    if (companiesWithData.length === 1 || (companiesWithData.length === 0 && companies.length === 1)) {
        const targetCompany = companiesWithData.length === 1 ? companiesWithData[0] : companies[0];
        const rawList = Array.isArray(data[targetCompany]) ? data[targetCompany] : [];

        const validItems = [];
        rawList.forEach(item => {
            const name = getItemName(item);
            const count = getItemCount(item);
            if (name && count > 0) {
                validItems.push({ name, count });
            }
        });

        // เรียงลำดับจากจำนวนมากไปน้อย
        validItems.sort((a, b) => b.count - a.count);

        // ดึง 4 อันดับแรก และส่วนที่เหลือจัดเป็น "อื่นๆ"
        const top4 = validItems.slice(0, 4);
        const remaining = validItems.slice(4);

        let othersCount = 0;
        remaining.forEach(item => {
            othersCount += item.count;
        });

        const processedData = top4.map(item => ({
            name: item.name,
            count: item.count,
            isOthers: false
        }));

        if (remaining.length > 0 && othersCount > 0) {
            processedData.push({
                name: 'อื่นๆ',
                count: othersCount,
                isOthers: true,
                subItems: remaining
            });
        }

        const maxLabelLength = 10;
        const formatProductName = (name, max = maxLabelLength) => {
            if (!name) return '';
            return name.length > max ? name.slice(0, max) + '...' : name;
        };

        const labels = processedData.map(item => formatProductName(item.name));
        const values = processedData.map(item => item.count);

        const bgColors = processedData.map((_, index) => chartColors[index % chartColors.length]);
        const borderColors = bgColors.map(c => c.replace('0.75', '1'));

        productChartInstance = new Chart(ctx, {
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
                        callbacks: {
                            title: function (tooltipItems) {
                                if (!tooltipItems || !tooltipItems.length) return '';
                                const item = processedData[tooltipItems[0].dataIndex];
                                return item ? item.name : tooltipItems[0].label;
                            },
                            label: function (context) {
                                const item = processedData[context.dataIndex];
                                if (item && item.isOthers && Array.isArray(item.subItems) && item.subItems.length > 0) {
                                    const lines = [
                                        ` จำนวนรวม: ${Number(context.raw).toLocaleString()} ราย`,
                                        '',
                                        ' รายการในกลุ่มอื่นๆ:'
                                    ];
                                    item.subItems.forEach(sub => {
                                        lines.push(`   • ${sub.name}: ${Number(sub.count).toLocaleString()} ราย`);
                                    });
                                    return lines;
                                }
                                return ` จำนวน: ${Number(context.raw).toLocaleString()} ราย`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'ผลิตภัณฑ์',
                            font: { weight: 'bold', style: 'normal' }
                        },
                        ticks: {
                            autoSkip: false
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
        return;
    }

    // กรณีมีหลายบริษัทที่มีข้อมูล (ใช้กราฟ Stacked Bar แยกตามบริษัท)
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

function initOccupationChart(data) {
    const ctx = document.getElementById('occupationChart');
    if (!ctx) return;

    if (occupationChartInstance) {
        occupationChartInstance.destroy();
    }

    if (!Array.isArray(data) || data.length === 0) return;

    const isInvalidName = (name) => {
        if (!name) return true;
        const trimmed = name.trim();
        if (!trimmed) return true;
        if (trimmed === '-' || /^[-_\s]+$/.test(trimmed)) return true;
        if (trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'n/a') return true;
        if (trimmed === 'ไม่ระบุ') return true;
        return false;
    };

    // รวมจำนวนตามชื่ออาชีพ และกรองพวกที่ไม่มีชื่อออก (เช่น "" " " "-")
    const itemMap = new Map();
    data.forEach(item => {
        const name = (item.name || '').trim();
        const count = Number(item.count || 0);

        if (isInvalidName(name) || count <= 0) {
            return;
        }

        if (itemMap.has(name)) {
            itemMap.set(name, itemMap.get(name) + count);
        } else {
            itemMap.set(name, count);
        }
    });

    let rawOthersItem = null;
    const validItems = [];

    for (const [name, count] of itemMap.entries()) {
        if (name === 'อื่นๆ' || name === 'อื่น ๆ') {
            if (rawOthersItem) {
                rawOthersItem.count += count;
            } else {
                rawOthersItem = { name: 'อื่นๆ', count: count };
            }
        } else {
            validItems.push({ name, count });
        }
    }

    // เรียงลำดับตาม count จากมากไปน้อย
    validItems.sort((a, b) => b.count - a.count);

    // ดึง 6 อันดับแรก และส่วนที่เหลือรวมเข้ากลุ่ม "อื่นๆ"
    const maxTop = 6;
    let topItems = [];
    let remaining = [];

    if (!rawOthersItem && validItems.length <= 7) {
        topItems = validItems;
        remaining = [];
    } else {
        topItems = validItems.slice(0, maxTop);
        remaining = validItems.slice(maxTop);
    }

    const othersSubItems = [];
    if (rawOthersItem) {
        othersSubItems.push(rawOthersItem);
    }
    remaining.forEach(item => {
        othersSubItems.push(item);
    });

    othersSubItems.sort((a, b) => b.count - a.count);

    let othersCount = 0;
    othersSubItems.forEach(item => {
        othersCount += item.count;
    });

    const processedData = topItems.map(item => ({
        name: item.name,
        count: item.count,
        isOthers: false
    }));

    if (othersSubItems.length > 0 && othersCount > 0) {
        processedData.push({
            name: 'อื่นๆ',
            count: othersCount,
            isOthers: true,
            subItems: othersSubItems
        });
    }

    if (processedData.length === 0) return;

    const maxLabelLength = 10;
    const formatOccupationName = (name, max = maxLabelLength) => {
        if (!name) return '';
        return name.length > max ? name.slice(0, max) + '...' : name;
    };

    const labels = processedData.map(item => formatOccupationName(item.name));
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
                        title: function (tooltipItems) {
                            if (!tooltipItems || !tooltipItems.length) return '';
                            const item = processedData[tooltipItems[0].dataIndex];
                            return item ? item.name : tooltipItems[0].label;
                        },
                        label: function (context) {
                            const item = processedData[context.dataIndex];
                            if (item && item.isOthers && Array.isArray(item.subItems) && item.subItems.length > 0) {
                                const lines = [
                                    ` จำนวนรวม: ${Number(context.raw).toLocaleString()} ราย`,
                                    '',
                                    ' รายการในกลุ่มอื่นๆ:'
                                ];
                                item.subItems.forEach(sub => {
                                    lines.push(`   • ${sub.name}: ${Number(sub.count).toLocaleString()} ราย`);
                                });
                                return lines;
                            }
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
                    },
                    ticks: {
                        autoSkip: false
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
        const company = document.getElementById('dashboardCompany')?.value || '';
        const branch = document.getElementById('dashboardBranch')?.value || '';
        const cusType = document.getElementById('dashboardCustomerType')?.value || '';
        const gender = document.getElementById('dashboardGender')?.value || '';
        const contactStatus = document.getElementById('dashboardContactStatus')?.value || '';

        const params = new URLSearchParams();
        if (company) params.append('company', company);
        if (branch) params.append('branch', branch);
        if (cusType) params.append('cusType', cusType);
        if (gender) params.append('gender', gender);
        if (contactStatus) params.append('contactStatus', contactStatus);

        const queryString = params.toString();
        const url = '/Home/GetCustommerDashboard' + (queryString ? `?${queryString}` : '');

        const response = await fetch(url);
        if (!response.ok) {
            console.error("HTTP error fetching dashboard customer info:", response.status);
            renderEmptyDashboard();
            return;
        }
        const data = await response.json();
        console.log("data", data);

        if (!data || data.status === false) {
            console.error("Error fetching dashboard customer info:", data ? data.message : "No data received");
            renderEmptyDashboard();
            return;
        }

        if (data.companyCus) {
            window._lastCompanyCus = data.companyCus;
            const companyEl = document.getElementById('dashboardCompany');
            if (companyEl && companyEl.options.length <= 1) {
                await setFilterCompany(null, data.companyCus);
            }
            setDataDashboardCustomer(data);
        } else {
            setDataDashboardCustomer({ companyCus: [] });
        }
        if (data.graph) {
            if (data.graph.product) initProductChart(data.graph.product);
            if (data.graph.occupation) initOccupationChart(data.graph.occupation);
            if (data.graph.customerAge) initAgeChart(data.graph.customerAge);
        }

    } catch (error) {
        console.error("Error fetching dashboard customer info:", error);
        renderEmptyDashboard();
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
                            <span class="stat-unit">สัญญา</span>
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
    let optionsHtml = '<option value="">ทั้งหมด</option>';
    const seen = new Set();
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                const name = typeof item === 'object' ? String(item.name ?? item.value ?? '').trim() : String(item).trim();
                const value = typeof item === 'object' ? String(item.value ?? item.name ?? '').trim() : name;
                if (value && !seen.has(value)) {
                    seen.add(value);
                    optionsHtml += `<option value="${value}">${name}</option>`;
                }
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
        selectEl.value = currentValue;
    } else {
        selectEl.value = '';
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
        $(selectEl).val(selectEl.value).trigger('change.select2');
    }
}

async function setFilterGender(data) {
    const selectEl = document.getElementById('dashboardGender');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';
    let optionsHtml = '<option value="">ทั้งหมด</option>';
    const seen = new Set();
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                const name = typeof item === 'object' ? String(item.name ?? item.value ?? '').trim() : String(item).trim();
                const value = typeof item === 'object' ? String(item.value ?? item.name ?? '').trim() : name;
                if (value && !seen.has(value)) {
                    seen.add(value);
                    optionsHtml += `<option value="${value}">${name}</option>`;
                }
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
        selectEl.value = currentValue;
    } else {
        selectEl.value = '';
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
        $(selectEl).val(selectEl.value).trigger('change.select2');
    }
}

async function setFilterContractStatus(data) {
    const selectEl = document.getElementById('dashboardContactStatus');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';
    let optionsHtml = '<option value="">ทั้งหมด</option>';
    const seen = new Set();
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                const name = typeof item === 'object' ? String(item.name ?? item.value ?? '').trim() : String(item).trim();
                const value = typeof item === 'object' ? String(item.value ?? item.name ?? '').trim() : name;
                if (value && !seen.has(value)) {
                    seen.add(value);
                    optionsHtml += `<option value="${value}">${name}</option>`;
                }
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
        selectEl.value = currentValue;
    } else {
        selectEl.value = '';
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
        $(selectEl).val(selectEl.value).trigger('change.select2');
    }
}

function renderEmptyDashboard() {
    const statTotalEl = document.getElementById('statTotalCount');
    if (statTotalEl) statTotalEl.innerText = '0';
    const customerCardContainer = document.getElementById('customerCard');
    if (customerCardContainer) customerCardContainer.innerHTML = '';
    if (productChartInstance) {
        productChartInstance.destroy();
        productChartInstance = null;
    }
    if (occupationChartInstance) {
        occupationChartInstance.destroy();
        occupationChartInstance = null;
    }
    if (ageChartInstance) {
        ageChartInstance.destroy();
        ageChartInstance = null;
    }
}

function updateDependentDropdownsState() {
    const companyVal = ($('#dashboardCompany').val() || '').trim();
    const isCompanySelected = (companyVal !== '');

    const dependentSelectors = [
        '#dashboardBranch',
        '#dashboardCustomerType',
        '#dashboardGender',
        '#dashboardContactStatus'
    ];

    dependentSelectors.forEach(selector => {
        const $el = $(selector);
        if ($el.length) {
            $el.prop('disabled', !isCompanySelected);
            if (!isCompanySelected && $el.val() !== '') {
                $el.val('').trigger('change.select2');
            }
        }
    });
}

async function setFilterCompany(menuData, cusData) {
    const selectEl = document.getElementById('dashboardCompany');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';

    let list = [];
    if (Array.isArray(menuData) && menuData.length > 0) {
        list = menuData;
    } else if (Array.isArray(cusData) && cusData.length > 0) {
        list = cusData;
    }

    if (list.length === 0 && selectEl.options.length > 1) {
        return;
    }

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    const seen = new Set();
    list.forEach(item => {
        if (item) {
            const name = typeof item === 'object' ? String(item.name || item.company_name || item.companyName || item.value || '').trim() : String(item).trim();
            const value = typeof item === 'object' ? String(item.value ?? item.name ?? item.company_name ?? item.companyName ?? '').trim() : name;
            if (value && !seen.has(value)) {
                seen.add(value);
                optionsHtml += `<option value="${value}">${name}</option>`;
            }
        }
    });

    if (seen.size === 0 && selectEl.options.length > 1) {
        return;
    }

    selectEl.innerHTML = optionsHtml;
    if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
        selectEl.value = currentValue;
    } else {
        selectEl.value = '';
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
        $(selectEl).val(selectEl.value).trigger('change.select2');
    }
}

async function setFilterBranch(data) {
    const selectEl = document.getElementById('dashboardBranch');
    if (!selectEl) return;

    const currentValue = selectEl.value || '';

    let optionsHtml = '<option value="">ทั้งหมด</option>';
    const seen = new Set();
    if (Array.isArray(data)) {
        data.forEach(item => {
            if (item) {
                const name = typeof item === 'object' ? String(item.name || item.branch_name || item.value || '').trim() : String(item).trim();
                const value = typeof item === 'object' ? String(item.value ?? item.name ?? item.branch_name ?? '').trim() : name;
                if (value && !seen.has(value)) {
                    seen.add(value);
                    optionsHtml += `<option value="${value}">${name}</option>`;
                }
            }
        });
    }
    selectEl.innerHTML = optionsHtml;
    if (currentValue && $(selectEl).find(`option[value="${currentValue}"]`).length > 0) {
        selectEl.value = currentValue;
    } else {
        selectEl.value = '';
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
        $(selectEl).val(selectEl.value).trigger('change.select2');
    }
}

function setDropdownsLoadingState() {
    const dependentSelectors = [
        '#dashboardBranch',
        '#dashboardCustomerType',
        '#dashboardGender',
        '#dashboardContactStatus'
    ];

    dependentSelectors.forEach(selector => {
        const $el = $(selector);
        if ($el.length) {
            $el.html('<option value="">กำลังโหลด...</option>');
            $el.prop('disabled', true);
            if (typeof $.fn !== 'undefined' && $.fn.select2) {
                $el.val('').trigger('change.select2');
            }
        }
    });
}

async function loadDashboardDropdowns(company = '') {
    try {
        const params = new URLSearchParams();
        if (company) params.append('company', company);
        const queryString = params.toString();
        const url = '/Home/GetCustommerDashboardDropdown' + (queryString ? `?${queryString}` : '');

        const response = await fetch(url, { skipLoading: true });
        if (!response.ok) {
            console.error("HTTP error fetching dashboard dropdown:", response.status);
            updateDependentDropdownsState();
            return;
        }
        const data = await response.json();
        console.log("GetCustommerDashboardDropdown data:", data);

        if (!data || data.status === false) {
            console.error("Error in dropdown data:", data ? data.message : "No data received");
            updateDependentDropdownsState();
            return;
        }

        if (!company) {
            await setFilterCompany(data.companyMenu, window._lastCompanyCus || null);
        }
        await setFilterBranch(data.branchMenu);
        await setFilterCustType(data.custypMenu);
        await setFilterGender(data.genderMenu);
        await setFilterContractStatus(data.contractStatusMenu);
        updateDependentDropdownsState();
    } catch (error) {
        console.error("Error loading dashboard dropdowns:", error);
        updateDependentDropdownsState();
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

    $('#dashboardCompany').on('change', async function () {
        const companyVal = ($(this).val() || '').trim();
        const isSelected = (companyVal !== '');

        if (isSelected) {
            setDropdownsLoadingState();
            await loadDashboardDropdowns(companyVal);
        } else {
            $('#dashboardBranch, #dashboardCustomerType, #dashboardGender, #dashboardContactStatus').val('').trigger('change.select2');
            updateDependentDropdownsState();
            await loadDashboardDropdowns('');
        }
    });

    updateDependentDropdownsState();

    startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
    try {
        await loadDashboardDropdowns();
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
            $('.select2-filter').val('').trigger('change.select2');
        } else {
            $('#dashboardCompany').val('');
            $('#dashboardBranch').val('');
            $('#dashboardCustomerType').val('');
            $('#dashboardGender').val('');
            $('#dashboardContactStatus').val('');
        }
        updateDependentDropdownsState();

        startLoading('กำลังโหลดข้อมูล...', 'กรุณารอสักครู่');
        try {
            await loadDashboardDropdowns('');
            await getDashboardCustomerInfo();
        } catch (error) {
            console.error("Error clearing dashboard filters:", error);
        } finally {
            stopLoading();
        }
    });

    // Auto-resize charts when container dimensions change (e.g. sidebar toggle)
    if (typeof ResizeObserver !== 'undefined') {
        const graphContainer = document.querySelector('.customer-graph');
        if (graphContainer) {
            const resizeObserver = new ResizeObserver(() => {
                if (productChartInstance) productChartInstance.resize();
                if (occupationChartInstance) occupationChartInstance.resize();
                if (ageChartInstance) ageChartInstance.resize();
            });
            resizeObserver.observe(graphContainer);
        }
    }

    window.addEventListener('resize', () => {
        if (productChartInstance) productChartInstance.resize();
        if (occupationChartInstance) occupationChartInstance.resize();
        if (ageChartInstance) ageChartInstance.resize();
    });
});