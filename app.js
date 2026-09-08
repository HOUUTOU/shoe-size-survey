(() => {
  'use strict';
  const $ = id => document.getElementById(id), form = $('survey');
  const cfg = window.SIZE_STUDY_CONFIG || {}, endpoint = cfg.endpoint || '';
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint);
  let pending = null;
  for(let n=40;n<=64;n++){const option=document.createElement('option');option.value=(n/2).toFixed(1);option.textContent=option.value+' cm';$('size').append(option);}
  const other=document.createElement('option');other.value='other';other.textContent='その他';$('size').append(other);
  const show=(text,kind='')=>{$('notice').hidden=false;$('notice').textContent=text;$('notice').className='message '+kind;};
  $('size').addEventListener('change',()=>{const enabled=$('size').value==='other';$('otherSize').hidden=!enabled;$('otherSize').disabled=!enabled;$('otherSize').required=enabled;});
  if(!configured){$('submit').disabled=true;show('現在、受付開始の準備中です。担当者からの案内をお待ちください。');}
  const uid=()=>crypto.randomUUID();
  // 只查询不可猜测的回执ID；姓名、年龄等不进入查询字符串。
  function receipt(id){return new Promise(resolve=>{
    const callback='sizeReceipt_'+uid().replaceAll('-',''),script=document.createElement('script');let settled=false;
    const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);script.remove();delete window[callback];resolve(result);};
    window[callback]=result=>finish(result);script.onerror=()=>finish(null);
    const url=new URL(endpoint);url.searchParams.set('action','receipt');url.searchParams.set('record_id',id);url.searchParams.set('callback',callback);
    script.src=url.href;script.referrerPolicy='no-referrer';const timer=setTimeout(()=>finish(null),3500);document.head.append(script);
  });}
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(!configured||!form.reportValidity())return;
    const fields={name:$('name').value.trim(),gender:$('gender').value,age:Number($('age').value),size:Number($('size').value==='other'?$('otherSize').value:$('size').value),website:$('website').value};
    if(!fields.name){show('氏名を入力してください。','error');$('name').focus();return;}
    if(pending&&JSON.stringify(pending.fields)!==JSON.stringify(fields)){show('前回の保存状況が未確認です。内容を元に戻して再送するか、担当者にお問い合わせください。','error');return;}
    if(!pending)pending={fields,record_id:uid()};
    const payload={...fields,record_id:pending.record_id,version:cfg.version};
    $('submit').disabled=true;form.querySelectorAll('input,select').forEach(el=>el.disabled=true);$('submit').textContent='保存を確認しています…';show('回答を送信しています。この画面を閉じずにお待ちください。');
    try{
      await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(payload),cache:'no-store'}).catch(()=>null);
      let confirmed=false;
      for(let i=0;i<7;i++){const result=await receipt(payload.record_id);if(result&&result.ok&&result.accepted&&result.record_id===payload.record_id){confirmed=true;break;}if(result&&result.error){pending=null;throw new Error('入力内容を確認し、もう一度送信してください。');}await new Promise(r=>setTimeout(r,650));}
      if(!confirmed)throw new Error('保存を確認できませんでした。内容を変えずにもう一度送信してください。繰り返しても同じ回答は重複記録されません。');
      form.hidden=true;$('notice').hidden=true;$('success').hidden=false;$('receipt').textContent='受付番号：'+payload.record_id;pending=null;form.reset();
    }catch(error){show(error.message,'error');}
    finally{form.querySelectorAll('input,select').forEach(el=>el.disabled=false);$('otherSize').disabled=$('size').value!=='other';$('submit').disabled=false;$('submit').textContent='回答を送信する';}
  });
  $('next').addEventListener('click',()=>{form.hidden=false;$('success').hidden=true;$('otherSize').hidden=true;$('otherSize').disabled=true;$('otherSize').required=false;$('name').focus();});
})();
