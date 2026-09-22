let socket;
let currentReadNotiCount = 0;

async function deleteNoti(id) {
    if (!id || id === 'null' || id === 'undefined') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่มีรายการที่ลบได้',
                confirmButtonColor: '#0d6efd',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: 'rounded-4 shadow-lg'
                }
            });
        }
        return;
    }

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

        // Hide detail modal popup if open
        const detailModalEl = document.getElementById('notificationDetailModal');
        if (detailModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const bsModal = bootstrap.Modal.getInstance(detailModalEl);
            if (bsModal) bsModal.hide();
        }

        // Reset right pane detail in allNotificationsModal to placeholder
        renderNotiDetailPlaceholder();

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
        console.error("Error deleting notification:", err);
    }
}

async function deleteReadNotifications() {
    if (currentReadNotiCount <= 0) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning',
                title: 'ไม่มีรายการที่ลบได้',
                confirmButtonColor: '#0d6efd',
                confirmButtonText: 'ตกลง',
                customClass: {
                    popup: 'rounded-4 shadow-lg'
                }
            });
        } else {
            alert('ไม่มีรายการที่ลบได้');
        }
        return;
    }

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

        // Reset right pane detail in allNotificationsModal to placeholder
        renderNotiDetailPlaceholder();

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
        const response = await fetch(`/Home/GetNotification?${params.toString()}`);
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
        // url: '/Layout/GetNotification?overall=true&receiver='+personalCode,
        url: '/Home/GetNotification?overall=true&receiver='+personalCode,
        type: 'GET',
        dataType: 'json',
        success: function (response) {
            renderNotifications(response);
        },
        error: function (err) {
            console.error("Error fetching notifications:", err);
        }
    });
}

function formatNotiDate(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const formatter = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Bangkok',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const parts = formatter.formatToParts(d);
            const getPart = (type) => (parts.find(p => p.type === type)?.value || '');
            const day = getPart('day');
            const month = getPart('month');
            const year = getPart('year');
            return `${day}/${month}/${year}`;
        }
    } catch (e) {
        console.error("Error formatting noti date:", e);
    }
    return String(dateStr).split('T')[0].split(' ')[0];
}

