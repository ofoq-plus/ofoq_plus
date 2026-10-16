// Small backend for OFOQ PLUS AI day reflection. Keep your API key on the server.
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.OPENAI_API_KEY;
const ROOT = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.txt':'text/plain; charset=utf-8'};
function send(res,status,body,type='application/json; charset=utf-8'){res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff'});res.end(type.startsWith('application/json')?JSON.stringify(body):body);}
const server=http.createServer(async(req,res)=>{
 if(req.method==='POST'&&req.url==='/api/evaluate-day'){
  if(!API_KEY){send(res,503,{error:'مفتاح OPENAI_API_KEY موش موجود في إعدادات الخادم.'});return;}
  let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>20000){req.destroy();}});
  req.on('end',async()=>{try{
   const d=JSON.parse(raw||'{}');
   const goal=String(d.goal||'').slice(0,3000), events=String(d.events||'').slice(0,8000), mood=String(d.mood||'').slice(0,100);
   if(!goal&&!events){send(res,400,{error:'اكتب هدفك أو أحداث نهارك أولًا.'});return;}
   const prompt=`حلّل نهار المستخدم بلطف وباللهجة التونسية. الهدف: ${goal||'لم يذكر هدفًا'}. ما حدث: ${events||'لم يذكر أحداثًا'}. الإحساس المختار: ${mood||'غير محدد'}. أعطِ تقييمًا تقريبيًا من A إلى F مع تفسير قصير منصف، اذكر الإيجابيات وما يمكن تحسينه، ثم نصيحة عملية صغيرة لغدًا. لا تحكم على قيمة الشخص، ولا تعاقبه على يوم صعب، ولا تفترض معلومات غير مذكورة. إذا كان النص يشير لضيق شديد، كن داعمًا وشجّعه على التحدث مع شخص بالغ موثوق. اكتب بشكل مختصر وواضح.`;
   const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',input:prompt,max_output_tokens:350})});
   const j=await r.json();if(!r.ok){send(res,502,{error:j.error?.message||'خدمة الذكاء الاصطناعي رجّعت خطأ.'});return;}
   let analysis=(j.output||[]).flatMap(item=>item.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n').trim();
   send(res,200,{analysis:analysis||'ما وصلناش نصّ تقييم واضح. جرّب مرّة أخرى.'});
  }catch(e){send(res,400,{error:'تعذّر فهم الطلب أو الاتصال بالخدمة.'});}});return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Method not allowed'});return;}
 let urlPath=decodeURIComponent((req.url||'/').split('?')[0]);if(urlPath==='/')urlPath='/index.html';const file=path.resolve(ROOT,'.'+urlPath);if(!file.startsWith(ROOT+path.sep)&&file!==path.join(ROOT,'index.html')){send(res,403,{error:'Forbidden'});return;}
 fs.readFile(file,(err,data)=>{if(err){send(res,404,{error:'File not found'});return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else res.end(data);});
});
server.listen(PORT,()=>console.log(`OFOQ PLUS running at http://localhost:${PORT}`));
