let socket;

async function deleteNoti(id) {

        if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบการแจ้งเตือนนี้ใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ลบรายการ',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'rounded-4 shadow-lg'
            }
        });
        if (!result.isConfirmed) return;
    }

    try {
    const response = await fetch(`/Layout/DeleteNotification`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
        })
    });
    if (!response.ok) return {};
    const data = await response.json();
        fetchNotifications();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'ลบการแจ้งเตือนนี้เรียบร้อย',
                showConfirmButton: false,
                timer: 2500,
                timerProgressBar: true
            });
        }
        return data || {};
    } catch (err) {
        console.error("Error deleting read notifications:", err);
    }

}

async function deleteReadNotifications() {
    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ',
            text: 'คุณต้องการลบการแจ้งเตือนที่อ่านแล้วทั้งหมดใช่หรือไม่?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ลบรายการ',
            cancelButtonText: 'ยกเลิก',
            customClass: {
                popup: 'rounded-4 shadow-lg'
            }
        });
        if (!result.isConfirmed) return;
    }

    try {
        const response = await fetch(`/Layout/DeleteNotification`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                isReaded: true
            })
        });
        if (!response.ok) return {};
        const data = await response.json();
        fetchNotifications();
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'ลบการแจ้งเตือนที่อ่านแล้วเรียบร้อย',
                showConfirmButton: false,
                timer: 2500,
                timerProgressBar: true
            });
        }
        return data || {};
    } catch (err) {
        console.error("Error deleting read notifications:", err);
    }
}

async function isReadNoti(id) {
    const response = await fetch(`/Layout/UpdateNotification`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id: id,
            is_read: true
        })
    });
    if (!response.ok) return {};
    const data = await response.json();
    return data || {};
}

async function getNotiDetail(id) {
    const params = new URLSearchParams({ overall: 'false', Id: id });
    const response = await fetch(`/Layout/GetNotification?${params.toString()}`);
    if (!response.ok) return {};
    const data = await response.json();
    return data || {};
}

function fetchNotifications() {
    $.ajax({
        url: '/Layout/GetNotification?isOverall=true',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            renderNotifications(response);
        },
        error: function (err) {
            console.error("Error fetching notifications from /Layout/GetNotification:", err);
        }
    });
}

function formatNotiDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const isUtc = typeof dateStr === 'string' && dateStr.toUpperCase().includes('Z');
            const year = isUtc ? d.getUTCFullYear() : d.getFullYear();
            const month = String((isUtc ? d.getUTCMonth() : d.getMonth()) + 1).padStart(2, '0');
            const day = String(isUtc ? d.getUTCDate() : d.getDate()).padStart(2, '0');
            const hours = String(isUtc ? d.getUTCHours() : d.getHours()).padStart(2, '0');
            const mins = String(isUtc ? d.getUTCMinutes() : d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${mins}`;
        }
    } catch (e) { }
    return String(dateStr).replace('T', ' ').replace('.000Z', '').slice(0, 16);
}

function getItemInfo(t, groupSender, groupEndDate, groupIsRead) {
    let titleText = '';
    let itemEndDate = groupEndDate || '';
    let itemSender = groupSender || '';
    let itemId = null;
    let itemIsRead = (groupIsRead === true || groupIsRead === 1 || groupIsRead === 'true');

    if (t && typeof t === 'object') {
        titleText = t.title || '';
        if (t.end_date) itemEndDate = t.end_date;
        if (t.sender) itemSender = t.sender;
        if (t.Id !== undefined) itemId = t.Id;
        if (t.is_read !== undefined) itemIsRead = (t.is_read === true);
    } else {
        titleText = String(t || '');
    }

    return {
        id: itemId,
        title: titleText,
        sender: itemSender ? String(itemSender) : '',
        endDate: formatNotiDate(itemEndDate),
        isRead: itemIsRead
    };
}

function renderNotiDetailPlaceholder() {
    const detailContainer = $('#allNotificationsModalDetail');
    if (detailContainer.length) {
        detailContainer.html(`
            <div class="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4 text-muted" style="min-height: 400px;">
                <div class="bg-light rounded-circle p-4 mb-3 shadow-sm border">
                    <i class="bi bi-card-text display-5 text-primary opacity-75"></i>
                </div>
                <h6 class="fw-bold text-dark mb-1">รายละเอียดการแจ้งเตือน</h6>
                <p class="small text-muted mb-0">กรุณาเลือกรายการการแจ้งเตือนจากฝั่งซ้าย<br>เพื่อดูรายละเอียดข้อมูลอย่างครบถ้วน</p>
            </div>
        `);
    }
}

async function selectModalNotiItem(element, id) {
    $('.modal-noti-item').removeClass('active-noti-item bg-primary bg-opacity-10 border-start border-primary border-4 shadow-sm');
    $('.modal-noti-item').css('background-color', '#fff');

    if (element) {
        $(element).addClass('active-noti-item bg-primary bg-opacity-10 border-start border-primary border-4 shadow-sm');
        $(element).css('background-color', '');
        $(element).find('.bi-info-circle-fill').closest('.rounded-circle').remove();
    }

    const detailContainer = $('#allNotificationsModalDetail');
    if (!detailContainer.length) return;

    detailContainer.html(`
        <div class="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4" style="min-height: 400px;">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 2.5rem; height: 2.5rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="text-secondary fw-medium">กำลังโหลดรายละเอียดการแจ้งเตือน...</div>
        </div>
    `);

    try {
        await isReadNoti(id);
        const responseData = await getNotiDetail(id);
        let data = responseData;
        if (Array.isArray(responseData) && responseData.length > 0) {
            data = responseData[0];
        } else if (responseData && responseData.data) {
            data = Array.isArray(responseData.data) ? responseData.data[0] : responseData.data;
        } else if (responseData && responseData.response) {
            data = Array.isArray(responseData.response) ? responseData.response[0] : responseData.response;
        }

        renderNotiDetailContent(data);
    } catch (err) {
        console.error("Error in getNotiDetail:", err);
        detailContainer.html(`
            <div class="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4">
                <div class="alert alert-danger border-0 shadow-sm rounded-3 p-3">
                    <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i> เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียด
                </div>
            </div>
        `);
    }
}

function renderNotiDetailContent(data) {
    const detailContainer = $('#allNotificationsModalDetail');
    if (!detailContainer.length) return;

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        detailContainer.html(`
            <div class="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4 text-muted">
                <i class="bi bi-inbox display-4 mb-2 opacity-25"></i>
                <p class="mb-0 fw-medium">ไม่พบรายละเอียดสำหรับการแจ้งเตือนนี้</p>
            </div>
        `);
        return;
    }

    const header = data.header || data.Header || 'การแจ้งเตือน';
    const title = data.title || data.Title || '-';
    const message = data.message || data.Message || data.detail || data.Detail || '-';
    const notiId = data.Id !== undefined ? data.Id : (data.id !== undefined ? data.id : '-');
    const sender = data.sender !== null && data.sender !== undefined ? data.sender : '-';
    const receiver = data.receiver !== null && data.receiver !== undefined ? data.receiver : '-';
    const createBy = data.create_by !== null && data.create_by !== undefined ? data.create_by : (data.createBy || '-');

    const startDateFormatted = formatNotiDate(data.start_date || data.startDate);
    const endDateFormatted = formatNotiDate(data.end_date || data.endDate);
    const createDateFormatted = formatNotiDate(data.create_date || data.createDate);

    const html = `
        <div class="noti-detail-wrapper">
            <!-- Topic & Header Bar -->
            <div class="d-flex align-items-center justify-content-between pb-3 mb-3 border-bottom flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-primary px-3 py-2 fs-6 rounded-pill">
                        <i class="bi bi-bookmark-fill me-1"></i>${header}
                    </span>
                </div>

                <div>
                    <button class="btn btn-outline-danger btn-sm rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-sm" onclick="deleteNoti('${notiId}')">
                        <i class="bi bi-trash3-fill"></i>
                        <span>ลบ</span>
                    </button>
                </div>

            </div>

            <!-- Title & Message Card -->
            <div class="mb-4">
                <h5 class="fw-bold text-dark mb-3" style="line-height: 1.4;">${title}</h5>
                <div class="p-3 bg-light rounded-3 border" style="background-color: #f8fafc !important;">
                    <div class="text-secondary small fw-semibold mb-2">
                        <i class="bi bi-chat-left-text me-1 text-primary"></i> รายละเอียดข้อความ:
                    </div>
                    <div class="text-dark" style="white-space: pre-wrap; line-height: 1.6; font-size: 0.95rem;">${message}</div>
                </div>
            </div>

            <!-- Metadata Info Grid -->
            <div class="card border-0 bg-light rounded-3 p-3 mb-3">
                <h6 class="fw-semibold text-secondary mb-3 small text-uppercase" style="letter-spacing: 0.5px;">
                    <i class="bi bi-info-circle me-1"></i> ข้อมูลผู้ส่งและผู้รับ
                </h6>
                <div class="row g-3">
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้ส่ง (Sender)</div>
                        <div class="fw-semibold text-dark">${sender}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้รับ (Receiver)</div>
                        <div class="fw-semibold text-dark">${receiver}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้สร้าง (Create By)</div>
                        <div class="fw-semibold text-dark">${createBy}</div>
                    </div>
                </div>
            </div>

            <!-- Date Timeline Grid -->
            <div class="card border-0 bg-light rounded-3 p-3">
                <h6 class="fw-semibold text-secondary mb-3 small text-uppercase" style="letter-spacing: 0.5px;">
                    <i class="bi bi-calendar3 me-1"></i> ข้อมูลวันที่และเวลา
                </h6>
                <div class="row g-3">
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">วันที่เริ่ม (Start Date)</div>
                        <div class="fw-medium text-dark small">${startDateFormatted || '-'}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">วันที่สิ้นสุด (End Date)</div>
                        <div class="fw-medium text-dark small">${endDateFormatted || '-'}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">วันที่สร้าง (Create Date)</div>
                        <div class="fw-medium text-dark small">${createDateFormatted || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    detailContainer.html(html);
}

function renderNotifications(data) {
    const notiBadge = $('#notificationBadge');
    const notiHeaderCount = $('#notificationHeaderCount');
    const notiListContainer = $('#notificationList');
    const allNotiModalBody = $('#allNotificationsModalBody');

    // Reset or keep placeholder for detail view
    renderNotiDetailPlaceholder();

    // เก็บ ID ของรายการที่เปิด/ขยาย (open collapse) อยู่ก่อน re-render เพื่อไม่ให้หุบเองเมื่อมีข้อมูลใหม่เข้ามา
    const openDropdownIds = new Set();
    notiListContainer.find('.collapse.show').each(function () {
        if (this.id) openDropdownIds.add(this.id);
    });

    const openModalIds = new Set();
    allNotiModalBody.find('.collapse.show').each(function () {
        if (this.id) openModalIds.add(this.id);
    });

    let totalCount = 0;
    let groups = [];

    if (data && typeof data === 'object') {
        if (typeof data.totalCount === 'number') {
            totalCount = data.totalCount;
        }

        let rawList = data.response || data.data || data.result || data.notifications;
        if (Array.isArray(rawList)) {
            groups = rawList;
        } else if (Array.isArray(data)) {
            groups = data;
        }
    } else if (Array.isArray(data)) {
        groups = data;
    }

    if (totalCount === 0 && groups.length > 0) {
        groups.forEach(g => {
            if (g.count !== undefined && g.count !== null) {
                totalCount += Number(g.count) || 0;
            } else if (Array.isArray(g.title)) {
                totalCount += g.title.length;
            } else {
                totalCount += 1;
            }
        });
    }

    if (totalCount > 0) {
        notiBadge.text(totalCount > 99 ? '99+' : totalCount).show();
        notiHeaderCount.text(totalCount);
    } else {
        notiBadge.hide();
        notiHeaderCount.text('0');
    }

    notiListContainer.empty();
    allNotiModalBody.empty();
    if (groups.length > 0) {
        groups.forEach((group, index) => {
            const headerText = group.header || '';
            const groupCount = group.count || 0;
            const collapseId = `notiCollapse_${index}`;
            const modalCollapseId = `modalNotiCollapse_${index}`;
            const groupEndDate = group.end_date || '';
            const groupSender = group.sender || '';

            const isDropdownExpanded = openDropdownIds.has(collapseId);
            const isModalExpanded = openModalIds.has(modalCollapseId);

            let titles = [];
            if (Array.isArray(group.title)) {
                titles = group.title;
            } else if (group.title) {
                titles = [group.title];
            } else {
                titles = [headerText];
            }

            let dropdownTitlesHtml = '';
            titles.forEach((t) => {
                const info = getItemInfo(t, groupSender, groupEndDate, group.is_read || group.isRead);
                dropdownTitlesHtml += `
                    <div class="px-3 py-2 border-bottom bg-white d-flex align-items-start gap-2 position-relative" 
                         style="transition: background-color 0.2s; padding-left: 1.5rem !important;" 
                         onmouseover="this.style.backgroundColor='#f8fafc'" 
                         onmouseout="this.style.backgroundColor='#fff'">
                        ${!info.isRead ? `<i class="bi bi-circle-fill text-primary flex-shrink-0" style="font-size: 0.35rem; margin-top: 0.45rem;"></i>` : ''}
                        <div class="flex-grow-1 min-w-0">
                            <div class="text-dark fw-medium" style="font-size: 0.85rem; line-height: 1.4;">${info.title}</div>
                            ${(info.sender || info.endDate) ? `
                                <div class="d-flex flex-wrap align-items-center gap-2 mt-1 text-muted" style="font-size: 0.75rem;">
                                    ${info.sender ? `<span>ผู้ส่ง: ${info.sender}</span>` : ''}
                                    ${(info.sender && info.endDate) ? `<span class="opacity-50">•</span>` : ''}
                                    ${info.endDate ? `<span>วันหมดอายุ: ${info.endDate}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            const groupDropdownHtml = `
                <div class="notification-group border-bottom">
                    <!-- หัวข้อใหญ่ (Header) สามารถกดเพื่อยุบ/ขยายได้ -->
                    <div class="px-3 py-2 border-bottom d-flex justify-content-between align-items-center" 
                         style="background-color: #eef2ff; cursor: pointer; user-select: none;"
                         data-bs-toggle="collapse" 
                         data-bs-target="#${collapseId}" 
                         aria-expanded="${isDropdownExpanded ? 'true' : 'false'}" 
                         aria-controls="${collapseId}">
                        <span class="fw-bold text-dark" style="font-size: 0.875rem;">
                            <i class="bi bi-bell-fill text-primary me-2"></i>${headerText}
                        </span>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary rounded-pill px-2 py-1" style="font-size: 0.75rem;">${groupCount}</span>
                            <i class="bi bi-chevron-down text-secondary" style="font-size: 0.75rem;"></i>
                        </div>
                    </div>
                    <!-- รายการที่ยุบ/ขยาย -->
                    <div class="collapse ${isDropdownExpanded ? 'show' : ''}" id="${collapseId}">
                        ${dropdownTitlesHtml}
                    </div>
                </div>
            `;
            notiListContainer.append(groupDropdownHtml);

            let modalTitlesHtml = '';
            titles.forEach((t) => {
                const info = getItemInfo(t, groupSender, groupEndDate, group.is_read);
                const itemNotiId = info.id || '';

                modalTitlesHtml += `
                    <div class="p-3 border-bottom bg-white d-flex align-items-start gap-3 modal-noti-item position-relative" 
                         style="cursor: pointer; transition: all 0.2s ease;" 
                         data-noti-id="${itemNotiId}"
                         onclick="selectModalNotiItem(this, '${itemNotiId}')"
                         onmouseover="if(!this.classList.contains('active-noti-item')) this.style.backgroundColor='#f1f5f9'" 
                         onmouseout="if(!this.classList.contains('active-noti-item')) this.style.backgroundColor='#fff'">
                        ${!info.isRead ? `
                            <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1" style="width: 38px; height: 38px;">
                                <i class="bi bi-info-circle-fill"></i>
                            </div>
                        ` : ''}
                        <div class="flex-grow-1 min-w-0">
                            <div class="fw-semibold text-dark mb-1" style="font-size: 0.925rem;">${info.title}</div>
                            ${(info.sender || info.endDate) ? `
                                <div class="d-flex flex-wrap align-items-center gap-3 text-secondary" style="font-size: 0.8rem;">
                                    ${info.sender ? `<span>ผู้ส่ง: <strong>${info.sender}</strong></span>` : ''}
                                    ${info.endDate ? `<span>วันหมดอายุ: <strong>${info.endDate}</strong></span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            });

            const groupModalHtml = `
                <div class="card border-0 mb-3 shadow-sm overflow-hidden" style="border-radius: 10px;">
                    <div class="card-header border-bottom d-flex justify-content-between align-items-center py-2 px-3" 
                         style="background-color: #eef2ff; cursor: pointer; user-select: none;"
                         data-bs-toggle="collapse" 
                         data-bs-target="#${modalCollapseId}" 
                         aria-expanded="${isModalExpanded ? 'true' : 'false'}" 
                         aria-controls="${modalCollapseId}">
                        <span class="fw-bold text-dark fs-6"><i class="bi bi-bell-fill text-primary me-2"></i>${headerText}</span>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary rounded-pill fs-6 px-3 py-1">${groupCount}</span>
                            <i class="bi bi-chevron-down text-secondary" style="font-size: 0.85rem;"></i>
                        </div>
                    </div>
                    <div class="collapse ${isModalExpanded ? 'show' : ''}" id="${modalCollapseId}">
                        <div class="card-body p-0">
                            ${modalTitlesHtml}
                        </div>
                    </div>
                </div>
            `;
            allNotiModalBody.append(groupModalHtml);
        });
    } else {
        const emptyHtml = `
            <div class="p-5 text-center text-muted bg-white">
                <i class="bi bi-bell-slash display-4 mb-3 d-block opacity-25"></i>
                <p class="mb-0 fw-medium">ไม่มีการแจ้งเตือนใหม่</p>
            </div>
        `;
        notiListContainer.append(emptyHtml);
        allNotiModalBody.append(emptyHtml);
    }
}

function showNotification(notification) {
    const topic = notification.header || notification.topic || notification.title || notification.Header || 'แจ้งเตือนใหม่';
    let content = '';
    if (Array.isArray(notification.title)) {
        content = notification.title.map(t => typeof t === 'object' ? (t.title || t.name || JSON.stringify(t)) : t).join(', ');
    } else {
        content = notification.content || notification.message || notification.Detail || (typeof notification.title === 'string' ? notification.title : '');
    }

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: topic,
            text: content,
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true
        });
    }

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(topic, {
            body: content,
            icon: '/favicon.ico'
        });
    }
}

