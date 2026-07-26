import { pgTable, text, timestamp, integer, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  emoji: varchar('emoji', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  url: text('url'),
  blobUrl: text('blob_url'),
  ogImage: text('og_image'),
  description: text('description'),
  tags: text('tags').array(),
  category: varchar('category', { length: 100 }).notNull(),
  format: varchar('format', { length: 100 }).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  addedBy: varchar('added_by', { length: 100 }),
  notes: text('notes'),
  folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  likeCount: integer('like_count').default(0).notNull(),
  loveCount: integer('love_count').default(0).notNull(),
  // Soft delete: set when moved to "Recently deleted", purged after 30 days
  deletedAt: timestamp('deleted_at'),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  resourceId: uuid('resource_id').references(() => resources.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const foldersRelations = relations(folders, ({ many }) => ({
  resources: many(resources),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  folder: one(folders, {
    fields: [resources.folderId],
    references: [folders.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  resource: one(resources, {
    fields: [comments.resourceId],
    references: [resources.id],
  }),
}));
