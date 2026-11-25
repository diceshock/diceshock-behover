import SchemaBuilder from "@pothos/core";
import { nanoid } from "nanoid";
import { z } from "zod/v4";
import { hashPassword } from "../utils/password";
import type { GQLContext } from "./context";
import { forbidden, validationError } from "./errors";
import { requireStaff } from "./guards";

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  role: z.enum(["CUSTOMER", "MEMBER", "HOST", "STAFF"]),
  password: z.string().min(8).optional().nullable(),
});

const builder = new SchemaBuilder<{ Context: GQLContext }>({});
builder.queryType({
  fields: (t) => ({
    _managedAccountsSchema: t.boolean({ resolve: () => true }),
  }),
});
builder.mutationType({
  fields: (t) => ({
    createManagedUser: t.id({
      args: {
        name: t.arg.string({ required: true }),
        phone: t.arg.string({ required: true }),
        role: t.arg.string({ required: true }),
        password: t.arg.string(),
      },
      resolve: async (_parent, args, ctx) => {
        requireStaff(ctx);
        const parsed = createAccountSchema.safeParse(args);
        if (!parsed.success)
          throw validationError(
            "input",
            parsed.error.issues[0]?.message ?? "Invalid account",
          );
        const input = parsed.data;
        if (ctx.role !== "admin" && input.role === "STAFF")
          throw forbidden("Cannot create a privileged account");
        const internal = input.role === "STAFF" || input.role === "HOST";
        if (internal && !input.password)
          throw validationError("password", "Initial password is required");
        if (!internal && input.password)
          throw validationError(
            "password",
            "Customer accounts use SMS or WeChat login",
          );
        const existingPhone = await ctx.db.query.userInfoTable.findFirst({
          where: (ui, { eq }) => eq(ui.phone, input.phone),
          columns: { id: true },
        });
        const existingAccount = await ctx.db.query.accounts.findFirst({
          where: (account, { and, eq }) =>
            and(
              eq(account.provider, "SMS"),
              eq(account.providerAccountId, input.phone),
            ),
          columns: { userId: true },
        });
        if (existingPhone || existingAccount)
          throw validationError("phone", "Phone already belongs to an account");

        const id = crypto.randomUUID();
        const uid = nanoid();
        const now = Date.now();
        const role = input.role.toLowerCase();
        const credentials = input.password
          ? await hashPassword(input.password)
          : null;
        const db = ctx.env.DB;
        const statements = [
          db
            .prepare(`INSERT INTO "user"(id,name,role,disabled)
            SELECT ?,?,?,0 WHERE NOT EXISTS(SELECT 1 FROM user_info WHERE phone=?)
            AND NOT EXISTS(SELECT 1 FROM account WHERE provider='SMS' AND "providerAccountId"=?)`)
            .bind(id, input.name, role, input.phone, input.phone),
          db
            .prepare(`INSERT INTO user_info(id,uid,nickname,phone,points,create_at)
            SELECT id,?,?,?,0,? FROM "user" WHERE id=?`)
            .bind(uid, input.name, input.phone, now, id),
          db
            .prepare(`INSERT INTO account("userId",type,provider,"providerAccountId")
            SELECT id,'credentials','SMS',? FROM "user" WHERE id=?`)
            .bind(input.phone, id),
        ];
        if (credentials) {
          statements.push(
            db
              .prepare(`INSERT INTO user_credentials(user_id,password_hash,salt,iterations,created_at,updated_at)
            SELECT id,?,?,?,?,? FROM "user" WHERE id=?`)
              .bind(
                credentials.hash,
                credentials.salt,
                credentials.iterations,
                now,
                now,
                id,
              ),
          );
        }
        if (role === "host") {
          statements.push(
            db
              .prepare(`INSERT INTO trpg_access(user_id,store_id,staff,host)
            SELECT ?,id,0,1 FROM stores WHERE EXISTS(SELECT 1 FROM "user" WHERE id=?)`)
              .bind(id, id),
          );
        }
        await db.batch(statements);
        const created = await ctx.db.query.users.findFirst({
          where: (u, { eq }) => eq(u.id, id),
          columns: { id: true },
        });
        if (!created)
          throw validationError("phone", "Phone already belongs to an account");
        return id;
      },
    }),
  }),
});

export const managedAccountsSchema = builder.toSchema();
