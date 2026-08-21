import { getPostsByAuthor } from '@/lib/hive/hive-client';
import { CONTROL_TAGS } from '@/lib/hive/project-logic';
import { NextResponse } from 'next/server';

const extractAndCountTags = (posts: any[]) => {
  const tagCount = new Map<string, number>();

  posts.forEach(post => {
    try {
      const metadata = JSON.parse(post.json_metadata || '{}');
      const postTags = metadata.tags || [];
      if (Array.isArray(postTags)) {
        postTags.forEach((tag: any) => {
          if (typeof tag === 'string' && !CONTROL_TAGS.has(tag)) {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
          }
        });
      }
    } catch (e) {
      // ignore
    }
  });

  return Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
};

export async function GET() {
  try {
    const username = process.env.NEXT_PUBLIC_HIVE_USERNAME;
    if (!username) return NextResponse.json([], { status: 200 });

    const posts = await getPostsByAuthor(username);
    const tags = extractAndCountTags(posts);
    return NextResponse.json(tags, { status: 200 });
  } catch (e) {
    console.error('Error fetching tags', e);
    return NextResponse.json([], { status: 500 });
  }
}
