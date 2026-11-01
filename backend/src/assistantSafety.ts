const normalize=(value:unknown)=>String(value??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

/**
 * Conservative output guard: if a personalized food recommendation repeats a
 * declared allergy/restriction, do not present it as a safe suggestion.
 * This is intentionally lexical and fail-closed, not a clinical allergen model.
 */
export function findRestrictedFoodMentions(answer:string,profile:any):string[]{
  const sources=[profile?.allergies,profile?.restrictions].filter(Boolean).join(';');
  const terms=sources.split(/[;,\n]+/).map((part:string)=>normalize(part)
    .replace(/^(alergia a|alergia|alergico a|alergica a|intolerancia a|intolerancia|nao posso comer|evitar)\s+/,'')
    .trim()).filter((term:string)=>term.length>=3);
  const output=normalize(answer);
  return [...new Set(terms.filter((term:string)=>term && output.includes(term)))];
}
