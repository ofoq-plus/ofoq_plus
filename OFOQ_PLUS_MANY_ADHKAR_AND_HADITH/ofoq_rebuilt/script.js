const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const surahs = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
const surahSelect=$('#surahSelect'); surahs.forEach((name,i)=>{if(i===0)return;const opt=document.createElement('option');opt.value=String(i+1);opt.textContent=String(i+1).padStart(3,'0')+' — سورة '+name;surahSelect.append(opt)});
const reciter=$('#reciterSelect'), audio=$('#quranAudio');
// Let visitors choose between reading the Mushaf themselves and listening to reciters.
(()=>{
 const readBtn=$('#readMyselfBtn'), listenBtn=$('#listenRecitersBtn');
 const controls=$('#reciterControls'), hint=$('#readModeHint');
 if(!readBtn||!listenBtn||!controls||!hint)return;
 function setQuranMode(mode){
  const reading=mode==='read';
  controls.hidden=reading;hint.hidden=!reading;
  readBtn.classList.toggle('active',reading);listenBtn.classList.toggle('active',!reading);
  readBtn.setAttribute('aria-pressed',String(reading));listenBtn.setAttribute('aria-pressed',String(!reading));
  if(reading){audio.pause();}
  else {$('#surahSelect').focus({preventScroll:true});}
 }
 readBtn.addEventListener('click',()=>{setQuranMode('read');document.querySelector('#quran-reader')?.scrollIntoView({behavior:'smooth',block:'start'});});
 listenBtn.addEventListener('click',()=>setQuranMode('listen'));
 setQuranMode('read');
})();
// Status is visible and accessible; do not blame the user's internet for every audio error.
const audioStatus=document.createElement('p');
audioStatus.id='audioStatus'; audioStatus.className='muted'; audioStatus.setAttribute('role','status'); audioStatus.setAttribute('aria-live','polite');
audioStatus.style.cssText='margin:8px 0 12px;min-height:1.5em;line-height:1.8';
audio.insertAdjacentElement('afterend',audioStatus);
let ayahQueue=[], ayahIndex=0, queueMode=false, currentPlayToken=0;
const editions={
  'ar.alafasy':'ar.alafasy','ar.sudais':'ar.sudais','ar.husary':'ar.husary',
  'ar.minshawi':'ar.minshawi','ar.minshawimujawwad':'ar.minshawimujawwad',
  'ar.shuraim':'ar.shuraim','ar.abdulbasit':'ar.abdulbasit',
  'ar.abdulbasitmujawwad':'ar.abdulbasitmujawwad','ar.ajamy':'ar.ajamy',
  'ar.hudhaify':'ar.hudhaify','ar.muhammadayoub':'ar.muhammadayoub',
  'ar.muhammadjibreel':'ar.muhammadjibreel','ar.mahermuaiqly':'ar.mahermuaiqly'
};
function showAudioStatus(message){audioStatus.textContent=message;}
function setBusy(busy){const btn=$('#playSurah');btn.disabled=busy;btn.textContent=busy?'⏳ جاري تحضير التلاوة…':'▶ استمع للسورة';}
function playCurrentAyah(token){
  if(token!==currentPlayToken || !queueMode) return;
  if(ayahIndex>=ayahQueue.length){queueMode=false;setBusy(false);$('#playSurah').textContent='▶ استمع للسورة';showAudioStatus('اكتملت تلاوة السورة. تقبّل الله منك.');return;}
  audio.src=ayahQueue[ayahIndex];
  audio.play().then(()=>showAudioStatus(`جاري تشغيل الآية ${ayahIndex+1} من ${ayahQueue.length}`)).catch(()=>{
    queueMode=false;setBusy(false);showAudioStatus('تعذّر تشغيل هذا الملف الصوتي. جرّب قارئًا آخر أو أعد المحاولة لاحقًا.');
  });
}
audio.addEventListener('ended',()=>{if(queueMode){ayahIndex++;playCurrentAyah(currentPlayToken);}});
// Keep native player errors from replacing the more specific message shown by the loader.
audio.addEventListener('error',()=>{if(audio.src && !queueMode && !$('#playSurah').disabled && !audio.dataset.fallbackLoading){showAudioStatus('تعذّر تحميل الملف الصوتي من المصدر. جرّب قارئًا آخر أو أعد المحاولة لاحقًا.');}});
async function loadAyahQueue(surahNumber,edition,token){
  const apiEdition=editions[edition] || edition;
  const urls=[`https://api.alquran.cloud/v1/surah/${surahNumber}/${encodeURIComponent(apiEdition)}`,`https://alquran.api.islamic.network/v1/surah/${surahNumber}/${encodeURIComponent(apiEdition)}`];
  let lastError;
  for(const url of urls){
    try{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),12000);
      let response;
      try{response=await fetch(url,{signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timeout);}
      if(!response.ok)throw new Error('http');
      const payload=await response.json();
      const ayahs=payload?.data?.ayahs;
      if(payload.code!==200 || !Array.isArray(ayahs) || !ayahs.length || !ayahs.every(a=>a.audio))throw new Error('audio');
      if(token!==currentPlayToken)return false;
      ayahQueue=ayahs.map(a=>a.audio);ayahIndex=0;queueMode=true;setBusy(false);$('#playSurah').textContent='▶ إعادة تشغيل السورة';playCurrentAyah(token);return true;
    }catch(error){lastError=error;}
  }
  throw lastError||new Error('audio unavailable');
}
$('#playSurah').addEventListener('click',async()=>{
  const token=++currentPlayToken;
  const surahNumber=Number(surahSelect.value),edition=reciter.value;
  queueMode=false;ayahQueue=[];ayahIndex=0;audio.pause();audio.removeAttribute('src');audio.load();setBusy(true);showAudioStatus('جاري تجهيز التلاوة…');
  try{
    // Use the full-surah source for Maher Al-Muaiqly, with API fallback if that host is unavailable.
    if(edition==='ar.mahermuaiqly'){
      audio.dataset.fallbackLoading='1';
      const fullUrl=`https://download.quranicaudio.com/quran/maher_256/${String(surahNumber).padStart(3,'0')}.mp3`;
      audio.src=fullUrl;audio.load();
      try{
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('timeout')),10000);
          const clean=()=>{clearTimeout(timer);audio.removeEventListener('canplay',ok);audio.removeEventListener('error',bad);};
          const ok=()=>{clean();resolve();};const bad=()=>{clean();reject(new Error('source'));};
          audio.addEventListener('canplay',ok,{once:true});audio.addEventListener('error',bad,{once:true});
        });
        if(token!==currentPlayToken)return;
        await audio.play();audio.dataset.fallbackLoading='';setBusy(false);showAudioStatus('القارئ: الشيخ ماهر المعيقلي');return;
      }catch(e){audio.pause();audio.removeAttribute('src');audio.load();audio.dataset.fallbackLoading='';}
    }
    await loadAyahQueue(surahNumber,edition,token);
  }catch(error){
    if(token!==currentPlayToken)return;
    queueMode=false;setBusy(false);showAudioStatus('المصدر الصوتي للقارئ هذا ما جاوبش توّا. جرّب قارئًا آخر أو أعد المحاولة بعد قليل.');
  }
});
const verses=[['﴿ فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ﴾','الشرح: 5'],['﴿ وَهُوَ مَعَكُمْ أَيْنَ مَا كُنْتُمْ ﴾','الحديد: 4'],['﴿ وَاذْكُرُونِي أَذْكُرْكُمْ ﴾','البقرة: 152'],['﴿ إِنَّ اللَّهَ مَعَ الصَّابِرِينَ ﴾','البقرة: 153'],['﴿ وَإِلَىٰ رَبِّكَ فَارْغَبْ ﴾','الشرح: 8']];let verseIndex=0;$('#newVerse').addEventListener('click',()=>{verseIndex=(verseIndex+1)%verses.length;$('.verse-card p').textContent=verses[verseIndex][0];$('.verse-card span').textContent=verses[verseIndex][1]});
const prayerTimes={Tunis:['05:00','06:25','12:15','15:35','18:05','19:25'],Sfax:['04:55','06:20','12:10','15:30','18:00','19:20'],Sousse:['04:58','06:23','12:13','15:33','18:03','19:23'],Kairouan:['04:58','06:23','12:13','15:33','18:03','19:23'],Bizerte:['05:02','06:27','12:17','15:37','18:07','19:27'],Gabes:['04:52','06:17','12:07','15:27','17:57','19:17']};
const prayerNames=['الفجر','الشروق','الظهر','العصر','المغرب','العشاء'];
function renderTimes(times, note){$('#prayerTimes').innerHTML=prayerNames.map((n,i)=>`<div><span>${n}</span><b>${times[i]||'—'}</b></div>`).join('');const n=$('#prayerNote');if(n)n.textContent=note;}
async function loadPrayerTimes(){const city=$('#citySelect').value;renderTimes(prayerTimes[city],'جاري جلب مواقيت اليوم من خدمة مواقيت الصلاة…');try{const d=new Date();const date=`${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;const url=`https://api.aladhan.com/v1/timingsByCity/${date}?city=${encodeURIComponent(city)}&country=Tunisia&method=3`;const res=await fetch(url,{signal:AbortSignal.timeout(9000)});if(!res.ok)throw new Error('network');const j=await res.json();const t=j?.data?.timings;if(j.code!==200||!t)throw new Error('data');const vals=[t.Fajr,t.Sunrise,t.Dhuhr,t.Asr,t.Maghrib,t.Isha].map(x=>String(x||'').split(' ')[0]);if(vals.some(x=>!/^\d{2}:\d{2}$/.test(x)))throw new Error('format');renderTimes(vals,`مواقيت اليوم من خدمة AlAdhan لمدينة ${city}. قد تختلف دقائق حسب طريقة الحساب والجهة المحلية؛ تحقّق من جامعك.`);}catch(e){renderTimes(prayerTimes[city],'تعذّر جلب المواقيت الحيّة؛ المعروض أوقات تقريبية احتياطية، تحقّق من تقويم جامعك المحلي.');}}
$('#citySelect').addEventListener('change',loadPrayerTimes);loadPrayerTimes();
// Adhan reminder: browsers require a user gesture to unlock audio. It works while this page stays open and awake.
(()=>{
 const audioEl=$('#adhanAudio'), enableBtn=$('#enableAdhanBtn'), testBtn=$('#testAdhanBtn'), status=$('#adhanStatus');
 if(!audioEl||!enableBtn||!testBtn||!status)return;
 let enabled=false;
 const fired=new Set();
 function prayerEntries(){
  const labels=['الفجر','الظهر','العصر','المغرب','العشاء'];
  const cells=$$('#prayerTimes > div');
  const wanted=[0,2,3,4,5];
  return wanted.map((idx,i)=>({name:labels[i],time:cells[idx]?.querySelector('b')?.textContent?.trim()}));
 }
 enableBtn.addEventListener('click',async()=>{
  try{audioEl.volume=0.01;await audioEl.play();audioEl.pause();audioEl.currentTime=0;audioEl.volume=1;enabled=true;enableBtn.textContent='الأذان مفعّل ✓';status.textContent='تمّ تفعيل الصوت. يلزم تبقي الصفحة محلولة، والصوت مسموح في الجهاز.';}
  catch(e){enabled=false;status.textContent='المتصفّح منع الصوت. اضغط «جرّب الصوت» واسمح بالصوت، ثم عاود التفعيل.';}
 });
 testBtn.addEventListener('click',async()=>{try{audioEl.currentTime=0;await audioEl.play();status.textContent='الأذان قاعد يتشغّل للتجربة.';}catch(e){status.textContent='ما نجّمش نشغّل الصوت. تأكّد من الإنترنت والصوت في الجهاز.';}});
 function checkAdhan(){
  if(!enabled||document.hidden)return;
  const now=new Date();const hhmm=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  for(const p of prayerEntries()){
   if(!p.time||p.time!==hhmm)continue;
   const key=`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}-${$('#citySelect').value}-${p.name}-${p.time}`;
   if(fired.has(key))continue;
   fired.add(key);audioEl.currentTime=0;audioEl.play().then(()=>{status.textContent=`حان وقت ${p.name} — الأذان قاعد يتشغّل.`}).catch(()=>{status.textContent=`دخل وقت ${p.name}، أمّا المتصفّح منع تشغيل الأذان. افتح الصفحة واضغط تفعيل الأذان.`});
  }
  // Prevent unbounded growth over long sessions.
  if(fired.size>30)fired.clear();
 }
 setInterval(checkAdhan,5000);
})();
const dhikrData={
morning:[
['أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ','مرة — أذكار الصباح'],
['اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ','مرة'],
['اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ','سيد الاستغفار — أتمّ بقيته من مصدر موثوق'],
['رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا','3 مرات'],
['اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ','مرة'],
['اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ','دعاء الصباح'],
['أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ','3 مرات'],
['بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ','3 مرات'],
['سُبْحَانَ اللَّهِ وَبِحَمْدِهِ','100 مرة'],
['اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ','كرّرها وأكثر من الصلاة على النبي'],
['أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ','كرّرها'],
['سُبْحَانَ اللَّهِ','كرّرها'],['الْحَمْدُ لِلَّهِ','كرّرها'],['اللَّهُ أَكْبَرُ','كرّرها'],
['لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ','ورد يومي']
],
evening:[
['أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ','مرة — أذكار المساء'],
['اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ','مرة'],
['رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا','3 مرات'],
['أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ','3 مرات'],
['بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ','3 مرات'],
['اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ','دعاء المساء'],
['اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ','ورد المساء'],
['سُبْحَانَ اللَّهِ وَبِحَمْدِهِ','100 مرة'],
['أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ','كرّرها'],
['اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ','كرّرها'],
['الْحَمْدُ لِلَّهِ عَلَى كُلِّ حَالٍ','ذكر وحمد'],
['حَسْبِيَ اللَّهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ','دعاء التوكّل'],
['لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ','كنز من كنوز الجنة'],
['سُبْحَانَ اللَّهِ','كرّرها'],['الْحَمْدُ لِلَّهِ','كرّرها']
],
general:[
['سُبْحَانَ اللَّهِ وَبِحَمْدِهِ','100 مرة'],['سُبْحَانَ اللَّهِ الْعَظِيمِ','ذكر عظيم'],['لَا إِلَهَ إِلَّا اللَّهُ','أفضل الذكر'],
['الْحَمْدُ لِلَّهِ','ذكر وحمد'],['اللَّهُ أَكْبَرُ','ذكر وتعظيم'],['لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ','كنز من كنوز الجنة'],
['أَسْتَغْفِرُ اللَّهَ','استغفار'],['أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ','استغفار وتوبة'],
['اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ','الصلاة على النبي ﷺ'],['سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ','من أحب الكلام إلى الله'],
['اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي','دعاء'],['رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ','دعاء'],
['رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ','دعاء قرآني — البقرة 201'],
['حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ','ذكر التوكّل'],['إِنَّا لِلَّهِ وَإِنَّا إِلَيْهِ رَاجِعُونَ','عند المصيبة'],
['اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ','دعاء مأثور'],['يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ','دعاء'],
['اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي','دعاء العفو'],['اللَّهُمَّ اهْدِنِي وَسَدِّدْنِي','دعاء الهداية'],
['اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى','دعاء جامع'],['اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ','دعاء مأثور'],
['سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ','كلمتان خفيفتان على اللسان'],['اللَّهُمَّ تَقَبَّلْ مِنَّا','دعاء'],['رَبِّ زِدْنِي عِلْمًا','طه 114']
]};let currentKind='morning',dhikrDone=0;
function renderDhikr(){const list=$('#adhkarList');list.innerHTML='';dhikrData[currentKind].forEach(([text,amount])=>{const row=document.createElement('div');row.className='dhikr-item';const p=document.createElement('p');p.textContent=text;const small=document.createElement('small');small.textContent=amount;small.style.cssText='font-size:10px;display:block;color:#55766c';p.append(small);const btn=document.createElement('button');btn.textContent='＋';btn.setAttribute('aria-label','احتساب ذكر');btn.addEventListener('click',()=>{dhikrDone++;$('#dhikrDone').textContent=dhikrDone;$('#dhikrCount').textContent=dhikrDone;btn.textContent='✓';btn.disabled=true;updateProgress()});row.append(p,btn);list.append(row)})}renderDhikr();$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.tab').forEach(b=>b.classList.toggle('active',b===btn));currentKind=btn.dataset.kind;renderDhikr()}));$('#resetDhikr').addEventListener('click',()=>{dhikrDone=0;$('#dhikrDone').textContent='0';$('#dhikrCount').textContent='0';renderDhikr()});
const hadithCollection=[
['إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ','رواه البخاري ومسلم — متفق عليه'],
['الدِّينُ النَّصِيحَةُ','رواه مسلم'],
['الطُّهُورُ شَطْرُ الإِيمَانِ','رواه مسلم'],
['مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ','رواه البخاري ومسلم'],
['لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ','رواه البخاري ومسلم'],
['الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ','رواه البخاري ومسلم'],
['يَسِّرُوا وَلَا تُعَسِّرُوا، وَبَشِّرُوا وَلَا تُنَفِّرُوا','رواه البخاري ومسلم'],
['مَنْ لَا يَرْحَمْ لَا يُرْحَمْ','رواه البخاري ومسلم'],
['الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ','رواه البخاري ومسلم'],
['اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ','رواه الترمذي، وقال: حسن'],
['لَا تَغْضَبْ','رواه البخاري'],
['إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ','رواه مسلم'],
['مَنْ صَمَتَ نَجَا','رواه الترمذي — حسّنه بعض أهل العلم'],
['الرَّاحِمُونَ يَرْحَمُهُمُ الرَّحْمَنُ','رواه الترمذي وأبو داود'],
['مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ','رواه مسلم'],
['أَحَبُّ الأَعْمَالِ إِلَى اللَّهِ أَدْوَمُهَا وَإِنْ قَلَّ','رواه البخاري ومسلم'],
['مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ','رواه مسلم'],
['مَنْ غَشَّنَا فَلَيْسَ مِنَّا','رواه مسلم'],
['لَا ضَرَرَ وَلَا ضِرَارَ','حديث مشهور؛ روي من طرق متعددة وله شواهد'],
['إِنَّ اللَّهَ كَتَبَ الإِحْسَانَ عَلَى كُلِّ شَيْءٍ','رواه مسلم'],
['مَنْ دَلَّ عَلَى خَيْرٍ فَلَهُ مِثْلُ أَجْرِ فَاعِلِهِ','رواه مسلم'],
['الْحَيَاءُ شُعْبَةٌ مِنَ الإِيمَانِ','رواه البخاري ومسلم'],
['آيَةُ الْمُنَافِقِ ثَلَاثٌ: إِذَا حَدَّثَ كَذَبَ، وَإِذَا وَعَدَ أَخْلَفَ، وَإِذَا اؤْتُمِنَ خَانَ','رواه البخاري ومسلم'],
['مَنْ لَا يَشْكُرُ النَّاسَ لَا يَشْكُرُ اللَّهَ','رواه الترمذي وأبو داود'],
['إِنَّ الرِّفْقَ لَا يَكُونُ فِي شَيْءٍ إِلَّا زَانَهُ','رواه مسلم']
];
function renderHadith(){const list=$('#hadithList');if(!list)return;list.innerHTML='';hadithCollection.forEach((h,i)=>{const article=document.createElement('article');article.className='hadith-entry';const number=document.createElement('small');number.className='hadith-number';number.textContent=`حديث ${i+1} من ${hadithCollection.length}`;const quote=document.createElement('p');quote.className='hadith-text';quote.textContent='«'+h[0]+'»';const source=document.createElement('small');source.className='muted';source.textContent=h[1];article.append(number,quote,source);list.append(article)})}renderHadith();

function updateProgress(){const checks=$$('.habit');const done=checks.filter(c=>c.checked).length;const pct=Math.round(done/checks.length*100);$('#progressBar').style.width=pct+'%';$('#progressPct').textContent=pct+'%';$('#progressText').textContent=`أنجزت ${done} من ${checks.length} عادات اليوم`;$$('.habit').forEach(c=>{});localStorage.setItem('ofoqHabits',JSON.stringify(checks.map(c=>c.checked)));const prayers=$$('#prayerChecks input');localStorage.setItem('ofoqPrayers',JSON.stringify(prayers.map(c=>c.checked)))}
$$('.habit').forEach(c=>c.addEventListener('change',updateProgress));try{const saved=JSON.parse(localStorage.getItem('ofoqHabits')||'[]');$$('.habit').forEach((c,i)=>c.checked=!!saved[i]);const savedPrayers=JSON.parse(localStorage.getItem('ofoqPrayers')||'[]');$$('#prayerChecks input').forEach((c,i)=>{c.checked=!!savedPrayers[i];c.addEventListener('change',()=>{localStorage.setItem('ofoqPrayers',JSON.stringify($$('#prayerChecks input').map(x=>x.checked)));const count=$$('#prayerChecks input').filter(x=>x.checked).length;$('#progressPct').textContent=Math.round(count/5*100)+'%'})})}catch(e){}updateProgress();
$('#notifyBtn').addEventListener('click',async()=>{if(!('Notification'in window)){alert('المتصفّح هذا ما يدعمش إشعارات الويب.');return}if(!window.isSecureContext){alert('الإشعارات عادةً تحتاج الموقع يكون منشور على HTTPS، موش ملف محلي.');return}const permission=await Notification.requestPermission();if(permission==='granted'){new Notification('أُفُق | تذكير طيّب',{body:'خذ لحظة للذكر والصلاة.'});$('#notifyBtn').textContent='تم التفعيل ✓'}else alert('ما تمّش السماح بالإشعارات. تنجّم تفعّلها من إعدادات المتصفّح.');});
// OFOQ PLUS is locked to its original dark emerald-and-gold theme.
$('#menuToggle').addEventListener('click',()=>$('.nav').classList.toggle('open'));$$('.nav a').forEach(a=>a.addEventListener('click',()=>$('.nav').classList.remove('open')));
const now=new Date();$('#todayDate').textContent=new Intl.DateTimeFormat('ar-TN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);$('#greeting').textContent=now.getHours()<12?'نهارك زين ☀️':now.getHours()<18?'نهارك طيّب 🌿':'ليلتك هادئة 🌙';


// Quran mushaf page images (604 pages). The image host needs an internet connection.
(()=>{
 const img=$('#mushafPageImage'), input=$('#pageNumber'), label=$('#pageLabel'), status=$('#mushafStatus'), styleSelect=$('#mushafImageStyle');
 const readSurahSelect=$('#readSurahSelect'), readSurahStatus=$('#readSurahStatus');
 if(!img||!input||!label||!status)return;
 let page=1, hostAttempt=0;
 // All options use Quran page-image providers; changing the choice prioritizes a different source.
 const imageSources = {
  madani: n=>`https://cdn.islamic.network/quran/images/page/${n}.png`,
  myquran: n=>`https://cdn.myquran.com/img/page/${n}.png`,
  kemenag: n=>`https://media.qurankemenag.net/khat2/QK_${String(n).padStart(3,'0')}.webp`,
  auto: n=>`https://cdn.islamic.network/quran/images/page/${n}.png`
 };
 const clampPage=n=>Math.max(1,Math.min(604,Number.isFinite(n)?Math.trunc(n):1));
 function orderedSources(){
  const selected=styleSelect?.value||'madani';
  const order=selected==='auto'?['madani','myquran','kemenag']: [selected,...['madani','myquran','kemenag'].filter(k=>k!==selected)];
  return [...new Set(order)].map(key=>imageSources[key]);
 }
 let activeSources=orderedSources();
 function showPage(n){
  page=clampPage(n);input.value=String(page);label.textContent=`صفحة ${page} من 604`;
  img.alt=`صورة الصفحة ${page} من المصحف الشريف`;status.textContent='جاري تحميل صفحة المصحف…';
  activeSources=orderedSources();hostAttempt=0;img.dataset.page=String(page);img.src=activeSources[hostAttempt](page);
  $('#pagePrev').disabled=page===1;$('#pageNext').disabled=page===604;
  localStorage.setItem('ofoqLastMushafPage',String(page));
 }
 // Let the reader jump directly to the first page of any selected surah.
 if(readSurahSelect){
  const surahNames = ['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
  readSurahSelect.innerHTML='';
  surahNames.forEach((name,i)=>{const opt=document.createElement('option');opt.value=String(i+1);opt.textContent=String(i+1).padStart(3,'0')+' — سورة '+name;readSurahSelect.append(opt)});
  try{const savedSurah=localStorage.getItem('ofoqReadSurah');if(savedSurah&&Number(savedSurah)>=1&&Number(savedSurah)<=114)readSurahSelect.value=savedSurah}catch(e){}
  readSurahSelect.addEventListener('change',async()=>{
   const selected=Number(readSurahSelect.value);
   if(!selected)return;
   localStorage.setItem('ofoqReadSurah',String(selected));
   if(readSurahStatus)readSurahStatus.textContent='جاري تحديد صفحة بداية السورة…';
   try{
    const response=await fetch(`https://api.alquran.cloud/v1/surah/${selected}`);
    if(!response.ok)throw new Error('api');
    const payload=await response.json();
    const firstPage=Number(payload?.data?.ayahs?.[0]?.page);
    if(payload.code!==200||!firstPage||firstPage<1||firstPage>604)throw new Error('page');
    showPage(firstPage);
    if(readSurahStatus)readSurahStatus.textContent='تم فتح بداية السورة المختارة ✓';
   }catch(e){if(readSurahStatus)readSurahStatus.textContent='ما نجّمتش نحدّد صفحة بداية السورة. تأكّد من الإنترنت، أو استعمل رقم الصفحة يدويًا.';}
  });
 }
 img.addEventListener('load',()=>{if(img.dataset.page===String(page))status.textContent='';});
 img.addEventListener('error',()=>{
  if(img.dataset.page!==String(page))return;
  hostAttempt++;
  if(hostAttempt<activeSources.length){img.src=activeSources[hostAttempt](page);status.textContent='المصدر المختار ما حمّلش الصورة؛ نجرب مصدرًا آخر…';}
  else{status.textContent='تعذّر تحميل صورة الصفحة من المصادر المتاحة. تأكّد من اتصال الإنترنت ثم اضغط «أعد تحميل الصفحة».';}
 });
 styleSelect?.addEventListener('change',()=>{try{localStorage.setItem('ofoqMushafImageStyle',styleSelect.value)}catch(e){}showPage(page)});
 try{const savedStyle=localStorage.getItem('ofoqMushafImageStyle');if(savedStyle&&imageSources[savedStyle]&&styleSelect)styleSelect.value=savedStyle}catch(e){}
 $('#retryMushaf')?.addEventListener('click',()=>showPage(page));
 $('#pagePrev').addEventListener('click',()=>showPage(page-1));
 $('#pageNext').addEventListener('click',()=>showPage(page+1));
 $('#pageGo').addEventListener('click',()=>showPage(Number(input.value)||1));
 input.addEventListener('keydown',e=>{if(e.key==='Enter')showPage(Number(input.value)||1)});
 $('#saveMushafPage').addEventListener('click',()=>{localStorage.setItem('ofoqSavedMushafPage',String(page));$('#savedMushafPage').textContent=`تم حفظ الصفحة ${page} ✓`;});
 const saved=Number(localStorage.getItem('ofoqSavedMushafPage'));
 if(saved>=1&&saved<=604)$('#savedMushafPage').textContent=`صفحتك المحفوظة: ${saved}`;
 const last=Number(localStorage.getItem('ofoqLastMushafPage'));
 showPage(last>=1&&last<=604?last:1);
 window.addEventListener('beforeunload',()=>localStorage.setItem('ofoqLastMushafPage',String(page)));
})();;

// Searchable, concise Quran vocabulary glossary. Meanings are introductory and contextual.
(()=>{
 const input=$('#quranWordSearch'), list=$('#quranWordList'), clear=$('#clearQuranWordSearch');
 if(!input||!list)return;
 const entries=[
  ['الصمد','السيد الكامل الذي يُقصَد إليه في الحوائج، وهو الله سبحانه.','الإخلاص: 2'],
  ['أبًّا','النبات والكلأ الذي ترعاه الأنعام.','عبس: 31'],
  ['قسورة','قيل: الأسد، وقيل: الرماة أو الصيادون؛ والمعنى يُراجع في التفسير.','المدثر: 51'],
  ['ضِيزَى','جائرة وغير عادلة.','النجم: 22'],
  ['غَسَق','اشتداد ظلمة الليل أو أوله، بحسب السياق.','الإسراء: 78'],
  ['كَلَالَة','من مات وليس له والد ولا ولد، وتفاصيل حكمها تُطلب من التفسير والفقه.','النساء: 12'],
  ['قَسَتْ','اشتدّت وصلبت؛ ويأتي وصفًا للقلوب في السياق القرآني.','البقرة: 74'],
  ['رَانَ','غطّى القلبَ ما كسبه الإنسان من الذنوب، كما ورد في التفسير.','المطففين: 14'],
  ['سِجِّيل','ورد في تفسيرها حجارة من طين متحجّر.','الفيل: 4'],
  ['أواب','كثير الرجوع إلى الله والطاعة.','ص: 30'],
  ['حَصْحَصَ','ظهر واتّضح الحقّ بعد خفائه.','يوسف: 51'],
  ['يَزِفُّون','يسرعون في المشي.','الصافات: 94'],
  ['دَحَاهَا','بسطها ومهّدها؛ وهذا شرح لغوي مختصر للكلمة.','النازعات: 30'],
  ['مُدْهَامَّتَان','شديدتا الخضرة.','الرحمن: 64'],
  ['نَضْرَة','بهجة وحُسن وإشراق.','المطففين: 24'],
  ['هَضِيم','قيل: نضيج ليّن، وقيل: متراكب بعضه على بعض.','الشعراء: 148'],
  ['أَكْنَان','مواضع تستر وتحفظ، مثل المغارات والملاجئ.','النحل: 81'],
  ['مُقْمَحُون','رافعو رؤوسهم مع غَضّ أبصارهم أو عجزهم عن خفضها؛ يوضّحها سياق الآية والتفسير.','يس: 8'],
  ['عَسْعَسَ','أقبل الليل أو أدبر؛ ورد الوجهان في اللغة والتفسير.','التكوير: 17'],
  ['أَبْسَلُوا','أُسلموا للهلاك أو جُوزوا بما كسبوا؛ بحسب سياق الآية والتفسير.','الأنعام: 70'],
  ['يَتَسَنَّه','لم يتغيّر بمرور السنين.','البقرة: 259'],
  ['فَانْفَضُّوا','تفرّقوا وانصرفوا.','الجمعة: 11'],
  ['لُجِّيّ','عميق كثير الماء.','النور: 40'],
  ['مَرَجَ','خلط أو أرسل؛ ويتحدّد المقصود بحسب الآية.','الرحمن: 19'],
  ['الْغَاشِيَة','القيامة التي تغشى الناس بأهوالها.','الغاشية: 1'],
  ['الْقَارِعَة','اسم من أسماء يوم القيامة، لما يقرع القلوب بأهواله.','القارعة: 1'],
  ['الْحُطَمَة','اسم للنار، من الحطم أي الكسر والتحطيم.','الهمزة: 4'],
  ['الْكَوْثَر','الخير الكثير، ومنه نهر في الجنة أعطاه الله للنبي ﷺ.','الكوثر: 1'],
  ['الْفَلَق','الصبح حين ينشقّ عنه الليل.','الفلق: 1'],
  ['الْوَسْوَاس','كثير الوسوسة، ويُراد به هنا الموسوس الخنّاس.','الناس: 4'],
  ['الْأَثَاث','متاع البيت وما يُنتفع به.','النحل: 80'],
  ['الْقَسْوَرَة','تُكتب أيضًا قسورة؛ ورد في تفسيرها الأسد أو الرماة.','المدثر: 51']
 ];
 const norm=s=>s.normalize('NFD').replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').trim().toLowerCase();
 function render(){const q=norm(input.value);const matches=entries.filter(e=>!q||norm(e[0]).includes(q)||norm(e[1]).includes(q)||norm(e[2]).includes(q));list.innerHTML='';if(!matches.length){const empty=document.createElement('div');empty.className='word-empty';empty.textContent='ما لقيناش الكلمة في القائمة المختصرة. جرّب كتابة الكلمة من غير تشكيل.';list.append(empty);return;}matches.forEach(e=>{const card=document.createElement('article');card.className='word-entry';const term=document.createElement('b');term.textContent=e[0];const meaning=document.createElement('p');meaning.textContent=e[1];const ref=document.createElement('small');ref.textContent='الموضع: '+e[2];card.append(term,meaning,ref);list.append(card);});}
 input.addEventListener('input',render);clear?.addEventListener('click',()=>{input.value='';render();input.focus()});render();
})();

// Daily journal and ratings: saved locally in this browser only.
(()=>{
 const $=id=>document.getElementById(id);const date=$('journalDate');if(!date)return;
 const today=new Date();date.value=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
 const keyFor=d=>'ofoqJournal:'+d;let dayRating=0,siteRating=0;
 function setStars(groupId,value,hiddenId){const group=$(groupId);if(!group)return;group.querySelectorAll('button').forEach(btn=>{const on=Number(btn.dataset.rating)<=value;btn.classList.toggle('selected',on);btn.textContent=on?'★':'☆';btn.setAttribute('aria-pressed',String(Number(btn.dataset.rating)===value));});if(hiddenId)$(hiddenId).value=String(value);}
 function loadDay(){const data=JSON.parse(localStorage.getItem(keyFor(date.value))||'{}');$('journalGoal').value=data.goal||'';$('journalEvents').value=data.events||'';$('journalMood').value=data.mood||'';dayRating=Number(data.rating)||0;setStars('dayRating',dayRating,'dayRatingValue');$('journalStatus').textContent=data.saved?'عندك يوميات محفوظة للتاريخ هذا. تنجم تبدّلها وتحفظ من جديد.':'';}
 $('dayRating').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{dayRating=Number(b.dataset.rating);setStars('dayRating',dayRating,'dayRatingValue');}));
 $('siteRating').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{siteRating=Number(b.dataset.rating);setStars('siteRating',siteRating);}));
 date.addEventListener('change',loadDay);
 $('journalForm').addEventListener('submit',e=>{e.preventDefault();const data={goal:$('journalGoal').value.trim(),events:$('journalEvents').value.trim(),mood:$('journalMood').value,rating:dayRating,saved:true};localStorage.setItem(keyFor(date.value),JSON.stringify(data));$('journalStatus').textContent='تحفظت يومياتك بنجاح على الجهاز هذا ✅';});
 $('aiEvaluateDay').addEventListener('click',()=>{const result=$('aiDayResult');const goal=$('journalGoal').value.trim();const events=$('journalEvents').value.trim();const mood=$('journalMood').value;const text=(goal+' '+events+' '+mood).toLowerCase();if(!goal&&!events&&!mood){result.hidden=false;result.textContent='اكتب شنوّة صار في نهارك أو اختار إحساسك، وبعد اطلب آية للتأمّل.';return;}const verses=[
 {keys:['حزن','حزين','تقلقت','تقلّقت','صعيب','صعيبة','بكيت','فشلت','مشكلة','مشاكل','خايب','تعبت','قلق','خوف','خايف'],verse:'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا ۝ إِنَّ مَعَ الْعُسْرِ يُسْرًا',ref:'سورة الشرح، الآيتان 5–6',note:'إذا كان نهارك صعيب، خذ وقتك وافتكر معنى الرجاء واليسر، واطلب المساندة من شخص تثق فيه إذا تحتاج.'},
 {keys:['قلق','قلقان','قلقت','خايف','خوف','توتر','متوتر','مضغوط','هم','حيرة'],verse:'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',ref:'سورة الرعد، الآية 28 (جزء من الآية)',note:'تنجم تاخذ لحظة هدوء وذكر، مع التعامل مع أسباب القلق خطوة بخطوة.'},
 {keys:['نجحت','نجاح','فرحان','فرحانة','باهي','باهي برشة','فرحت','إنجاز','انجاز','كمّلت','كملت','الحمد لله','شكرت'],verse:'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ',ref:'سورة إبراهيم، الآية 7 (جزء من الآية)',note:'إذا صارلك خير اليوم، تذكّر الشكر وعبّر عليه بكلمة طيبة وعمل صالح.'},
 {keys:['هدف','أهداف','نراجع','قريت','تعلمت','تعلّمت','خدمت','اجتهدت','تعبت في','حاولت','ما كملتش','ما كمّلتش'],verse:'وَأَنْ لَيْسَ لِلْإِنْسَانِ إِلَّا مَا سَعَىٰ',ref:'سورة النجم، الآية 39',note:'ركّز على السعي والمحاولة، وخذ من نهارك درسًا لخطوة صغيرة غدوة.'},
 {keys:['أمي','أمّي','أبي','بابا','ماما','عايلتي','عائلتي','عاونت','ساعدت','خير','طيبة','طيّبة'],verse:'وَقُل لَّهُمَا قَوْلًا كَرِيمًا',ref:'سورة الإسراء، الآية 23 (جزء من الآية)',note:'خلّي الكلام الطيّب والإحسان عادة، خاصة مع الوالدين والعائلة.'}
 ];let chosen=null;for(const item of verses){if(item.keys.some(k=>text.includes(k))){chosen=item;break;}}if(!chosen){chosen={verse:'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا',ref:'سورة البقرة، الآية 286 (جزء من الآية)',note:'آية للتأمّل والتذكّر بأنّ التكليف مرتبط بالوسع. خذ من نهارك ما ينفعك، وخطّط للغد برفق.'};}result.replaceChildren();const halo=document.createElement('div');halo.className='verse-celestial-halo';halo.setAttribute('aria-hidden','true');halo.innerHTML='<span>✦</span><i>✧</i><b>۞</b>';const title=document.createElement('h3');title.className='verse-reveal-title';title.textContent='✧ آية تتأمّل فيها ✧';const verse=document.createElement('blockquote');verse.className='daily-verse-text verse-reveal-text';verse.textContent='﴿ '+chosen.verse+' ﴾';const ref=document.createElement('p');ref.className='verse-reveal-ref';ref.textContent=chosen.ref;const note=document.createElement('p');note.className='verse-reveal-note';note.textContent=chosen.note;const caveat=document.createElement('small');caveat.className='muted verse-reveal-caveat';caveat.textContent='اختيرت الآية حسب كلماتك كاقتراح للتأمّل، وليس على أساس أنّها تفسير قطعي لما حدث. ارجع للمصحف والتفسير الموثوق لفهم السياق.';result.append(halo,title,verse,ref,note,caveat);result.hidden=false;result.classList.remove('verse-awaken');void result.offsetWidth;result.classList.add('verse-awaken');});
 $('clearJournal').addEventListener('click',()=>{if(!confirm('تحب تفرّغ الخانات؟ الحفظ القديم ما يتمسحش كان ما تحفظش من جديد.'))return;$('journalGoal').value='';$('journalEvents').value='';$('journalMood').value='';dayRating=0;setStars('dayRating',0,'dayRatingValue');$('journalStatus').textContent='الخانات تفرّغت. الحفظ القديم مازال موجود إلى أن تحفظ التغييرات.';});
 $('exportJournal').addEventListener('click',()=>{try{const data={exportedAt:new Date().toISOString(),journal:{},habits:localStorage.getItem('ofoqHabits'),prayers:localStorage.getItem('ofoqPrayers'),siteRating:localStorage.getItem('ofoqSiteRating')};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('ofoqJournal:'))data.journal[k.slice('ofoqJournal:'.length)]=JSON.parse(localStorage.getItem(k)||'{}');}const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ofoq-plus-backup-'+date.value+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('journalStatus').textContent='تمّ تنزيل نسخة احتياطية من البيانات المحفوظة في هذا المتصفّح. احتفظ بها في مكان آمن.';}catch(e){$('journalStatus').textContent='ما نجّمش نصدّر البيانات. جرّب متصفّحًا آخر أو تأكّد من مساحة الجهاز.';}});
 $('saveSiteRating').addEventListener('click',()=>{if(!siteRating){$('siteRatingStatus').textContent='اختار تقييم من نجمة إلى 5 نجوم قبل الحفظ.';return;}localStorage.setItem('ofoqSiteRating',JSON.stringify({rating:siteRating,feedback:$('siteFeedback').value.trim(),updatedAt:new Date().toISOString()}));$('siteRatingStatus').textContent='شكراً على تقييمك! تحفظ على جهازك فقط ✅';});
 const oldSite=JSON.parse(localStorage.getItem('ofoqSiteRating')||'null');if(oldSite){siteRating=Number(oldSite.rating)||0;$('siteFeedback').value=oldSite.feedback||'';setStars('siteRating',siteRating);$('siteRatingStatus').textContent='آخر تقييم محفوظ على الجهاز هذا.';}
 loadDay();
})();

// Electronic tasbih: saves count per selected dhikr and goal in this browser.
(()=>{
 const dhikr=$('#tasbihDhikr'), goal=$('#tasbihGoal'), countEl=$('#tasbihCount');
 const current=$('#tasbihCurrentDhikr'), goalText=$('#tasbihGoalText'), progress=$('#tasbihProgress'), status=$('#tasbihStatus');
 if(!dhikr||!goal||!countEl)return;
 const key=()=>`ofoq-tasbih-v1:${dhikr.value}:${goal.value}`;
 let count=0;
 try{count=Number(localStorage.getItem(key())||0)||0}catch(e){}
 function render(message='ربي يتقبّل منك 🤍'){
   countEl.textContent=String(count);current.textContent=dhikr.value;
   goalText.textContent=goal.value==='0'?'واصل على راحتك':`من ${goal.value} تسبيحة`;
   const pct=goal.value==='0'?0:Math.min(100,count/Number(goal.value)*100);
   progress.style.width=pct+'%';status.textContent=message;
 }
 function save(){try{localStorage.setItem(key(),String(count))}catch(e){status.textContent='ما نجّمش نحفظ العدد في المتصفّح هذا.'}}
 function load(){try{count=Number(localStorage.getItem(key())||0)||0}catch(e){count=0}render()}
 $('#tasbihTap').addEventListener('click',()=>{count++;save();render(goal.value!=='0'&&count===Number(goal.value)?'وصلت للهدف، تقبّل الله منك 🌟':'ربي يتقبّل منك 🤍');});
 $('#tasbihUndo').addEventListener('click',()=>{count=Math.max(0,count-1);save();render('تراجعت ضغطة واحدة.');});
 $('#tasbihReset').addEventListener('click',()=>{count=0;save();render('رجّعنا العدّ للصفر. ابدأ من جديد وقت تحب.');});
 dhikr.addEventListener('change',load);goal.addEventListener('change',load);load();
})();
