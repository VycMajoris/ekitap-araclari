import { diffWordsWithSpace, Change } from 'diff';
import { DiffItem, DebugLogEntry } from './types';

export interface RuleReplacement {
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: unknown[]) => string);
  description: string;
}

const FINISHED_VERB_OR_CLAUSE_REGEX = /(?:[dt][ıiuü]m|[dt][ıiuü]n|[dt][ıiuü]k|[dt][ıiuü]n[ıiuü]z|[dt][ıiuü]ler|m[ıiuü]şt[ıiuü]m|m[ıiuü]şt[ıiuü]n|m[ıiuü]şt[ıiuü]k|m[ıiuü]şt[ıiuü]ler|m[ıiuü]ş|m[ıiuü]şiz|m[ıiuü]şsiniz|m[ıiuü]şler|[ıiuü]?yor|[ıiuü]?yorum|[ıiuü]?yorsun|[ıiuü]?yoruz|[ıiuü]?yorsunuz|[ıiuü]?yorlar|[ae]c[ae]k|[ae]c[ae]ğ[ıi]m|[ae]c[ae]ksin|[ae]c[ae]ğiz|[ae]c[ae]ksiniz|[ae]c[ae]kl[ae]r|[ıiuü]r|[ae]r|m[ae]l[ıi]|m[ae]l[ıi]y[ıi]m|m[ae]l[ıi]sin|m[ae]l[ıi]yiz|s[ae]m|s[ae]n|s[ae]k|s[ae]niz|s[ae]l[ae]r|[ae]r[ae]k|[ıiuü]nc[ae]|d[ıiuü]ğ[ıi]|d[ıiuü]kt[ae]n|m[ae]d[ae]n|y[ae]n|[ae]n|d[ıiuü]kç[ae]|k[ae]n|[dt][ıiuü]r|[dt][ıiuü]|'dur|'dür|'dır|'dir|'tur|'tür|'tır|'tir|'nun|'nün|'nın|'nin|'da|'de|'ta|'te|'dan|'den|'tan|'ten)$/i;

const TURKISH_SUFFIX_CONTINUATION_REGEX = /^(?:l[ae]r(?:[ıi]n?|[dt][ae]n?|[ıiuü]m[ıiuü]z?|[ıiuü]z)?|[dt][ae]n?|[dt][ıiuü](?:m|n|k|n[ıiuü]z|l[ae]r)?|m[ıiuü]ş(?:t[ıiuü][a-z]*)?|[ıiuü]?yor(?:[dt][ıiuü][a-z]*|[ıiuü]m|[ıiuü]z|l[ae]r)?|[ae]c[ae]k(?:t[ıiuü][a-z]*|[ıi]m|[ıi]z|l[ae]r)?|m[ae]l[ıi](?:y[ıi]m|y[ıi]z|s[ıi]n|l[ae]r)?|m[ae]d[ae]n|m[ae]ks[ıi]z[ıi]n|d[ıiuü]kt[ae]n|d[ıiuü]kç[ae]|y?[ae]n|k[ae]n|y?[ae]r[ae]k|y?[ıiuü]nc[ae]|y?[ıiuü]p|s[ae](?:yd[ıi][a-z]*|m|n|k)?|m[ae]z(?:l[ae]r)?|m[ae]d[ıi][a-z]*|m[ae]d[ıi]m|m[ae]d[ıi]k|m[ae]d[ıi]n|l[ae]m[ae]z(?:l[ae]r)?|l[ae]m[ae]d[ıi][a-z]*|l[ae]d[ıi][a-z]*|l[ae]m[ae]k?|l[ae]nm[ae]k?|l[ae]şm[ae]k?|t[ıiuü]rm[ae][a-z]*|d[ıiuü]rm[ae][a-z]*|t[ıiuü]rd[ıiuü][a-z]*|d[ıiuü]rd[ıiuü][a-z]*|r[ae]nc[ıi][a-z]*|s[ıiuü]z(?:l[ıi]k)?|l[ıiuü](?:k|l[ae]r)?|c[ıiuü](?:l[ıi]k|l[ae]r)?|n[ıiuü]n|n[ıiuü]|n[ae]|nd[ae]n?|s[ıiuü]n[ae]|s[ıiuü]nd[ae]n?|[ıiuü]m[ıiuü]z|[ıiuü]n[ıiuü]z|[ıiuü]m|[ıiuü]n|[ıiuü]z)$/i;

