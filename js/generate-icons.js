/* ============================================================
   EduBlog PWA 아이콘 자동 생성 스크립트
   앱 첫 로드 시 icons/ 폴더에 PNG 캐시
   ============================================================ */
(function generateIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const KEY   = 'edublog_icons_v1';

  if (localStorage.getItem(KEY)) return; // 이미 생성됨

  function drawIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    function roundRect(x, y, w, h, r, fill) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
      ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);
      ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h);
      ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r);
      ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
    }

    const grad = ctx.createLinearGradient(0,0,size,size);
    grad.addColorStop(0,'#3730a3');
    grad.addColorStop(0.55,'#4f46e5');
    grad.addColorStop(1,'#06b6d4');
    roundRect(0,0,size,size,size*0.18,grad);

    const cx=size/2, cy=size/2;
    const cw=size*0.56, ch=size*0.62;
    const cx0=cx-cw/2, cy0=cy-ch/2-size*0.03;
    roundRect(cx0,cy0,cw,ch,size*0.06,'rgba(255,255,255,0.95)');

    const lw=cw*0.68, lh=size*0.045, lx=cx-lw/2;
    [0,1,2].forEach((i)=>{
      ctx.fillStyle = i===0?'#4f46e5':'#94a3b8';
      const w=i===0?lw:lw*(i===1?.75:.55);
      roundRect(lx,cy0+ch*0.18+i*(size*0.078),w,lh,lh/2,ctx.fillStyle);
    });

    ctx.font=`${size*0.22}px serif`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('📚',cx+cw*0.22,cy0+ch*0.7);

    return canvas.toDataURL('image/png');
  }

  /* localStorage에 아이콘 data URL 저장 */
  const icons = {};
  sizes.forEach(s => { icons[s] = drawIcon(s); });
  try { localStorage.setItem(KEY, JSON.stringify(icons)); } catch(e) { /* quota */ }
})();
