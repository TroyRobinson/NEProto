import { id } from '@instantdb/react';
import db from './db';
import { ZctaFeature } from './census';

export async function saveStat(params: {
  variable: string;
  title: string;
  description: string;
  category: string;
  dataset: string;
  year: string;
  features: ZctaFeature[];
}) {
  const statId = id();
  const txs = [
    db.tx.stats[statId].update({
      variable: params.variable,
      title: params.title,
      description: params.description,
      category: params.category,
      dataset: params.dataset,
      year: Number(params.year),
    }),
    ...params.features.map(f => {
      const vid = id();
      return db.tx.statValues[vid]
        .update({ zcta: f.properties.ZCTA5CE10, value: f.properties.value ?? undefined })
        .link({ stat: statId });
    })
  ];
  await db.transact(txs);
}
