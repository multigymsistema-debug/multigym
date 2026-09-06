export function cleanAssistantText(input:string):string{
  const lines=String(input||'').replace(/\r/g,'').split('\n'),out:string[]=[];
  for(let i=0;i<lines.length;i++){
    const line=lines[i].trim();
    if(/^---+$/.test(line)||!line) { if(line==='')out.push(''); continue; }
    if(line.startsWith('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{2,}/.test(lines[i+1])){
      const headers=line.split('|').slice(1,-1).map(x=>x.trim().toLowerCase());i+=2;
      while(i<lines.length&&lines[i].trim().startsWith('|')){
        const cells=lines[i].trim().split('|').slice(1,-1).map(x=>x.trim());
        if(cells.length){const primary=cells[0]||'Opção',portion=cells[1]||'',details=cells.slice(2).filter((_,idx)=>!/(por que|porque|motivo|funciona)/.test(headers[idx+2]||''));out.push(`• ${primary}${portion?` — ${portion}`:''}${details.length?` (${details.join('; ')})`:''}`)}
        i++;
      }
      i--;continue;
    }
    out.push(lines[i]);
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
