// Enhanced script.js with proper template generation and bug fixes

const API_BASE_URL = 'http://localhost:5000';

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
    // Add default experience and education items on page load
    addExperienceItem();
    addEducationItem();
});

function initializeEventListeners() {
    // AI generation button
    const aiBtn = document.getElementById('generate-ai-btn');
    if (aiBtn) {
        aiBtn.addEventListener('click', generateAIContent);
    }

    // Template selection
    document.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', handleTemplateSelection);
    });

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.textContent.toLowerCase();
            switchTab(tabName);
        });
    });
    
    // Skill input
    const skillInput = document.getElementById('skillInput');
    if (skillInput) {
        skillInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && skillInput.value.trim()) {
                e.preventDefault();
                addSkill(skillInput.value.trim());
                skillInput.value = '';
            }
        });
    }
    
    // Generate resume button
    const generateBtn = document.querySelector('.generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateResumePreview);
    }

    // Download PDF button
    const downloadBtn = document.getElementById('download-pdf-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }

    // Add experience and education buttons (will be created dynamically)
    document.addEventListener('click', (e) => {
        if (e.target.textContent === 'Add Experience') {
            addExperienceItem();
        } else if (e.target.textContent === 'Add Education') {
            addEducationItem();
        }
    });
}

function initializeDefaultSkills() {
    const defaultSkills = ['JavaScript', 'Python', 'Project Management'];
    defaultSkills.forEach(skill => addSkill(skill));
}

function switchTab(tabName) {
    // Remove active class from all tabs and contents
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked tab
    const activeTab = Array.from(document.querySelectorAll('.tab')).find(tab => 
        tab.textContent.toLowerCase() === tabName
    );
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Add active class to corresponding content
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
}

async function generateAIContent() {
    const btn = document.getElementById('generate-ai-btn');
    const outputDiv = document.getElementById('ai-output');
    const role = document.getElementById('role').value.trim();
    const skills = document.getElementById('skills').value.trim();
    const jobDescription = document.getElementById('job-description').value.trim();

    if (!role || !skills) {
        outputDiv.innerHTML = '<div class="error">Please fill in the target role and your skills.</div>';
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
            outputDiv.innerHTML = `<div class="success"><strong>AI Generated Content:</strong><br><pre>${data.content}</pre></div>`;
        } else {
            outputDiv.innerHTML = `<div class="error">Error: ${data.error || data.message}</div>`;
        }
    } catch (error) {
        outputDiv.innerHTML = `<div class="error">Failed to connect to API: ${error.message}</div>`;
    } finally {
        btn.classList.remove('loading');
        btn.textContent = 'Generate AI Content';
    }
}

function handleTemplateSelection(e) {
    document.querySelectorAll('.template-card').forEach(card => card.classList.remove('selected'));
    e.currentTarget.classList.add('selected');
    
    const templateName = e.currentTarget.querySelector('.template-name').textContent.trim();
    formData.selectedTemplate = templateName.toLowerCase().includes('modern') ? 'modern' : 'classic';
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
    const index = formData.skills.indexOf(skillName);
    if (index > -1) {
        formData.skills.splice(index, 1);
        const skillTags = document.querySelectorAll('.skill-tag');
        skillTags.forEach(tag => {
            if (tag.textContent.includes(skillName)) {
                tag.remove();
            }
        });
    }
}

