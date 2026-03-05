declare module 'lucide-react' {
  import { FC, SVGAttributes } from 'react';
  type Icon = FC<SVGAttributes<SVGElement>>;
  const icons: { [key: string]: Icon };
  export = icons;
  export type { Icon };
}

declare module 'gsplat' {
  export class Scene { constructor(); [key: string]: any; }
  export class Camera { constructor(); [key: string]: any; }
  export class WebGLRenderer { constructor(canvas?: HTMLCanvasElement); [key: string]: any; }
  export class OrbitControls { constructor(camera: any, canvas: any); [key: string]: any; }
  export class PLYLoader { constructor(); [key: string]: any; }
  export class Loader { constructor(); [key: string]: any; }
  export class Vector3 { constructor(x?: number, y?: number, z?: number); x: number; y: number; z: number; [key: string]: any; }
  export const [key: string]: any;
}
