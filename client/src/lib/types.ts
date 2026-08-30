export interface User {
  id: string;
  name: string;
  email: string;
}

// Tiptap/ProseMirror JSON document shape (kept loose -- the editor owns the
// exact structure, the frontend/backend just pass it through).
export type TiptapContent = Record<string, unknown>;

export interface DocSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  owner?: User; // present on items in the "shared with me" list
}

export interface FullDocument {
  id: string;
  title: string;
  content: TiptapContent;
  ownerId: string;
  owner: User;
  createdAt: string;
  updatedAt: string;
}

export interface ShareEntry {
  userId: string;
  name: string;
  email: string;
}

export interface VersionEntry {
  id: string;
  title: string;
  createdAt: string;
  createdBy: string;
}
