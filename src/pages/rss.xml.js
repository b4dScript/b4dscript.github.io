import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import createSlug from "../lib/createSlug";

export async function GET(context) {
  const posts = await getCollection("blog");
  return rss({
    title: "b4dScript | Writeups",
    description: "Cybersecurity writeups and penetration testing notes",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${createSlug(post.data.title, post.slug)}/`,
    })),
  });
}
