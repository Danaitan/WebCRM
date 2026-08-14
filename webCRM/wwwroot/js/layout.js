let socket;

function fetchNotifications() {
    $.ajax({
        url: '/Layout/GetNotification',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            console.log("GetNotification response:", response);
            renderNotifications(response);
        },
        error: function (err) {
            console.error("Error fetching notifications from /Layout/GetNotification:", err);
        }
    });
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
            if (g.count !== undefined) {
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
        groups.forEach((group) => {
            const headerText = group.header || group.Header || group.topic || group.name || 'การแจ้งเตือน';
            const groupCount = group.count !== undefined ? group.count : (Array.isArray(group.title) ? group.title.length : 1);
            
            let titles = [];
            if (Array.isArray(group.title)) {
                titles = group.title;
            } else if (typeof group.title === 'string' && group.title) {
                titles = [group.title];
            } else if (group.content || group.message || group.Detail) {
                titles = [group.content || group.message || group.Detail];
            } else {
                titles = ['-'];
            }

            let dropdownTitlesHtml = '';
            titles.forEach((t) => {
                dropdownTitlesHtml += `
                    <div class="px-3 py-2 border-bottom bg-white d-flex align-items-center gap-2" style="transition: background-color 0.2s; padding-left: 1.5rem !important;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='#fff'">
                        <i class="bi bi-circle-fill text-primary" style="font-size: 0.4rem;"></i>
                        <span class="text-secondary fw-medium" style="font-size: 0.85rem; line-height: 1.4;">${t}</span>
                    </div>
                `;
            });

            const groupDropdownHtml = `
                <div class="notification-group border-bottom">
                    <!-- หัวข้อใหญ่ (Header) -->
                    <div class="px-3 py-2 border-bottom d-flex justify-content-between align-items-center" style="background-color: #eef2ff;">
                        <span class="fw-bold text-dark" style="font-size: 0.875rem;">
                            <i class="bi bi-bell-fill text-primary me-2"></i>${headerText}
                        </span>
                        <span class="badge bg-primary rounded-pill px-2 py-1" style="font-size: 0.75rem;">${groupCount}</span>
                    </div>
                    <!-- รายการย่อย (Title) -->
                    <div>
                        ${dropdownTitlesHtml}
                    </div>
                </div>
            `;
            notiListContainer.append(groupDropdownHtml);

            let modalTitlesHtml = '';
            titles.forEach((t) => {
                modalTitlesHtml += `
                    <div class="p-3 border-bottom bg-white d-flex align-items-center gap-3" style="transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='#fff'">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 38px; height: 38px;">
                            <i class="bi bi-info-circle-fill"></i>
                        </div>
                        <div class="flex-grow-1">
                            <span class="fw-medium text-dark" style="font-size: 0.95rem;">${t}</span>
                        </div>
                    </div>
                `;
            });

            const groupModalHtml = `
                <div class="card border-0 mb-3 shadow-sm overflow-hidden" style="border-radius: 10px;">
                    <!-- หัวข้อใหญ่ประจำกลุ่ม (Header Card) -->
                    <div class="card-header border-bottom d-flex justify-content-between align-items-center py-2 px-3" style="background-color: #eef2ff;">
                        <span class="fw-bold text-dark fs-6"><i class="bi bi-bell-fill text-primary me-2"></i>${headerText}</span>
                        <span class="badge bg-primary rounded-pill fs-6 px-3 py-1">${groupCount}</span>
                    </div>
                    <div class="card-body p-0">
                        ${modalTitlesHtml}
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
        content = notification.title.join(', ');
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

function connectWebSocket() {
    if (typeof userId === 'undefined' || !userId) {
        console.warn("WebSocket: userId is missing or empty.");
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsDomain = window.location.host;
    const wsUrl = `${wsProtocol}//${wsDomain}/ws?userId=${encodeURIComponent(typeof userId !== 'undefined' ? userId : '')}`;

    console.log("Connecting WebSocket to:", wsUrl);

    try {
        socket = new WebSocket(wsUrl);

        socket.onopen = function () {
            console.log("WebSocket connected");
        };

        socket.onmessage = function (event) {
            try {
                const result = JSON.parse(event.data);
                console.log("Notification received via WebSocket:", result);

                fetchNotifications();

                const itemData = result.data || result.notification || (result.type === "notification" || result.type === "postNotification" ? result : null);
                if (itemData && (itemData.topic || itemData.title || itemData.header || itemData.content || itemData.message)) {
                    showNotification(itemData);
                }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
                fetchNotifications();
            }
        };

        socket.onclose = function () {
            console.log("WebSocket disconnected. Reconnecting in 3 seconds...");
            setTimeout(() => {
                connectWebSocket();
            }, 3000);
        };

        socket.onerror = function (error) {
            console.error("WebSocket error:", error);
        };
    } catch (err) {
        console.error("Failed to establish WebSocket connection:", err);
    }
}

$(document).ready(function () {
    fetchNotifications();

    $('#bellNotification').on('click', function () {
        fetchNotifications();
    });

    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    connectWebSocket();
});

window.addEventListener('pageshow', function () {
    fetchNotifications();
});

document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        fetchNotifications();
    }
});
