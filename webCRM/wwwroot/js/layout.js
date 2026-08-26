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
        
        // Hide detail modal popup if open
        const detailModalEl = document.getElementById('notificationDetailModal');
        if (detailModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const bsModal = bootstrap.Modal.getInstance(detailModalEl);
            if (bsModal) bsModal.hide();
        }

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

const notiCacheMap = new Map();

function formatNotiValue(val) {
    if (!val && val !== 0) return '';
    if (Array.isArray(val)) {
        return val.map(item => {
            if (typeof item === 'object' && item !== null) {
                return item.title || item.name || item.Header || item.header || item.message || item.detail || item.content || JSON.stringify(item);
            }
            return String(item);
        }).filter(Boolean).join(', ');
    }
    if (typeof val === 'object' && val !== null) {
        return val.title || val.name || val.Header || val.header || val.message || val.detail || val.content || JSON.stringify(val);
    }
    return String(val);
}

function extractNotiData(responseData, id) {
    let resultObj = null;
    if (responseData && typeof responseData === 'object') {
        let d = responseData;
        if (typeof responseData === 'string' && responseData.startsWith('{')) {
            try { d = JSON.parse(responseData); } catch (e) { }
        }
        let inner = d;
        if (Array.isArray(inner)) {
            resultObj = inner.length > 0 ? inner[0] : null;
        } else if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
            resultObj = inner;
        }
    }

    const cached = id ? notiCacheMap.get(String(id)) : null;
    if (cached) {
        if (!resultObj || typeof resultObj !== 'object' || Object.keys(resultObj).length === 0) {
            return cached;
        }
        return Object.assign({}, cached, resultObj);
    }
    return resultObj || {};
}

async function isReadNoti(id) {
    if (!id || String(id).startsWith('noti_')) return {};
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
    if (!id || id === 'null' || id === 'undefined' || String(id).startsWith('noti_')) return {};
    try {
        const params = new URLSearchParams({ overall: 'false', Id: id, id: id });
        const response = await fetch(`/Layout/GetNotification?${params.toString()}`);
        if (!response.ok) return {};
        const data = await response.json();
        return data || {};
    } catch (err) {
        console.error("Error in getNotiDetail:", err);
        return {};
    }
}