let wsReconnectAttempts = 0;
const MAX_WS_RECONNECT_ATTEMPTS = 5;

function connectWebSocket() {
    if (typeof userId === 'undefined' || !userId || userId.trim() === '') {
        return;
    }

    if (wsReconnectAttempts >= MAX_WS_RECONNECT_ATTEMPTS) {
        return;
    }

    let targetDomain = window.location.host;
    let wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (typeof apiDomain !== 'undefined' && apiDomain) {
        try {
            const urlObj = new URL(apiDomain.startsWith('http') ? apiDomain : `${window.location.protocol}//${apiDomain}`);
            targetDomain = urlObj.host;
            wsProtocol = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
        } catch (e) {
            // invalid apiDomain
        }
    }

    const wsUrl = `${wsProtocol}//${targetDomain}/ws?userId=${encodeURIComponent(userId.trim())}`;

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = function () {
            wsReconnectAttempts = 0;
        };

        socket.onmessage = function (event) {
            try {
                const result = JSON.parse(event.data);
                fetchNotifications();
                const itemData = result.data || result.notification || (result.type === "notification" || result.type === "postNotification" ? result : null);
                if (itemData && (itemData.topic || itemData.title || itemData.header || itemData.content || itemData.message)) {
                    showNotification(itemData);
                }
            } catch (err) {
                fetchNotifications();
            }
        };

        socket.onclose = function (event) {
            wsReconnectAttempts++;
            if (wsReconnectAttempts <= MAX_WS_RECONNECT_ATTEMPTS) {
                const delay = Math.min(10000, 3000 * wsReconnectAttempts);
                setTimeout(() => {
                    connectWebSocket();
                }, delay);
            }
        };

        socket.onerror = function () {
            // silently ignore
        };
    } catch (err) {
        // silently ignore
    }
}

