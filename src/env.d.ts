// src/env.d.ts
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}