/* ================================
   PORTAL JAVASCRIPT - SECURE STORAGE
   ================================ */

let currentLanguage = 'ar';
let currentStep = 1;
const MAX_SOURCE_IMAGE_SIZE = 15 * 1024 * 1024;
const TARGET_IMAGE_SIZE = 1.5 * 1024 * 1024;
const MAX_UPLOAD_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 2200;
const formData = { personalInfo: {}, contactCareer: {}, grantDetails: {}, bankingInfo: {}, attachments: {} };

document.addEventListener('DOMContentLoaded', function() {
    setupLanguageSwitchers(); setupFormListeners(); setupFileUpload(); setupIBANFormatting(); setupOtherFields();
    document.querySelectorAll('input:not([type=file]), select, textarea').forEach(function(field){
        field.addEventListener('blur',function(){ if(field.hasAttribute('required') || field.value.trim()) validateField(field); });
    });
});

function setupLanguageSwitchers(){document.querySelectorAll('.lang-btn').forEach(btn=>btn.addEventListener('click',function(){switchLanguage(this.getAttribute('data-lang'));}));}
function switchLanguage(lang){currentLanguage=lang;document.querySelectorAll('[data-en][data-ar]').forEach(el=>{const text=lang==='en'?el.getAttribute('data-en'):el.getAttribute('data-ar');if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')el.placeholder=text;else el.textContent=text;});document.documentElement.lang=lang;document.documentElement.dir=lang==='en'?'ltr':'rtl';document.querySelectorAll('.lang-btn').forEach(btn=>btn.classList.toggle('active',btn.getAttribute('data-lang')===lang));}
function nextStep(){if(validateStep(currentStep)){saveStepData(currentStep);currentStep=Math.min(currentStep+1,5);updateProgressBar();showStep(currentStep);}}
function prevStep(){saveStepData(currentStep);currentStep=Math.max(currentStep-1,1);updateProgressBar();showStep(currentStep);}
function showStep(stepNumber){document.querySelectorAll('.form-step').forEach(s=>s.classList.remove('active'));const step=document.getElementById('formStep'+stepNumber);if(step)step.classList.add('active');const container=document.querySelector('.portal-container');if(container)container.scrollIntoView({behavior:'smooth',block:'start'});}
function updateProgressBar(){const progress=document.getElementById('progressFill');if(progress)progress.style.width=(currentStep/5*100)+'%';for(let i=1;i<=5;i++){const el=document.getElementById('step'+i);if(!el)continue;el.classList.remove('active','completed');if(i<currentStep)el.classList.add('completed');else if(i===currentStep)el.classList.add('active');}}
function validateStep(stepNumber){let isValid=true;const step=document.getElementById('formStep'+stepNumber);if(!step)return false;step.querySelectorAll('input, select, textarea').forEach(function(input){if(input.type==='file'||input.type==='checkbox')return;if(input.hasAttribute('required')||input.value.trim())if(!validateField(input))isValid=false;});if(stepNumber===5){['idCardFront','idCardBack'].forEach(function(id){const errorEl=document.getElementById(id+'Error');if(!formData.attachments[id]){if(errorEl)errorEl.textContent=currentLanguage==='ar'?'يرجى رفع هذه الصورة':'Please upload this photo';isValid=false;}else if(errorEl)errorEl.textContent='';});const terms=document.getElementById('terms');if(terms&&!terms.checked)isValid=false;}return isValid;}
function validateField(field){const value=field.value.trim();const group=field.closest('.form-group');const errorEl=group&&group.querySelector('.error-message');let isValid=true,msg='';if(!value){if(field.hasAttribute('required')){isValid=false;msg=currentLanguage==='ar'?'هذا الحقل مطلوب':'This field is required';}}else if(field.type==='email'&&!/^\S+@\S+\.\S+$/.test(value)){isValid=false;msg=currentLanguage==='ar'?'البريد الإلكتروني غير صحيح':'Invalid email';}else if(field.name==='phone'&&!/^\+?[0-9\s\-\(\)\.,]{10,30}$/.test(value)){isValid=false;msg=currentLanguage==='ar'?'رقم الهاتف غير صحيح':'Invalid phone number';}else if(field.name==='iban'&&!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,41}$/.test(value.replace(/\s/g,''))){isValid=false;msg=currentLanguage==='ar'?'رقم الآيبان غير صحيح (حتى 45 حرفًا ورقمًا)':'Invalid IBAN (up to 45 letters and numbers)';}else if((field.name==='grantAmount'||field.name==='income')&&(isNaN(value)||Number(value)<=0)){isValid=false;msg=currentLanguage==='ar'?'يجب أن يكون رقماً موجباً':'Must be a positive number';}field.classList.toggle('error',!isValid);if(errorEl)errorEl.textContent=isValid?'':msg;return isValid;}
function saveStepData(stepNumber){const step=document.getElementById('formStep'+stepNumber);const groups=[null,formData.personalInfo,formData.contactCareer,formData.grantDetails,formData.bankingInfo];const group=groups[stepNumber];if(!step||!group)return;step.querySelectorAll('input, select, textarea').forEach(function(input){if(input.type==='file'||input.type==='checkbox')return;if(input.name)group[input.name]=input.value;});}
function setupFileUpload(){['idCardFront','idCardBack'].forEach(function(id){const input=document.getElementById(id),preview=document.getElementById(id+'Preview'),errorEl=document.getElementById(id+'Error'),area=document.getElementById(id+'Area');if(!input)return;input.addEventListener('change',async function(){const file=this.files&&this.files[0];if(!file)return;try{const optimized=await prepareIdentityImage(file,errorEl);formData.attachments[id]=optimized;if(preview){preview.textContent='✓ '+optimized.name+' ('+formatBytes(optimized.size)+')';preview.style.display='block';}if(area)area.style.borderColor='#27ae60';}catch(error){if(errorEl)errorEl.textContent=error.message;this.value='';delete formData.attachments[id];}});});}
function formatBytes(bytes){if(bytes<1024)return bytes+' B';if(bytes<1024*1024)return Math.round(bytes/1024)+' KB';return (bytes/(1024*1024)).toFixed(1)+' MB';}
function prepareIdentityImage(file,errorEl){
    if(file.size>MAX_SOURCE_IMAGE_SIZE) return Promise.reject(new Error('حجم الصورة الأصلية كبير جدًا. الحد الأقصى 15 ميجابايت.'));
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)) return Promise.reject(new Error('يُسمح فقط بصور JPG أو PNG أو WebP'));
    if(file.size<=TARGET_IMAGE_SIZE) return Promise.resolve(file);
    if(typeof createImageBitmap==='function') return compressWithBitmap(file);
    return compressWithImageElement(file);
}
async function compressWithBitmap(file){
    const bitmap=await createImageBitmap(file);
    try{return await compressImageBitmap(bitmap,file.type,file.name);}finally{bitmap.close();}
}
function compressWithImageElement(file){
    return new Promise(function(resolve,reject){
        const url=URL.createObjectURL(file);
        const img=new Image();
        img.onload=async function(){URL.revokeObjectURL(url);try{resolve(await compressImageElement(img,file.type,file.name));}catch(e){reject(e);}};
        img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('تعذر قراءة الصورة'));};
        img.src=url;
    });
}
async function compressImageBitmap(source,mimeType,name){
    let width=source.width,height=source.height;
    const scale=Math.min(1,MAX_IMAGE_DIMENSION/Math.max(width,height));
    width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(source,0,0,width,height);
    return compressCanvas(canvas,name);
}
async function compressImageElement(source,mimeType,name){
    let width=source.naturalWidth,height=source.naturalHeight;
    const scale=Math.min(1,MAX_IMAGE_DIMENSION/Math.max(width,height));
    width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{alpha:false});ctx.drawImage(source,0,0,width,height);
    return compressCanvas(canvas,name);
}
async function compressCanvas(canvas,name){
    let quality=0.9;
    let blob=await canvasToBlob(canvas,'image/jpeg',quality);
    while(blob.size>TARGET_IMAGE_SIZE && quality>0.62){quality-=0.06;blob=await canvasToBlob(canvas,'image/jpeg',quality);}
    if(blob.size>MAX_UPLOAD_IMAGE_SIZE)throw new Error('تعذر تقليل حجم الصورة إلى الحجم المناسب. اختر صورة أوضح بحجم أقل.');
    const safeName=(String(name||'identity').replace(/\.[^.]+$/,'')||'identity')+'.jpg';
    return new File([blob],safeName,{type:'image/jpeg',lastModified:Date.now()});
}
function canvasToBlob(canvas,type,quality){return new Promise(function(resolve,reject){canvas.toBlob(function(blob){if(blob)resolve(blob);else reject(new Error('تعذر تجهيز الصورة'));},type,quality);});}
function removeFile(id){const input=document.getElementById(id),preview=document.getElementById(id+'Preview'),area=document.getElementById(id+'Area');if(input)input.value='';if(preview){preview.style.display='none';preview.textContent='';}if(area)area.style.borderColor='';delete formData.attachments[id];}
function setupOtherFields(){const countrySelect=document.getElementById('country'),otherCountryGroup=document.getElementById('otherCountryGroup'),otherCountryInput=document.getElementById('otherCountry');if(countrySelect&&otherCountryGroup&&otherCountryInput){countrySelect.addEventListener('change',function(){const other=this.value==='OTHER';otherCountryGroup.style.display=other?'block':'none';otherCountryInput.required=other;if(!other)otherCountryInput.value='';});}const bankSelect=document.getElementById('bankName'),otherBankGroup=document.getElementById('otherBankGroup'),otherBankInput=document.getElementById('otherBank');if(bankSelect&&otherBankGroup&&otherBankInput){bankSelect.addEventListener('change',function(){const other=this.value==='OTHER';otherBankGroup.style.display=other?'block':'none';otherBankInput.required=other;if(!other)otherBankInput.value='';});}}
function setupIBANFormatting(){const iban=document.getElementById('iban');if(!iban)return;iban.addEventListener('input',function(){let v=this.value.toUpperCase().replace(/\s/g,'').replace(/[^A-Z0-9]/g,'').slice(0,45);const groups=v.match(/.{1,4}/g);this.value=groups?groups.join(' '):v;});}
function withTimeout(promise,ms,message){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(message)),ms))]);}
function setSubmitStatus(text){const btn=document.getElementById('submitBtn');if(btn)btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> '+text;}
async function uploadPrivateIdentityImage(applicationId,fieldName,file){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),30000);
    try{
        const url='/api/upload-image?applicationId='+encodeURIComponent(applicationId)+'&fieldName='+encodeURIComponent(fieldName);
        const response=await fetch(url,{method:'POST',headers:{'Content-Type':file.type,'X-File-Size':String(file.size)},body:file,signal:controller.signal,cache:'no-store'});
        const result=await response.json().catch(()=>({}));
        if(!response.ok||!result.ok)throw new Error(result.error||'IMAGE_UPLOAD_FAILED');
        return{pathname:result.pathname,contentType:result.contentType||file.type,size:result.size||file.size};
    }catch(error){
        if(error.name==='AbortError')throw new Error('انتهت مهلة رفع '+(fieldName==='idCardFront'?'الصورة الأمامية':'الصورة الخلفية'));
        throw error;
    }finally{clearTimeout(timeout);}
}
function collectApplicationPayload(){saveStepData(1);saveStepData(2);saveStepData(3);saveStepData(4);return{personalInfo:formData.personalInfo,contactCareer:formData.contactCareer,grantDetails:formData.grantDetails,bankingInfo:formData.bankingInfo};}
async function submitApplicationSecurely(txNumber){const applicationId=crypto.randomUUID();const front=formData.attachments.idCardFront,back=formData.attachments.idCardBack;if(!front||!back)throw new Error('يرجى رفع صورتي الهوية');setSubmitStatus('جاري رفع الصور...');const [frontResult,backResult]=await Promise.all([uploadPrivateIdentityImage(applicationId,'idCardFront',front),uploadPrivateIdentityImage(applicationId,'idCardBack',back)]);setSubmitStatus('جاري حفظ الطلب...');const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);try{const response=await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({applicationId,transactionNumber:txNumber,payload:collectApplicationPayload(),images:{idCardFront:frontResult,idCardBack:backResult}}),signal:controller.signal,cache:'no-store'});const result=await response.json().catch(()=>({}));if(!response.ok||!result.ok){const err=new Error(result.error||'تعذر حفظ الطلب');err.stage=result.stage;throw err;}return result;}catch(error){if(error.name==='AbortError')throw new Error('انتهت مهلة حفظ الطلب. يرجى المحاولة مرة أخرى.');throw error;}finally{clearTimeout(timer);}}
function setupFormListeners(){const submitBtn=document.getElementById('submitBtn');if(!submitBtn)return;submitBtn.addEventListener('click',async function(){if(submitBtn.disabled||!validateStep(5))return;saveStepData(5);submitBtn.disabled=true;setSubmitStatus('جاري بدء الحفظ...');const txNumber='WA-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*90000)+10000);let saved=false;let saveError=null;try{await submitApplicationSecurely(txNumber);saved=true;}catch(error){console.error('Application submission error:',error);saveError=error;}submitBtn.disabled=false;submitBtn.innerHTML='<i class="fas fa-check-circle"></i> تقديم الطلب';if(!saved){const detail=saveError?.stage?'\n['+saveError.stage+']':'';alert((saveError?.message||'تعذر حفظ الطلب. يرجى المحاولة مرة أخرى.')+detail);return;}const msg=encodeURIComponent('مرحباً، لقد قمت بتقديم طلب منحة.\n'+'رقم المعاملة: '+txNumber+'\n'+'الاسم: '+(formData.personalInfo.fullName||'')+'\n'+'الهاتف: '+(formData.contactCareer.phone||'')+'\n'+'نوع المنحة: '+(formData.grantDetails.grantType||'')+'\n'+'المبلغ: '+(formData.grantDetails.grantAmount||'')+' ريال');const waUrl='whatsapp://send?phone=966545239928&text='+msg,waWeb='https://wa.me/966545239928?text='+msg;try{const link=document.createElement('a');link.href=waUrl;link.click();}catch(e){}setTimeout(function(){try{window.open(waWeb,'_blank');}catch(e){}},1000);const transactionEl=document.getElementById('transactionNumber'),modal=document.getElementById('successModal');if(transactionEl)transactionEl.textContent=txNumber;if(modal)modal.classList.add('active');});}
function redirectToWhatsApp(){const modal=document.getElementById('successModal'),form=document.getElementById('grantForm');if(modal)modal.classList.remove('active');if(form)form.reset();formData.attachments={};['idCardFront','idCardBack'].forEach(removeFile);currentStep=1;updateProgressBar();showStep(1);}
