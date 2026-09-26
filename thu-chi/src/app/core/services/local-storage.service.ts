import { Injectable } from '@angular/core';

/** Bọc localStorage: không bao giờ ném lỗi (chế độ ẩn danh, bộ nhớ bị chặn...). */
@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  }

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* bỏ qua: dữ liệu vẫn giữ trong bộ nhớ của phiên */
    }
  }
}
