# Images

Put static image assets for the web UI in this folder.

Files in `public/images` are served from `/images`.

Example:

```tsx
<img src="/images/example.png" alt="Example" />
```

For Next.js `Image`:

```tsx
import Image from "next/image";

<Image src="/images/example.png" alt="Example" width={800} height={450} />
```
