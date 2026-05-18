import { extractResponseText, getMoodText, isLikelyTruncatedJson } from '../src/services/openai.service.js';

describe('openai.service', () => {
  test('mapea mood en escala 1..5', () => {
    expect(getMoodText(1)).toBe('muy triste');
    expect(getMoodText(2)).toBe('triste');
    expect(getMoodText(3)).toBe('regular');
    expect(getMoodText(4)).toBe('bien');
    expect(getMoodText(5)).toBe('muy bien');
  });

  test('usa fallback para valores fuera de rango', () => {
    expect(getMoodText(7)).toBe('regular');
    expect(getMoodText(0)).toBe('regular');
  });

  test('extrae texto de un content string o array de partes', () => {
    expect(extractResponseText('hola')).toBe('hola');
    expect(extractResponseText([
      { type: 'text', text: 'uno ' },
      { type: 'text', text: 'dos' },
    ])).toBe('uno dos');
    expect(extractResponseText([{ type: 'image_url', image_url: 'x' }])).toBe('');
  });

  test('detecta json truncado probable', () => {
    expect(isLikelyTruncatedJson('{"message":"hola"')).toBe(true);
    expect(isLikelyTruncatedJson('{"message":"hola"}')).toBe(false);
    expect(isLikelyTruncatedJson('```json\n{"a":1}\n```')).toBe(false);
  });
});
