(function (window) {
    'use strict';

    const profileByEmailCache = new Map();
    let groupEmailSet = new Set();
    let groupEmailLoadPromise = null;

    function normalize(value) {
        return String(value ?? '').trim().toLowerCase();
    }

    function isEmptyValue(value) {
        const normalized = normalize(value);
        return normalized === ''
            || normalized === '-'
            || normalized === 'null'
            || normalized === 'undefined';
    }

    function extractEmailFromItem(item) {
        if (!item) return '';
        return normalize(
            item.e_mail
            || item.email
            || item.Email
            || item.sendToGroupFull
            || item.sendToPersonAbb
            || item.sendToGroupAbb
            || item.sendToPerson
            || ''
        );
    }

    async function loadGroupEmailSet(forceReload = false) {
        if (forceReload) {
            groupEmailLoadPromise = null;
        }

        if (!groupEmailLoadPromise) {
            groupEmailLoadPromise = (async () => {
                const response = await fetch('/DashboardSuggestion/GetPersonalAndGroup', {
                    skipLoading: true
                });
                if (!response.ok) {
                    throw new Error(`HTTP error ${response.status}`);
                }

                const data = await response.json();
                const loadedSet = new Set();
                const group = Array.isArray(data?.group) ? data.group : [];
                const personalAbb = Array.isArray(data?.personalAbb) ? data.personalAbb : [];

                [...group, ...personalAbb].forEach(item => {
                    const email = extractEmailFromItem(item);
                    if (email) loadedSet.add(email);
                });

                groupEmailSet = loadedSet;
                window.groupEmailSet = groupEmailSet;
                return groupEmailSet;
            })().catch(error => {
                groupEmailLoadPromise = null;
                throw error;
            });
        }

        return groupEmailLoadPromise;
    }

    function isGroupSendTo(sendTo) {
        const target = normalize(sendTo);
        return !!target && target !== '-' && groupEmailSet.has(target);
    }

    function parseDateForSort(value) {
        if (isEmptyValue(value)) return 0;

        const raw = String(value).trim();
        const dmyMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
        if (dmyMatch) {
            let year = Number(dmyMatch[3]);
            if (year > 2400) year -= 543;
            const date = new Date(
                year,
                Number(dmyMatch[2]) - 1,
                Number(dmyMatch[1]),
                Number(dmyMatch[4] || 0),
                Number(dmyMatch[5] || 0),
                Number(dmyMatch[6] || 0)
            );
            return Number.isNaN(date.getTime()) ? 0 : date.getTime();
        }

        const timestamp = Date.parse(raw);
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    function getValidReplies(replyDetails) {
        if (!Array.isArray(replyDetails)) return [];
        return replyDetails.filter(item => !isEmptyValue(item?.reply));
    }

    function getFirstReplierIdentity(replyDetails) {
        const validReplies = getValidReplies(replyDetails);
        if (validReplies.length === 0) return '';

        const sorted = validReplies
            .map((item, index) => ({ item, index }))
            .sort((a, b) => {
                const dateDifference = parseDateForSort(a.item?.upDate) - parseDateForSort(b.item?.upDate);
                return dateDifference !== 0 ? dateDifference : a.index - b.index;
            });

        return normalize(sorted[0].item?.updBy);
    }

    function extractPersonalIdFromProfile(profile) {
        let value = profile;
        if (Array.isArray(value)) value = value[0];
        if (value?.data) value = Array.isArray(value.data) ? value.data[0] : value.data;

        return normalize(
            value?.personnel_code
            || value?.personalId
            || value?.personal_id
            || value?.emp_code
            || ''
        );
    }

    async function getPersonalIdByEmail(email) {
        const normalizedEmail = normalize(email);
        if (!normalizedEmail || !normalizedEmail.includes('@')) return '';

        if (!profileByEmailCache.has(normalizedEmail)) {
            profileByEmailCache.set(normalizedEmail, (async () => {
                const response = await fetch(`/Login/GetProfileByEmail?email=${encodeURIComponent(normalizedEmail)}`, {
                    skipLoading: true
                });
                if (!response.ok) return '';
                return extractPersonalIdFromProfile(await response.json());
            })().catch(error => {
                console.error('Error in getPersonalIdByEmail:', error);
                return '';
            }));
        }

        const personalId = await profileByEmailCache.get(normalizedEmail);
        if (!personalId) profileByEmailCache.delete(normalizedEmail);
        return personalId;
    }

    function canReplyToStatus(status) {
        return normalize(status) !== 'close';
    }

    async function evaluate(sendTo, replyDetails, status) {
        if (!canReplyToStatus(status)) {
            return {
                allowed: false,
                reason: 'เคสนี้อยู่ในสถานะปิดงานแล้ว ไม่สามารถบันทึกข้อความตอบกลับได้'
            };
        }

        // สิทธิ์ FCRM002 (isEdit) = ตอบกลับได้แบบไร้เงื่อนไข
        // ข้ามการตรวจสอบ กลุ่ม/บุคคล/ผู้ตอบคนแรก ทั้งหมด (ยังคงกันเฉพาะสถานะปิดงานด้านบน)
        if (window.isEdit === true) {
            return { allowed: true, reason: '' };
        }

        try {
            await loadGroupEmailSet();
        } catch (error) {
            console.error('Error loading group email data:', error);
            return {
                allowed: false,
                reason: 'ไม่สามารถตรวจสอบข้อมูลกลุ่มผู้รับผิดชอบได้ กรุณาลองใหม่อีกครั้ง'
            };
        }

        const currentEmail = normalize(window.currentUserEmail);
        const currentId = normalize(window.currentPersonalId || window.CURRENT_PERSONAL_ID || window.userId);
        const target = normalize(sendTo);

        if (isGroupSendTo(target)) {
            const validReplies = getValidReplies(replyDetails);
            if (validReplies.length === 0) {
                return { allowed: true, reason: '' };
            }

            const firstReplier = getFirstReplierIdentity(validReplies);
            let allowed = !!firstReplier && (currentEmail === firstReplier || currentId === firstReplier);

            if (!allowed && currentId) {
                const firstReplierPersonalId = await getPersonalIdByEmail(firstReplier);
                allowed = !!firstReplierPersonalId && currentId === firstReplierPersonalId;
            }

            return {
                allowed,
                reason: allowed
                    ? ''
                    : 'เคสนี้ถูกตอบกลับแล้ว สามารถตอบกลับได้เฉพาะผู้ที่ตอบกลับคนแรกเท่านั้น'
            };
        }

        const allowed = !!target && currentEmail === target;
        return {
            allowed,
            reason: allowed
                ? ''
                : 'เคสนี้มอบหมายให้ผู้รับผิดชอบเฉพาะราย คุณไม่มีสิทธิ์ตอบกลับ'
        };
    }

    function getReplyDetails(context) {
        const details = Array.isArray(context?.detail) ? [...context.detail] : [];
        if (details.length === 0 && !isEmptyValue(context?.reply)) {
            details.push({
                reply: context.reply,
                updBy: context.updBy,
                updByName: context.updByName || context.personalName,
                upDate: context.upDate
            });
        }
        return getValidReplies(details);
    }

    window.SuggestionReplyAuthorization = Object.freeze({
        canReplyToStatus,
        evaluate,
        getReplyDetails,
        getValidReplies,
        isEmptyValue,
        isGroupSendTo,
        loadGroupEmailSet
    });
})(window);
