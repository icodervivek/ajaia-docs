import "dotenv/config";
import { prisma } from "./db";

// Seeded demo users for the mock-auth login picker. Re-running this script
// is safe (upsert by email / by a marker in the demo doc's title).
const USERS = [
  { name: "Alice Chen", email: "alice@ajaia.demo" },
  { name: "Bilal Rahman", email: "bilal@ajaia.demo" },
  { name: "Carmen Ruiz", email: "carmen@ajaia.demo" },
];

const WELCOME_TITLE = "Welcome to Ajaia Docs";

const WELCOME_CONTENT = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome to Ajaia Docs" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "This is a " },
        { type: "text", text: "shared", marks: [{ type: "bold" }] },
        {
          type: "text",
          text: " document owned by Alice Chen and shared with Bilal Rahman — switch users with the picker in the top-right to see it from both sides.",
        },
      ],
    },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What to try" }] },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                { type: "text", text: "Edit this text — it " },
                { type: "text", text: "autosaves", marks: [{ type: "italic" }] },
                { type: "text", text: " a moment after you stop typing" },
              ],
            },
          ],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Rename the document from the title field above" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Import a .txt or .md file from the dashboard" }] }],
        },
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Share a document with another demo user by email" }] }],
        },
      ],
    },
  ],
};

async function main() {
  const users: Record<string, { id: string; name: string; email: string }> = {};
  for (const u of USERS) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: u,
    });
  }
  console.log("Seeded users:");
  console.table(Object.values(users));

  const alice = users["alice@ajaia.demo"];
  const bilal = users["bilal@ajaia.demo"];

  let welcome = await prisma.document.findFirst({ where: { ownerId: alice.id, title: WELCOME_TITLE } });
  if (!welcome) {
    welcome = await prisma.document.create({
      data: { title: WELCOME_TITLE, content: WELCOME_CONTENT, ownerId: alice.id },
    });
    console.log(`Created demo document "${WELCOME_TITLE}" (${welcome.id})`);
  } else {
    console.log(`Demo document "${WELCOME_TITLE}" already exists (${welcome.id})`);
  }

  await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: welcome.id, userId: bilal.id } },
    create: { documentId: welcome.id, userId: bilal.id },
    update: {},
  });
  console.log(`Shared "${WELCOME_TITLE}" with ${bilal.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