const WB = '(?<![a-zA-ZçğıöşüÇĞİÖŞÜ])';
const WE = '(?![a-zA-ZçğıöşüÇĞİÖŞÜ])';

function replaceCasePreserving(match: string, target: string): string {
  if (match === match.toUpperCase()) {
    return target.toUpperCase();
  }
  if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1);
  }
  return target.toLowerCase();
}

/**
 * Common regex rules for high-confidence Turkish OCR and PDF-to-EPUB conversion errors.
 */
export const TURKISH_OCR_REGEX_RULES: RuleReplacement[] = [
  {
    pattern: /[\u00AD\u200B\u200C\u200D\uFEFF]/g,
    replacement: '',
    description: 'Görünmez bozuk karakter temizliği (Soft hyphen / ZWSP)',
  },
  {
    pattern: /([abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0-9'’]+)-(?:<br\s*\/?>|\s)+([abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+)/gi,
    replacement: (_match: string, ...args: unknown[]) => {
      const part1 = args[0] as string;
      const part2 = args[1] as string;

      const hasApostrophe = /['’]/.test(part1);
      const isCapitalized = /^[A-ZÇĞİÖŞÜ]/.test(part2);
      const matchesFinishedClause = FINISHED_VERB_OR_CLAUSE_REGEX.test(part1);
      const isPart2ASuffix = TURKISH_SUFFIX_CONTINUATION_REGEX.test(part2);

      const isTrueHyphenation =
        !hasApostrophe &&
        !isCapitalized &&
        !matchesFinishedClause &&
        (isPart2ASuffix || (part1.length <= 3 && part2.length <= 5 && !/^(?:ve|veya|ile|ama|için|gibi|her|bir|o|bu|şu|ben|sen|biz|siz)$/i.test(part2)));

      if (isTrueHyphenation) {
        return `${part1}${part2}`;
      }

      return `${part1} - ${part2}`;
    },
    description: 'Satır sonu tire ve ara söz korumalı birleştirme',
  },
  {
    pattern: /([abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0-9]+)-([abcçdefgğhıijklmnoöprsştuüvyzABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ]+)/g,
    replacement: (match: string, ...args: unknown[]) => {
      const part1 = (args[0] as string) || '';
      const part2 = (args[1] as string) || '';
      const isCapitalized = /^[A-ZÇĞİÖŞÜ]/.test(part2);
      const matchesFinishedClause = FINISHED_VERB_OR_CLAUSE_REGEX.test(part1);
      const isPart2ASuffix = TURKISH_SUFFIX_CONTINUATION_REGEX.test(part2);

      if (!isCapitalized && !matchesFinishedClause && isPart2ASuffix) {
        return `${part1}${part2}`;
      }
      return match;
    },
    description: 'Bitişik satır sonu hece/ek birleştirme',
  },

  // 2. Unwanted space before punctuation: "kelime , başka" -> "kelime, başka"
  {
    pattern: /\s+([,\.!?:;])/g,
    replacement: '$1',
    description: 'Noktalama öncesi boşluk düzeltmesi',
  },

  // 3. 'cl' -> 'd' confusion in prominent words & variations
  {
    pattern: new RegExp(`${WB}(claha|cliye|cliyen|cloktor|clerece|clevam|clere|clolap)${WE}`, 'gi'),
    replacement: (match) => {
      const lower = match.toLowerCase();
      const targets: Record<string, string> = {
        claha: 'daha',
        cliye: 'diye',
        cliyen: 'diyen',
        cloktor: 'doktor',
        clerece: 'derece',
        clevam: 'devam',
        clere: 'dere',
        clolap: 'dolap'
      };
      return replaceCasePreserving(match, targets[lower] || match);
    },
    description: "'cl...' -> 'd...'",
  },
  {
    pattern: new RegExp(`${WB}clil([iü]n?de)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'dil' + suffix;
      return replaceCasePreserving(match, target);
    },
    description: "'clil...' -> 'dil...'",
  },
  {
    pattern: new RegExp(`${WB}clüşün([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'dü');
      return preservedRoot + 'şün' + rest;
    },
    description: "'clüşün...' -> 'düşün...'",
  },
  {
    pattern: new RegExp(`${WB}clünya([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'dü');
      return preservedRoot + 'nya' + rest;
    },
    description: "'clünya...' -> 'dünya...'",
  },
  {
    pattern: new RegExp(`${WB}clönem([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'dö');
      return preservedRoot + 'nem' + rest;
    },
    description: "'clönem...' -> 'dönem...'",
  },
  {
    pattern: new RegExp(`${WB}clur([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'du');
      return preservedRoot + 'r' + rest;
    },
    description: "'clur...' -> 'dur...'",
  },
  {
    pattern: new RegExp(`${WB}(cla|cle)${WE}`, 'gi'),
    replacement: (match) => {
      const target = match.toLowerCase() === 'cla' ? 'da' : 'de';
      return replaceCasePreserving(match, target);
    },
    description: "'cla/cle' -> 'da/de'",
  },
  {
    pattern: new RegExp(`${WB}(?:cil[eğ]gil|clegil|cleğil)${WE}`, 'gi'),
    replacement: (match) => replaceCasePreserving(match, 'değil'),
    description: "'clegil/cleğil' -> 'değil'",
  },
  {
    pattern: new RegExp(`${WB}clost([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'do');
      return preservedRoot + 'st' + rest;
    },
    description: "'clost...' -> 'dost...'",
  },
  {
    pattern: new RegExp(`${WB}cluygu([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'du');
      return preservedRoot + 'ygu' + rest;
    },
    description: "'cluygu...' -> 'duygu...'",
  },
  {
    pattern: new RegExp(`${WB}clurum([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'du');
      return preservedRoot + 'rum' + rest;
    },
    description: "'clurum...' -> 'durum...'",
  },
  {
    pattern: new RegExp(`${WB}clüzen([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'dü');
      return preservedRoot + 'zen' + rest;
    },
    description: "'clüzen...' -> 'düzen...'",
  },
  {
    pattern: new RegExp(`${WB}cleniz([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'de');
      return preservedRoot + 'niz' + rest;
    },
    description: "'cleniz...' -> 'deniz...'",
  },
  {
    pattern: new RegExp(`${WB}clol([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'do');
      return preservedRoot + 'l' + rest;
    },
    description: "'clol...' -> 'dol...'",
  },
  {
    pattern: new RegExp(`${WB}clön([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'dö');
      return preservedRoot + 'n' + rest;
    },
    description: "'clön...' -> 'dön...'",
  },

  // 4. 'rn' <-> 'm' confusion rules
  {
    pattern: new RegExp(`${WB}andınyor([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 4), 'andı');
      return preservedRoot + 'rıyor' + suffix;
    },
    description: "'andınyor...' -> 'andırıyor...'",
  },
  {
    pattern: new RegExp(`${WB}andıryor([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 4), 'andı');
      return preservedRoot + 'rıyor' + suffix;
    },
    description: "'andıryor...' -> 'andırıyor...'",
  },
  {
    pattern: new RegExp(`${WB}görünrn([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 5), 'görün');
      return preservedRoot + 'm' + rest;
    },
    description: "'görünrn...' -> 'görünm...'",
  },
  {
    pattern: new RegExp(`${WB}tükenrn([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 5), 'tüken');
      return preservedRoot + 'm' + rest;
    },
    description: "'tükenrn...' -> 'tükenm...'",
  },
  {
    pattern: new RegExp(`${WB}bölünrn([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 5), 'bölün');
      return preservedRoot + 'm' + rest;
    },
    description: "'bölünrn...' -> 'bölünm...'",
  },
  {
    pattern: new RegExp(`${WB}yarm(dan|ki|a)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = suffix === 'a' ? 'yarına' : suffix === 'dan' ? 'yarından' : suffix === 'ki' ? 'yarınki' : 'yarın';
      return replaceCasePreserving(match, target);
    },
    description: "'yarm...' -> 'yarın...'",
  },
  {
    pattern: new RegExp(`${WB}kam([ıiuü])(nda|ndan|m|na)?${WE}`, 'gi'),
    replacement: (match, vowel, suffix = '') => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 3), 'karn');
      return preservedRoot + vowel + suffix;
    },
    description: "'kamı...' -> 'karnı...'",
  },
  {
    pattern: new RegExp(`${WB}öğmeci(ler|si|leri|lik)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'öğrenci' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'öğmeci...' -> 'öğrenci...'",
  },
  {
    pattern: new RegExp(`${WB}öğm(ek|eye|edi|edim|iş|e)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const ending = suffix === 'ek' ? 'renmek' : suffix === 'eye' ? 'renmeye' : suffix === 'edi' ? 'rendi' : suffix === 'edim' ? 'rendim' : suffix === 'iş' ? 'renmiş' : suffix === 'e' ? 'renme' : 'renmek';
      const preservedRoot = replaceCasePreserving(match.slice(0, 3), 'öğ');
      return preservedRoot + ending;
    },
    description: "'öğm...' -> 'öğren...'",
  },
  {
    pattern: new RegExp(`${WB}soma(ki|kiler|dan|sı|ya)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'sonra' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'soma...' -> 'sonra...'",
  },
  {
    pattern: new RegExp(`${WB}bumu(nda|nu|na)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'burnu' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'bumu...' -> 'burnu...'",
  },
  {
    pattern: new RegExp(`${WB}karamlı([gğk][a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 6), 'karanlı');
      return preservedRoot + rest;
    },
    description: "'karamlı...' -> 'karanlı...'",
  },
  {
    pattern: new RegExp(`${WB}imsan([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      const preservedRoot = replaceCasePreserving(match.slice(0, 2), 'in');
      return preservedRoot + 'san' + rest;
    },
    description: "'imsan...' -> 'insan...'",
  },
  {
    pattern: new RegExp(`${WB}farkıma\\s+var([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => {
      return replaceCasePreserving(match, 'farkına var' + rest);
    },
    description: "'farkıma var' -> 'farkına var'",
  },
  {
    pattern: new RegExp(`${WB}ayrımlı(lar|sıyla)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'ayrıntı' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'ayrımlı...' -> 'ayrıntı...'",
  },
  {
    pattern: new RegExp(`${WB}davra[nm]ış?(lar)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'davranış' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'davramş...' -> 'davranış...'",
  },
  {
    pattern: new RegExp(`${WB}korkumç(tu)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'korkunç' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'korkumç...' -> 'korkunç...'",
  },
  {
    pattern: new RegExp(`${WB}düşümce(ler|si)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'düşünce' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'düşümce...' -> 'düşünce...'",
  },
  {
    pattern: new RegExp(`${WB}(uyamnak|uyamdı|uyamınca)${WE}`, 'gi'),
    replacement: (match) => {
      const lower = match.toLowerCase();
      const target = lower === 'uyamnak' ? 'uyanmak' : lower === 'uyamdı' ? 'uyandı' : 'uyanınca';
      return replaceCasePreserving(match, target);
    },
    description: "'uyam...' -> 'uyan...'",
  },
  {
    pattern: new RegExp(`${WB}yalmız(ca|lık)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'yalnız' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'yalmız...' -> 'yalnız...'",
  },
  {
    pattern: new RegExp(`${WB}yamlış(lık|lıkla)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'yanlış' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'yamlış...' -> 'yanlış...'",
  },
  {
    pattern: new RegExp(`${WB}(tuma|tumuva)${WE}`, 'gi'),
    replacement: (match) => {
      const target = match.toLowerCase() === 'tuma' ? 'turna' : 'turnuva';
      return replaceCasePreserving(match, target);
    },
    description: "'tuma/tumuva' -> 'turna/turnuva'",
  },
  {
    pattern: new RegExp(`${WB}kame(si)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => {
      const target = 'karne' + (suffix || '');
      return replaceCasePreserving(match, target);
    },
    description: "'kame...' -> 'karne...'",
  },
  {
    pattern: new RegExp(`${WB}(tarnarn|zarnan|adarn|akşarn)${WE}`, 'gi'),
    replacement: (match) => {
      const lower = match.toLowerCase();
      const target = lower === 'tarnarn' ? 'tamam' : lower === 'zarnan' ? 'zaman' : lower === 'adarn' ? 'adam' : 'akşam';
      return replaceCasePreserving(match, target);
    },
    description: "'tarnarn/zarnan/adarn/akşarn' -> 'tamam/zaman/adam/akşam'",
  },

  {
    pattern: /\.\s*,+/g,
    replacement: '.',
    description: "'.,,' -> '.'",
  },
  {
    pattern: /,\s*,+/g,
    replacement: ',',
    description: "',,' -> ','",
  },
  {
    pattern: /:\s*:+/g,
    replacement: ':',
    description: "'::' -> ':'",
  },
  {
    pattern: /;\s*;+/g,
    replacement: ';',
    description: "';;' -> ';'",
  },
  {
    pattern: new RegExp(`${WB}N\\s+de\\s+en${WE}`, 'g'),
    replacement: 'Neden',
    description: "'N de en' -> 'Neden'",
  },
  {
    pattern: new RegExp(`${WB}n\\s+de\\s+en${WE}`, 'g'),
    replacement: 'neden',
    description: "'n de en' -> 'neden'",
  },
  {
    pattern: new RegExp(`${WB}([Nn])\\s+e\\s+d\\s+e\\s+n${WE}`, 'g'),
    replacement: (_match: string, ...args: unknown[]) => `${args[0]}eden`,
    description: "'N e d e n' -> 'Neden'",
  },
  {
    pattern: new RegExp(`${WB}([Gg])\\s+e\\s+l\\s+d\\s+i${WE}`, 'g'),
    replacement: (_match: string, ...args: unknown[]) => `${args[0]}eldi`,
    description: "'g e l d i' -> 'geldi'",
  },
  {
    pattern: new RegExp(`${WB}([Bb])\\s+a\\s+ş\\s+l\\s+a\\s+d\\s+ı${WE}`, 'g'),
    replacement: (_match: string, ...args: unknown[]) => `${args[0]}aşladı`,
    description: "'b a ş l a d ı' -> 'başladı'",
  },
  {
    pattern: new RegExp(`${WB}([Yy])\\s+a\\s+p\\s+t\\s+ı${WE}`, 'g'),
    replacement: (_match: string, ...args: unknown[]) => `${args[0]}aptı`,
    description: "'y a p t ı' -> 'yaptı'",
  },
  {
    pattern: new RegExp(`${WB}de[\uFFFD]?il${WE}`, 'gi'),
    replacement: (match) => replaceCasePreserving(match, 'değil'),
    description: "'deil' -> 'değil'",
  },
  {
    pattern: new RegExp(`${WB}ba[\uFFFD]?lad([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'başlad' + rest),
    description: "'balad...' -> 'başlad...'",
  },
  {
    pattern: new RegExp(`${WB}i[\uFFFD]?in${WE}`, 'gi'),
    replacement: (match) => replaceCasePreserving(match, 'için'),
    description: "'iin' -> 'için'",
  },
  {
    pattern: new RegExp(`${WB}ya[\uFFFD]?mur([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'yağmur' + rest),
    description: "'yamur...' -> 'yağmur...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]imdi${WE}`, 'gi'),
    replacement: (match) => replaceCasePreserving(match, 'şimdi'),
    description: "'imdi' -> 'şimdi'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]ey(ler|i|e|den|de)?${WE}`, 'gi'),
    replacement: (match, suffix = '') => replaceCasePreserving(match, 'şey' + (suffix || '')),
    description: "'ey...' -> 'şey...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]öyle${WE}`, 'gi'),
    replacement: (match) => replaceCasePreserving(match, 'şöyle'),
    description: "'öyle' -> 'şöyle'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]ehir([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şehir' + rest),
    description: "'ehir...' -> 'şehir...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]üphe([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şüphe' + rest),
    description: "'üphe...' -> 'şüphe...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]ans([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şans' + rest),
    description: "'ans...' -> 'şans...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]eker([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şeker' + rest),
    description: "'eker...' -> 'şeker...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]arkı([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şarkı' + rest),
    description: "'arkı...' -> 'şarkı...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]iir([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şiir' + rest),
    description: "'iir...' -> 'şiir...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]irket([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şirket' + rest),
    description: "'irket...' -> 'şirket...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]iddet([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şiddet' + rest),
    description: "'iddet...' -> 'şiddet...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]eref([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şeref' + rest),
    description: "'eref...' -> 'şeref...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]air([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şair' + rest),
    description: "'air...' -> 'şair...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]art([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şart' + rest),
    description: "'art...' -> 'şart...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]aka([a-zçğıöşü]*)${WE}`, 'gi'),
    replacement: (match, rest) => replaceCasePreserving(match, 'şaka' + rest),
    description: "'aka...' -> 'şaka...'",
  },
  {
    pattern: new RegExp(`${WB}[\uFFFD]ubat${WE}`, 'gi'),
    replacement: (match) => replaceCasePreserving(match, 'şubat'),
    description: "'ubat' -> 'şubat'",
  },
  {
    pattern: new RegExp(`${WB}bir\\s+çok${WE}`, 'gi'),
    replacement: (match) => (match[0] === 'B' ? 'Birçok' : 'birçok'),
    description: "'bir çok' -> 'birçok'",
  },
  {
    pattern: new RegExp(`${WB}her\\s+hangi${WE}`, 'gi'),
    replacement: (match) => (match[0] === 'H' ? 'Herhangi' : 'herhangi'),
    description: "'her hangi' -> 'herhangi'",
  },
  {
    pattern: new RegExp(`${WB}bir\\s+kaç${WE}`, 'gi'),
    replacement: (match) => (match[0] === 'B' ? 'Birkaç' : 'birkaç'),
    description: "'bir kaç' -> 'birkaç'",
  },
  {
    pattern: new RegExp(`${WB}bir\\s+az${WE}`, 'gi'),
    replacement: (match) => (match[0] === 'B' ? 'Biraz' : 'biraz'),
    description: "'bir az' -> 'biraz'",
  },
  {
    pattern: new RegExp(`${WB}hiç\\s+bir${WE}`, 'gi'),
    replacement: (match) => (match[0] === 'H' ? 'Hiçbir' : 'hiçbir'),
    description: "'hiç bir' -> 'hiçbir'",
  },
  {
    pattern: /\.\s+\.\s+\./g,
    replacement: '...',
    description: "'. . .' -> '...'",
  },
  {
    pattern: /([a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+)\s+(['’])([a-zA-ZçğıöşüÇĞİÖŞÜ]+)/g,
    replacement: '$1$2$3',
    description: 'Kesme işareti öncesi boşluk düzeltmesi',
  },
  {
    pattern: /(?<=[.?!:»"'])\s+\d{1,4}\.?\s+(?=[A-ZÇĞİÖŞÜ])/g,
    replacement: ' ',
    description: 'Cümle arasına sızan sayfa numarası temizliği',
  },
  {
    pattern: /(?<=[.?!:»"'])\s+\d{1,4}\.?\s*$/g,
    replacement: '',
    description: 'Paragraf sonu sarkan sayfa numarası temizliği',
  },
];

/**
 * Patterns that indicate potential OCR / conversion artifacts in Turkish text.
 */
const SPLIT_LETTER_SEQUENCE_REGEX = /(?<![\p{L}\p{N}])[\p{L}]{1,2}\s+[\p{L}]{1,2}\s+[\p{L}]{1,2}(?![\p{L}\p{N}])/gu;

const VALID_SHORT_TURKISH_PHRASES = [
  'o da bir', 'bu da bir', 'şu da bir', 'ne de olsa', 'az da olsa',
  've ya da', 'o ve bu', 'ya da o', 'o da o', 'bu da bu', 'ne de bir',
  've de bir', 'en az bir', 'en çok bir', 'o da ne', 'şu da var', 'bir de bu', 'bir de o'
];

const OCR_ANOMALY_PATTERNS: RegExp[] = [
  /\uFFFD/,
  /\.\s*,|,\s*,|::|;;/,
  new RegExp(`${WB}(yarm|kamı|öğmeci|öğmek|soma|bumu|karamlı|imsan|farkıma\\s+var|ayrımlı|davra|korkumç|düşümce|uyam|yalmız|yamlış|tuma|tumuva|kame|tarnarn|zarnan|adarn|akşarn|andınyor|andıryor|görünrn|tükenrn|bölünrn|claha|cliye|cliyen|clil|clüşün|clünya|clönem|clur|cla|cle|clegil|cleğil|clost|cloktor|clerece|cluygu|clurum|clevam|clüzen|clere|cleniz|clol|clön)\\w*${WE}`, 'iu'),
  /[a-zA-ZçğıöşüÇĞİÖŞÜ0-9]+-\s+[a-zA-ZçğıöşüÇĞİÖŞÜ]+/,
  /\b\w*cl[aeıioöuü]\w*/i,
  /\b(bir çok|her hangi|bir kaç|bir az|hiç bir)\b/i,
  /\s+[,.!?:;]/,
  /\w+\s+['’]\w+/,
  /\.\s+\.\s+\./,
  /(?<![A-ZÇĞİÖŞÜ])[bcçdfgğhjklmnprsştvyz]{4,}(?![A-ZÇĞİÖŞÜ])/i,
  /[ÔÊÂÎÛôêâîû@#$\\/|<>~]/,
  /\b[a-zçğıöşü]+[A-ZÇĞİÖŞÜ]+[a-zçğıöşü]+\b/,
];

export function hasOcrAnomaly(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  if (text.includes('\uFFFD')) {
    return true;
  }

  for (const pattern of OCR_ANOMALY_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }

  const splitMatches = Array.from(text.matchAll(SPLIT_LETTER_SEQUENCE_REGEX));
  if (splitMatches.length > 0) {
    const hasInvalidSplit = splitMatches.some(
      (m) => !VALID_SHORT_TURKISH_PHRASES.includes(m[0].toLowerCase())
    );
    if (hasInvalidSplit) {
      return true;
    }
  }

  return false;
}

/**
 * Apply fast rule-based pre-cleaning to Turkish text.
 */
export function applyTurkishRegexPreClean(text: string): string {
  return applyTurkishRegexWithLogs(text, '', '', '').cleaned;
}

/**
 * Apply each regex rule in TURKISH_OCR_REGEX_RULES and return the cleaned text with structured debug logs.
 */
export function applyTurkishRegexWithLogs(
  text: string,
  blockId: string,
  chapterId: string,
  chapterTitle: string
): { cleaned: string; logs: DebugLogEntry[] } {
  let currentText = text;
  const logs: DebugLogEntry[] = [];
  const originalBlockText = text;

  TURKISH_OCR_REGEX_RULES.forEach((rule, ruleIdx) => {
    const textBeforeRule = currentText;
    const ruleChanges: { before: string; after: string }[] = [];

    const rawFlags = rule.pattern.flags;
    const flags = (rawFlags.includes('g') ? rawFlags : rawFlags + 'g') + (rawFlags.includes('u') ? '' : 'u');
    const regex = new RegExp(rule.pattern.source, flags);

    currentText = currentText.replace(regex, (match, ...args) => {
      let replacementStr: string;
      if (typeof rule.replacement === 'string') {
        let rep = rule.replacement;
        rep = rep.replace(/\$(\d+)/g, (_sub, groupIdx) => {
          const idx = parseInt(groupIdx, 10) - 1;
          return typeof args[idx] === 'string' ? (args[idx] as string) : '';
        });
        replacementStr = rep;
      } else {
        replacementStr = (rule.replacement as (substring: string, ...args: unknown[]) => string)(match, ...args);
      }

      ruleChanges.push({
        before: match,
        after: replacementStr,
      });

      return replacementStr;
    });

    if (currentText !== textBeforeRule) {
      if (ruleChanges.length === 0) {
        ruleChanges.push({
          before: textBeforeRule,
          after: currentText,
        });
      }

      logs.push({
        id: `${blockId}-${ruleIdx}-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('tr-TR'),
        source: 'regex',
        ruleName: rule.description,
        chapterId,
        chapterTitle,
        blockId,
        originalText: originalBlockText,
        correctedText: currentText,
        changes: ruleChanges,
      });
    }
  });

  return { cleaned: currentText, logs };
}

/**
 * Calculates word-level diffs between original and corrected text.
 */
export function computeTextDiff(original: string, corrected: string): {
  diffs: DiffItem[];
  fixedWordCount: number;
} {
  const changes: Change[] = diffWordsWithSpace(original, corrected);
  const diffs: DiffItem[] = [];
  let fixedWordCount = 0;

  for (const change of changes) {
    if (change.added) {
      diffs.push({ type: 'added', value: change.value });
      // Count added words as fixed words
      const words = change.value.trim().split(/\s+/).filter(Boolean);
      fixedWordCount += words.length;
    } else if (change.removed) {
      diffs.push({ type: 'removed', value: change.value });
    } else {
      diffs.push({ type: 'equal', value: change.value });
    }
  }

  return { diffs, fixedWordCount };
}
