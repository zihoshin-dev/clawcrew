import { describe, it, expect } from 'vitest';
import { CommandInterceptor } from '../../src/sandbox/interceptor.js';

describe('CommandInterceptor', () => {
  const interceptor = new CommandInterceptor();

  describe('allowed commands', () => {
    it('allows a safe ls command with severity=info', () => {
      const result = interceptor.intercept('ls -la /home/user');
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('allows a git commit command', () => {
      const result = interceptor.intercept('git commit -m "add feature"');
      expect(result.allowed).toBe(true);
    });

    it('allows a safe npm install command', () => {
      const result = interceptor.intercept('npm install lodash');
      expect(result.allowed).toBe(true);
    });
  });

  describe('blocked commands', () => {
    it('blocks recursive delete with rm -rf', () => {
      const result = interceptor.intercept('rm -rf /');
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
      expect(result.reason).toMatch(/recursive delete/i);
    });

    it('blocks DROP TABLE SQL statement', () => {
      const result = interceptor.intercept('DROP TABLE users;');
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks mkfs command', () => {
      const result = interceptor.intercept('mkfs.ext4 /dev/sdb1');
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks shutdown command', () => {
      const result = interceptor.intercept('shutdown -h now');
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks chmod 777', () => {
      const result = interceptor.intercept('chmod 777 /etc/passwd');
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('blocks dd writing to a device', () => {
      const result = interceptor.intercept('dd if=/dev/zero of=/dev/sda');
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
    });

    it('includes the matched pattern in the result', () => {
      const result = interceptor.intercept('DROP DATABASE production;');
      expect(result.matchedPattern).toBeDefined();
    });
  });

  describe('warned commands', () => {
    it('allows but warns on git push --force', () => {
      const result = interceptor.intercept('git push origin main --force');
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('warn');
      expect(result.reason).toMatch(/force push/i);
    });

    it('allows but warns on npm publish', () => {
      const result = interceptor.intercept('npm publish');
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('warn');
    });

    it('allows but warns on git reset --hard', () => {
      const result = interceptor.intercept('git reset --hard HEAD~1');
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('warn');
    });

    it('allows but warns on docker rm', () => {
      const result = interceptor.intercept('docker rm my-container');
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('warn');
    });
  });
});