function fetchNotifications() {
    const personalCode = typeof userId !== 'undefined' ? userId : '';
    $.ajax({
        url: '/Layout/GetNotification?overall=true&receiver='+personalCode,
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

function getItemInfo(t, groupSender, groupEndDate, groupIsRead, groupObj) {
    let titleText = '';
    let itemEndDate = groupEndDate || '';
    let itemSender = groupSender || '';
    let itemId = (groupObj && (groupObj.Id !== undefined && groupObj.Id !== null ? groupObj.Id : (groupObj.id !== undefined && groupObj.id !== null ? groupObj.id : (groupObj.guid || groupObj.Guid || groupObj.ref_id || groupObj.reference_id)))) || null;
    let itemIsRead = (groupIsRead === true || groupIsRead === 1 || groupIsRead === 'true');
    let itemObj = null;

    if (t && typeof t === 'object' && t !== null) {
        titleText = formatNotiValue(t.title || t.Title || t.name || t.Name || t.header || t.Header || t.message || t.Message || '');
        if (t.end_date || t.endDate || t.EndDate) itemEndDate = t.end_date || t.endDate || t.EndDate;
        if (t.sender || t.Sender) itemSender = t.sender || t.Sender;
        if (t.Id !== undefined && t.Id !== null) itemId = t.Id;
        else if (t.id !== undefined && t.id !== null) itemId = t.id;
        else if (t.guid !== undefined && t.guid !== null) itemId = t.guid;
        else if (t.Guid !== undefined && t.Guid !== null) itemId = t.Guid;
        else if (t.ref_id !== undefined && t.ref_id !== null) itemId = t.ref_id;
        
        if (t.is_read !== undefined) itemIsRead = (t.is_read === true || t.is_read === 1 || t.is_read === 'true');
        else if (t.isRead !== undefined) itemIsRead = (t.isRead === true || t.isRead === 1 || t.isRead === 'true');

        itemObj = Object.assign({}, groupObj || {}, t, {
            id: itemId,
            title: titleText || formatNotiValue(t),
            header: (t.header || t.Header || (groupObj && (groupObj.header || groupObj.Header))) || 'การแจ้งเตือน',
            message: (t.message || t.Message || t.detail || t.Detail || t.content || t.Content || (groupObj && (groupObj.message || groupObj.Message || groupObj.detail || groupObj.Detail))) || titleText,
            sender: itemSender,
            receiver: (t.receiver || t.Receiver || (groupObj && (groupObj.receiver || groupObj.Receiver))) || '',
            create_by: (t.create_by || t.createBy || t.CreateBy || (groupObj && (groupObj.create_by || groupObj.createBy || groupObj.CreateBy))) || '',
            start_date: (t.start_date || t.startDate || (groupObj && (groupObj.start_date || groupObj.startDate))) || '',
            end_date: itemEndDate,
            create_date: (t.create_date || t.createDate || (groupObj && (groupObj.create_date || groupObj.createDate))) || '',
            guid: (t.guid || t.Guid || (groupObj && (groupObj.guid || groupObj.Guid))) || itemId,
            sender_email: (t.sender_email || t.senderEmail || (groupObj && (groupObj.sender_email || groupObj.senderEmail))) || ''
        });
    } else {
        titleText = String(t || '');
        itemObj = {
            id: itemId,
            title: titleText,
            header: (groupObj && (groupObj.header || groupObj.Header)) || 'การแจ้งเตือน',
            message: (groupObj && (groupObj.message || groupObj.Message || groupObj.detail || groupObj.Detail || groupObj.content || groupObj.Content)) || titleText,
            sender: itemSender,
            receiver: (groupObj && (groupObj.receiver || groupObj.Receiver)) || '',
            create_by: (groupObj && (groupObj.create_by || groupObj.createBy || groupObj.CreateBy)) || '',
            start_date: (groupObj && (groupObj.start_date || groupObj.startDate)) || '',
            end_date: itemEndDate,
            create_date: (groupObj && (groupObj.create_date || groupObj.createDate)) || '',
            guid: (groupObj && (groupObj.guid || groupObj.Guid)) || itemId,
            sender_email: (groupObj && (groupObj.sender_email || groupObj.senderEmail)) || ''
        };
    }

    return {
        id: itemId,
        title: titleText,
        sender: itemSender ? String(itemSender) : '',
        endDate: formatNotiDate(itemEndDate),
        isRead: itemIsRead,
        rawObj: itemObj
    };
}

async function openNotiDetailModal(id, element) {
    // Close header notification dropdown if open
    const bellDropdown = document.getElementById('bellNotification');
    if (bellDropdown && typeof bootstrap !== 'undefined' && bootstrap.Dropdown) {
        const bsDropdown = bootstrap.Dropdown.getInstance(bellDropdown);
        if (bsDropdown) bsDropdown.hide();
    }

    if (!id || id === 'null' || id === 'undefined') {
        const allModalEl = document.getElementById('allNotificationsModal');
        if (allModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const bsAllModal = bootstrap.Modal.getOrCreateInstance(allModalEl);
            bsAllModal.show();
        }
        return;
    }

    const detailModalEl = document.getElementById('notificationDetailModal');
    if (detailModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
        const bsDetailModal = bootstrap.Modal.getOrCreateInstance(detailModalEl);
        bsDetailModal.show();
    }

    const modalBody = $('#notificationDetailModalBody');
    const deleteBtn = $('#notiDetailDeleteBtn');

    deleteBtn.attr('onclick', `deleteNoti('${id}')`);

    modalBody.html(`
        <div class="d-flex flex-column align-items-center justify-content-center text-center py-5" style="min-height: 220px;">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 2.5rem; height: 2.5rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <div class="text-secondary fw-medium">กำลังโหลดรายละเอียดการแจ้งเตือน...</div>
        </div>
    `);

    try {
        await isReadNoti(id);

        if (element) {
            $(element).find('.bi-circle-fill').remove();
        }

        const responseData = await getNotiDetail(id);
        const data = extractNotiData(responseData, id);

        renderNotiPopupDetailContent(data, modalBody);
        fetchNotifications();
    } catch (err) {
        console.error("Error in openNotiDetailModal:", err);
        const fallbackData = notiCacheMap.get(String(id));
        if (fallbackData) {
            renderNotiPopupDetailContent(fallbackData, modalBody);
        } else {
            modalBody.html(`
                <div class="alert alert-danger border-0 shadow-sm rounded-3 p-3 text-center mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i> เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียด
                </div>
            `);
        }
    }
}

function getFormattedNowDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${mins}:${secs}`;
}

async function submitNotificationReply(guid, inputId, senderEmail) {
    const replyInput = $(`#${inputId}`);
    const reply = replyInput.val() ? replyInput.val().trim() : '';

    if (!reply) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'แจ้งเตือน',
                text: 'กรุณากรอกข้อความตอบกลับ'
            });
        } else {
            alert('กรุณากรอกข้อความตอบกลับ');
        }
        return;
    }

    if (!guid || guid === '-' || guid === 'undefined' || guid === 'null') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'แจ้งเตือน',
                text: 'ไม่พบรหัสอ้างอิงสำหรับบันทึกข้อความตอบกลับ'
            });
        }
        return;
    }

    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ยืนยันการบันทึก',
            text: 'ต้องการบันทึกข้อความตอบกลับหรือไม่?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'บันทึก',
            cancelButtonText: 'ยกเลิก'
        });
        if (!result.isConfirmed) return;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading('กำลังบันทึกข้อมูล', 'ระบบกำลังบันทึกข้อความตอบกลับของคุณ กรุณารอสักครู่...');
        }

        const updBy = typeof currentUserEmail !== 'undefined' ? currentUserEmail : '';
        const response = await fetch(`/Suggestions/UpdateSuggestion?guid=${encodeURIComponent(guid)}&reply=${encodeURIComponent(reply)}&updBy=${encodeURIComponent(updBy)}`);

        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        const msg = await response.json();
        if (msg && msg.status === "error") {
            throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
        }

        if (senderEmail && senderEmail !== '-' && senderEmail !== 'undefined' && senderEmail !== 'null') {
            try {
                const fullNameTh = typeof userFullNameTh !== 'undefined' ? userFullNameTh : '';
                const emailContent = `เรียน ${senderEmail}<br><br>` +
                    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${fullNameTh} ได้ทำการตอบกลับข้อเสนอแนะ/ร้องเรียน โดยมีเนื้อหาดังนี้ ${reply} <br><br>` +
                    `ขอขอบคุณ<br>` +
                    `${fullNameTh}`;

                if (typeof sendEmail === 'function') {
                    await sendEmail(
                        senderEmail,
                        null,
                        "CRM : การตอบกลับข้อเสนอแนะ/ร้องเรียน",
                        emailContent
                    );
                }

                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 10);
                const senderId = typeof userId !== 'undefined' ? userId : '';

                if (typeof PostNoti === 'function') {
                    PostNoti({
                        header: "ข้อเสนอแนะ/ร้องเรียน",
                        title: "เรื่อง : ตอบกลับข้อเสนอแนะ/ร้องเรียน",
                        message: emailContent,
                        receiver_email: senderEmail,
                        sender: senderId,
                        create_by: senderId,
                        end_date: endDate,
                    });
                }
            } catch (emailErr) {
                console.error("เกิดข้อผิดพลาดในการส่งอีเมลตอบกลับ:", emailErr);
            }
        }

        if (typeof hideLoading === 'function') {
            hideLoading();
        }

        replyInput.val('');

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'บันทึกข้อความตอบกลับเรียบร้อยแล้ว',
                timer: 2000,
                showConfirmButton: false
            });
        }

        fetchNotifications();

        if (typeof searchSuggestion === 'function') {
            searchSuggestion(guid);
        }

    } catch (error) {
        console.error(error);
        if (typeof hideLoading === 'function') {
            hideLoading();
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message
            });
        }
    }
}

function getSuggestionReplyBlockHtml(guid, inputId, senderEmail) {
    const userNameDisplay = typeof userFullNameEn !== 'undefined' && userFullNameEn ? userFullNameEn : '';
    const nowDisplay = getFormattedNowDate();
    const targetGuid = guid || '';
    const targetSender = senderEmail || '';

    return `
        <div class="mt-4 border-top pt-2">
            <h6 style="text-decoration: underline; text-decoration-style: double;" class="mb-2 mt-2 fw-bold text-dark">
                บันทึกข้อมูล
            </h6>
            
            <div class="col-12 mt-1">
                <div class="border p-3 bg-white" style="border-radius: 6px; border-color: #e2e8f0;">
                    <div class="mb-2" style="font-size: 0.95rem; word-break: break-word; overflow-wrap: break-word;">
                        <span class="fw-bold" style="color: #0f5132;">ข้อความตอบกลับ:</span>
                    </div>
                    <textarea id="${inputId}" class="form-control mb-2" rows="3" style="resize: none; border-color: #e2e8f0;" placeholder="กรอกข้อความตอบกลับที่นี่..."></textarea>
                    <div class="d-flex justify-content-between mb-3 text-dark-blue" style="font-size: 0.85rem; font-family: 'Courier New', Courier, monospace; font-weight: bold; color: #002d62;">
                        <span>${userNameDisplay}</span>
                        <span>${nowDisplay}</span>
                    </div>
                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-primary px-4 fw-bold" onclick="submitNotificationReply('${targetGuid}', '${inputId}', '${targetSender}')" style="border-radius: 4px;">บันทึก</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderNotiPopupDetailContent(data, container) {
    if (!container || !container.length) return;

    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        container.html(`
            <div class="text-center p-4 text-muted">
                <i class="bi bi-inbox display-4 mb-2 opacity-25 d-block"></i>
                <p class="mb-0 fw-medium">ไม่พบรายละเอียดสำหรับการแจ้งเตือนนี้</p>
            </div>
        `);
        return;
    }

    const header = formatNotiValue(data.header);
    const title = formatNotiValue(data.title) || '-';
    const message = formatNotiValue(data.message) || '-';
    const sender = data.sender !== null && data.sender !== undefined ? formatNotiValue(data.sender) : '-';
    const receiver = data.receiver !== null && data.receiver !== undefined ? formatNotiValue(data.receiver) : '-';
    const createBy = data.create_by !== null && data.create_by !== undefined ? formatNotiValue(data.create_by) : '-';

    const startDateFormatted = formatNotiDate(data.start_date);
    const endDateFormatted = formatNotiDate(data.end_date);
    const createDateFormatted = formatNotiDate(data.create_date);

    const isSuggestionOrComplaint = header === "ข้อเสนอแนะ/ร้องเรียน";
    const itemGuid = data.guid || '';
    const senderEmail = data.sender_email || '';

    let replyBlockHtml = '';
    if (isSuggestionOrComplaint) {
        replyBlockHtml = getSuggestionReplyBlockHtml(itemGuid, 'notiReplyInput_Popup', senderEmail);
    }

    const html = `
        <div class="noti-popup-detail">
            <!-- Topic & Header Bar -->
            <div class="mb-3">
                <span class="badge bg-primary px-3 py-2 fs-6 rounded-pill shadow-sm">
                    <i class="bi bi-bookmark-fill me-1"></i>${header}
                </span>
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

            ${replyBlockHtml}

            <!-- Sender & Receiver Info Card -->
            <div class="card border-0 bg-light rounded-3 p-3 mb-3" style="background-color: #f8fafc !important;">
                <h6 class="fw-semibold text-secondary mb-2 small text-uppercase" style="letter-spacing: 0.5px;">
                    <i class="bi bi-info-circle me-1"></i> ข้อมูลผู้ส่งและผู้รับ
                </h6>
                <div class="row g-2">
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้ส่ง (Sender)</div>
                        <div class="fw-semibold text-dark small">${sender}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้รับ (Receiver)</div>
                        <div class="fw-semibold text-dark small">${receiver}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้สร้าง (Create By)</div>
                        <div class="fw-semibold text-dark small">${createBy}</div>
                    </div>
                </div>
            </div>

            <!-- Date Information Card -->
            <div class="card border-0 bg-light rounded-3 p-3" style="background-color: #f8fafc !important;">
                <h6 class="fw-semibold text-secondary mb-2 small text-uppercase" style="letter-spacing: 0.5px;">
                    <i class="bi bi-calendar3 me-1"></i> ข้อมูลวันที่และเวลา
                </h6>
                <div class="row g-2">
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">วันที่เริ่ม</div>
                        <div class="fw-medium text-dark small">${startDateFormatted || '-'}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">วันที่สิ้นสุด</div>
                        <div class="fw-medium text-dark small">${endDateFormatted || '-'}</div>
                    </div>
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">วันที่สร้าง</div>
                        <div class="fw-medium text-dark small">${createDateFormatted || '-'}</div>
                    </div>
                </div>
            </div>

        </div>
    `;

    container.html(html);
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
        const data = extractNotiData(responseData, id);

        renderNotiDetailContent(data);
        fetchNotifications();
    } catch (err) {
        console.error("Error in getNotiDetail:", err);
        const fallbackData = notiCacheMap.get(String(id));
        if (fallbackData) {
            renderNotiDetailContent(fallbackData);
        } else {
            detailContainer.html(`
                <div class="h-100 d-flex flex-column align-items-center justify-content-center text-center p-4">
                    <div class="alert alert-danger border-0 shadow-sm rounded-3 p-3">
                        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i> เกิดข้อผิดพลาดในการดึงข้อมูลรายละเอียด
                    </div>
                </div>
            `);
        }
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

    const header = formatNotiValue(data.header || data.Header || data.topic || data.Topic) || 'การแจ้งเตือน';
    const title = formatNotiValue(data.title || data.Title || data.subject || data.Subject) || '-';
    const message = formatNotiValue(data.message || data.Message || data.detail || data.Detail || data.content || data.Content) || '-';
    const notiId = data.Id !== undefined ? data.Id : (data.id !== undefined ? data.id : '-');
    const sender = data.sender !== null && data.sender !== undefined ? formatNotiValue(data.sender) : (data.Sender ? formatNotiValue(data.Sender) : '-');
    const receiver = data.receiver !== null && data.receiver !== undefined ? formatNotiValue(data.receiver) : (data.Receiver ? formatNotiValue(data.Receiver) : '-');
    const createBy = data.create_by !== null && data.create_by !== undefined ? formatNotiValue(data.create_by) : (data.createBy ? formatNotiValue(data.createBy) : (data.CreateBy ? formatNotiValue(data.CreateBy) : '-'));

    const startDateFormatted = formatNotiDate(data.start_date || data.startDate || data.StartDate);
    const endDateFormatted = formatNotiDate(data.end_date || data.endDate || data.EndDate);
    const createDateFormatted = formatNotiDate(data.create_date || data.createDate || data.CreateDate);

    const isSuggestionOrComplaint = header.includes('ข้อเสนอแนะ') || header.includes('ร้องเรียน') || header.toLowerCase().includes('suggestion') || header.toLowerCase().includes('complaint');
    const itemGuid = data.guid || data.Guid || data.ref_id || data.reference_id || data.Id || data.id || '';
    const senderEmail = data.sender_email || data.senderEmail || data.SenderEmail || data.sender || '';

    let replyBlockHtml = '';
    if (isSuggestionOrComplaint) {
        replyBlockHtml = getSuggestionReplyBlockHtml(itemGuid, 'notiReplyInput_Detail', senderEmail);
    }

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

            ${replyBlockHtml}
            
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
    notiCacheMap.clear();
    const notiBadge = $('#notificationBadge');
    const notiHeaderCount = $('#notificationHeaderCount');
    const notiListContainer = $('#notificationList');
    const allNotiModalBody = $('#allNotificationsModalBody');

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
            const isModalExpanded = openModalIds.size > 0 ? openModalIds.has(modalCollapseId) : true;

            let titles = [];
            if (Array.isArray(group.title)) {
                titles = group.title;
            } else if (group.title) {
                titles = [group.title];
            } else {
                titles = [headerText];
            }

            let dropdownTitlesHtml = '';
            titles.forEach((t, tIdx) => {
                const info = getItemInfo(t, groupSender, groupEndDate, group.is_read || group.isRead, group);
                let itemNotiId = info.id;
                if (!itemNotiId && itemNotiId !== 0) {
                    itemNotiId = `noti_${index}_${tIdx}`;
                }
                itemNotiId = String(itemNotiId);
                if (info.rawObj) {
                    notiCacheMap.set(itemNotiId, info.rawObj);
                    if (info.rawObj.id) notiCacheMap.set(String(info.rawObj.id), info.rawObj);
                    if (info.rawObj.Id) notiCacheMap.set(String(info.rawObj.Id), info.rawObj);
                    if (info.rawObj.guid) notiCacheMap.set(String(info.rawObj.guid), info.rawObj);
                    if (info.rawObj.Guid) notiCacheMap.set(String(info.rawObj.Guid), info.rawObj);
                }

                dropdownTitlesHtml += `
                    <div class="px-3 py-2 border-bottom bg-white d-flex align-items-start gap-2 position-relative notification-item-clickable" 
                         style="transition: background-color 0.2s; padding-left: 1.5rem !important; cursor: pointer;" 
                         data-noti-id="${itemNotiId}"
                         onclick="openNotiDetailModal('${itemNotiId}', this)"
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
            titles.forEach((t, tIdx) => {
                const info = getItemInfo(t, groupSender, groupEndDate, group.is_read || group.isRead, group);
                let itemNotiId = info.id;
                if (!itemNotiId && itemNotiId !== 0) {
                    itemNotiId = `noti_${index}_${tIdx}`;
                }
                itemNotiId = String(itemNotiId);
                if (info.rawObj) {
                    notiCacheMap.set(itemNotiId, info.rawObj);
                }

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

    const notiId = notification.Id || notification.id || (notification.data && (notification.data.Id || notification.data.id)) || '';

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'info',
            title: topic,
            text: content,
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            didOpen: (toast) => {
                toast.style.cursor = 'pointer';
                toast.addEventListener('click', () => {
                    openNotiDetailModal(notiId);
                });
            }
        });
    }

    if ("Notification" in window && Notification.permission === "granted") {
        const n = new Notification(topic, {
            body: content,
            icon: '/favicon.ico'
        });
        n.onclick = function () {
            window.focus();
            openNotiDetailModal(notiId);
        };
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

const sidebarIconMap = {
    '/Home/Index': 'bi-house',
    '/Home': 'bi-house',
    '/': 'bi-house',
    '/CustomerDetail': 'bi-person',
    '/Suggestions': 'bi-chat-dots',
    '/Campain': 'bi-megaphone',
    '/ProspectSetup': 'bi-people-fill',
    '/ProductApprove': 'bi-shield-check',
    '/ProspectAssign': 'bi-people',
    '/ProspectCall': 'bi-telephone'
};

function getSidebarActiveClass(path) {
    const currentPath = window.location.pathname || '/';
    const normPath = (path || '').toLowerCase();
    const normCurrent = currentPath.toLowerCase();

    if (normPath === '/' || normPath === '/home/index') {
        if (normCurrent === '/' || normCurrent === '/home/index') {
            return 'active-menu text-primary';
        }
        return 'text-secondary';
    }
    if (normPath && normPath !== '#' && normCurrent.startsWith(normPath)) {
        return 'active-menu text-primary';
    }
    return 'text-secondary';
}

function renderSidebarMenu(items) {
    const nav = $('#sidebarNav');
    if (!nav.length) return;

    let html = '';
    items.forEach(item => {
        const title = item.Title || item.title || '';
        const path = item.Path || item.path || '#';
        const cleanPath = path.split('?')[0];
        const iconClass = sidebarIconMap[path] || sidebarIconMap[cleanPath] || 'bi-grid';
        const activeClass = getSidebarActiveClass(path);

        html += `
            <a href="${path}" class="nav-link ${activeClass} d-flex align-items-center gap-3 px-3 py-2 rounded">
                <i class="bi ${iconClass} fs-5"></i> <span class="fw-medium sidebar-text">${title}</span>
            </a>
        `;
    });

    if (html.trim()) {
        nav.html(html);
    }
}

function loadSidebarMenu() {
    const nav = $('#sidebarNav');
    if (!nav.length) return;

    const personalCode = (typeof userId !== 'undefined' && userId) ? userId : '100664';
    const cacheKey = 'sidebar_pages_' + personalCode;

    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                renderSidebarMenu(parsed);
            }
        } catch (e) {}
    }

    $.ajax({
        url: '/Login/GetPage?personalCode=' + encodeURIComponent(personalCode) + '&menuPosition=side_bar',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            let data = response;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) {}
            }
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) {}
            }
            if (Array.isArray(data)) {
                const filtered = data.filter(item => 
                    (item.IsActive ?? item.isActive ?? true) && 
                    (item.IsSidebar ?? item.isSidebar ?? true)
                );
                sessionStorage.setItem(cacheKey, JSON.stringify(filtered));
                renderSidebarMenu(filtered);
            }
        },
        error: function (err) {
            console.error("Error fetching pages for sidebar menu:", err);
        }
    });
}

function loadDashboardViewMenu() {
    const selects = $('.dashboard-view-select');
    if (!selects.length) return;

    const personalCode = (typeof userId !== 'undefined' && userId) ? userId : '100664';
    const cacheKey = 'dashboard_view_pages_' + personalCode;

    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (Array.isArray(parsed) && parsed.length > 0) {
                renderDashboardViewMenu(parsed);
            }
        } catch (e) {}
    }

    $.ajax({
        url: '/Login/GetPage?personalCode=' + encodeURIComponent(personalCode) + '&menuPosition=dashboard_view',
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            let data = response;
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) {}
            }
            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) {}
            }
            if (Array.isArray(data)) {
                const filtered = data.filter(item => 
                    (item.IsActive ?? item.isActive ?? true)
                );
                sessionStorage.setItem(cacheKey, JSON.stringify(filtered));
                renderDashboardViewMenu(filtered);
            }
        },
        error: function (err) {
            console.error("Error fetching pages for dashboard view menu:", err);
        }
    });
}

function renderDashboardViewMenu(items) {
    const selects = $('.dashboard-view-select');
    if (!selects.length) return;

    const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, "");

    selects.each(function () {
        const select = $(this);
        const firstOpt = select.find('option').first();
        const firstValue = firstOpt.attr('value') || '';
        const firstText = firstOpt.text() || 'ข้อมูลลูกค้า';

        select.empty();

        const $firstOption = $('<option></option>').attr('value', firstValue).text(firstText);
        select.append($firstOption);

        items.forEach(function (item) {
            const title = item.Title || item.title || '';
            const path = item.Path || item.path || '';
            if (title && path) {
                const $opt = $('<option></option>').attr('value', path).text(title);
                select.append($opt);
            }
        });

        let matched = false;
        select.find('option').each(function () {
            const optVal = $(this).attr('value') || '';
            if (isPathMatchDashboardView(currentPath, optVal)) {
                select.val(optVal);
                matched = true;
                return false;
            }
        });

        if (!matched) {
            select.val(firstValue);
        }
    });
}

function isPathMatchDashboardView(currentPath, optPath) {
    if (!optPath) return false;
    currentPath = (currentPath || '').toLowerCase().replace(/\/$/, "");
    optPath = (optPath || '').toLowerCase().replace(/\/$/, "");

    if (currentPath === optPath) return true;

    const isHomeCurrent = (currentPath === "" || currentPath === "/home" || currentPath === "/home/index");
    const isHomeOpt = (optPath === "" || optPath === "/home" || optPath === "/home/index");
    if (isHomeCurrent && isHomeOpt) return true;

    if (currentPath === optPath + "/index") return true;
    if (optPath === currentPath + "/index") return true;

    if (optPath !== '' && optPath !== '/' && optPath !== '/home' && optPath !== '/home/index' && currentPath.startsWith(optPath + '/')) {
        return true;
    }
    return false;
}

$(document).ready(function () {
    loadSidebarMenu();
    loadDashboardViewMenu();
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

