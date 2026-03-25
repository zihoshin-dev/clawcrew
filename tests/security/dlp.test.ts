import { describe, it, expect } from 'vitest';
import { DlpFilter } from '../../src/security/dlp.js';

describe('DlpFilter', () => {
  describe('주민번호 masking', () => {
    it('masks a valid 주민번호', () => {
      const filter = new DlpFilter();
      const { filtered, detections } = filter.filter('주민번호: 900101-1234567');
      expect(filtered).toContain('[주민번호 마스킹]');
      expect(filtered).not.toContain('900101-1234567');
      expect(detections).toEqual(expect.arrayContaining([
        expect.objectContaining({ patternName: '주민번호', count: 1 }),
      ]));
    });
  });

  describe('전화번호 masking', () => {
    it('masks a mobile number with dashes', () => {
      const filter = new DlpFilter();
      const { filtered } = filter.filter('연락처: 010-1234-5678');
      expect(filtered).toContain('[전화번호 마스킹]');
      expect(filtered).not.toContain('010-1234-5678');
    });

    it('masks a mobile number without dashes', () => {
      const filter = new DlpFilter();
      const { filtered } = filter.filter('01012345678');
      expect(filtered).toContain('[전화번호 마스킹]');
    });
  });

  describe('이메일 masking', () => {
    it('masks an email address', () => {
      const filter = new DlpFilter();
      const { filtered, detections } = filter.filter('email: user@example.com');
      expect(filtered).toContain('[이메일 마스킹]');
      expect(filtered).not.toContain('user@example.com');
      expect(detections.find((d) => d.patternName === '이메일')?.count).toBe(1);
    });
  });

  describe('카드번호 masking', () => {
    it('masks a credit card number with dashes', () => {
      const filter = new DlpFilter();
      const { filtered } = filter.filter('카드: 1234-5678-9012-3456');
      expect(filtered).toContain('[카드번호 마스킹]');
    });

    it('masks a credit card number without dashes', () => {
      const filter = new DlpFilter();
      const { filtered } = filter.filter('1234567890123456');
      expect(filtered).toContain('[카드번호 마스킹]');
    });
  });

  describe('계좌번호 masking', () => {
    it('masks a bank account number', () => {
      const filter = new DlpFilter();
      const { filtered, detections } = filter.filter('계좌: 123-456-789012');
      expect(filtered).toContain('[계좌번호 마스킹]');
      expect(detections.find((d) => d.patternName === '계좌번호')).toBeDefined();
    });
  });

  describe('no false positives', () => {
    it('does not mask clean text', () => {
      const filter = new DlpFilter();
      const text = '안녕하세요. 오늘 날씨가 좋네요.';
      const { filtered, detections } = filter.filter(text);
      expect(filtered).toBe(text);
      expect(detections).toHaveLength(0);
    });

    it('does not mask a normal number sequence', () => {
      const filter = new DlpFilter();
      const text = '가격은 12345원입니다.';
      const { filtered } = filter.filter(text);
      expect(filtered).toBe(text);
    });
  });

  describe('multiple detections', () => {
    it('detects multiple PII types in one string', () => {
      const filter = new DlpFilter();
      const text = '이메일: test@test.com 전화: 010-9999-8888';
      const { detections } = filter.filter(text);
      expect(detections.length).toBeGreaterThanOrEqual(2);
    });

    it('counts multiple occurrences of same pattern', () => {
      const filter = new DlpFilter();
      const text = '010-1111-2222 그리고 010-3333-4444';
      const { detections } = filter.filter(text);
      const phoneDetection = detections.find((d) => d.patternName === '전화번호');
      expect(phoneDetection?.count).toBe(2);
    });
  });

  describe('custom patterns', () => {
    it('applies custom patterns in addition to defaults', () => {
      const filter = new DlpFilter([
        { name: '비밀코드', regex: /SECRET-\d{4}/g, replacement: '[비밀코드 마스킹]' },
      ]);
      const { filtered, detections } = filter.filter('코드: SECRET-1234');
      expect(filtered).toContain('[비밀코드 마스킹]');
      expect(detections.find((d) => d.patternName === '비밀코드')).toBeDefined();
    });
  });

  describe('hasPersonalInfo', () => {
    it('returns true when PII is present', () => {
      const filter = new DlpFilter();
      expect(filter.hasPersonalInfo('연락처: 010-1234-5678')).toBe(true);
    });

    it('returns false when no PII is present', () => {
      const filter = new DlpFilter();
      expect(filter.hasPersonalInfo('Hello world')).toBe(false);
    });
  });
});
