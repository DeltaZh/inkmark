import { afterEach } from 'vitest';

// happy-dom + React 19：声明测试环境以消除 act() 警告
(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = '';
});
