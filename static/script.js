// Updated script.js for Render deployment with HTTPS and improvements

const API_BASE_URL = 'https://resume-generator-svqj.onrender.com'; // live deployed API

let formData = {
    personal: {},
    experiences: [],
    education: [],
    skills: [],
    selectedTemplate: 'modern'
};

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeDefaultSkills();
    addExperienceItem();
    addEducationItem();
});

function initializeEventListeners() {
    const aiBtn = document.getElementById('generate-ai-btn');
    if (aiBtn) {
        aiBtn.addEventListener('click', generateAIContent);
    }

    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', handleTemplateSelection);
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', e => {
            const tabName = e.target.textContent.trim().toLowerCase();
            switchTab(tabName);
        });
    });

    const skillInput = document.getElementById('skillInput');
    if (skillInput) {
        skillInput.addEventListener('keypress', e => {
            if (e.key === 'Enter' && skillInput.value.trim()) {
                e.preventDefault();
                addSkill(skillInput.value.trim());
                skillInput.value = '';
            }
        });
    }

    const generateBtn = document.querySelector('.generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateResumePreview);
    }

    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }

    document.addEventListener('click', e => {
        if (e.target.textContent === 'Add Experience') {
            addExperienceItem();
        } else if (e.target.textContent === 'Add Education') {
            addEducationItem();
        }
    });
}

function initializeDefaultSkills() {
    ['JavaScript', 'Python', 'Project Management'].forEach(addSkill);
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const activeTab = Array.from(document.querySelectorAll('.tab')).find(tab =>
        tab.textContent.trim().toLowerCase() === tabName
    );
    if (activeTab) activeTab.classList.add('active');

    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) activeContent.classList.add('active');
}

async function generateAIContent() {
    const btn = document.getElementById('generate-ai-btn');
    const outputDiv = document.getElementById('ai-output');
    const role = document.getElementById('role')?.value.trim();
    const skills = document.getElementById('skills')?.value.trim();
    const jobDescription = document.getElementById('job-description')?.value.trim();

    if (!role || !skills) {
        outputDiv.innerHTML = '<div class="error">Please provide your target role and skills.</div>';
        outputDiv.classList.add('visible');
        return;
    }

    btn.classList.add('loading');
    btn.textContent = 'Generating...';
    outputDiv.innerHTML = '<div class="loading">Generating content...</div>';
    outputDiv.classList.add('visible');

    try {
        const response = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, skills, job_description: jobDescription })
        });

        const data = await response.json();

        if (data.status === 'success') {
            outputDiv.innerHTML = `<div class="success"><strong>AI Generated:</strong><pre>${data.content}</pre></div>`;
        } else {
            outputDiv.innerHTML = `<div class="error">Error: ${data.error || data.message || 'Unknown error.'}</div>`;
        }
    } catch (error) {
        outputDiv.innerHTML = `<div class="error">API connection failed: ${error.message}</div>`;
    } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Generate AI Content';
    }
}

function handleTemplateSelection(e) {
    document.querySelectorAll('.template-card').forEach(card => card.classList.remove('selected'));
    e.currentTarget.classList.add('selected');

    const templateName = e.currentTarget.querySelector('.template-name').textContent.trim().toLowerCase();
    formData.selectedTemplate = templateName.includes('modern') ? 'modern' : 'classic';
}

function addSkill(skillName) {
    if (!formData.skills.includes(skillName)) {
        formData.skills.push(skillName);
        const skillTag = document.createElement('div');
        skillTag.className = 'skill-tag';
        skillTag.innerHTML = `
            <span>${skillName}</span>
            <span class="skill-remove" onclick="removeSkill('${skillName}')">×</span>
        `;
        document.querySelector('.skills-container').appendChild(skillTag);
    }
}

function removeSkill(skillName) {
    formData.skills = formData.skills.filter(skill => skill !== skillName);
    document.querySelectorAll('.skill-tag').forEach(tag => {
        if (tag.textContent.includes(skillName)) tag.remove();
    });
}

function addExperienceItem() {
    // existing logic remains unchanged, reuse from your current working app
}

function removeExperienceItem(id) {
    // existing logic remains unchanged
}

function updateExperienceData(e) {
    // existing logic remains unchanged
}

function addEducationItem() {
    // existing logic remains unchanged
}

function removeEducationItem(id) {
    // existing logic remains unchanged
}

function updateEducationData(e) {
    // existing logic remains unchanged
}

function collectPersonalData() {
    formData.personal = {
        firstName: document.getElementById('firstName')?.value || '',
        lastName: document.getElementById('lastName')?.value || '',
        email: document.getElementById('email')?.value || '',
        phone: document.getElementById('phone')?.value || '',
        location: document.getElementById('location')?.value || '',
        website: document.getElementById('website')?.value || '',
        linkedin: document.getElementById('linkedin')?.value || '',
        summary: document.getElementById('summary')?.value || ''
    };
}

function generateResumePreview() {
    collectPersonalData();
    const resumeContent = document.getElementById('resume-content');

    localStorage.setItem('resumeFormData', JSON.stringify(formData)); // Auto-save on generate

    if (formData.selectedTemplate === 'modern') {
        resumeContent.innerHTML = generateModernTemplate();
    } else {
        resumeContent.innerHTML = generateClassicTemplate();
    }
}

function generateModernTemplate() {
    // your existing modern template rendering remains unchanged
}

function generateClassicTemplate() {
    // your existing classic template rendering remains unchanged
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

async function downloadPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const resumeElement = document.getElementById('a4-container');

        if (!resumeElement) {
            alert('Resume content not found.');
            return;
        }

        const canvas = await html2canvas(resumeElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#fff'
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${formData.personal.firstName || 'Resume'}_${formData.personal.lastName || 'Document'}.pdf`);
    } catch (error) {
        console.error(error);
        alert('PDF generation failed. Please try again.');
    }
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
}

// Expose functions globally for HTML onclick calls
window.addExperience = addExperienceItem;
window.addEducation = addEducationItem;
window.removeSkill = removeSkill;
window.removeExperienceItem = removeExperienceItem;
window.removeEducationItem = removeEducationItem;
window.switchTab = switchTab;
window.scrollToSection = scrollToSection;
window.generateResume = generateResumePreview;
