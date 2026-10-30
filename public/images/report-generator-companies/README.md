# Report Generator Company Images

Place company cover images for the report generator page in this folder.

Each company image is referenced by `imagePath` in `data/companyKnowledge.ts`.
Files in this folder are served from `/images/report-generator-companies`.

Example:

```ts
imagePath: "/images/report-generator-companies/TaiwanSemiconductorManufacturingCompany.png"
```

To replace a company's image, put a file in this folder and update that company's `imagePath` if the filename changes.
