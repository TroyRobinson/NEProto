import { i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    organizations: i.entity({
      name: i.string(),
      description: i.string(),
      category: i.string(),
      website: i.string().optional(),
      phone: i.string().optional(),
      email: i.string().optional(),
      statistics: i.string().optional(),
      createdAt: i.number().indexed(),
    }),
    locations: i.entity({
      address: i.string(),
      latitude: i.number(),
      longitude: i.number(),
      isPrimary: i.boolean(),
    }),
    acsCache: i.entity({
      key: i.string().unique().indexed(),
      rows: i.string(),
      fetchedAt: i.number().indexed(),
      source: i.string(),
    }),
  },
  links: {
    orgLocations: {
      forward: { on: 'organizations', has: 'many', label: 'locations' },
      reverse: { on: 'locations', has: 'one', label: 'organization' },
    },
    orgLogos: {
      forward: { on: 'organizations', has: 'one', label: 'logo' },
      reverse: { on: '$files', has: 'one', label: 'logoOrg' },
    },
    orgPhotos: {
      forward: { on: 'organizations', has: 'many', label: 'photos' },
      reverse: { on: '$files', has: 'one', label: 'photoOrg' },
    },
  },
});

type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;