function getItemInfo(t, groupIsRead, groupObj) {
    const grp = (groupObj && typeof groupObj === 'object') ? groupObj : {};
    let titleText = '';
    let itemEndDate = grp.end_date || '';
    let itemStartDate = grp.start_date || '';
    let itemSender = grp.sender || '';
    let itemId = grp.Id ?? grp.id;
    let itemRefId = grp.ref_id || grp.refId || grp.reference_guid || grp.suggestion_guid || '';
    let itemIsRead = (groupIsRead === true || groupIsRead === 'true' || groupIsRead === 1);
    let itemObj = null;

    if (t && typeof t === 'object' && t !== null) {
        titleText = formatNotiValue(t.title || '');
        if (t.end_date) itemEndDate = t.end_date;
        if (t.start_date) itemStartDate = t.start_date;
        if (t.sender) itemSender = t.sender;
        if (t.Id !== undefined && t.Id !== null) itemId = t.Id;
        else if (t.id !== undefined && t.id !== null) itemId = t.id;
        else if (t.guid !== undefined && t.guid !== null) itemId = t.guid;
        else if (t.Guid !== undefined && t.Guid !== null) itemId = t.Guid;
        else if (t.ref_id !== undefined && t.ref_id !== null) itemId = t.ref_id;

        itemRefId = t.ref_id
            || t.refId
            || t.reference_guid
            || t.suggestion_guid
            || ((t.guid || t.Guid) !== itemId ? (t.guid || t.Guid) : itemRefId)
            || '';
        
        if (t.is_read !== undefined) {
            itemIsRead = !(t.is_read === false || t.is_read === 0 || t.is_read === 'false');
        } else if (t.isRead !== undefined) {
            itemIsRead = !(t.isRead === false || t.isRead === 0 || t.isRead === 'false');
        }

        itemObj = Object.assign({}, grp, t, {
            id: itemId,
            title: titleText || formatNotiValue(t),
            header: t.header || 'การแจ้งเตือน',
            message: t.message,
            sender: itemSender,
            receiver: grp.receiver,
            create_by: grp.create_by || '',
            start_date: itemStartDate,
            end_date: itemEndDate,
            create_date: t.create_date || '',
            guid: itemRefId,
            ref_id: itemRefId,
            is_read: itemIsRead
        });
    } else {
        titleText = String(t || '');
        itemObj = {
            id: itemId,
            title: titleText,
            header: grp.header || 'การแจ้งเตือน',
            message: grp.message,
            sender: itemSender,
            receiver: grp.receiver || grp.Receiver || '',
            create_by: grp.create_by || grp.createBy || grp.CreateBy || '',
            start_date: itemStartDate,
            end_date: itemEndDate,
            create_date: grp.create_date || grp.createDate || '',
            guid: itemRefId,
            ref_id: itemRefId,
            is_read: itemIsRead
        };
    }

    return {
        id: itemId,
        title: titleText,
        sender: itemSender ? String(itemSender) : '',
        startDate: formatNotiDate(itemStartDate),
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

        await renderNotiPopupDetailContent(data, modalBody);
        fetchNotifications();
    } catch (err) {
        console.error("Error in openNotiDetailModal:", err);
        const fallbackData = notiCacheMap.get(String(id));
        if (fallbackData) {
            await renderNotiPopupDetailContent(fallbackData, modalBody);
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

function extractSuggestionGuidFromText(value) {
    const text = formatNotiValue(value);
    if (!text) return '';

    const referenceMatch = text.match(/รหัสอ้างอิง\s*:\s*([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/i);
    return referenceMatch ? referenceMatch[1] : '';
}

function getSuggestionReference(data) {
    if (!data || typeof data !== 'object') return '';

    const notificationId = data.Id ?? data.id ?? '';
    const explicitReference = data.ref_id
        || data.refId
        || data.reference_guid
        || data.suggestion_guid
        || '';
    if (explicitReference) return String(explicitReference);

    const possibleGuid = data.guid || data.Guid || '';
    if (possibleGuid && String(possibleGuid) !== String(notificationId)) {
        return String(possibleGuid);
    }

    // Notification API บางเวอร์ชันไม่ส่ง ref_id กลับมา จึงอ่านรหัสที่ฝังในข้อความเป็น fallback
    return extractSuggestionGuidFromText(data.message)
        || extractSuggestionGuidFromText(data.title)
        || '';
}

async function getSuggestionReplyContext(guid) {
    const response = await fetch(`/Suggestions/GetReplyContext?guid=${encodeURIComponent(guid)}`, {
        skipLoading: true
    });
    if (!response.ok) {
        let message = 'ไม่สามารถโหลดข้อมูลสิทธิ์การตอบกลับได้';
        try {
            const error = await response.json();
            if (error?.message) message = error.message;
        } catch (e) { }
        throw new Error(message);
    }
    return await response.json();
}

async function getNotificationReplyBlockHtml(data, inputId) {
    const guid = getSuggestionReference(data);
    if (!guid) {
        return '<div class="alert alert-warning py-2 px-3 mt-3 mb-0">การแจ้งเตือนนี้ไม่มีรหัสอ้างอิงข้อเสนอแนะ/ร้องเรียน จึงไม่สามารถตอบกลับจากหน้านี้ได้</div>';
    }

    try {
        const context = await getSuggestionReplyContext(guid);
        const replyDetails = window.SuggestionReplyAuthorization.getReplyDetails(context);
        const permission = await window.SuggestionReplyAuthorization.evaluate(
            context.sendTo,
            replyDetails,
            context.statusTask
        );

        if (!permission.allowed) {
            return `<div class="alert alert-warning py-2 px-3 mt-3 mb-0">${permission.reason || 'คุณไม่มีสิทธิ์ตอบกลับเคสนี้'}</div>`;
        }

        const senderEmail = data.sender_email || data.senderEmail || '';
        return renderSuggestionReplyFormHtml(guid, inputId, senderEmail);
    } catch (error) {
        console.error('Error checking notification reply permission:', error);
        return `<div class="alert alert-warning py-2 px-3 mt-3 mb-0">${error.message || 'ไม่สามารถตรวจสอบสิทธิ์การตอบกลับได้ กรุณาลองใหม่อีกครั้ง'}</div>`;
    }
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

    try {
        const context = await getSuggestionReplyContext(guid);
        const replyDetails = window.SuggestionReplyAuthorization.getReplyDetails(context);
        const permission = await window.SuggestionReplyAuthorization.evaluate(
            context.sendTo,
            replyDetails,
            context.statusTask
        );
        if (!permission.allowed) {
            if (typeof Swal !== 'undefined') {
                await Swal.fire({
                    icon: 'warning',
                    title: 'ไม่มีสิทธิ์ตอบกลับ',
                    text: permission.reason || 'คุณไม่มีสิทธิ์ตอบกลับเคสนี้'
                });
            }
            return;
        }
    } catch (error) {
        console.error('Error rechecking notification reply permission:', error);
        if (typeof Swal !== 'undefined') {
            await Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: error.message || 'ไม่สามารถตรวจสอบสิทธิ์การตอบกลับได้ กรุณาลองใหม่อีกครั้ง'
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

        const response = await fetch(`/Suggestions/UpdateSuggestion?guid=${encodeURIComponent(guid)}&reply=${encodeURIComponent(reply)}`, {
            method: 'POST',
            skipLoading: true
        });

        if (!response.ok) {
            throw new Error("HTTP error " + response.status);
        }
        const msg = await response.json();
        if (msg && msg.status === "error") {
            throw new Error(msg.message || "เกิดข้อผิดพลาดจากเซิร์ฟเวอร์");
        }

        if (senderEmail) {
            try {
                const $activeRow = $('#suggestionsTable tbody tr.table-active');
                const creator = $activeRow.length
                    ? ($activeRow.attr('data-updby') || '')
                    : '';
                const profile = await getProfileByCode(creator);
                const topicTitle = $activeRow.length > 0 ? $activeRow.find('td:nth-child(2)').text().trim() : '';
                const fullNameTh = userFullNameTh || '';
                const homeUrl = `${webDomain}/Login?returnUrl=${encodeURIComponent('/Home')}`;
                const emailContent =
                    `เรียน ${profile.thname}<br><br>` +
                    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${fullNameTh} ` +
                    `ได้ทำการตอบกลับข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                    `โดยมีเนื้อหาดังนี้ ${reply}<br><br>` +
                    ` ` +
                    `<a href="${homeUrl}">คลิกที่นี่เพื่อเข้าสู่ระบบCRM</a>` +
                    `<br><br>` +
                    `ขอขอบคุณ<br>` +
                    `${fullNameTh}`;

                await sendEmail(
                    profile.e_mail,
                    null,
                    "CRM : การตอบกลับข้อเสนอแนะ/ร้องเรียน เรื่อง " + topicTitle,
                    emailContent
                );

                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 10);
                const senderId = typeof userId !== 'undefined' ? userId : '';
                const notiContent = `เรียน ${profile.thname},<br><br>` +
                    `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${fullNameTh} ` +
                    `ได้ทำการตอบกลับข้อเสนอแนะ/ร้องเรียนหัวข้อ ${topicTitle} ` +
                    `โดยมีเนื้อหาดังนี้ ${reply}<br><br>` +
                    `ขอขอบคุณ<br>` +
                    `${fullNameTh}`;

                await PostNoti({
                    header: "ข้อเสนอแนะ/ร้องเรียน",
                    title: "เรื่อง : " + topicTitle,
                    message: notiContent,
                    receiver_email: profile.e_mail,
                    receiver: profile.personnel_code,
                    sender: senderId,
                    create_by: senderId,
                    end_date: endDate,
                    ref_id: guid,
                });
                
            } catch (emailErr) {
                console.error("เกิดข้อผิดพลาดในการส่งอีเมลตอบกลับ:", emailErr);
            }
        }

        if (typeof stopLoading === 'function') {
            stopLoading(true);
        } else if (typeof hideLoading === 'function') {
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
        if (typeof stopLoading === 'function') {
            stopLoading(true);
        } else if (typeof hideLoading === 'function') {
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

function renderSuggestionReplyFormHtml(guid, inputId, senderEmail) {
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

async function renderNotiPopupDetailContent(data, container) {
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
    let replyBlockHtml = '';
    if (isSuggestionOrComplaint) {
        replyBlockHtml = await getNotificationReplyBlockHtml(data, 'notiReplyInput_Popup');
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

        await renderNotiDetailContent(data);
        fetchNotifications();
    } catch (err) {
        console.error("Error in getNotiDetail:", err);
        const fallbackData = notiCacheMap.get(String(id));
        if (fallbackData) {
            await renderNotiDetailContent(fallbackData);
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

async function renderNotiDetailContent(data) {
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

    const header = formatNotiValue(data.header) || 'การแจ้งเตือน';
    const title = formatNotiValue(data.title) || '-';
    const message = formatNotiValue(data.message) || '-';
    const notiId = data.Id !== undefined ? data.Id : (data.id !== undefined ? data.id : '-');
    const sender = data.sender !== null && data.sender !== undefined ? formatNotiValue(data.sender) : '-';
    const receiver = data.receiver !== null && data.receiver !== undefined ? formatNotiValue(data.receiver) : '-';
    const createBy = data.create_by !== null && data.create_by !== undefined ? formatNotiValue(data.create_by) : '-';

    const startDateFormatted = formatNotiDate(data.start_date);
    const endDateFormatted = formatNotiDate(data.end_date);
    const createDateFormatted = formatNotiDate(data.create_date);

    const isSuggestionOrComplaint = header.includes('ข้อเสนอแนะ') || header.includes('ร้องเรียน');
    let replyBlockHtml = '';
    if (isSuggestionOrComplaint) {
        replyBlockHtml = await getNotificationReplyBlockHtml(data, 'notiReplyInput_Detail');
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
                    <i class="bi bi-info-circle me-1"></i> ข้อมูลผู้ส่ง
                </h6>
                <div class="row g-3">
                    <div class="col-12 col-sm-4">
                        <div class="text-muted small">ผู้ส่ง (Sender)</div>
                        <div class="fw-semibold text-dark">${sender}</div>
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
    let readCount = 0;
    let groups = [];

    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
    }
    if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { }
    }

    if (data && typeof data === 'object') {
        const totalCountValue = data.totalCount ?? data.TotalCount ?? data.total_count;
        const parsedTotalCount = Number(totalCountValue);
        if (totalCountValue !== null && totalCountValue !== undefined && Number.isFinite(parsedTotalCount)) {
            totalCount = Math.max(0, Math.trunc(parsedTotalCount));
        }

        let rawList = data.response;
        if (typeof rawList === 'string') {
            try { rawList = JSON.parse(rawList); } catch (e) { }
        }
        if (Array.isArray(rawList)) {
            groups = rawList;
        } else if (Array.isArray(data)) {
            groups = data;
        } else if (data.title) {
            groups = [data];
        }
    } else if (Array.isArray(data)) {
        groups = data;
    }

    // รวมกลุ่ม (Group by header) หากข้อมูลที่ได้มาเป็นรายการแยกรายชิ้น (flat items) เพื่อให้แสดงผลครบถ้วนและเป็นหมวดหมู่
    let normalizedGroups = [];
    const headerMap = new Map();

    groups.forEach((item) => {
        if (!item) return;
        if (Array.isArray(item.title)) {
            normalizedGroups.push(item);
        } else {
            const h = item.header || item.Header || item.topic || item.Topic || 'การแจ้งเตือน';
            if (!headerMap.has(h)) {
                const newGroup = {
                    header: h,
                    count: 0,
                    title: [],
                    is_read: true,
                    start_date: item.start_date || item.startDate || item.create_date || item.createDate,
                    end_date: item.end_date || item.endDate,
                    sender: item.sender || item.Sender
                };
                headerMap.set(h, newGroup);
                normalizedGroups.push(newGroup);
            }
            const grp = headerMap.get(h);
            grp.count += 1;
            grp.title.push(item);
            if (item.is_read === false || item.is_read === 0 || item.isRead === false || item.isRead === 0 || item.is_read === 'false') {
                grp.is_read = false;
            }
        }
    });

    groups = normalizedGroups;

    // หาก API ไม่ได้ส่งยอดรวม หรือส่ง 0 ทั้งที่มีรายการใหม่ ให้คำนวณจากสถานะอ่านของรายการที่แสดงผล
    const derivedUnreadCount = groups.reduce((groupTotal, group) => {
        const titles = Array.isArray(group.title)
            ? group.title
            : (group.title !== null && group.title !== undefined ? [group.title] : []);
        const groupIsRead = group.is_read ?? group.isRead;

        return groupTotal + titles.reduce((itemTotal, item) => {
            const info = getItemInfo(item, groupIsRead, group);
            return itemTotal + (info.isRead ? 0 : 1);
        }, 0);
    }, 0);

    if (totalCount <= 0 && derivedUnreadCount > 0) {
        totalCount = derivedUnreadCount;
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
            const headerText = group.header || 'การแจ้งเตือน';
            const collapseId = `notiCollapse_${index}`;
            const modalCollapseId = `modalNotiCollapse_${index}`;

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

            const groupCount = group.count;

            let dropdownTitlesHtml = '';
            titles.forEach((t, tIdx) => {
                const info = getItemInfo(t, group.is_read || group.isRead, group);
                if (info.isRead) {
                    readCount++;
                }
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
                            ${(info.sender || info.startDate) ? `
                                <div class="d-flex flex-wrap align-items-center gap-2 mt-1 text-muted" style="font-size: 0.75rem;">
                                    ${info.sender ? `<span>ผู้ส่ง: ${info.sender}</span>` : ''}
                                    ${(info.sender && info.startDate) ? `<span class="opacity-50">•</span>` : ''}
                                    ${info.startDate ? `<span>วันที่แจ้งเตือน: ${info.startDate}</span>` : ''}
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
                            <span class="badge bg-primary rounded-pill px-2 py-1" style="font-size: 0.75rem;">${groupCount > 0 ? groupCount : ""}</span>
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
                const info = getItemInfo(t, group.is_read || group.isRead, group);
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
                            ${(info.sender || info.startDate) ? `
                                <div class="d-flex flex-wrap align-items-center gap-3 text-secondary" style="font-size: 0.8rem;">
                                    ${info.sender ? `<span>ผู้ส่ง: <strong>${info.sender}</strong></span>` : ''}
                                    ${info.startDate ? `<span>วันที่แจ้งเตือน: <strong>${info.startDate}</strong></span>` : ''}
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
                            <span class="badge bg-primary rounded-pill fs-6 px-3 py-1">${groupCount > 0 ? groupCount : ""}</span>
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
    currentReadNotiCount = readCount;
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
    '/Campaign': 'bi-megaphone',
    '/ProspectSetup': 'bi-people-fill',
    '/ProductApprove': 'bi-shield-check',
    '/ProspectAssign': 'bi-people',
    '/ProspectCall': 'bi-telephone',
    '/DashboardProspectCall': 'bi-telephone-inbound',
    '/DashboardSuggestion': 'bi-chat-left-dots',
    '/ManageUser': 'bi-gear'
};

function getSidebarIcon(path, isChild = false) {
    if (!path) return isChild ? 'bi-circle' : 'bi-grid';
    const cleanPath = path.split('?')[0];
    if (isChild && (cleanPath === '/Home/Index' || cleanPath === '/' || cleanPath === '/Home')) {
        return 'bi-person';
    }
    return sidebarIconMap[path] || sidebarIconMap[cleanPath] || (isChild ? 'bi-circle' : 'bi-grid');
}

function isSidebarPathActive(path) {
    if (!path || path === '#') return false;
    const currentPath = (window.location.pathname || '/').toLowerCase().replace(/\/$/, "");
    const targetPath = (path.split('?')[0] || '').toLowerCase().replace(/\/$/, "");

    if (targetPath === '' || targetPath === '/' || targetPath === '/home' || targetPath === '/home/index') {
        return (currentPath === '' || currentPath === '/' || currentPath === '/home' || currentPath === '/home/index');
    }
    return currentPath === targetPath || currentPath.startsWith(targetPath + '/');
}

function renderSidebarMenu(items) {
    const nav = $('#sidebarNav');
    if (!nav.length) return;
    if (!Array.isArray(items) || items.length === 0) return;

    // Filter active items
    const activeItems = items.filter(item => (item.IsActive ?? item.isActive ?? true) !== false);

    // Group children by ParentId
    const childrenMap = {};
    activeItems.forEach(item => {
        const parentId = item.ParentId ?? item.parentId ?? item.parent_id;
        if (parentId !== null && parentId !== undefined && parentId !== "" && parentId !== 0) {
            const pIdStr = String(parentId);
            if (!childrenMap[pIdStr]) {
                childrenMap[pIdStr] = [];
            }
            childrenMap[pIdStr].push(item);
        }
    });

    // Identify top-level items (ParentId is null / undefined / empty / 0)
    const topLevelItems = activeItems.filter(item => {
        const parentId = item.ParentId ?? item.parentId ?? item.parent_id;
        const menuPos = (item.MenuPosition ?? item.menuPosition ?? '').toLowerCase();
        const isTop = (parentId === null || parentId === undefined || parentId === "" || parentId === 0);
        return isTop && (!menuPos || menuPos === 'side_bar');
    });

    let html = '';

    topLevelItems.forEach(item => {
        const itemId = item.Id ?? item.id;
        const idStr = String(itemId);
        const title = item.Title ?? item.title ?? '';
        const path = item.Path ?? item.path ?? '#';
        const iconClass = getSidebarIcon(path, false);
        const children = childrenMap[idStr] || [];

        if (children.length > 0) {
            // Ensure "ข้อมูลสัญญา" is sorted to be the first child item
            children.sort((a, b) => {
                const aTitle = (a.Title ?? a.title ?? '').trim();
                const bTitle = (b.Title ?? b.title ?? '').trim();
                if (aTitle === 'ข้อมูลสัญญา') return -1;
                if (bTitle === 'ข้อมูลสัญญา') return 1;
                return 0;
            });
            // Check if child is active or parent matches current URL
            const isChildActive = children.some(child => isSidebarPathActive(child.Path ?? child.path));
            const isParentActive = isSidebarPathActive(path);
            const isExpanded = isChildActive || isParentActive;
            const collapseId = `sidebarSubmenu_${itemId}`;
            const parentActiveClass = (isChildActive || isParentActive) ? 'text-primary fw-semibold' : 'text-secondary';

            let childrenHtml = '';
            children.forEach(child => {
                const cTitle = child.Title ?? child.title ?? '';
                const cPath = child.Path ?? child.path ?? '#';
                const cIconClass = getSidebarIcon(cPath, true);
                const isCActive = isSidebarPathActive(cPath);
                const cActiveClass = isCActive ? 'active-menu text-primary' : 'text-secondary';

                childrenHtml += `
                    <a href="${cPath}" class="nav-link ${cActiveClass} d-flex align-items-center gap-2 px-3 py-1.5 rounded">
                        <i class="bi ${cIconClass} fs-6"></i>
                        <span class="sidebar-text">${cTitle}</span>
                    </a>
                `;
            });

            html += `
                <div class="sidebar-item-group mb-1">
                    <button class="nav-link ${parentActiveClass} d-flex align-items-center justify-content-between w-100 px-3 py-2 rounded border-0 bg-transparent text-start sidebar-parent-toggle" 
                            type="button"
                            data-bs-toggle="collapse" 
                            data-bs-target="#${collapseId}" 
                            aria-expanded="${isExpanded ? 'true' : 'false'}"
                            aria-controls="${collapseId}">
                        <div class="d-flex align-items-center gap-3">
                            <i class="bi ${iconClass} fs-5"></i>
                            <span class="fw-medium sidebar-text">${title}</span>
                        </div>
                        <i class="bi bi-chevron-down sidebar-chevron fs-6"></i>
                    </button>
                    <div class="collapse ${isExpanded ? 'show' : ''}" id="${collapseId}">
                        <div class="sidebar-submenu d-flex flex-column gap-1 my-1">
                            ${childrenHtml}
                        </div>
                    </div>
                </div>
            `;
        } else {
            const activeClass = isSidebarPathActive(path) ? 'active-menu text-primary' : 'text-secondary';
            html += `
                <a href="${path}" class="nav-link ${activeClass} d-flex align-items-center gap-3 px-3 py-2 rounded mb-1">
                    <i class="bi ${iconClass} fs-5"></i>
                    <span class="fw-medium sidebar-text">${title}</span>
                </a>
            `;
        }
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
        url: '/Login/GetPage?personalCode=' + encodeURIComponent(personalCode),
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
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                renderSidebarMenu(data);
            }
        },
        error: function (err) {
            console.error("Error fetching pages for sidebar menu:", err);
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
    if (window.location.search.includes('user=')) {
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('user');
            const cleanUrl = url.pathname + (url.search ? url.search : '') + url.hash;
            window.history.replaceState({}, document.title, cleanUrl);
        } catch (e) {
            console.error("Error cleaning user param from URL:", e);
        }
    }

    loadSidebarMenu();
    fetchNotifications();
    initRoleSwitcher();

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


// =====================================================================
// Role Switcher (ปรับบทบาทของตัวเอง) — ปุ่มด้านขวาของกระดิ่งแจ้งเตือน
// =====================================================================
let roleSwitcherRoles = [];
let roleSwitcherLoaded = false;

function parseRoleSwitcherResponse(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data && Array.isArray(response.data)) return response.data;
    if (response.data && response.data.data && Array.isArray(response.data.data)) return response.data.data;
    if (response.result && Array.isArray(response.result)) return response.result;
    return [];
}

function escapeRoleHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function initRoleSwitcher() {
    const $switcher = $('#roleSwitcher');
    if (!$switcher.length) return;

    const toggleEl = document.getElementById('roleSwitcherToggle');
    if (toggleEl) {
        toggleEl.addEventListener('shown.bs.dropdown', function () {
            if (!roleSwitcherLoaded) {
                loadRoleSwitcherRoles();
            }
            const searchInput = document.getElementById('roleSwitcherSearch');
            if (searchInput) {
                searchInput.value = '';
                setTimeout(() => searchInput.focus(), 100);
            }
            renderRoleSwitcherList('');
        });
    }

    // ค้นหาบทบาท
    $('#roleSwitcherSearch').on('input', function () {
        renderRoleSwitcherList($(this).val() || '');
    });

    // ไม่ให้ dropdown ปิดเมื่อคลิกในกล่องค้นหา
    $('#roleSwitcherSearch').on('click', function (e) {
        e.stopPropagation();
    });

    // เลือกบทบาท
    $(document).on('click', '.role-switcher-item', function () {
        const roleId = $(this).attr('data-role-id') || '';
        const roleName = $(this).attr('data-role-name') || '';
        switchOwnRole(roleId, roleName);
    });
}

async function loadRoleSwitcherRoles() {
    const $list = $('#roleSwitcherList');
    try {
        const response = await $.ajax({
            url: '/ManageUser/GetCRMRoles',
            type: 'GET',
            dataType: 'json'
        });

        let roles = parseRoleSwitcherResponse(response) || [];

        // แสดงเฉพาะบทบาทที่เปิดใช้งาน (ถ้ามีสถานะกำกับ)
        roles = roles.filter(r => {
            const status = (r.status || r.role_status || '').toString().toLowerCase().trim();
            return status === '' || status === 'enable' || status === 'active';
        });

        roleSwitcherRoles = roles.map(r => ({
            role_id: (r.role_id || r.RoleId || r.roleId || r.id || '').toString(),
            role_name: (r.role_name || r.RoleName || r.roleName || r.name || '').toString()
        })).filter(r => r.role_id);

        roleSwitcherLoaded = true;
        renderRoleSwitcherList($('#roleSwitcherSearch').val() || '');
    } catch (err) {
        console.error('Error loading roles for switcher:', err);
        $list.html(`
            <div class="p-3 text-center text-danger small">
                <i class="bi bi-exclamation-triangle me-1"></i> ไม่สามารถโหลดรายการบทบาทได้
            </div>
        `);
    }
}

function renderRoleSwitcherList(searchTerm) {
    const $list = $('#roleSwitcherList');
    if (!$list.length) return;

    if (!roleSwitcherLoaded) {
        $list.html(`
            <div class="p-3 text-center text-muted small">
                <span class="spinner-border spinner-border-sm me-2"></span>กำลังโหลดบทบาท...
            </div>
        `);
        return;
    }

    const currentRoleId = ($('#roleSwitcher').attr('data-current-role-id') || '').toString();
    const term = (searchTerm || '').toString().toLowerCase().trim();

    const filtered = roleSwitcherRoles.filter(r => {
        if (!term) return true;
        return r.role_id.toLowerCase().includes(term)
            || r.role_name.toLowerCase().includes(term);
    });

    if (filtered.length === 0) {
        $list.html(`
            <div class="p-3 text-center text-muted small">
                <i class="bi bi-inbox me-1"></i> ไม่พบบทบาทที่ค้นหา
            </div>
        `);
        return;
    }

    const html = filtered.map(r => {
        const isCurrent = r.role_id === currentRoleId;
        return `
            <button type="button"
                    class="role-switcher-item btn w-100 text-start d-flex align-items-center justify-content-between px-3 py-2 border-0 rounded-0 ${isCurrent ? 'bg-primary bg-opacity-10' : 'bg-white'}"
                    data-role-id="${escapeRoleHtml(r.role_id)}"
                    data-role-name="${escapeRoleHtml(r.role_name)}"
                    ${isCurrent ? 'disabled' : ''}>
                <span class="d-flex align-items-center gap-2">
                    <i class="bi ${isCurrent ? 'bi-check-circle-fill text-primary' : 'bi-person-badge text-secondary'}"></i>
                    <span class="d-flex flex-column">
                        <span class="fw-medium text-dark small">${escapeRoleHtml(r.role_name || r.role_id)}</span>
                        <span class="text-muted" style="font-size: 0.72rem;">${escapeRoleHtml(r.role_id)}</span>
                    </span>
                </span>
                ${isCurrent ? '<span class="badge bg-primary rounded-pill" style="font-size: 0.65rem;">ปัจจุบัน</span>' : ''}
            </button>
        `;
    }).join('');

    $list.html(html);
}

async function switchOwnRole(roleId, roleName) {
    if (!roleId) return;

    if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
            title: 'ยืนยันการเปลี่ยนบทบาท',
            html: `ต้องการเปลี่ยนบทบาทของคุณเป็น<br><b>${escapeRoleHtml(roleName || roleId)}</b> ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d6efd',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'เปลี่ยนบทบาท',
            cancelButtonText: 'ยกเลิก',
            customClass: { popup: 'rounded-4 shadow-lg' }
        });
        if (!result.isConfirmed) return;
    }

    try {
        if (typeof showLoading === 'function') {
            showLoading('กำลังเปลี่ยนบทบาท', 'ระบบกำลังปรับบทบาทของคุณ กรุณารอสักครู่...');
        }

        const response = await fetch('/Layout/SwitchRole', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role_id: roleId, role_name: roleName })
        });

        const data = await response.json();

        if (!response.ok || !data || data.status === false) {
            throw new Error((data && data.message) || 'ไม่สามารถเปลี่ยนบทบาทได้');
        }

        // อัปเดตค่าปัจจุบันไว้ก่อน (เผื่อ UI ยังไม่ถูก redirect ทัน)
        $('#roleSwitcher').attr('data-current-role-id', roleId);
        $('#roleSwitcher').attr('data-current-role-name', roleName || '');

        if (typeof stopLoading === 'function') {
            stopLoading(true);
        } else if (typeof hideLoading === 'function') {
            hideLoading();
        }

        // เข้าสู่ระบบใหม่ (rebuild session ทั้งหมด) โดยคงบทบาทที่เพิ่งเลือกไว้
        // แล้วกลับมาที่หน้าเดิมด้วย returnUrl
        const returnUrl = window.location.pathname
            + window.location.search
            + window.location.hash;
        window.location.href = '/Login?returnUrl='
            + encodeURIComponent(returnUrl);
    } catch (err) {
        console.error('Error switching role:', err);
        if (typeof stopLoading === 'function') {
            stopLoading(true);
        } else if (typeof hideLoading === 'function') {
            hideLoading();
        }
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: err.message || 'ไม่สามารถเปลี่ยนบทบาทได้'
            });
        }
    }
}
