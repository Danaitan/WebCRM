let socket;

function fetchNotifications() {
    $.ajax({
        url: '/Layout/GetNotification?isOverall=true',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            // console.log("GetNotification response:", response);
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

function getItemInfo(t, groupSender, groupEndDate) {
    let titleText = '';
    let itemEndDate = groupEndDate || '';
    let itemSender = groupSender || '';

    if (t && typeof t === 'object') {
        titleText = t.title || t.name || t.text || t.header || t.Header || '';
        if (t.end_date || t.endDate) itemEndDate = t.end_date || t.endDate;
        if (t.sender || t.Sender) itemSender = t.sender || t.Sender;
    } else {
        titleText = String(t || '');
    }

    return {
        title: titleText,
        sender: itemSender ? String(itemSender) : '',
        endDate: formatNotiDate(itemEndDate)
    };
}

function renderNotifications(data) {
    const notiBadge = $('#notificationBadge');
    const notiHeaderCount = $('#notificationHeaderCount');
    const notiListContainer = $('#notificationList');
    const allNotiModalBody = $('#allNotificationsModalBody');

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
            const headerText = group.header || group.Header || group.topic || group.name || 'การแจ้งเตือน';
            const groupCount = group.count !== undefined ? group.count : (Array.isArray(group.title) ? group.title.length : 1);
            const collapseId = `notiCollapse_${index}`;
            const groupEndDate = group.end_date || group.endDate || '';
            const groupSender = group.sender || group.Sender || '';

            let titles = [];
            if (Array.isArray(group.title)) {
                titles = group.title;
            } else if (group.title) {
                titles = [group.title];
            } else {
                titles = [headerText];
            }

            console.log("group", group);

            let dropdownTitlesHtml = '';
            titles.forEach((t) => {
                const info = getItemInfo(t, groupSender, groupEndDate);
                dropdownTitlesHtml += `
                    <div class="px-3 py-2 border-bottom bg-white d-flex align-items-start gap-2 position-relative" 
                         style="transition: background-color 0.2s; padding-left: 1.5rem !important;" 
                         onmouseover="this.style.backgroundColor='#f8fafc'" 
                         onmouseout="this.style.backgroundColor='#fff'">
                        <i class="bi bi-circle-fill text-primary flex-shrink-0" style="font-size: 0.35rem; margin-top: 0.45rem;"></i>
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
                         aria-expanded="false" 
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
                    <div class="collapse" id="${collapseId}">
                        ${dropdownTitlesHtml}
                    </div>
                </div>
            `;
            notiListContainer.append(groupDropdownHtml);

            let modalTitlesHtml = '';
            titles.forEach((t) => {
                const info = getItemInfo(t, groupSender, groupEndDate);
                modalTitlesHtml += `
                    <div class="p-3 border-bottom bg-white d-flex align-items-start gap-3" 
                         style="transition: background-color 0.2s;" 
                         onmouseover="this.style.backgroundColor='#f8fafc'" 
                         onmouseout="this.style.backgroundColor='#fff'">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 mt-1" style="width: 38px; height: 38px;">
                            <i class="bi bi-info-circle-fill"></i>
                        </div>
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

            const modalCollapseId = `modalNotiCollapse_${index}`;
            const groupModalHtml = `
                <div class="card border-0 mb-3 shadow-sm overflow-hidden" style="border-radius: 10px;">
                    <!-- หัวข้อใหญ่ประจำกลุ่ม (Header Card) สามารถกดเพื่อยุบ/ขยายได้ -->
                    <div class="card-header border-bottom d-flex justify-content-between align-items-center py-2 px-3" 
                         style="background-color: #eef2ff; cursor: pointer; user-select: none;"
                         data-bs-toggle="collapse" 
                         data-bs-target="#${modalCollapseId}" 
                         aria-expanded="false" 
                         aria-controls="${modalCollapseId}">
                        <span class="fw-bold text-dark fs-6"><i class="bi bi-bell-fill text-primary me-2"></i>${headerText}</span>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary rounded-pill fs-6 px-3 py-1">${groupCount}</span>
                            <i class="bi bi-chevron-down text-secondary" style="font-size: 0.85rem;"></i>
                        </div>
                    </div>
                    <div class="collapse" id="${modalCollapseId}">
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

    // ป้องกันไม่ให้ Dropdown ปิดตัวเองเมื่อกดขยายหัวข้อหรือคลิกข้างในรายการแจ้งเตือน
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
