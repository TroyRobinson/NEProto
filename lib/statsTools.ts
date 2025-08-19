import adminDb from './adminDb';

export async function searchStats(query: string) {
  const res = await adminDb.query({
    stats: {
      $: {
        where: {
          or: [
            { title: { $ilike: `%${query}%` } },
            { description: { $ilike: `%${query}%` } },
          ],
        },
      },
    },
  });
  return (
    res.stats?.map((s: { variableId: string; description: string }) => ({
      id: s.variableId,
      description: s.description,
    })) || []
  );
}
