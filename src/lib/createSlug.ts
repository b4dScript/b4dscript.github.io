export default function createSlug(title: string, slug: string): string {
  return slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
