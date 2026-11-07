
// v95 progression: all spending uses EXISTING base/forge cards, not a new panel.
// Small linear mana and arcana gains; in-run gains capped at four selections.
const NS95_PROGRESS={
 apply(p){
  if(!p||!Number.isFinite(p.ns93MaxMana))return;
  const ranks=NET.role?p.ns95ProfileRanks||mpProgress.ranks:meta.ranks;
  const mana=Math.max(0,Math.min(NET.role?12:3,Math.floor(Number(ranks?.mana)||0)));
  const arcana=Math.max(0,Math.min(NET.role?10:3,Math.floor(Number(ranks?.arcana)||0)));
  p.ns93MaxMana+=mana*(NET.role?4:8);
  p.ns93Mana=p.ns93MaxMana;
  p.ns93ManaRegen+=mana*(NET.role?.07:.12);
  p.ns95ArcanaRank=arcana;
  p.ns95SpellMult=1+arcana*(NET.role?.008:.015);
  p.ns95RunManaRanks=0;
 },
 boost(p){
  if(!p||!Number.isFinite(p.ns93MaxMana)||(p.ns95RunManaRanks||0)>=4)return false;
  p.ns95RunManaRanks=(p.ns95RunManaRanks||0)+1;
  p.ns93MaxMana=Math.min(190,p.ns93MaxMana+8);
  p.ns93Mana=Math.min(p.ns93MaxMana,(p.ns93Mana||0)+10);
  p.ns93ManaRegen=Math.min(7.3,(p.ns93ManaRegen||2.5)+.12);
  return true;
 }
};
window.__NS95_PROGRESS=NS95_PROGRESS;