$(document).ready(function () {
    fetchNotifications();

    $('#bellNotification').on('click', function () {
        fetchNotifications();
    });

    $('#allNotificationsModal').on('show.bs.modal', function () {
        renderNotiDetailPlaceholder();
    });

    // ป้องกันไม่ให้ Dropdown ปิดตัวเอง และรองรับการกดขยาย/ยุบรายการแจ้งเตือนอย่างถูกต้อง
    $(document).on('click', '#notificationList [data-bs-toggle="collapse"]', function (e) {
        e.stopPropagation();
        e.preventDefault();
        const targetSelector = $(this).attr('data-bs-target');
        if (targetSelector) {
            const targetEl = document.querySelector(targetSelector);
            if (targetEl && typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
                const bsCollapse = bootstrap.Collapse.getOrCreateInstance(targetEl, { toggle: false });
                bsCollapse.toggle();
            }
        }
    });

    $('#notificationList').on('click', function (e) {
        e.stopPropagation();
    });

    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // ปิดการเรียก WebSocket ชั่วคราวเมื่อรันบนเครื่อง Local เพื่อไม่ให้ขึ้น Error ใน Console
    // connectWebSocket();
});

window.addEventListener('pageshow', function () {
    fetchNotifications();
});

document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        fetchNotifications();
    }
});
