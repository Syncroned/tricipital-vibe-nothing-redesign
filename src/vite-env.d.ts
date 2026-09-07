/// <reference types="vite/client" />

declare module '*.frag?raw' {
  const content: string
  export default content
}

declare module '*.glsl?raw' {
  const content: string
  export default content
}

declare module '*.svg?inline' {
  const src: string
  export default src
}
