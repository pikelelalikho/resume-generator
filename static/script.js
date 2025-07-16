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

// ================== EVENT LISTENERS ==================
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

// ================== SKILLS ==================
function initializeDefaultSkills() {
    ['JavaScript', 'Python', 'Project Management'].forEach(addSkill);
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

// ================== TEMPLATES & TABS ==================
function handleTemplateSelection(e) {
    document.querySelectorAll('.template-card').forEach(card => card.classList.remove('selected'));
    e.currentTarget.classList.add('selected');

    const templateName = e.currentTarget.querySelector('.template-name').textContent.trim().toLowerCase();
    formData.selectedTemplate = templateName.includes('modern') ? 'modern' : 'classic';
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

// ================== EXPERIENCE ==================
function addExperienceItem() {
    const id = `exp-${Date.now()}`;
    formData.experiences.push({ id, title: '', company: '', startDate: '', endDate: '', description: '' });

    const container = document.querySelector('.experience-container');
    const item = document.createElement('div');
    item.className = 'experience-item';
    item.id = id;
    item.innerHTML = `
        <input placeholder="Job Title" oninput="updateExperienceData(event, '${id}', 'title')"/>
        <input placeholder="Company" oninput="updateExperienceData(event, '${id}', 'company')"/>
        <input type="month" placeholder="Start Date" oninput="updateExperienceData(event, '${id}', 'startDate')"/>
        <input type="month" placeholder="End Date" oninput="updateExperienceData(event, '${id}', 'endDate')"/>
        <textarea placeholder="Description" oninput="updateExperienceData(event, '${id}', 'description')"></textarea>
        <button onclick="removeExperienceItem('${id}')">Remove</button>
    `;
    container.appendChild(item);
}

function removeExperienceItem(id) {
    formData.experiences = formData.experiences.filter(exp => exp.id !== id);
    document.getElementById(id)?.remove();
}

function updateExperienceData(e, id, field) {
    const experience = formData.experiences.find(exp => exp.id === id);
    if (experience) experience[field] = e.target.value;
}

// ================== EDUCATION ==================
function addEducationItem() {
    const id = `edu-${Date.now()}`;
    formData.education.push({ id, degree: '', institution: '', startDate: '', endDate: '', description: '' });

    const container = document.querySelector('.education-container');
    const item = document.createElement('div');
    item.className = 'education-item';
    item.id = id;
    item.innerHTML = `
        <input placeholder="Degree" oninput="updateEducationData(event, '${id}', 'degree')"/>
        <input placeholder="Institution" oninput="updateEducationData(event, '${id}', 'institution')"/>
        <input type="month" placeholder="Start Date" oninput="updateEducationData(event, '${id}', 'startDate')"/>
        <input type="month" placeholder="End Date" oninput="updateEducationData(event, '${id}', 'endDate')"/>
        <textarea placeholder="Description" oninput="updateEducationData(event, '${id}', 'description')"></textarea>
        <button onclick="removeEducationItem('${id}')">Remove</button>
    `;
    container.appendChild(item);
}

function removeEducationItem(id) {
    formData.education = formData.education.filter(edu => edu.id !== id);
    document.getElementById(id)?.remove();
}

function updateEducationData(e, id, field) {
    const education = formData.education.find(edu => edu.id === id);
    if (education) education[field] = e.target.value;
}

// ================== PERSONAL DATA & PREVIEW ==================
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
    localStorage.setItem('resumeFormData', JSON.stringify(formData)); // Auto-save on generate

    const resumeContent = document.getElementById('resume-content');
    resumeContent.innerHTML =
        formData.selectedTemplate === 'modern'
            ? generateModernTemplate()
            : generateClassicTemplate();
}

// ================== TEMPLATES ==================
function generateModernTemplate() {
    return `
        <div class="resume modern">
            <h2>${formData.personal.firstName} ${formData.personal.lastName}</h2>
            <p>${formData.personal.email} | ${formData.personal.phone} | ${formData.personal.location}</p>
            <p>${formData.personal.website} | ${formData.personal.linkedin}</p>
            <p>${formData.personal.summary}</p>
            <h3>Skills</h3>
            <ul>${formData.skills.map(skill => `<li>${skill}</li>`).join('')}</ul>
            <h3>Experience</h3>
            <ul>
                ${formData.experiences
                    .map(
                        exp => `
                    <li>
                        <strong>${exp.title}</strong> at ${exp.company} (${formatDate(exp.startDate)} - ${formatDate(exp.endDate)})
                        <p>${exp.description}</p>
                    </li>
                `
                    )
                    .join('')}
            </ul>
            <h3>Education</h3>
            <ul>
                ${formData.education
                    .map(
                        edu => `
                    <li>
                        <strong>${edu.degree}</strong> at ${edu.institution} (${formatDate(edu.startDate)} - ${formatDate(edu.endDate)})
                        <p>${edu.description}</p>
                    </li>
                `
                    )
                    .join('')}
            </ul>
        </div>
    `;
}

function generateClassicTemplate() {
    return `
        <div class="resume classic">
            <h1>${formData.personal.firstName} ${formData.personal.lastName}</h1>
            <p>${formData.personal.email} | ${formData.personal.phone}</p>
            <h2>Profile</h2>
            <p>${formData.personal.summary}</p>
            <h2>Skills</h2>
            <ul>${formData.skills.map(skill => `<li>${skill}</li>`).join('')}</ul>
            <h2>Work Experience</h2>
            ${formData.experiences
                .map(
                    exp => `
                <div>
                    <h3>${exp.title} - ${exp.company}</h3>
                    <span>${formatDate(exp.startDate)} - ${formatDate(exp.endDate)}</span>
                    <p>${exp.description}</p>
                </div>
            `
                )
                .join('')}
            <h2>Education</h2>
            ${formData.education
                .map(
                    edu => `
                <div>
                    <h3>${edu.degree} - ${edu.institution}</h3>
                    <span>${formatDate(edu.startDate)} - ${formatDate(edu.endDate)}</span>
                    <p>${edu.description}</p>
                </div>
            `
                )
                .join('')}
        </div>
    `;
}

// ================== UTILITY ==================
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

// ================== PDF DOWNLOAD ==================
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

// ================== SCROLL & EXPOSURE ==================
function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
}

window.addExperience = addExperienceItem;
window.addEducation = addEducationItem;
window.removeSkill = removeSkill;
window.removeExperienceItem = removeExperienceItem;
window.removeEducationItem = removeEducationItem;
window.switchTab = switchTab;
window.scrollToSection = scrollToSection;
window.generateResume = generateResumePreview;