function addExperienceItem() {
    const experienceList = document.getElementById('experience-list');
    const experienceId = Date.now();
    const experienceItem = document.createElement('div');
    experienceItem.className = 'experience-item';
    experienceItem.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Job Title *</label>
                <input type="text" data-field="title" data-id="${experienceId}" placeholder="Software Engineer">
            </div>
            <div class="form-group">
                <label>Company *</label>
                <input type="text" data-field="company" data-id="${experienceId}" placeholder="Tech Corp">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Start Date *</label>
                <input type="month" data-field="startDate" data-id="${experienceId}">
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="month" data-field="endDate" data-id="${experienceId}">
            </div>
        </div>
        <div class="form-group">
            <label>Location</label>
            <input type="text" data-field="location" data-id="${experienceId}" placeholder="New York, NY">
        </div>
        <div class="form-group">
            <label>Description</label>
            <textarea data-field="description" data-id="${experienceId}" placeholder="Describe your responsibilities and achievements..."></textarea>
        </div>
        <button type="button" class="remove-btn" onclick="removeExperienceItem(${experienceId})">Remove</button>
    `;
    experienceList.appendChild(experienceItem);
    
    // Initialize experience object
    formData.experiences.push({
        id: experienceId,
        title: '',
        company: '',
        startDate: '',
        endDate: '',
        location: '',
        description: ''
    });

    // Add event listeners for the new inputs
    experienceItem.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('input', updateExperienceData);
    });
}

function removeExperienceItem(experienceId) {
    const experienceItem = document.querySelector(`[data-id="${experienceId}"]`).closest('.experience-item');
    if (experienceItem) {
        experienceItem.remove();
        formData.experiences = formData.experiences.filter(exp => exp.id !== experienceId);
    }
}

function updateExperienceData(e) {
    const field = e.target.getAttribute('data-field');
    const id = parseInt(e.target.getAttribute('data-id'));
    const value = e.target.value;
    
    const experience = formData.experiences.find(exp => exp.id === id);
    if (experience) {
        experience[field] = value;
    }
}

function addEducationItem() {
    const educationList = document.getElementById('education-list');
    const educationId = Date.now();
    const educationItem = document.createElement('div');
    educationItem.className = 'education-item';
    educationItem.innerHTML = `
        <div class="form-row">
            <div class="form-group">
                <label>Degree *</label>
                <input type="text" data-field="degree" data-id="${educationId}" placeholder="Bachelor of Science">
            </div>
            <div class="form-group">
                <label>Field of Study *</label>
                <input type="text" data-field="field" data-id="${educationId}" placeholder="Computer Science">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>School *</label>
                <input type="text" data-field="school" data-id="${educationId}" placeholder="University of Technology">
            </div>
            <div class="form-group">
                <label>Location</label>
                <input type="text" data-field="location" data-id="${educationId}" placeholder="New York, NY">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Start Date</label>
                <input type="month" data-field="startDate" data-id="${educationId}">
            </div>
            <div class="form-group">
                <label>End Date</label>
                <input type="month" data-field="endDate" data-id="${educationId}">
            </div>
        </div>
        <div class="form-group">
            <label>GPA</label>
            <input type="text" data-field="gpa" data-id="${educationId}" placeholder="3.8">
        </div>
        <button type="button" class="remove-btn" onclick="removeEducationItem(${educationId})">Remove</button>
    `;
    educationList.appendChild(educationItem);
    
    // Initialize education object
    formData.education.push({
        id: educationId,
        degree: '',
        field: '',
        school: '',
        location: '',
        startDate: '',
        endDate: '',
        gpa: ''
    });

    // Add event listeners for the new inputs
    educationItem.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', updateEducationData);
    });
}

function removeEducationItem(educationId) {
    const educationItem = document.querySelector(`[data-id="${educationId}"]`).closest('.education-item');
    if (educationItem) {
        educationItem.remove();
        formData.education = formData.education.filter(edu => edu.id !== educationId);
    }
}

function updateEducationData(e) {
    const field = e.target.getAttribute('data-field');
    const id = parseInt(e.target.getAttribute('data-id'));
    const value = e.target.value;
    
    const education = formData.education.find(edu => edu.id === id);
    if (education) {
        education[field] = value;
    }
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
    
    if (formData.selectedTemplate === 'modern') {
        resumeContent.innerHTML = generateModernTemplate();
    } else {
        resumeContent.innerHTML = generateClassicTemplate();
    }
}

function generateModernTemplate() {
    const { personal, experiences, education, skills } = formData;
    
    return `
        <div class="resume-modern">
            <div class="sidebar">
                <div class="profile-section">
                    <div class="profile-placeholder">${personal.firstName ? personal.firstName.charAt(0) : '?'}</div>
                    <h3>${personal.firstName || 'First'} ${personal.lastName || 'Last'}</h3>
                </div>
                
                <div class="sidebar-section">
                    <h3>Contact</h3>
                    ${personal.email ? `<p>📧 ${personal.email}</p>` : ''}
                    ${personal.phone ? `<p>📞 ${personal.phone}</p>` : ''}
                    ${personal.location ? `<p>📍 ${personal.location}</p>` : ''}
                    ${personal.website ? `<p>🌐 ${personal.website}</p>` : ''}
                    ${personal.linkedin ? `<p>💼 ${personal.linkedin}</p>` : ''}
                </div>
                
                ${skills.length > 0 ? `
                <div class="sidebar-section">
                    <h3>Skills</h3>
                    <div class="skills-list">
                        ${skills.map(skill => `<div class="skill-item">${skill}</div>`).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="main-content">
                <div class="header-section">
                    <h1>${personal.firstName || 'First'} ${personal.lastName || 'Last'}</h1>
                    <h2>Professional</h2>
                    ${personal.summary ? `<p class="summary">${personal.summary}</p>` : ''}
                </div>
                
                ${experiences.length > 0 ? `
                <div class="content-section">
                    <div class="section-icon">💼</div>
                    <div>
                        <h3>Experience</h3>
                        ${experiences.map(exp => `
                            <div class="experience-entry">
                                <h4>${exp.title || 'Job Title'} - ${exp.company || 'Company'}</h4>
                                <div class="date-range">${formatDate(exp.startDate)} - ${exp.endDate ? formatDate(exp.endDate) : 'Present'}</div>
                                ${exp.location ? `<p><strong>Location:</strong> ${exp.location}</p>` : ''}
                                ${exp.description ? `<p>${exp.description}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${education.length > 0 ? `
                <div class="content-section">
                    <div class="section-icon">🎓</div>
                    <div>
                        <h3>Education</h3>
                        ${education.map(edu => `
                            <div class="education-entry">
                                <h4>${edu.degree || 'Degree'} in ${edu.field || 'Field'}</h4>
                                <div class="date-range">${formatDate(edu.startDate)} - ${edu.endDate ? formatDate(edu.endDate) : 'Present'}</div>
                                <p><strong>${edu.school || 'School'}</strong></p>
                                ${edu.location ? `<p>${edu.location}</p>` : ''}
                                ${edu.gpa ? `<p>GPA: ${edu.gpa}</p>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function generateClassicTemplate() {
    const { personal, experiences, education, skills } = formData;
    
    return `
        <div class="resume-classic">
            <div class="sidebar">
                <div class="profile-section">
                    <div class="profile-image-placeholder">${personal.firstName ? personal.firstName.charAt(0) : '?'}</div>
                </div>
                
                <div class="sidebar-section">
                    <h3>Contact</h3>
                    ${personal.email ? `<div class="contact-item"><span class="icon">📧</span> ${personal.email}</div>` : ''}
                    ${personal.phone ? `<div class="contact-item"><span class="icon">📞</span> ${personal.phone}</div>` : ''}
                    ${personal.location ? `<div class="contact-item"><span class="icon">📍</span> ${personal.location}</div>` : ''}
                    ${personal.website ? `<div class="contact-item"><span class="icon">🌐</span> ${personal.website}</div>` : ''}
                    ${personal.linkedin ? `<div class="contact-item"><span class="icon">💼</span> LinkedIn</div>` : ''}
                </div>
                
                ${skills.length > 0 ? `
                <div class="sidebar-section">
                    <h3>Skills</h3>
                    <div class="skills-classic">
                        ${skills.map(skill => `
                            <div class="skill-item">
                                <div class="skill-name">${skill}</div>
                                <div class="skill-bar">
                                    <div class="skill-progress"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            <div class="main-content">
                <div class="header-section">
                    <h1>${personal.firstName || 'First'} ${personal.lastName || 'Last'}</h1>
                    <h2>Professional</h2>
                    ${personal.summary ? `<p class="summary">${personal.summary}</p>` : ''}
                </div>
                
                ${experiences.length > 0 ? `
                <div class="content-section">
                    <h3>Experience</h3>
                    ${experiences.map(exp => `
                        <div class="experience-entry">
                            <h4>${exp.title || 'Job Title'} - ${exp.company || 'Company'}</h4>
                            <div class="date-range">${formatDate(exp.startDate)} - ${exp.endDate ? formatDate(exp.endDate) : 'Present'}</div>
                            ${exp.location ? `<p><strong>Location:</strong> ${exp.location}</p>` : ''}
                            ${exp.description ? `<p>${exp.description}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
                
                ${education.length > 0 ? `
                <div class="content-section">
                    <h3>Education</h3>
                    ${education.map(edu => `
                        <div class="education-entry">
                            <h4>${edu.degree || 'Degree'} in ${edu.field || 'Field'}</h4>
                            <div class="date-range">${formatDate(edu.startDate)} - ${edu.endDate ? formatDate(edu.endDate) : 'Present'}</div>
                            <p><strong>${edu.school || 'School'}</strong></p>
                            ${edu.location ? `<p>${edu.location}</p>` : ''}
                            ${edu.gpa ? `<p>GPA: ${edu.gpa}</p>` : ''}
                        </div>
                    `).join('')}
                </div>
                ` : ''}
            </div>
        </div>
    `;
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
            console.error('Resume element not found');
            return;
        }

        const canvas = await html2canvas(resumeElement, { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff',
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${formData.personal.firstName || 'Resume'}_${formData.personal.lastName || 'Document'}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

// Scroll to section function for navigation
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Global functions for onclick handlers
window.addExperience = addExperienceItem;
window.addEducation = addEducationItem;
window.removeSkill = removeSkill;
window.removeExperienceItem = removeExperienceItem;
window.removeEducationItem = removeEducationItem;
window.switchTab = switchTab;
window.scrollToSection = scrollToSection;
window.generateResume = generateResumePreview;