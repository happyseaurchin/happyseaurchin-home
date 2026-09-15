// The whole loop, run against the REAL functions lifted out of the three files.
const fs = require('fs');
const W = fs.readFileSync('/home/user/happyseaurchin-home/walk.html','utf8');
const H = fs.readFileSync('/home/user/happyseaurchin-home/hands.html','utf8');
const grab = (src, sig) => { const i = src.indexOf(sig); return src.slice(i, src.indexOf('\n}\n', i) + 2); };

eval(grab(W,'function isEntryNode(n){'));
eval(grab(W,'function childDigits(node){'));
eval(grab(W,'function doneCardsIn(raw, prefix){'));
eval(grab(H,'function nodesUnder(raw, prefix, keep){'));
const DONE_AT    = n => n && typeof n==='object' && n['4']==='done' && String(n['_']||'').trim();
const WITNESS_OF = n => n && typeof n==='object' && n['4']==='witnessed' && String(n['2']||'');

// a floor-10 mirror, and the beach's own spindle write (0 steps into the underscore)
const mirror = who => { let r = 'MIRROR — '+who; for (let i=0;i<10;i++) r={_:r}; return r; };
function setAt(block, addr, node){
  let n = block;
  const p = String(addr).split('');
  p.slice(0,-1).forEach(ch => { const k = ch==='0'?'_':ch;
    if (!n[k] || typeof n[k]!=='object') n[k] = (typeof n[k]==='string') ? {_:n[k]} : {};
    n = n[k]; });
  n[p[p.length-1]] = node;
  return block;
}
const DAY='20263331', BEAT=DAY+'5', WEEK=DAY.slice(0,7);
const card = (t,ela) => ({_:t,'2':'beach-venture','3':'2026-09-15T12:00Z','4':'done',...(ela?{'6':ela}:{})});

const david = setAt(mirror('David'), BEAT+'1', card('Wrote the golden card.','2h10'));
setAt(david, BEAT+'2', card('Fixed the ragged column.','40m'));
setAt(david, DAY.slice(0,7)+'2'+'31', card('Something earlier this week.'));   // another day, same week
const mine  = setAt(mirror('happyseaurchin'), BEAT+'1', card('My own closed card.'));

let pass = true;
const t = (label, got, want) => { const ok = JSON.stringify(got)===JSON.stringify(want);
  if (!ok) pass = false; console.log(`  ${ok?'✓':'✗'} ${label}` + (ok?'':`\n      got ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`)); };

console.log('\n/walk reads what closed, out of the mirrors:');
t('the day answers with both of the day’s cards',
  doneCardsIn(david, DAY).map(c=>c.text), ['Wrote the golden card.','Fixed the ragged column.']);
t('the beat answers with the same two', doneCardsIn(david, BEAT).length, 2);
t('the week answers with all three', doneCardsIn(david, WEEK).length, 3);
t('the neighbouring day answers with its own one', doneCardsIn(david, '20263332').length, 1);
t('an empty day answers with none', doneCardsIn(david, '20263335').length, 0);
t('a different WEEK answers with none', doneCardsIn(david, '2026332').length, 0);
t('the elapsed rides at 6, not in the words', doneCardsIn(david, BEAT)[0].elapsed, '2h10');
t('my own closed card is mine alone', doneCardsIn(mine, DAY).map(c=>c.text), ['My own closed card.']);

console.log('\n/hands finds the claims as positions:');
let asks = nodesUnder(david, WEEK, DONE_AT).map(c => ({claim:c.value, addr:c.addr}));
t('three claims under the week', asks.length, 3);
t('a claim carries its address', asks[0].addr, BEAT+'1');

console.log('\nconfirming one — a free digit under the SAME beat in MY block:');
const ask = asks[0];
const beat = ask.addr.slice(0,-1);
let at = mine; for (const ch of beat){ at = at && typeof at==='object' ? (ch==='0'?at['_']:at[ch]) : null; }
let slot=null; for(let d=1;d<=9;d++){ if(!(at&&typeof at==='object'&&at[String(d)]!==undefined)){slot=String(d);break;} }
t('it does NOT take digit 1 — my own card is there', slot, '2');
setAt(mine, beat+slot, {_:ask.claim,'1':'David','2':ask.addr,'3':'2026-09-15T12:30Z','4':'witnessed'});

console.log('\nand the ask is not offered twice:');
const seen = new Set(nodesUnder(mine, WEEK, WITNESS_OF).map(w=>w.value));
t('the witness points at the claim’s address', [...seen], [ask.addr]);
t('two claims remain unconfirmed', nodesUnder(david, WEEK, DONE_AT).filter(c=>!seen.has(c.addr)).length, 2);
t('my own card is still a card, not a witness', doneCardsIn(mine, DAY).map(c=>c.text), ['My own closed card.']);
t('the witness is not mistaken for something I closed', doneCardsIn(mine, BEAT).length, 1);

console.log('\n' + (pass ? 'PASS — the round trip closes' : 'FAIL'));
process.exit(pass?0:1);
