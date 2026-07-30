let masterData = [];

async function getmaster() {
    try {
        const response = await fetch('/Home/GetMaster');
        masterData = await response.json();
        renderBranchOptions();
    } catch (error) {
        console.error("Error fetching master data:", error);
    }
}

function renderBranchOptions() {
    const branchSelect = document.getElementById('branchSelect');
    if (!branchSelect) return;

    branchSelect.innerHTML = '<option value="">ทั้งหมด</option>';

    const currentCompany = (window.CURRENT_COMPANY || "").trim().toUpperCase();

    if (masterData && Array.isArray(masterData.department)) {
        const filteredDepartments = masterData.department.filter(item => {
            if (!currentCompany) return true;
            return item.company && item.company.trim().toUpperCase() === currentCompany;
        });

        const uniqueSections = [];
        filteredDepartments.forEach(item => {
            if (item.section && item.section.trim() !== '') {
                const sectionName = item.section.trim();
                if (!uniqueSections.includes(sectionName)) {
                    uniqueSections.push(sectionName);
                }
            }
        });

        uniqueSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            option.textContent = section;
            branchSelect.appendChild(option);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getmaster();
});
